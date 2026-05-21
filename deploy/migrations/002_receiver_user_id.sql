-- Run on Supabase when using ddl-auto=validate (optional if you already deployed with update once).
ALTER TABLE transfer_sessions
  ADD COLUMN IF NOT EXISTS receiver_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_transfer_sessions_receiver_user_id
  ON transfer_sessions (receiver_user_id, created_at DESC);
