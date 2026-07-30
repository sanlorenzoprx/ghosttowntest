import { UserData } from '../types/auth';
import { generateRandomId } from '../lib/utils';
import { authenticateRequest } from './auth';
import type { Env } from './env';

interface ReferralRecord {
  fromEmail: string;
  createdAt: string;
  resultId?: string;
  claimedAt?: string;
  claimedBy?: string;
}

interface ReferralCreateRequest {
  resultId?: string;
}

/**
 * GET /api/referral/claim?ref=<refId>
 * Claims a referral bonus (grants +1 free test)
 */
export async function handleReferralClaim(request: Request, env: Env, refParam: string) {
  try {
    if (!refParam) {
      return new Response(
        JSON.stringify({ error: 'Missing ref parameter' }),
        { status: 400 }
      );
    }

    const claimant = await authenticateRequest(request, env);
    if (!claimant) {
      return new Response(JSON.stringify({ error: 'Log in or sign up to claim this referral' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const refKey = `referral_${refParam}`;
    const referralJson = await env.KV.get(refKey);
    if (!referralJson) {
      return new Response(JSON.stringify({ error: 'Referral not found' }), { status: 404 });
    }
    const referral = JSON.parse(referralJson) as ReferralRecord;
    const fromEmail = referral.fromEmail;

    if (fromEmail === claimant.email) {
      return new Response(JSON.stringify({ error: 'You cannot claim your own referral' }), { status: 400 });
    }

    // Get referrer user
    const fromUserJSON = await env.KV.get(`user_${fromEmail}`);
    if (!fromUserJSON) {
      return new Response(
        JSON.stringify({ error: 'Referrer not found' }),
        { status: 404 }
      );
    }

    const fromUser = JSON.parse(fromUserJSON) as UserData;

    if (referral.claimedAt) {
      // Already claimed, return success but don't increment again
      return new Response(
        JSON.stringify({ 
          message: 'Referral already claimed',
          sharesReceived: fromUser.sharesReceived
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    fromUser.sharesReceived = (fromUser.sharesReceived || 0) + 1;
    await env.KV.put(`user_${fromEmail}`, JSON.stringify(fromUser));

    referral.claimedAt = new Date().toISOString();
    referral.claimedBy = claimant.email;
    await env.KV.put(refKey, JSON.stringify(referral));

    return new Response(
      JSON.stringify({
        message: 'Referral claimed successfully',
        bonus: '+1 free test granted to referrer',
        sharesReceived: fromUser.sharesReceived
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Referral claim error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to claim referral' }),
      { status: 500 }
    );
  }
}

/**
 * POST /api/referral/create
 * Creates a new referral link for the user
 */
export async function handleReferralCreate(request: Request, env: Env) {
  try {
    const authenticated = await authenticateRequest(request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: 'Log in to create a referral link' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { resultId } = await request.json<ReferralCreateRequest>().catch((): ReferralCreateRequest => ({}));
    if (!resultId || !/^[a-z0-9_-]{1,64}$/i.test(resultId)) {
      return new Response(JSON.stringify({ error: 'A completed assessment is required to create a share link' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!await env.KV.get(`verdict:${resultId}`)) {
      return new Response(JSON.stringify({ error: 'Assessment result not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const refId = generateRandomId(16);
    await env.KV.put(`referral_${refId}`, JSON.stringify({
      fromEmail: authenticated.email,
      resultId,
      createdAt: new Date().toISOString()
    } satisfies ReferralRecord), { expirationTtl: 86400 * 30 });

    authenticated.user.sharesGiven = (authenticated.user.sharesGiven || 0) + 1;
    await env.KV.put(`user_${authenticated.email}`, JSON.stringify(authenticated.user));

    const frontendOrigin = env.FRONTEND_URL?.replace(/\/$/, '')
      || request.headers.get('Origin')
      || new URL(request.url).origin;
    const link = `${frontendOrigin}/?ref=${refId}`;

    return new Response(
      JSON.stringify({
        refId,
        link
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Referral create error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create referral link' }),
      { status: 500 }
    );
  }
}
