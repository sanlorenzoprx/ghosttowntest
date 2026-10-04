import type { Env } from './env';
import { blake3 } from '@noble/hashes/blake3.js';

interface CloudflareTokenEnvelope {
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  expiresAt: string;
}

interface CloudflareOAuthState {
  orderId: string;
  ownerId: string;
  redirectUri: string;
  createdAt: string;
}

const CF_API = 'https://api.cloudflare.com/client/v4';
const CF_AUTH = 'https://dash.cloudflare.com/oauth2/auth';
const CF_TOKEN = 'https://dash.cloudflare.com/oauth2/token';
const tokenKey = (orderId: string) => `get_me_live_cf_token_${orderId}`;
const stateKey = (state: string) => `get_me_live_cf_oauth_state_${state}`;

export async function loadCloudflareAuthorizationState(env: Env, state: string): Promise<CloudflareOAuthState | null> {
  if (!state) return null;
  const raw = await env.KV.get(stateKey(state));
  return raw ? JSON.parse(raw) as CloudflareOAuthState : null;
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is not configured`);
  return normalized;
}

/**
 * OAuth scopes GhostTown requests (plan §9). GhostTown no longer searches for or
 * buys domains, so Registrar scopes are never requested, even if the configured
 * list still names them. Existing connections keep their original grants until
 * the customer reconnects.
 */
export function cloudflareOAuthScopes(configured: string | undefined): string[] {
  const legacyAliases: Record<string, string> = {
    'account:read': 'account.read',
    'page.write': 'pages.write',
    'pages:write': 'pages.write',
    'zone:read': 'zone.read',
    'dns_records:edit': 'dns.write',
    'dns_records:write': 'dns.write'
  };
  const scopes = required(configured, 'CLOUDFLARE_OAUTH_SCOPES')
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .filter(scope => !/registrar/i.test(scope))
    .map(scope => legacyAliases[scope.toLowerCase()] || scope);
  return [...new Set(scopes)];
}

function cfScopes(env: Env): string[] {
  return cloudflareOAuthScopes(env.CLOUDFLARE_OAUTH_SCOPES);
}
export async function createCloudflareAuthorizationUrl(
  env: Env,
  input: { orderId: string; ownerId: string; redirectUri: string }
): Promise<string> {
  const clientId = required(env.CLOUDFLARE_OAUTH_CLIENT_ID, 'CLOUDFLARE_OAUTH_CLIENT_ID');
  const state = crypto.randomUUID();
  const payload: CloudflareOAuthState = {
    orderId: input.orderId,
    ownerId: input.ownerId,
    redirectUri: input.redirectUri,
    createdAt: new Date().toISOString()
  };
  await env.KV.put(stateKey(state), JSON.stringify(payload), { expirationTtl: 600 });
  const url = new URL(CF_AUTH);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', cfScopes(env).join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

export async function completeCloudflareAuthorization(
  env: Env,
  input: { code: string; state: string }
): Promise<CloudflareOAuthState> {
  const state = await loadCloudflareAuthorizationState(env, input.state);
  if (!state) throw new Error('Cloudflare connection expired or is invalid');
  const clientId = required(env.CLOUDFLARE_OAUTH_CLIENT_ID, 'CLOUDFLARE_OAUTH_CLIENT_ID');
  const clientSecret = required(env.CLOUDFLARE_OAUTH_CLIENT_SECRET, 'CLOUDFLARE_OAUTH_CLIENT_SECRET');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: state.redirectUri
  });
  const response = await fetch(CF_TOKEN, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });
  const token = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !token.access_token) {
    throw new Error(token.error_description || token.error || 'Cloudflare authorization failed');
  }
  const envelope: CloudflareTokenEnvelope = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    scope: token.scope,
    expiresAt: new Date(Date.now() + Math.max(60, token.expires_in || 3600) * 1000).toISOString()
  };
  await env.KV.put(tokenKey(state.orderId), JSON.stringify(envelope), { expirationTtl: 86400 * 30 });
  await env.KV.delete(stateKey(input.state));
  return state;
}

async function cloudflareAccessToken(env: Env, orderId: string): Promise<string> {
  const raw = await env.KV.get(tokenKey(orderId));
  if (!raw) throw new Error('Connect Cloudflare before continuing');
  let token = JSON.parse(raw) as CloudflareTokenEnvelope;
  if (new Date(token.expiresAt).getTime() > Date.now() + 60_000) return token.accessToken;
  if (!token.refreshToken) throw new Error('Cloudflare authorization expired; reconnect Cloudflare');

  const clientId = required(env.CLOUDFLARE_OAUTH_CLIENT_ID, 'CLOUDFLARE_OAUTH_CLIENT_ID');
  const clientSecret = required(env.CLOUDFLARE_OAUTH_CLIENT_SECRET, 'CLOUDFLARE_OAUTH_CLIENT_SECRET');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refreshToken });
  const response = await fetch(CF_TOKEN, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });
  const refreshed = await response.json() as { access_token?: string; refresh_token?: string; scope?: string; expires_in?: number };
  if (!response.ok || !refreshed.access_token) throw new Error('Cloudflare authorization must be renewed');
  token = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || token.refreshToken,
    scope: refreshed.scope || token.scope,
    expiresAt: new Date(Date.now() + Math.max(60, refreshed.expires_in || 3600) * 1000).toISOString()
  };
  await env.KV.put(tokenKey(orderId), JSON.stringify(token), { expirationTtl: 86400 * 30 });
  return token.accessToken;
}
async function cloudflareApi<T>(
  env: Env,
  orderId: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await cloudflareAccessToken(env, orderId);
  const response = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers || {})
    }
  });
  const body = await response.json() as { success?: boolean; result?: T; errors?: Array<{ message?: string }> };
  if (!response.ok || body.success === false) {
    throw new Error(body.errors?.map(item => item.message).filter(Boolean).join('; ') || `Cloudflare request failed (${response.status})`);
  }
  return (body.result ?? body) as T;
}

export async function disconnectCloudflareAuthorization(env: Env, orderId: string): Promise<void> {
  await env.KV.delete(tokenKey(orderId));
}

export async function listCloudflareAccounts(env: Env, orderId: string): Promise<Array<{ id: string; name: string }>> {
  const memberships = await cloudflareApi<Array<{ account?: { id?: string; name?: string } }>>(
    env,
    orderId,
    '/memberships?per_page=50'
  );
  const accounts = memberships
    .map(membership => membership.account)
    .filter((account): account is { id: string; name?: string } => Boolean(account?.id))
    .map(account => ({ id: account.id, name: account.name?.trim() || account.id }));
  return [...new Map(accounts.map(account => [account.id, account])).values()];
}

function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  const size = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += size) {
    output += String.fromCharCode(...bytes.subarray(offset, offset + size));
  }
  return btoa(output);
}

function pagesAssetHash(path: string, bytes: Uint8Array): string {
  // Match Wrangler's Pages Direct Upload content-addressing contract:
  // BLAKE3(base64(file bytes) + file extension), first 32 hex characters.
  const filename = path.split('/').pop() || path;
  const dot = filename.lastIndexOf('.');
  const extension = dot >= 0 ? filename.slice(dot + 1) : '';
  const input = new TextEncoder().encode(`${bytesToBase64(bytes)}${extension}`);
  const digest = blake3(input);
  return Array.from(digest, (byte: number) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
export interface PagesProject {
  name: string;
  /** Provider-assigned production host, e.g. "proof-path-4xz.pages.dev". */
  subdomain: string;
}

function pagesSubdomainFrom(value: unknown): string | null {
  const host = String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.pages\.dev$/.test(host) ? host : null;
}

/** Reads a Pages project. Returns null only when Cloudflare reports it does not exist. */
export async function getPagesProject(
  env: Env,
  orderId: string,
  accountId: string,
  projectName: string
): Promise<PagesProject | null> {
  const token = await cloudflareAccessToken(env, orderId);
  const url = `${CF_API}/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) {
    await response.body?.cancel();
    return null;
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudflare Pages project lookup failed (${response.status}): ${body.slice(0, 240)}`);
  }
  const payload = await response.json() as { result?: { name?: string; subdomain?: string } };
  const subdomain = pagesSubdomainFrom(payload.result?.subdomain);
  // Cloudflare can assign a subdomain that differs from the project name without
  // reporting an error, so the provider value is mandatory; never derive it.
  if (!subdomain) throw new Error(`Cloudflare did not return the Pages address for project ${projectName}`);
  return { name: payload.result?.name || projectName, subdomain };
}

/**
 * Creates a Pages project. Returns null when Cloudflare reports the name is
 * already taken (in this account or globally), so the caller can try the next name.
 */
export async function createPagesProject(
  env: Env,
  orderId: string,
  accountId: string,
  projectName: string
): Promise<PagesProject | null> {
  const token = await cloudflareAccessToken(env, orderId);
  const response = await fetch(`${CF_API}/accounts/${encodeURIComponent(accountId)}/pages/projects`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: projectName, production_branch: 'main' })
  });
  const payload = await response.json().catch(() => ({})) as { success?: boolean; result?: { name?: string; subdomain?: string }; errors?: Array<{ message?: string }> };
  const message = payload.errors?.map(item => item.message).filter(Boolean).join('; ') || '';
  if (response.status === 409 || /already (exists|taken|in use)/i.test(message)) return null;
  if (!response.ok || payload.success === false) throw new Error(message || `Cloudflare Pages project creation failed (${response.status})`);
  const subdomain = pagesSubdomainFrom(payload.result?.subdomain);
  if (subdomain) return { name: payload.result?.name || projectName, subdomain };
  const reread = await getPagesProject(env, orderId, accountId, payload.result?.name || projectName);
  if (!reread) throw new Error(`Cloudflare Pages project ${projectName} was not found after creation`);
  return reread;
}

/** Reads a project this order already owns, recreating it under the same name if it was deleted. */
export async function ensurePagesProject(
  env: Env,
  orderId: string,
  accountId: string,
  projectName: string
): Promise<PagesProject> {
  const existing = await getPagesProject(env, orderId, accountId, projectName);
  if (existing) return existing;
  const created = await createPagesProject(env, orderId, accountId, projectName);
  if (!created) throw new Error(`The Cloudflare Pages project ${projectName} is no longer available`);
  return created;
}

async function pagesUploadJwt(
  env: Env,
  orderId: string,
  accountId: string,
  projectName: string
): Promise<string> {
  const result = await cloudflareApi<{ jwt: string }>(
    env,
    orderId,
    `/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/upload-token`
  );
  if (!result.jwt) throw new Error('Cloudflare Pages upload token was not returned');
  return result.jwt;
}
async function pagesAssetRequest<T>(jwt: string, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${CF_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json() as { success?: boolean; result?: T; errors?: Array<{ message?: string }> };
  if (!response.ok || payload.success === false) {
    throw new Error(payload.errors?.map(item => item.message).filter(Boolean).join('; ') || `Cloudflare Pages asset request failed (${response.status})`);
  }
  return (payload.result ?? payload) as T;
}

export async function deployCloudflarePagesHtml(
  env: Env,
  orderId: string,
  accountId: string,
  projectName: string,
  html: string,
  files: Array<{ path: string; contentType: string; bytes: ArrayBuffer }> = []
): Promise<{ deploymentId: string; deploymentUrl?: string }> {
  // The caller resolves (and persists) the Pages project before deploying.
  const jwt = await pagesUploadJwt(env, orderId, accountId, projectName);
  // Pages Direct Upload manifests use URL-rooted paths and Wrangler-compatible
  // BLAKE3 asset hashes. The manifest and asset registry must use the same
  // path/hash pair or Pages can accept a deployment that cannot serve its root.
  const deployFiles = [
    { path: '/index.html', contentType: 'text/html; charset=utf-8', bytes: new TextEncoder().encode(html) as Uint8Array },
    ...files.map(file => ({ ...file, path: `/${file.path.replace(/^\/+/, '')}`, bytes: new Uint8Array(file.bytes) }))
  ];
  const hashed = deployFiles.map(file => ({ ...file, hash: pagesAssetHash(file.path, file.bytes) }));
  const missing = await pagesAssetRequest<string[]>(jwt, '/pages/assets/check-missing', { hashes: [...new Set(hashed.map(file => file.hash))] });
  if (missing.length) {
    await pagesAssetRequest(jwt, '/pages/assets/upload', hashed.filter(file => missing.includes(file.hash)).map(file => ({
      key: file.hash,
      value: bytesToBase64(file.bytes),
      base64: true,
      metadata: { contentType: file.contentType }
    })));
  }
  await pagesAssetRequest(jwt, '/pages/assets/upsert-hashes', { hashes: [...new Set(hashed.map(file => file.hash))] });
  const token = await cloudflareAccessToken(env, orderId);
  const form = new FormData();
  form.set('manifest', JSON.stringify(Object.fromEntries(hashed.map(file => [file.path, file.hash]))));
  form.set('branch', 'main');
  form.set('commit_dirty', 'false');
  form.set('commit_message', `GhostTown Get Me Live ${orderId}`);
  const response = await fetch(
    `${CF_API}/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/deployments`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  const payload = await response.json() as {
    success?: boolean;
    result?: { id?: string; url?: string; aliases?: string[] };
    errors?: Array<{ message?: string }>;
  };
  if (!response.ok || payload.success === false || !payload.result?.id) {
    throw new Error(payload.errors?.map(item => item.message).filter(Boolean).join('; ') || 'Cloudflare Pages deployment failed');
  }
  // `result.url` is the immutable per-deployment hash URL. It is evidence only;
  // the customer address is the project's provider-returned `subdomain`.
  const deploymentUrl = String(payload.result.url || '').trim() || undefined;
  return { deploymentId: payload.result.id, deploymentUrl };
}

export async function addCloudflarePagesDomain(
  env: Env,
  orderId: string,
  accountId: string,
  projectName: string,
  domain: string
): Promise<{ name: string; status?: string }> {
  return cloudflareApi<{ name: string; status?: string }>(
    env,
    orderId,
    `/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains`,
    { method: 'POST', body: JSON.stringify({ name: domain.trim().toLowerCase() }) }
  );
}
export interface CloudflareZone { id: string; name: string; status: string; }

/** Zones in the connected account (read-only), optionally only the one with this name. */
export async function listCloudflareZones(env: Env, orderId: string, accountId: string, name?: string): Promise<CloudflareZone[]> {
  const params = new URLSearchParams({ 'account.id': accountId, per_page: '50' });
  if (name) params.set('name', name.trim().toLowerCase());
  const zones = await cloudflareApi<Array<{ id?: string; name?: string; status?: string }>>(env, orderId, `/zones?${params}`);
  return zones
    .filter((zone): zone is { id: string; name: string; status?: string } => Boolean(zone.id && zone.name))
    .map(zone => ({ id: zone.id, name: zone.name.toLowerCase(), status: zone.status || 'unknown' }));
}

/** One zone by id, only if it belongs to this account (read-only). */
export async function getCloudflareZone(env: Env, orderId: string, accountId: string, zoneId: string): Promise<CloudflareZone | null> {
  const token = await cloudflareAccessToken(env, orderId);
  const response = await fetch(`${CF_API}/zones/${encodeURIComponent(zoneId)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404 || response.status === 403) { await response.body?.cancel(); return null; }
  const payload = await response.json().catch(() => ({})) as { success?: boolean; result?: { id?: string; name?: string; status?: string; account?: { id?: string } }; errors?: Array<{ message?: string }> };
  if (!response.ok || payload.success === false) {
    throw new Error(payload.errors?.map(item => item.message).filter(Boolean).join('; ') || `Cloudflare zone lookup failed (${response.status})`);
  }
  const zone = payload.result;
  if (!zone?.id || !zone.name || zone.account?.id !== accountId) return null;
  return { id: zone.id, name: zone.name.toLowerCase(), status: zone.status || 'unknown' };
}

