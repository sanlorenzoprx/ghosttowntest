/**
 * First 30 email list (rollout phase 1).
 *
 * POST /api/first30/waitlist  public: { email, consent: true, source, verdictId?, locale? }
 * GET  /api/internal/first30-waitlist  owner-only export (INTERNAL_RESEARCH_OWNER_EMAILS)
 * GET  /api/first30/unsubscribe?id&t   confirm page; POST unsubscribes (also RFC 8058 one-click)
 * GET  /api/internal/first30-email-preview  owner-only preview of the "First 30 is open" email
 *
 * Entries live in KV under one key per normalized email, so a repeat signup is
 * idempotent and the response never reveals whether an address was already on
 * the list. The consent text stored is the server's copy, never the client's.
 */
import type { Env } from './env';
import { GHOSTTOWN_FIRST_30_WAITLIST_V1 } from '../lib/ghosttownOffer';
import { consumeHourlyRateLimit } from './runtimeControls';
import { requireOwner } from './commercialMetrics';
import { renderFirst30OpensEmail } from '../lib/first30Email';
import { LEGAL_POLICY } from '../lib/businessPolicy';

export const FIRST_30_WAITLIST_KEY_PREFIX = 'waitlist:first30:';
const SIGNUPS_PER_IP_PER_HOUR = 5;
const MAX_BODY_BYTES = 4096;
const SOURCES = new Set(['verdict', 'landing']);

export interface First30WaitlistEntry {
  schemaVersion: 'ghosttown-first30-waitlist-v1';
  offerId: string;
  email: string;
  source: 'verdict' | 'landing';
  verdictId?: string;
  locale: 'en' | 'es';
  consentText: string;
  createdAt: string;
  updatedAt: string;
  unsubscribedAt?: string;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', ...headers }
  });
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function signupBudget(request: Request, env: Env): Promise<{ allowed: boolean; retryAfter: number }> {
  if (!env.DB) return { allowed: true, retryAfter: 0 };
  const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
  try {
    const state = await consumeHourlyRateLimit(env, `first30_waitlist:${(await sha256Hex(ip)).slice(0, 24)}`, SIGNUPS_PER_IP_PER_HOUR);
    return { allowed: state.allowed, retryAfter: state.retryAfter };
  } catch (error) {
    console.warn('First 30 waitlist rate-limit check failed open', error);
    return { allowed: true, retryAfter: 0 };
  }
}

export async function handleFirst30WaitlistJoin(request: Request, env: Env): Promise<Response> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: 'Request body must be a JSON object' }, 400);

  const email = normalizeEmail(body.email);
  if (!validEmail(email)) return json({ error: 'Enter a valid email address.' }, 400);
  if (body.consent !== true) return json({ error: 'Please confirm that GhostTown may email you about First 30.' }, 400);

  const budget = await signupBudget(request, env);
  if (!budget.allowed) {
    return json({ error: 'Too many signups from this connection. Try again later.' }, 429, { 'Retry-After': String(budget.retryAfter) });
  }

  const source = typeof body.source === 'string' && SOURCES.has(body.source) ? body.source as First30WaitlistEntry['source'] : 'verdict';
  const verdictId = typeof body.verdictId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(body.verdictId) ? body.verdictId : undefined;
  const locale = typeof body.locale === 'string' && body.locale.toLowerCase().startsWith('es') ? 'es' : 'en';
  const key = `${FIRST_30_WAITLIST_KEY_PREFIX}${await sha256Hex(email)}`;
  const now = new Date().toISOString();

  let existing: First30WaitlistEntry | null = null;
  const stored = await env.KV.get(key);
  if (stored) {
    try {
      existing = JSON.parse(stored) as First30WaitlistEntry;
    } catch {
      existing = null;
    }
  }

  const firstVerdictId = existing?.verdictId ?? verdictId;
  // The entry is rebuilt without unsubscribedAt: signing up again with fresh
  // consent clears an earlier unsubscribe.
  const entry: First30WaitlistEntry = {
    schemaVersion: 'ghosttown-first30-waitlist-v1',
    offerId: GHOSTTOWN_FIRST_30_WAITLIST_V1.offerId,
    email,
    source: existing?.source ?? source,
    ...(firstVerdictId ? { verdictId: firstVerdictId } : {}),
    locale,
    consentText: locale === 'es' ? GHOSTTOWN_FIRST_30_WAITLIST_V1.es.consentText : GHOSTTOWN_FIRST_30_WAITLIST_V1.consentText,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  await env.KV.put(key, JSON.stringify(entry), { metadata: { createdAt: entry.createdAt, source: entry.source } });
  console.log(JSON.stringify({ event: 'first30_waitlist_join', source: entry.source, repeat: Boolean(existing), hasVerdict: Boolean(entry.verdictId) }));

  return json({ status: 'joined', list: GHOSTTOWN_FIRST_30_WAITLIST_V1.listId }, existing ? 200 : 201);
}

function unsubscribeSecret(env: Env): string {
  const secret = env.FIRST30_UNSUBSCRIBE_SECRET?.trim() || env.JWT_SECRET;
  if (!secret) throw new Error('No secret configured for First 30 unsubscribe links');
  return secret;
}

