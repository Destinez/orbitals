export class ParticipantStore {
  constructor(pool) {
    this.pool = pool;
  }

  async get(id) {
    const { rows } = await this.pool.query(`
      SELECT id, username, wallet_address, quote_url, created_at, updated_at
      FROM participants WHERE id = $1
    `, [id]);
    return rows[0] ? participantFromRow(rows[0]) : null;
  }

  async create(participant) {
    const { rows } = await this.pool.query(`
      INSERT INTO participants (id, username, wallet_address, quote_url, created_at, updated_at)
      VALUES ($1, $2, $3, NULL, $4, $4)
      RETURNING id, username, wallet_address, quote_url, created_at, updated_at
    `, [participant.id, participant.username, participant.walletAddress, participant.createdAt]);
    return participantFromRow(rows[0]);
  }

  async getCampaign() {
    const { rows } = await this.pool.query(`
      SELECT post_url, account_url FROM campaign_settings WHERE id = 1
    `);
    return rows[0]
      ? { postUrl: rows[0].post_url, accountUrl: rows[0].account_url }
      : null;
  }

  async saveCampaign({ postUrl, accountUrl }) {
    const { rows } = await this.pool.query(`
      INSERT INTO campaign_settings (id, post_url, account_url, updated_at)
      VALUES (1, COALESCE($1, ''), COALESCE($2, 'https://x.com/orbitals_nft'), NOW())
      ON CONFLICT (id) DO UPDATE SET
        post_url = COALESCE($1, campaign_settings.post_url),
        account_url = COALESCE($2, campaign_settings.account_url),
        updated_at = NOW()
      RETURNING post_url, account_url
    `, [postUrl ?? null, accountUrl ?? null]);
    return { postUrl: rows[0].post_url, accountUrl: rows[0].account_url };
  }

  async saveQuote(id, quoteUrl, updatedAt) {
    const { rows } = await this.pool.query(`
      UPDATE participants SET quote_url = $2, updated_at = $3
      WHERE id = $1
      RETURNING id, username, wallet_address, quote_url, created_at, updated_at
    `, [id, quoteUrl, updatedAt]);
    return participantFromRow(rows[0]);
  }
}

function participantFromRow(row) {
  return {
    id: row.id,
    username: row.username,
    walletAddress: row.wallet_address,
    quoteUrl: row.quote_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
