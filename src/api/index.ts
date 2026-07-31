import { handleSignup, handleLogin, handleVerify } from './auth';
import { handleAnalyticsEvent } from './analytics';
import { handleCheckout } from './checkout';
import { handleStripeWebhook } from './webhook';
import { handleReferralClaim, handleReferralCreate } from './referral';
import { handleShareReward } from './shareReward';
import verdictHandler from './verdict';
import { handlePaidTestCheckout, handlePaidTestOrders, handlePaidTestPdf, handlePaidTestPlan, handlePaidTestPlanPdf, handlePaidTestReport } from './paidTest';
import {
  handleLaunchBlueprint,
  handleLaunchBlueprintJson,
  handleLaunchBlueprintPdf,
  handleLaunchBlueprintProgress,
  handleLaunchBlueprintRetry
} from './blueprintApi';
import { handleBlueprintSeeds, handleBlueprintSeedSuggestions } from './blueprintSeeds';
import { handleInternalGoogleSearch } from './internalGoogleSearch';
import type { Env } from './env';
import { handleResultHistory, handleSaveCurrentResult, handleSavedResult } from './resultHistory';
import {
  handleNextPublicVideoJob,
  handlePublicVideo,
  handlePublicVideoFailure,
  handlePublicVideoStatus,
  handlePublicVideoUpload
} from './publicVideoJobs';

/**
 * Main Cloudflare Workers fetch handler.
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
    if (method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
      if (path === '/api/integrations/shorts-factory/health' && method === 'GET') {
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'ghosttowntest',
          contract_version: 'lit-verdict-v1',
          verdict_endpoint: '/api/verdict',
          authentication: env.LIT_API_KEY?.trim() ? 'bearer_required' : 'not_configured',
          evaluation: { primary: 'cloudflare_workers_ai', fallback: 'deterministic', provenance_recorded: true },
          live_publishing_enabled: false
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (path === '/api/integrations/shorts-factory/video-jobs/next' && method === 'GET') {
        const response = await handleNextPublicVideoJob(request, env);
        applyCors(response, corsHeaders);
        return response;
      }
      const videoUploadMatch = path.match(/^\/api\/integrations\/shorts-factory\/video-jobs\/([a-zA-Z0-9_-]+)\/video$/);
      if (videoUploadMatch && method === 'PUT') {
        const response = await handlePublicVideoUpload(request, env, videoUploadMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const videoFailureMatch = path.match(/^\/api\/integrations\/shorts-factory\/video-jobs\/([a-zA-Z0-9_-]+)\/fail$/);
      if (videoFailureMatch && method === 'POST') {
        const response = await handlePublicVideoFailure(request, env, videoFailureMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const videoStatusMatch = path.match(/^\/api\/videos\/([a-zA-Z0-9_-]+)\/status$/);
      if (videoStatusMatch && method === 'GET') {
        const response = await handlePublicVideoStatus(env, videoStatusMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const publicVideoMatch = path.match(/^\/api\/videos\/([a-zA-Z0-9_-]+)\.mp4$/);
      if (publicVideoMatch && method === 'GET') {
        const response = await handlePublicVideo(env, publicVideoMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }

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
      if (path === '/api/internal/google-search' && (method === 'GET' || method === 'POST')) {
        const response = await handleInternalGoogleSearch(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      if (path === '/api/checkout' && method === 'POST') {
        const response = await handleCheckout(request, env);
        applyCors(response, corsHeaders);
        return response;
      }
      if (path === '/api/paid-test/orders' && method === 'GET') {
        const response = await handlePaidTestOrders(request, env);
        applyCors(response, corsHeaders);
        return response;
      }
      if (path === '/api/paid-test/checkout' && method === 'POST') {
        const response = await handlePaidTestCheckout(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      const seedSuggestionsMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint\/seeds\/suggest$/);
      if (seedSuggestionsMatch && method === 'POST') {
        const response = await handleBlueprintSeedSuggestions(request, env, seedSuggestionsMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const seedsMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint\/seeds$/);
      if (seedsMatch && (method === 'GET' || method === 'POST')) {
        const response = await handleBlueprintSeeds(request, env, seedsMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const blueprintJsonMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint\.json$/);
      if (blueprintJsonMatch && method === 'GET') {
        const response = await handleLaunchBlueprintJson(request, env, blueprintJsonMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const blueprintPdfMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint\.pdf$/);
      if (blueprintPdfMatch && method === 'GET') {
        const response = await handleLaunchBlueprintPdf(request, env, blueprintPdfMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const blueprintProgressMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint\/progress$/);
      if (blueprintProgressMatch && (method === 'GET' || method === 'POST')) {
        const response = await handleLaunchBlueprintProgress(request, env, blueprintProgressMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const blueprintRetryMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint\/retry$/);
      if (blueprintRetryMatch && method === 'POST') {
        const response = await handleLaunchBlueprintRetry(request, env, blueprintRetryMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const blueprintMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint$/);
      if (blueprintMatch && method === 'GET') {
        const response = await handleLaunchBlueprint(request, env, blueprintMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }

      if (path === '/api/analytics/events' && method === 'POST') {
        const response = await handleAnalyticsEvent(request, env);
        applyCors(response, corsHeaders);
        return response;
      }
      const paidReportMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/report$/);
      if (paidReportMatch && method === 'GET') {
        const response = await handlePaidTestReport(request, env, paidReportMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const paidPlanMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/plan$/);
      if (paidPlanMatch && method === 'GET') {
        const response = await handlePaidTestPlan(request, env, paidPlanMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const paidPdfMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/report\.pdf$/);
      if (paidPdfMatch && method === 'GET') {
        const response = await handlePaidTestPdf(request, env, paidPdfMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const paidPlanPdfMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/plan\.pdf$/);
      if (paidPlanPdfMatch && method === 'GET') {
        const response = await handlePaidTestPlanPdf(request, env, paidPlanPdfMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }

      if (path === '/api/webhook/stripe' && method === 'POST') {
        const response = await handleStripeWebhook(request, env);
        applyCors(response, corsHeaders);
        return response;
      }
      if (path.startsWith('/api/referral/claim') && method === 'GET') {
        const response = await handleReferralClaim(request, env, url.searchParams.get('ref') || '');
        applyCors(response, corsHeaders);
        return response;
      }
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

      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

const LOCAL_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5300',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5300'
]);

function getAllowedOrigin(request: Request, env: Env): string | undefined {
  const origin = request.headers.get('Origin');
  if (!origin) return undefined;
  if (LOCAL_ORIGINS.has(origin) || origin === env.FRONTEND_URL?.replace(/\/$/, '')) return origin;
  try {
    const hostname = new URL(origin).hostname;
    if (
      hostname === 'ghosttowntest.com'
      || hostname === 'www.ghosttowntest.com'
      || hostname === 'app.ghosttowntest.com'
      || hostname === 'lit-ghosttown.app'
      || hostname === 'www.lit-ghosttown.app'
      || hostname.endsWith('.ghosttowntest.pages.dev')
    ) return origin;
  } catch {
    return undefined;
  }
  return undefined;
}

function applyCors(response: Response, headers: Record<string, string>): void {
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  response.headers.append('Vary', 'Origin');
}
