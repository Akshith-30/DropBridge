-- Run once in Supabase SQL Editor when using SPRING_JPA_HIBERNATE_DDL_AUTO=validate
CREATE TABLE IF NOT EXISTS user_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL,
    contact_device_id VARCHAR(64) NOT NULL,
    nickname VARCHAR(80) NOT NULL,
    pairing_code VARCHAR(8) NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_contacts_owner_device UNIQUE (owner_user_id, contact_device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_contacts_owner ON user_contacts (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_device ON user_contacts (contact_device_id);
