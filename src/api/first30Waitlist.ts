/**
 * First 30 email list (rollout phase 1).
 *
 * POST /api/first30/waitlist  public: { email, consent: true, source, verdictId?, locale? }
 * GET  /api/internal/first30-waitlist  owner-only export (INTERNAL_RESEARCH_OWNER_EMAILS)
 *
 * Entries live in KV under one key per normalized email, so a repeat signup is
 * idempotent and the response never reveals whether an address was already on
 * the list. The consent text stored is the server's copy, never the client's.
 */
import type { Env } from './env';
import { GHOSTTOWN_FIRST_30_WAITLIST_V1 } from '../lib/ghosttownOffer';
import { consumeHourlyRateLimit } from './runtimeControls';
import { requireOwner } from './commercialMetrics';

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
  return json({ list: GHOSTTOWN_FIRST_30_WAITLIST_V1.listId, count: entries.length, entries });
}
