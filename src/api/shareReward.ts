import { authenticateRequest } from './auth';
import type { Env } from './env';

interface ShareRewardRequest {
  resultId?: string;
  refId?: string;
}

interface ReferralRecord {
  fromEmail?: string;
  resultId?: string;
}

const MAX_SHARE_CREDITS = 1;

export async function handleShareReward(request: Request, env: Env): Promise<Response> {
  try {
    const authenticated = await authenticateRequest(request, env);
    if (!authenticated) {
      return json({ error: 'Create an account or log in to earn share rewards' }, 401);
    }

    const { resultId, refId } = await request.json<ShareRewardRequest>();
    if (!resultId || !refId || !/^[a-z0-9_-]{1,64}$/i.test(resultId) || !/^[a-z0-9_-]{1,64}$/i.test(refId)) {
      return json({ error: 'A valid result and share link are required' }, 400);
    }

    const [resultJson, referralJson] = await Promise.all([
      env.KV.get(`verdict:${resultId}`),
      env.KV.get(`referral_${refId}`)
    ]);
    if (!resultJson) return json({ error: 'Assessment result not found' }, 404);
    if (!referralJson) return json({ error: 'Share link not found' }, 404);

    const referral = JSON.parse(referralJson) as ReferralRecord;
    if (referral.fromEmail !== authenticated.email) {
      return json({ error: 'This share link belongs to another account' }, 403);
    }
    if (referral.resultId !== resultId) {
      return json({ error: 'This share link does not match the assessment result' }, 400);
    }

    const rewardKey = `share_reward:${authenticated.email}:${resultId}`;
    if (await env.KV.get(rewardKey)) {
      return json({
        rewarded: false,
        reason: 'already_rewarded',
        shareCredits: authenticated.user.shareCredits || 0,
        message: 'This result has already earned a free assessment.'
      });
    }

    const currentCredits = authenticated.user.shareCredits || 0;
    if (currentCredits >= MAX_SHARE_CREDITS) {
      return json({
        rewarded: false,
        reason: 'limit_reached',
        shareCredits: MAX_SHARE_CREDITS,
        message: 'You have unlocked your one free share bonus.'
      });
    }

    authenticated.user.shareCredits = currentCredits + 1;
    await Promise.all([
      env.KV.put(`user_${authenticated.email}`, JSON.stringify(authenticated.user)),
      env.KV.put(rewardKey, JSON.stringify({
        resultId,
        refId,
        rewardedAt: new Date().toISOString()
      }))
    ]);

    return json({
      rewarded: true,
      shareCredits: authenticated.user.shareCredits,
      totalFreeAssessments: 1 + authenticated.user.shareCredits,
      message: 'Your next free assessment is unlocked.'
    });
  } catch (error) {
    console.error('Share reward error:', error);
    return json({ error: 'Failed to unlock the share reward' }, 500);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
