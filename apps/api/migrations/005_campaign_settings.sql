CREATE TABLE IF NOT EXISTS campaign_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  post_url TEXT NOT NULL DEFAULT '',
  account_url TEXT NOT NULL DEFAULT 'https://x.com/orbitals_nft',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO campaign_settings (id, post_url, account_url)
VALUES (1, '', 'https://x.com/orbitals_nft')
ON CONFLICT (id) DO NOTHING;