/** DNS records with exactly this name in the zone (read-only). */
export async function listCloudflareDnsRecords(
  env: Env, orderId: string, zoneId: string, name: string
): Promise<Array<{ id: string; type: string; name: string; comment?: string }>> {
  const params = new URLSearchParams({ name: name.trim().toLowerCase(), per_page: '50' });
  const records = await cloudflareApi<Array<{ id?: string; type?: string; name?: string; comment?: string | null }>>(env, orderId, `/zones/${encodeURIComponent(zoneId)}/dns_records?${params}`);
  return records.map(record => ({ id: String(record.id || ''), type: String(record.type || ''), name: String(record.name || '').toLowerCase(), comment: record.comment || undefined }));
}

export const GHOSTTOWN_DNS_COMMENT = 'GhostTown Get Me Live';

/** Removes only the records GhostTown created for this host (matched by comment). */
export async function deleteGhostTownDnsRecords(env: Env, orderId: string, zoneId: string, name: string): Promise<void> {
  const records = await listCloudflareDnsRecords(env, orderId, zoneId, name);
  for (const record of records.filter(item => item.id && item.comment === GHOSTTOWN_DNS_COMMENT)) {
    await cloudflareApi<unknown>(env, orderId, `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(record.id)}`, { method: 'DELETE' });
  }
}

