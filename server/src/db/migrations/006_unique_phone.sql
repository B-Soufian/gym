-- Migration 006: Make phone unique and ensure custom_id is also handled
BEGIN;

-- Add unique constraint to phone if not already there
-- We check for existence first to avoid errors
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_phone_key') THEN
        ALTER TABLE members ADD CONSTRAINT members_phone_key UNIQUE (phone);
    END IF;
END $$;

COMMIT;
