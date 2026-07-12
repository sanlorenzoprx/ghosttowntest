import { handleSignup, handleLogin, handleVerify } from './auth';
import { handleCheckout } from './checkout';
import { handleStripeWebhook } from './webhook';
import { handleReferralClaim, handleReferralCreate } from './referral';
import { handleShareReward } from './shareReward';
import verdictHandler from './verdict';
import { handlePaidTestCheckout, handlePaidTestPdf, handlePaidTestReport } from './paidTest';
import type { Env } from './env';
import { handleResultHistory, handleSaveCurrentResult, handleSavedResult } from './resultHistory';

/**
 * Main Cloudflare Workers fetch handler
 * Routes requests to appropriate handlers
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log(`${method} ${path}`);

    const allowedOrigin = getAllowedOrigin(request, env);
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    if (allowedOrigin) corsHeaders['Access-Control-Allow-Origin'] = allowedOrigin;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Verdict endpoint
      if ((path === '/api/verdict' || path === '/api/lit-verdict') && method === 'POST') {
        const response = await verdictHandler(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      if (path === '/api/results' && method === 'GET') {
        const response = await handleResultHistory(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      if (path === '/api/results' && method === 'POST') {
        const response = await handleSaveCurrentResult(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      const savedResultMatch = path.match(/^\/api\/results\/([^/]+)$/);
      if (savedResultMatch && method === 'GET') {
        const response = await handleSavedResult(request, env, savedResultMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }

      // Auth endpoints
      if (path === '/api/auth/signup' && method === 'POST') {
        const response = await handleSignup(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      if (path === '/api/auth/login' && method === 'POST') {
        const response = await handleLogin(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      if (path === '/api/auth/verify' && method === 'POST') {
        const response = await handleVerify(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      // Stripe checkout
      if (path === '/api/checkout' && method === 'POST') {
        const response = await handleCheckout(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      if (path === '/api/paid-test/checkout' && method === 'POST') {
        const response = await handlePaidTestCheckout(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      const paidReportMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/report$/);
      if (paidReportMatch && method === 'GET') {
        const response = await handlePaidTestReport(request, env, paidReportMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const paidPdfMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/report\.pdf$/);
      if (paidPdfMatch && method === 'GET') {
        const response = await handlePaidTestPdf(request, env, paidPdfMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }

      // Stripe webhook
      if (path === '/api/webhook/stripe' && method === 'POST') {
        const response = await handleStripeWebhook(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      // Referral claim
      if (path.startsWith('/api/referral/claim') && method === 'GET') {
        const refParam = url.searchParams.get('ref');
        const response = await handleReferralClaim(request, env, refParam || '');
        applyCors(response, corsHeaders);
        return response;
      }

      // Referral create
      if (path === '/api/referral/create' && method === 'POST') {
        const response = await handleReferralCreate(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      if (path === '/api/share/reward' && method === 'POST') {
        const response = await handleShareReward(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      // 404
      return new Response(
        JSON.stringify({ error: 'Endpoint not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
};

const LOCAL_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
]);

function getAllowedOrigin(request: Request, env: Env): string | undefined {
  const origin = request.headers.get('Origin');
  if (!origin) return undefined;
  if (LOCAL_ORIGINS.has(origin) || origin === env.FRONTEND_URL?.replace(/\/$/, '')) return origin;
  try {
    const hostname = new URL(origin).hostname;
    if (hostname === 'lit-ghosttown.app' || hostname === 'www.lit-ghosttown.app' || hostname.endsWith('.ghosttowntest.pages.dev')) {
      return origin;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function applyCors(response: Response, headers: Record<string, string>): void {
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  response.headers.append('Vary', 'Origin');
}