/**
 * Points a host at the Pages project (proxied CNAME; Cloudflare flattens it at
 * the apex). A Pages custom domain added through the API stays pending until
 * this record exists.
 */
export async function createCloudflareDnsCname(env: Env, orderId: string, zoneId: string, name: string, target: string): Promise<void> {
  await cloudflareApi<unknown>(env, orderId, `/zones/${encodeURIComponent(zoneId)}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({ type: 'CNAME', name: name.trim().toLowerCase(), content: target.trim().toLowerCase(), proxied: true, ttl: 1, comment: GHOSTTOWN_DNS_COMMENT })
  });
}

/** Custom domains attached to a Pages project (read-only). */
export async function listCloudflarePagesDomains(
  env: Env, orderId: string, accountId: string, projectName: string
): Promise<Array<{ name: string; status?: string }>> {
  const domains = await cloudflareApi<Array<{ name?: string; status?: string }>>(
    env, orderId, `/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains`
  );
  return domains.filter(domain => domain.name).map(domain => ({ name: String(domain.name).toLowerCase(), status: domain.status }));
}

/** One Pages custom domain's provider status, or null when it is not attached. */
export async function getCloudflarePagesDomain(
  env: Env, orderId: string, accountId: string, projectName: string, name: string
): Promise<{ name: string; status?: string } | null> {
  const token = await cloudflareAccessToken(env, orderId);
  const url = `${CF_API}/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains/${encodeURIComponent(name.trim().toLowerCase())}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) { await response.body?.cancel(); return null; }
  const payload = await response.json().catch(() => ({})) as { success?: boolean; result?: { name?: string; status?: string }; errors?: Array<{ message?: string }> };
  if (!response.ok || payload.success === false) {
    throw new Error(payload.errors?.map(item => item.message).filter(Boolean).join('; ') || `Cloudflare domain lookup failed (${response.status})`);
  }
  return { name: String(payload.result?.name || name).toLowerCase(), status: payload.result?.status };
}

