-- ============================================
-- Lakhlifi Gym v9.0
-- Migration 003: Create Triggers
-- CdC Reference: §8.2
-- ============================================

BEGIN;

-- ============================================
-- Auto-update updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to gyms
CREATE TRIGGER trg_gyms_updated_at
    BEFORE UPDATE ON gyms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to members
CREATE TRIGGER trg_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Audit trigger for members table
-- CdC §8.2: Automatic audit even if app forgets
-- ============================================
CREATE OR REPLACE FUNCTION log_member_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INT;
    v_username VARCHAR(80);
    v_action VARCHAR(50);
BEGIN
    -- Get current user context (set by middleware)
    BEGIN
        v_user_id := current_setting('app.current_user_id', TRUE)::INT;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    BEGIN
        v_username := current_setting('app.current_username', TRUE);
    EXCEPTION WHEN OTHERS THEN
        v_username := 'SYSTEM';
    END;

    -- Map TG_OP to our action_type
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
    ELSIF TG_OP = 'UPDATE' THEN
        -- Detect specific transitions
        IF OLD.status = 'ACTIVE' AND NEW.status = 'FROZEN' THEN
            v_action := 'FREEZE';
        ELSIF OLD.status = 'FROZEN' AND NEW.status = 'ACTIVE' THEN
            v_action := 'UNFREEZE';
        ELSIF NEW.status = 'DELETED' AND OLD.status != 'DELETED' THEN
            v_action := 'DELETE';
        ELSE
            v_action := 'UPDATE';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
    END IF;

    INSERT INTO audit_logs (
        user_id, username_snapshot, gym_id,
        action_type, target_table, target_id,
        old_value, new_value, created_at
    ) VALUES (
        v_user_id,
        COALESCE(v_username, 'SYSTEM'),
        COALESCE(NEW.gym_id, OLD.gym_id),
        v_action,
        'members',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_members_audit
    AFTER INSERT OR UPDATE OR DELETE ON members
    FOR EACH ROW EXECUTE FUNCTION log_member_changes();

-- ============================================
-- Audit trigger for payments table
-- ============================================
CREATE OR REPLACE FUNCTION log_payment_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INT;
    v_username VARCHAR(80);
BEGIN
    BEGIN
        v_user_id := current_setting('app.current_user_id', TRUE)::INT;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    BEGIN
        v_username := current_setting('app.current_username', TRUE);
    EXCEPTION WHEN OTHERS THEN
        v_username := 'SYSTEM';
    END;

    INSERT INTO audit_logs (
        user_id, username_snapshot, gym_id,
        action_type, target_table, target_id,
        old_value, new_value, created_at
    ) VALUES (
        v_user_id,
        COALESCE(v_username, 'SYSTEM'),
        COALESCE(NEW.gym_id, OLD.gym_id),
        'PAYMENT',
        'payments',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_audit
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_payment_changes();

COMMIT;
