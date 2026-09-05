/**
 * API base URL for production when the static site and Render API differ.
 * Leave unset in local dev — Vite proxies /api to the API service.
 */
const raw = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '') ?? '';

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return raw ? `${raw}${normalized}` : normalized;
}
