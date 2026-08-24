import type { Env } from './env';

const RESULT_CLAIM_TTL_SECONDS = 86400 * 90;
const RESULT_CLAIM_CONSUMED_TTL_SECONDS = 86400;
const RESULT_CLAIM_TOKEN = /^[0-9a-f]{64}$/;
const resultClaimKey = (resultId: string) => `verdict_claim_${resultId}`;

function randomHex(bytes: number): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function claimDigest(resultId: string, token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${resultId}:${token}`)
  );
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

/**
 * Issue an opaque ownership-claim capability for an anonymous verdict.
 * The raw token is returned only to the requesting browser; KV stores only a
 * result-bound SHA-256 digest. Public result/video identifiers are therefore
 * insufficient to establish account ownership.
 */
export async function issueResultClaimToken(env: Env, resultId: string): Promise<string> {
  const token = randomHex(32);
  await env.KV.put(
    resultClaimKey(resultId),
    await claimDigest(resultId, token),
    { expirationTtl: RESULT_CLAIM_TTL_SECONDS }
  );
  return token;
}

export async function verifyResultClaimToken(
  env: Env,
  resultId: string,
  token: string | undefined
): Promise<boolean> {
  if (!token || !RESULT_CLAIM_TOKEN.test(token)) return false;
  const expected = await env.KV.get(resultClaimKey(resultId));
  if (!expected || !/^[0-9a-f]{64}$/.test(expected)) return false;
  return constantTimeEqual(await claimDigest(resultId, token), expected);
}

/**
 * Retire the capability before the authoritative verdict is copied into the
 * account-owned namespace. Overwriting the digest with a non-secret consumed
 * marker avoids leaving a reusable token while remaining compatible with the
 * minimal KV emulators used by the deterministic test suite.
 */
export async function retireResultClaimToken(env: Env, resultId: string): Promise<void> {
  await env.KV.put(
    resultClaimKey(resultId),
    'consumed',
    { expirationTtl: RESULT_CLAIM_CONSUMED_TTL_SECONDS }
  );
}
