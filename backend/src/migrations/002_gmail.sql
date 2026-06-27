-- Gmail integration: OAuth token store (single row)
CREATE TABLE IF NOT EXISTS gmail_settings (
  id             SERIAL PRIMARY KEY,
  gmail_email    TEXT,
  access_token   TEXT,
  refresh_token  TEXT,
  token_expiry   TIMESTAMPTZ,
  history_id     TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Reusable email templates with placeholder support
CREATE TABLE IF NOT EXISTS email_templates (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend interactions with email-specific columns
ALTER TABLE interactions
  ADD COLUMN IF NOT EXISTS gmail_message_id  TEXT,
  ADD COLUMN IF NOT EXISTS email_subject     TEXT,
  ADD COLUMN IF NOT EXISTS email_to          TEXT,
  ADD COLUMN IF NOT EXISTS email_from        TEXT,
  ADD COLUMN IF NOT EXISTS direction         TEXT,
  ADD COLUMN IF NOT EXISTS source            TEXT,
  ADD COLUMN IF NOT EXISTS tracking_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS open_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opened_at         TIMESTAMPTZ;

-- Partial unique index prevents duplicate Gmail message imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_interactions_gmail_message_id
  ON interactions (gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;