/** Detaches a Pages custom domain. Already-detached is success. */
export async function deleteCloudflarePagesDomain(
  env: Env, orderId: string, accountId: string, projectName: string, name: string
): Promise<void> {
  const token = await cloudflareAccessToken(env, orderId);
  const url = `${CF_API}/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains/${encodeURIComponent(name.trim().toLowerCase())}`;
  const response = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) { await response.body?.cancel(); return; }
  const payload = await response.json().catch(() => ({})) as { success?: boolean; errors?: Array<{ message?: string }> };
  if (!response.ok || payload.success === false) {
    throw new Error(payload.errors?.map(item => item.message).filter(Boolean).join('; ') || `Cloudflare domain removal failed (${response.status})`);
  }
}

export async function findCloudflareZone(
  env: Env,
  orderId: string,
  accountId: string,
  domain: string
): Promise<{ id: string; name: string } | null> {
  const params = new URLSearchParams({ name: domain.trim().toLowerCase(), 'account.id': accountId, per_page: '20' });
  const zones = await cloudflareApi<Array<{ id: string; name: string }>>(env, orderId, `/zones?${params}`);
  return zones[0] || null;
}

export async function ensureCloudflareEmailDestination(
  env: Env,
  orderId: string,
  accountId: string,
  destinationEmail: string
): Promise<{ id?: string; email?: string; verified?: string | null }> {
  const addresses = await cloudflareApi<Array<{ id?: string; email?: string; verified?: string | null }>>(
    env,
    orderId,
    `/accounts/${encodeURIComponent(accountId)}/email/routing/addresses?per_page=100`
  );
  const normalized = destinationEmail.trim().toLowerCase();
  const existing = addresses.find(item => item.email?.trim().toLowerCase() === normalized);
  if (existing) return existing;
  return cloudflareApi(env, orderId, `/accounts/${encodeURIComponent(accountId)}/email/routing/addresses`, {
    method: 'POST',
    body: JSON.stringify({ email: normalized })
  });
}

