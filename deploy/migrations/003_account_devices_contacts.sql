-- Account-centric contacts + registered devices (run when using ddl-auto=validate)

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

-- Migrate user_contacts from device-centric to user-centric
ALTER TABLE user_contacts ADD COLUMN IF NOT EXISTS contact_user_id UUID;

-- Best-effort backfill: map legacy contact_device_id to user via devices table (empty until devices register)
UPDATE user_contacts uc
SET contact_user_id = d.user_id
FROM devices d
WHERE uc.contact_user_id IS NULL
  AND uc.contact_device_id = d.id;

-- Drop rows that could not be migrated (orphaned device-only contacts)
DELETE FROM user_contacts WHERE contact_user_id IS NULL;

ALTER TABLE user_contacts DROP CONSTRAINT IF EXISTS uq_user_contacts_owner_device;
ALTER TABLE user_contacts DROP COLUMN IF EXISTS contact_device_id;
ALTER TABLE user_contacts DROP COLUMN IF EXISTS pairing_code;

ALTER TABLE user_contacts ALTER COLUMN contact_user_id SET NOT NULL;
ALTER TABLE user_contacts
    ADD CONSTRAINT uq_user_contacts_owner_user UNIQUE (owner_user_id, contact_user_id);

DROP INDEX IF EXISTS idx_user_contacts_device;
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact_user ON user_contacts (contact_user_id);
