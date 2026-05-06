-- Migration 005: Add custom_id to members

BEGIN;

ALTER TABLE members ADD COLUMN custom_id VARCHAR(50);
CREATE UNIQUE INDEX idx_members_custom_id ON members (custom_id) WHERE custom_id IS NOT NULL;

COMMIT;