export async function configureCloudflareEmailRouting(
  env: Env,
  orderId: string,
  input: { accountId: string; zoneId: string; domain: string; localPart: string; destinationEmail: string }
): Promise<{ businessEmail: string; verified: boolean }> {
  const destination = await ensureCloudflareEmailDestination(env, orderId, input.accountId, input.destinationEmail);
  if (!destination.verified) return { businessEmail: `${input.localPart}@${input.domain}`, verified: false };
  try {
    await cloudflareApi(env, orderId, `/zones/${encodeURIComponent(input.zoneId)}/email/routing/dns`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (!message.includes('already') && !message.includes('enabled')) throw error;
  }
  const businessEmail = `${input.localPart.trim().toLowerCase()}@${input.domain.trim().toLowerCase()}`;
  const existing = await cloudflareApi<Array<{
    id?: string;
    enabled?: boolean;
    matchers?: Array<{ type?: string; field?: string; value?: string }>;
  }>>(env, orderId, `/zones/${encodeURIComponent(input.zoneId)}/email/routing/rules?per_page=100`);
  const current = existing.find(rule => rule.matchers?.some(matcher => matcher.field === 'to' && matcher.value?.toLowerCase() === businessEmail));
  if (!current) {
    await cloudflareApi(env, orderId, `/zones/${encodeURIComponent(input.zoneId)}/email/routing/rules`, {
      method: 'POST',
      body: JSON.stringify({
        name: `GhostTown ${businessEmail}`,
        enabled: true,
        matchers: [{ type: 'literal', field: 'to', value: businessEmail }],
        actions: [{ type: 'forward', value: [input.destinationEmail.trim().toLowerCase()] }]
      })
    });
  }
  return { businessEmail, verified: true };
}
interface StripeConnectedAccount {
  id: string;
  details_submitted?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  configuration?: {
    merchant?: {
      capabilities?: {
        card_payments?: { status?: string };
        stripe_balance?: { payouts?: { status?: string } };
      };
    };
  };
}

async function stripeForm<T>(
  env: Env,
  path: string,
  fields: URLSearchParams,
  connectedAccountId?: string
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(connectedAccountId ? { 'Stripe-Account': connectedAccountId } : {})
    },
    body: fields.toString()
  });
  const body = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || `Stripe request failed (${response.status})`);
  return body;
}

