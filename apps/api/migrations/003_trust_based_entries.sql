DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'name') THEN
    ALTER TABLE participants ALTER COLUMN name DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'access_token') THEN
    ALTER TABLE participants ALTER COLUMN access_token DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'token_expires_at') THEN
    ALTER TABLE participants ALTER COLUMN token_expires_at DROP NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS participants_username_key
  ON participants (LOWER(username));
