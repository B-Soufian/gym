-- ============================================
-- Lakhlifi Gym v9.0
-- Migration 004: Seed Development Data
-- ============================================

BEGIN;

-- Temporarily set RLS context for seeding using set_config
SELECT set_config('app.current_role', 'SUPER_ADMIN', true);
SELECT set_config('app.current_gym_id', '0', true);
SELECT set_config('app.current_user_id', '1', true);
SELECT set_config('app.current_username', 'admin', true);

-- ============================================
-- 1. Create default gyms
-- ============================================
INSERT INTO gyms (name, address, phone, email) VALUES
    ('GYM VISION Central', '123 Rue Principale, Casablanca', '+212600000001', 'central@gymvision.ma'),
    ('GYM VISION Est', '45 Avenue Hassan II, Rabat', '+212600000002', 'est@gymvision.ma');

-- ============================================
-- 2. Create SUPER_ADMIN (password: Admin@2025)
-- bcrypt hash for 'Admin@2025' with cost 12
-- ============================================
INSERT INTO users (username, password_hash, role, gym_id) VALUES
    ('admin', '$2b$12$LJ3m4ys3GZ8r/FKZH.F5/.KvGMXx7LD7fVqEq1k5pGvVQ8f.xJHaW', 'SUPER_ADMIN', NULL);

-- ============================================
-- 3. Create STAFF users (password: Staff@2025)
-- ============================================
INSERT INTO users (username, password_hash, role, gym_id) VALUES
    ('ahmed_central', '$2b$12$LJ3m4ys3GZ8r/FKZH.F5/.KvGMXx7LD7fVqEq1k5pGvVQ8f.xJHaW', 'STAFF', 1),
    ('sara_est', '$2b$12$LJ3m4ys3GZ8r/FKZH.F5/.KvGMXx7LD7fVqEq1k5pGvVQ8f.xJHaW', 'STAFF', 2);

-- ============================================
-- 4. Create subscription plans
-- ============================================
INSERT INTO subscriptions (name, duration_days, price, gym_id) VALUES
    -- Gym 1
    ('Mensuel', 30, 300.00, 1),
    ('Trimestriel', 90, 800.00, 1),
    ('Semestriel', 180, 1400.00, 1),
    ('Annuel', 365, 2500.00, 1),
    -- Gym 2
    ('Mensuel', 30, 250.00, 2),
    ('Trimestriel', 90, 700.00, 2),
    ('Annuel', 365, 2200.00, 2);

-- ============================================
-- 5. Create sample members
-- ============================================
SELECT set_config('app.current_gym_id', '1', true);

INSERT INTO members (first_name, last_name, phone, gender, gym_id, status, subscription_start, subscription_end) VALUES
    ('Youssef', 'El Amrani', '+212611111111', 'MALE', 1, 'ACTIVE', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days'),
    ('Fatima', 'Benali', '+212622222222', 'FEMALE', 1, 'ACTIVE', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days'),
    ('Karim', 'Tazi', '+212633333333', 'MALE', 1, 'FROZEN', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days'),
    ('Amina', 'Idrissi', '+212644444444', 'FEMALE', 1, 'EXPIRED', CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '5 days'),
    ('Omar', 'Saadi', '+212655555555', 'MALE', 1, 'ACTIVE', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '28 days');

-- Update frozen member's freeze fields
UPDATE members SET
    frozen_since = CURRENT_DATE - INTERVAL '3 days',
    frozen_until = CURRENT_DATE + INTERVAL '7 days',
    frozen_days_used = 0
WHERE first_name = 'Karim' AND last_name = 'Tazi';

SELECT set_config('app.current_gym_id', '2', true);

INSERT INTO members (first_name, last_name, phone, gender, gym_id, status, subscription_start, subscription_end) VALUES
    ('Hassan', 'Moussaoui', '+212666666666', 'MALE', 2, 'ACTIVE', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '10 days'),
    ('Leila', 'Alaoui', '+212677777777', 'FEMALE', 2, 'ACTIVE', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days');

-- ============================================
-- 6. Create sample payments
-- ============================================
SELECT set_config('app.current_gym_id', '1', true);

INSERT INTO payments (member_id, gym_id, subscription_id, amount, payment_method, date_start, date_end, staff_id, staff_username_snapshot) VALUES
    (1, 1, 1, 300.00, 'CASH', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 2, 'ahmed_central'),
    (2, 1, 1, 300.00, 'CARD', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 2, 'ahmed_central'),
    (3, 1, 2, 800.00, 'CASH', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '85 days', 2, 'ahmed_central'),
    (5, 1, 1, 300.00, 'TRANSFER', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '28 days', 2, 'ahmed_central');

SELECT set_config('app.current_gym_id', '2', true);

INSERT INTO payments (member_id, gym_id, subscription_id, amount, payment_method, date_start, date_end, staff_id, staff_username_snapshot) VALUES
    (6, 2, 5, 250.00, 'CASH', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '10 days', 3, 'sara_est'),
    (7, 2, 5, 250.00, 'CASH', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 3, 'sara_est');

COMMIT;
