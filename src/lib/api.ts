const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, '')
  : '';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('lit_user_token_v1');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