async function unsubscribeToken(env: Env, id: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(unsubscribeSecret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`first30-unsubscribe:${id}`));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

/** The signed link that removes one address from the list. */
export async function first30UnsubscribeUrl(env: Env, apiOrigin: string, email: string): Promise<string> {
  const id = await sha256Hex(normalizeEmail(email));
  const url = new URL('/api/first30/unsubscribe', apiOrigin);
  url.searchParams.set('id', id);
  url.searchParams.set('t', await unsubscribeToken(env, id));
  return url.toString();
}

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f6f3ed;font-family:Arial,Helvetica,sans-serif;color:#17201c;"><main style="max-width:520px;margin:48px auto;padding:28px;background:#fff;border-radius:12px;line-height:1.6;">${body}
<p style="margin-top:24px;font-size:13px;color:#5b625e;">GhostTown · <a href="mailto:${LEGAL_POLICY.supportEmail}">${LEGAL_POLICY.supportEmail}</a></p></main></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
}

export async function handleFirst30Unsubscribe(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const token = url.searchParams.get('t') || '';
  const valid = /^[a-f0-9]{64}$/.test(id) && /^[a-f0-9]{64}$/.test(token) && timingSafeEqual(token, await unsubscribeToken(env, id));
  if (!valid) {
    return page('Link not valid', `<h1 style="font-size:24px;">This link is not valid</h1><p>To leave the First 30 list, email <a href="mailto:${LEGAL_POLICY.supportEmail}?subject=unsubscribe">${LEGAL_POLICY.supportEmail}</a> with "unsubscribe" in the subject.</p>`, 400);
  }

  // GET only shows a button, so link scanners that open every URL in an email
  // cannot unsubscribe anyone. Mail apps use the one-click POST (RFC 8058).
  if (request.method === 'GET') {
    const action = `/api/first30/unsubscribe?id=${id}&t=${token}`;
    return page('Unsubscribe', `<h1 style="font-size:24px;">Leave the First 30 list?</h1><p>You will stop getting First 30 emails.</p><form method="post" action="${action}"><button type="submit" style="background:#b5451b;color:#fff;border:0;padding:12px 20px;border-radius:6px;font-weight:bold;font-size:16px;cursor:pointer;">Unsubscribe</button></form>`);
  }

  const key = `${FIRST_30_WAITLIST_KEY_PREFIX}${id}`;
  const stored = await env.KV.get(key);
  if (stored) {
    try {
      const entry = JSON.parse(stored) as First30WaitlistEntry;
      if (!entry.unsubscribedAt) {
        const now = new Date().toISOString();
        await env.KV.put(key, JSON.stringify({ ...entry, unsubscribedAt: now, updatedAt: now }), { metadata: { createdAt: entry.createdAt, source: entry.source, unsubscribed: true } });
        console.log(JSON.stringify({ event: 'first30_waitlist_unsubscribe' }));
      }
    } catch (error) {
      console.error('First 30 unsubscribe could not read the list entry', error);
    }
  }
  return page('Unsubscribed', '<h1 style="font-size:24px;">You are unsubscribed</h1><p>You will not get any more First 30 emails. If you change your mind, you can join again from your GhostTown verdict.</p>');
}

export async function handleFirst30EmailPreview(request: Request, env: Env): Promise<Response> {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;
  const url = new URL(request.url);
  const locale = url.searchParams.get('locale') === 'es' ? 'es' : 'en';
  const email = renderFirst30OpensEmail({
    locale,
    unsubscribeUrl: await first30UnsubscribeUrl(env, url.origin, owner.email),
    first30Url: (env.FRONTEND_URL?.trim() || 'https://ghosttownverdict.com').replace(/\/$/, '')
  });
  if (url.searchParams.get('format') === 'json') return json(email);
  return new Response(email.html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } });
}

export async function handleFirst30WaitlistExport(request: Request, env: Env): Promise<Response> {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;

  const entries: First30WaitlistEntry[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.KV.list({ prefix: FIRST_30_WAITLIST_KEY_PREFIX, cursor });
    const values = await Promise.all(page.keys.map(item => env.KV.get(item.name)));
    for (const value of values) {
      if (!value) continue;
      try {
        entries.push(JSON.parse(value) as First30WaitlistEntry);
      } catch {
        // A malformed entry is skipped rather than failing the whole export.
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // Only people who are still subscribed are exported, each with the signed
  // unsubscribe link that every email to them must carry.
  const apiOrigin = new URL(request.url).origin;
  const subscribed = entries.filter(entry => !entry.unsubscribedAt);
  const withLinks = await Promise.all(subscribed.map(async entry => ({
    ...entry,
    unsubscribeUrl: await first30UnsubscribeUrl(env, apiOrigin, entry.email)
  })));
  return json({
    list: GHOSTTOWN_FIRST_30_WAITLIST_V1.listId,
    count: withLinks.length,
    unsubscribedCount: entries.length - subscribed.length,
    postalAddress: LEGAL_POLICY.mailingAddress,
    entries: withLinks
  });
}
