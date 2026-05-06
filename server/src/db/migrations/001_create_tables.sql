-- ============================================
-- tamesna Gym v9.0
-- Migration 001: Create All Tables
-- CdC Reference: §3.1 - §3.7
-- ============================================

BEGIN;

-- ============================================
-- 3.1 Table: gyms
-- ============================================
CREATE TABLE gyms (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    address         TEXT,
    phone           VARCHAR(20),
    email           VARCHAR(100),
    logo_url        VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at      TIMESTAMPTZ NULL,           -- Soft delete
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gyms_active ON gyms (is_active) WHERE is_active = TRUE;

-- ============================================
-- 3.2 Table: users
-- ============================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(80) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,      -- bcrypt, cost 12
    role            VARCHAR(15) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'STAFF')),
    gym_id          INT REFERENCES gyms(id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STAFF must have gym_id, SUPER_ADMIN must have NULL
ALTER TABLE users ADD CONSTRAINT chk_role_gym CHECK (
    (role = 'SUPER_ADMIN' AND gym_id IS NULL)
    OR
    (role = 'STAFF' AND gym_id IS NOT NULL)
);

CREATE INDEX idx_users_gym ON users (gym_id);

-- ============================================
-- 3.3 Table: subscriptions
-- ============================================
CREATE TABLE subscriptions (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,      -- Ex: 'Mensuel', 'Trimestriel'
    duration_days   INT NOT NULL CHECK (duration_days > 0),
    price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    gym_id          INT NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subs_gym ON subscriptions (gym_id);

-- ============================================
-- 3.4 Table: members (with State Machine)
-- CORRECTION: frozen_since / frozen_until added
-- ============================================
CREATE TABLE members (
    id                  SERIAL PRIMARY KEY,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    email               VARCHAR(100),
    photo_url           VARCHAR(500),
    gender              VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE')),
    date_of_birth       DATE,
    gym_id              INT NOT NULL REFERENCES gyms(id) ON DELETE RESTRICT,
    status              VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'FROZEN', 'EXPIRED', 'DELETED')),

    -- Freeze logic (CdC §4.2)
    frozen_since        DATE,
    frozen_until        DATE,
    frozen_days_used    INT DEFAULT 0,
    max_freeze_days     INT DEFAULT 30,

    -- Current subscription dates
    subscription_start  DATE,
    subscription_end    DATE,

    -- Soft delete
    deleted_at          TIMESTAMPTZ,
    deleted_by          INT REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Notes
    notes               TEXT
);

-- frozen_since must be before frozen_until
ALTER TABLE members ADD CONSTRAINT chk_freeze_dates
    CHECK (frozen_until IS NULL OR frozen_since < frozen_until);

-- DELETED status requires deleted_at
ALTER TABLE members ADD CONSTRAINT chk_deleted_consistency
    CHECK (status != 'DELETED' OR deleted_at IS NOT NULL);

CREATE INDEX idx_members_gym ON members (gym_id);
CREATE INDEX idx_members_status ON members (status);
CREATE INDEX idx_members_sub_end ON members (subscription_end);
CREATE INDEX idx_members_phone ON members (phone);

-- ============================================
-- 3.5 Table: payments (with subscription_id)
-- CORRECTION: subscription_id was missing
-- ============================================
CREATE TABLE payments (
    id                      SERIAL PRIMARY KEY,
    member_id               INT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    gym_id                  INT NOT NULL REFERENCES gyms(id) ON DELETE RESTRICT,
    subscription_id         INT REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount                  NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method          VARCHAR(20) DEFAULT 'CASH'
                            CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER')),
    date_start              DATE NOT NULL,
    date_end                DATE NOT NULL,
    staff_id                INT REFERENCES users(id) ON DELETE SET NULL,
    staff_username_snapshot VARCHAR(80),
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payments ADD CONSTRAINT chk_payment_dates
    CHECK (date_end > date_start);

CREATE INDEX idx_payments_gym ON payments (gym_id);
CREATE INDEX idx_payments_member ON payments (member_id);
CREATE INDEX idx_payments_date ON payments (date_start, date_end);

-- ============================================
-- 3.6 Table: audit_logs
-- CORRECTION: ON DELETE SET NULL + username_snapshot
-- ============================================
CREATE TABLE audit_logs (
    id                  SERIAL PRIMARY KEY,
    user_id             INT REFERENCES users(id) ON DELETE SET NULL,
    username_snapshot   VARCHAR(80) NOT NULL,
    gym_id              INT REFERENCES gyms(id) ON DELETE SET NULL,
    action_type         VARCHAR(50) NOT NULL CHECK (action_type IN (
        'LOGIN', 'LOGIN_FAILED', 'LOGOUT',
        'CREATE', 'UPDATE', 'DELETE',
        'FREEZE', 'UNFREEZE', 'PAYMENT'
    )),
    target_table        VARCHAR(50),
    target_id           INT,
    old_value           JSONB,
    new_value           JSONB,
    ip_address          INET,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs (user_id);
CREATE INDEX idx_audit_target ON audit_logs (target_table, target_id);
CREATE INDEX idx_audit_ts ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_gym ON audit_logs (gym_id);

-- ============================================
-- 3.7 Table: sending_queue
-- ============================================
CREATE TABLE sending_queue (
    id              SERIAL PRIMARY KEY,
    gym_id          INT NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    member_id       INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    phone_number    VARCHAR(20) NOT NULL,
    message         TEXT NOT NULL,
    status          VARCHAR(15) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'FAILED', 'EXPIRED')),
    attempts        SMALLINT NOT NULL DEFAULT 0,
    max_attempts    SMALLINT NOT NULL DEFAULT 3,
    scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMPTZ,
    failed_reason   TEXT,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_queue_status ON sending_queue (status, scheduled_at)
    WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX idx_queue_gym ON sending_queue (gym_id);

COMMIT;
