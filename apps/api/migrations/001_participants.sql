CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  profile_image_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at BIGINT NOT NULL,
  quote_url TEXT,
  quote_post_id TEXT,
  tasks JSONB NOT NULL DEFAULT '{"like":false,"repost":false,"quote":false,"follow":false}'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