export async function createStripeConnectedMerchant(
  env: Env,
  input: { email: string; country?: string }
): Promise<StripeConnectedAccount> {
  const response = await fetch('https://api.stripe.com/v2/core/accounts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      'Stripe-Version': '2026-07-29.dahlia'
    },
    body: JSON.stringify({
      contact_email: input.email.trim().toLowerCase(),
      display_name: input.email.split('@')[0].slice(0, 120),
      dashboard: 'full',
      identity: { country: (input.country || 'US').toLowerCase() },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      defaults: {
        currency: 'usd',
        responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
        locales: ['en-US']
      },
      include: ['configuration.merchant', 'identity', 'requirements']
    })
  });
  const account = await response.json() as StripeConnectedAccount & { error?: { message?: string } };
  if (!response.ok || !account.id) throw new Error(account.error?.message || 'Payment account could not be created');
  return account;
}
export async function retrieveStripeConnectedMerchant(
  env: Env,
  accountId: string
): Promise<StripeConnectedAccount> {
  const query = new URLSearchParams();
  query.append('include[]', 'configuration.merchant');
  query.append('include[]', 'requirements');
  const response = await fetch(`https://api.stripe.com/v2/core/accounts/${encodeURIComponent(accountId)}?${query}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Stripe-Version': '2026-07-29.dahlia' }
  });
  const body = await response.json() as StripeConnectedAccount & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || 'Stripe connected account could not be loaded');
  return body;
}

export async function createStripeOnboardingLink(
  env: Env,
  input: { accountId: string; returnUrl: string; refreshUrl: string }
): Promise<string> {
  const result = await stripeForm<{ url: string }>(env, '/account_links', new URLSearchParams({
    account: input.accountId,
    type: 'account_onboarding',
    return_url: input.returnUrl,
    refresh_url: input.refreshUrl,
    'collection_options[fields]': 'eventually_due'
  }));
  return result.url;
}

function amountCents(value: string): number {
  const normalized = value.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('Add a valid offer price before enabling customer payments');
  return Math.round(parsed * 100);
}

export async function createConnectedCheckoutSession(
  env: Env,
  input: {
    accountId: string;
    productName: string;
    price: string;
    successUrl: string;
    cancelUrl: string;
    getMeLiveOrderId: string;
    sourceSprintOrderId: string;
  }
): Promise<{ id: string; url: string }> {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const random = crypto.getRandomValues(new Uint8Array(8));
  const integrationIdentifier = `ghosttown_gml_${Array.from(random, value => alphabet[value % alphabet.length]).join('')}`;
  const fields = new URLSearchParams({
    mode: 'payment',
    integration_identifier: integrationIdentifier,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(amountCents(input.price)),
    'line_items[0][price_data][product_data][name]': input.productName.trim().slice(0, 120),
    'line_items[0][quantity]': '1',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    'metadata[get_me_live_experiment_order_id]': input.getMeLiveOrderId,
    'metadata[source_sprint_order_id]': input.sourceSprintOrderId,
    'metadata[evidence_event_type]': 'payment'
  });
  return stripeForm<{ id: string; url: string }>(env, '/checkout/sessions', fields, input.accountId);
}
