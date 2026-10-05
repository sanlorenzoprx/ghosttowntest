const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();

function inferProductionApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return '';
  if (hostname === 'api.ghosttowntest.com' || hostname === 'api.lit-ghosttown.app') return '';
  if (hostname === 'main.ghosttown-acceptance.pages.dev' || hostname.endsWith('.ghosttown-acceptance.pages.dev')) {
    return 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
  }
  if (
    hostname === 'ghosttowntest.com'
    || hostname === 'www.ghosttowntest.com'
    || hostname === 'app.ghosttowntest.com'
    || hostname === 'lit-ghosttown.app'
    || hostname === 'www.lit-ghosttown.app'
    || hostname.endsWith('.pages.dev')
  ) {
    return `${protocol}//api.ghosttowntest.com`;
  }
  return '';
}

export const API_BASE_URL = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, '')
  : inferProductionApiBaseUrl();

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('lit_user_token_v1');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
