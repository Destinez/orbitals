ALTER TABLE participants ADD COLUMN IF NOT EXISTS wallet_address TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS participants_wallet_address_key
  ON participants (wallet_address)
  WHERE wallet_address IS NOT NULL;
