-- Fresh Supabase: you already have users, transfer_sessions, files (empty).
-- Skip 001 (legacy user_contacts). Skip 003 (migration from old contacts).
-- Run this once in Supabase SQL Editor, then set SPRING_JPA_HIBERNATE_DDL_AUTO=validate on Render.

-- 002: transfer history (receiver on logged-in receive)
ALTER TABLE transfer_sessions
  ADD COLUMN IF NOT EXISTS receiver_user_id UUID REFERENCES users (id);

CREATE INDEX IF NOT EXISTS idx_transfer_sessions_receiver_user_id
  ON transfer_sessions (receiver_user_id, created_at DESC);

-- Current network model (user-centric contacts + devices)
CREATE TABLE IF NOT EXISTS user_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    nickname VARCHAR(80) NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_contacts_owner_user UNIQUE (owner_user_id, contact_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_contacts_owner ON user_contacts (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact_user ON user_contacts (contact_user_id);

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    device_name VARCHAR(80) NOT NULL,
    pairing_code VARCHAR(8) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (user_id);
CREATE INDEX IF NOT EXISTS idx_devices_pairing_code ON devices (pairing_code);
