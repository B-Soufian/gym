-- ============================================
-- Lakhlifi Gym v9.0
-- Migration 002: Enable Row-Level Security
-- CdC Reference: §2.2
-- ============================================

BEGIN;

-- ============================================
-- Enable RLS on all tenant-sensitive tables
-- ============================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sending_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Force RLS even for table owners
-- (Critical: without this, the app user might bypass RLS)
-- ============================================
ALTER TABLE members FORCE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE sending_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies: STAFF sees own gym, SUPER_ADMIN sees all
-- ============================================

-- members
CREATE POLICY gym_isolation_members ON members
    USING (
        gym_id = current_setting('app.current_gym_id', TRUE)::INT
        OR current_setting('app.current_role', TRUE) = 'SUPER_ADMIN'
    );

-- payments
CREATE POLICY gym_isolation_payments ON payments
    USING (
        gym_id = current_setting('app.current_gym_id', TRUE)::INT
        OR current_setting('app.current_role', TRUE) = 'SUPER_ADMIN'
    );

-- subscriptions
CREATE POLICY gym_isolation_subscriptions ON subscriptions
    USING (
        gym_id = current_setting('app.current_gym_id', TRUE)::INT
        OR current_setting('app.current_role', TRUE) = 'SUPER_ADMIN'
    );

-- users (STAFF sees only users from same gym, SUPER_ADMIN sees all)
CREATE POLICY gym_isolation_users ON users
    USING (
        gym_id = current_setting('app.current_gym_id', TRUE)::INT
        OR gym_id IS NULL  -- SUPER_ADMIN accounts have NULL gym_id
        OR current_setting('app.current_role', TRUE) = 'SUPER_ADMIN'
    );

-- sending_queue
CREATE POLICY gym_isolation_queue ON sending_queue
    USING (
        gym_id = current_setting('app.current_gym_id', TRUE)::INT
        OR current_setting('app.current_role', TRUE) = 'SUPER_ADMIN'
    );

-- audit_logs (STAFF sees own gym logs, SUPER_ADMIN sees all)
CREATE POLICY gym_isolation_audit ON audit_logs
    USING (
        gym_id = current_setting('app.current_gym_id', TRUE)::INT
        OR current_setting('app.current_role', TRUE) = 'SUPER_ADMIN'
    );

-- ============================================
-- INSERT policies (ensure data goes to correct gym)
-- ============================================
CREATE POLICY insert_members ON members
    FOR INSERT WITH CHECK (
        gym_id = current_setting('app.current_gym_id', TRUE)::INT
        OR current_setting('app.current_role', TRUE) = 'SUPER_ADMIN'
    );

CREATE POLICY insert_payments ON payments
    FOR INSERT WITH CHECK (
        gym_id = current_setting('app.current_gym_id', TRUE)::INT
        OR current_setting('app.current_role', TRUE) = 'SUPER_ADMIN'
    );

CREATE POLICY insert_queue ON sending_queue
    FOR INSERT WITH CHECK (
        gym_id = current_setting('app.current_gym_id', TRUE)::INT
        OR current_setting('app.current_role', TRUE) = 'SUPER_ADMIN'
    );

-- audit_logs: allow insert for any authenticated user (logging is universal)
CREATE POLICY insert_audit ON audit_logs
    FOR INSERT WITH CHECK (TRUE);

COMMIT;
