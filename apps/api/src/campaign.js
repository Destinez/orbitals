/** True when the URL is a real X status (numeric id), not a placeholder. */
export function isPostLive(url) {
  return Boolean(parsePostUrl(url));
}

export function parsePostUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname.toLowerCase())) {
      return null;
    }
    const match = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)\/?$/);
    if (!match) return null;
    return `https://x.com/${match[1]}/status/${match[2]}`;
  } catch {
    return null;
  }
}

export function campaignPayload(row, config) {
  const postUrl = row?.postUrl || config.campaignPostUrl || '';
  const accountUrl = row?.accountUrl || config.orbitalsAccountUrl || 'https://x.com/orbitals_nft';
  return {
    postUrl,
    accountUrl,
    postLive: isPostLive(postUrl),
  };
}
