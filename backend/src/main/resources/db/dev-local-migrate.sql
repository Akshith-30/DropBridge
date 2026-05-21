-- Dev-only patch after Hibernate ddl-auto:update (account + devices model).
-- Statements separated by @@ (see application-dev.yml) so PostgreSQL DO blocks work.

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL,
    device_name VARCHAR(80) NOT NULL,
    pairing_code VARCHAR(8) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP
)
@@
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (user_id)
@@
CREATE INDEX IF NOT EXISTS idx_devices_pairing_code ON devices (pairing_code)
@@
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'user_contacts'
          AND column_name = 'contact_device_id'
    ) THEN
        ALTER TABLE user_contacts ADD COLUMN IF NOT EXISTS contact_user_id UUID;

        UPDATE user_contacts uc
        SET contact_user_id = d.user_id
        FROM devices d
        WHERE uc.contact_user_id IS NULL
          AND uc.contact_device_id = d.id;

        DELETE FROM user_contacts WHERE contact_user_id IS NULL;

        ALTER TABLE user_contacts DROP CONSTRAINT IF EXISTS uq_user_contacts_owner_device;
        ALTER TABLE user_contacts DROP COLUMN IF EXISTS contact_device_id;
        ALTER TABLE user_contacts DROP COLUMN IF EXISTS pairing_code;

        ALTER TABLE user_contacts ALTER COLUMN contact_user_id SET NOT NULL;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_contacts_owner_user'
        ) THEN
            ALTER TABLE user_contacts
                ADD CONSTRAINT uq_user_contacts_owner_user UNIQUE (owner_user_id, contact_user_id);
        END IF;

        DROP INDEX IF EXISTS idx_user_contacts_device;
        CREATE INDEX IF NOT EXISTS idx_user_contacts_contact_user ON user_contacts (contact_user_id);
    END IF;
END $$;
