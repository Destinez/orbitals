DROP INDEX IF EXISTS participants_verified_at_idx;

ALTER TABLE participants
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS profile_image_url,
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token,
  DROP COLUMN IF EXISTS token_expires_at,
  DROP COLUMN IF EXISTS quote_post_id,
  DROP COLUMN IF EXISTS tasks,
  DROP COLUMN IF EXISTS verified_at;
