import { handleSignup, handleLogin, handleVerify, handleRevokeSessions } from './auth';
import { handleAnalyticsEvent } from './analytics';
import { handleCommercialMetrics } from './commercialMetrics';
import { handleCheckout } from './checkout';
import { handleStripeWebhook } from './webhook';
import { handleReferralClaim, handleReferralCreate } from './referral';
import { handleShareReward } from './shareReward';
import verdictHandler from './verdict';
import { handlePaidTestOrders, handlePaidTestPdf, handlePaidTestPlan, handlePaidTestPlanPdf, handlePaidTestReport } from './paidTest';
import { handlePaidTestCheckout } from './paidTestCheckout';
import {
  handleLaunchBlueprint,
  handleLaunchBlueprintJson,
  handleLaunchBlueprintPdf,
  handleLaunchBlueprintAssets,
  handleLaunchBlueprintUncertainty
} from './blueprintApi';
import { handleLaunchBlueprintProgress, handleLaunchBlueprintRetry } from './blueprintApiMeasurement';
import { handleBlueprintSeeds, handleBlueprintSeedSuggestions } from './blueprintSeeds';
import { handleInternalGoogleSearch } from './internalGoogleSearch';
import { handleResearchPreviewSuggestions } from './researchPreview';
import { handleStoryStudioEvidence } from './evidenceIngestion';
import { handleLaunchSiteOwner, handlePublicLaunchLead, handlePublicLaunchSite } from './launchSite';
import {
  handleGetMeLiveCheckout,
  handleGetMeLiveOrders,
  handleGetMeLiveOrder,
  handleGetMeLiveConfig,
  handleGetMeLiveAssets,
  handleGetMeLiveAssetRead,
  handleGetMeLiveAssetDelete,
  handleGetMeLiveAssetOrder,
  handleGetMeLiveActivity,
  handleGetMeLiveSharePack,
  handleGetMeLiveSprintShareDraft,
  handleGetMeLivePreview,
  handleGetMeLiveCloudflareConnect,
  handleGetMeLiveCloudflareDisconnect,
  handleGetMeLiveCloudflareCallback,
  handleGetMeLiveCloudflareAccounts,
  handleGetMeLiveEmailSetup,
  handleGetMeLiveStripeConnect,
  handleGetMeLiveStripeStatus,
  handleGetMeLivePublish,
  handleGetMeLivePublishStatus,
  handleGetMeLivePublishVerify,
  handleGetMeLiveLeads,
  handleGetMeLiveReleaseReceipt,
  handleGetMeLiveReleaseReceiptBackfill,
  handleGetMeLiveReleases,
  handleGetMeLiveHealth,
  handleGetMeLiveCustomDomainZones,
  handleGetMeLiveCustomDomainConnect,
  handleGetMeLiveCustomDomainReconcile,
  handleGetMeLiveCustomDomainDelete,
  handleGetMeLiveStoryStudioHandoff,
  handlePublicGetMeLiveActivity,
  handlePublicGetMeLiveLead,
  handlePublicGetMeLiveBuy
} from './getMeLive';
import type { Env } from './env';
import { handleResultHistory, handleSaveCurrentResult, handleSavedResult } from './resultHistory';
import {
  handleNextPublicVideoJob,
  handlePublicVideo,
  handlePublicVideoFailure,
  handlePublicVideoStatus,
  handlePublicVideoUpload
} from './publicVideoJobs';

export { LaunchBlueprintWorkflow } from './launchBlueprintWorkflow';

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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

      if (path === '/api/integrations/story-studio/evidence' && method === 'POST') {
        const response = await handleStoryStudioEvidence(request, env);
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
      if (path === '/api/auth/revoke-sessions' && method === 'POST') {
        const response = await handleRevokeSessions(request, env);
        applyCors(response, corsHeaders);
        return response;
      }
      if (path === '/api/internal/google-search' && (method === 'GET' || method === 'POST')) {
        const response = await handleInternalGoogleSearch(request, env);
        applyCors(response, corsHeaders);
        return response;
      }
      if (path === '/api/internal/commercial-metrics' && method === 'GET') {
        const response = await handleCommercialMetrics(request, env);
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
      if (path === '/api/get-me-live/checkout' && method === 'POST') {
        const response = await handleGetMeLiveCheckout(request, env);
        applyCors(response, corsHeaders);
        return response;
      }
      if (path === '/api/get-me-live/orders' && method === 'GET') {
        const response = await handleGetMeLiveOrders(request, env);
        applyCors(response, corsHeaders);
        return response;
      }
      if (path === '/api/get-me-live/cloudflare/callback' && method === 'GET') {
        return handleGetMeLiveCloudflareCallback(request, env);
      }

      if (path === '/api/research-preview/suggestions' && method === 'POST') {
        const response = await handleResearchPreviewSuggestions(request, env);
        applyCors(response, corsHeaders);
        return response;
      }

      const getMeLiveSprintShareMatch = path.match(/^\/api\/get-me-live\/sprints\/([^/]+)\/share-draft$/);
      if (getMeLiveSprintShareMatch && (method === 'GET' || method === 'POST')) { const response = await handleGetMeLiveSprintShareDraft(request, env, decodeURIComponent(getMeLiveSprintShareMatch[1])); applyCors(response, corsHeaders); return response; }
      const getMeLiveOrderMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)$/);
      if (getMeLiveOrderMatch && method === 'GET') {
        const response = await handleGetMeLiveOrder(request, env, decodeURIComponent(getMeLiveOrderMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveConfigMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/config$/);
      if (getMeLiveConfigMatch && (method === 'POST' || method === 'PUT' || method === 'GET')) {
        const response = await handleGetMeLiveConfig(request, env, decodeURIComponent(getMeLiveConfigMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveAssetsMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/assets$/);
      if (getMeLiveAssetsMatch && method === 'POST') { const response = await handleGetMeLiveAssets(request, env, decodeURIComponent(getMeLiveAssetsMatch[1])); applyCors(response, corsHeaders); return response; }
      const getMeLiveAssetOrderMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/assets\/order$/);
      if (getMeLiveAssetOrderMatch && method === 'PUT') { const response = await handleGetMeLiveAssetOrder(request, env, decodeURIComponent(getMeLiveAssetOrderMatch[1])); applyCors(response, corsHeaders); return response; }
      const getMeLiveAssetMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/assets\/([^/]+)$/);
      if (getMeLiveAssetMatch && method === 'GET') { const response = await handleGetMeLiveAssetRead(request, env, decodeURIComponent(getMeLiveAssetMatch[1]), decodeURIComponent(getMeLiveAssetMatch[2])); applyCors(response, corsHeaders); return response; }
      if (getMeLiveAssetMatch && method === 'DELETE') { const response = await handleGetMeLiveAssetDelete(request, env, decodeURIComponent(getMeLiveAssetMatch[1]), decodeURIComponent(getMeLiveAssetMatch[2])); applyCors(response, corsHeaders); return response; }
      const getMeLiveSharePackMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/share-pack$/);
      if (getMeLiveSharePackMatch && (method === 'GET' || method === 'POST')) { const response = await handleGetMeLiveSharePack(request, env, decodeURIComponent(getMeLiveSharePackMatch[1])); applyCors(response, corsHeaders); return response; }
      const getMeLiveActivityMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/activity$/);
      if (getMeLiveActivityMatch && method === 'GET') { const response = await handleGetMeLiveActivity(request, env, decodeURIComponent(getMeLiveActivityMatch[1])); applyCors(response, corsHeaders); return response; }
      const getMeLivePreviewMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/preview$/);
      if (getMeLivePreviewMatch && (method === 'POST' || method === 'GET')) {
        const response = await handleGetMeLivePreview(request, env, decodeURIComponent(getMeLivePreviewMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveCloudflareConnectMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/cloudflare\/connect$/);
      if (getMeLiveCloudflareConnectMatch && method === 'GET') {
        const response = await handleGetMeLiveCloudflareConnect(request, env, decodeURIComponent(getMeLiveCloudflareConnectMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveCloudflareDisconnectMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/cloudflare\/disconnect$/);
      if (getMeLiveCloudflareDisconnectMatch && method === 'POST') {
        const response = await handleGetMeLiveCloudflareDisconnect(request, env, decodeURIComponent(getMeLiveCloudflareDisconnectMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveCloudflareAccountsMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/cloudflare\/accounts$/);
      if (getMeLiveCloudflareAccountsMatch && method === 'GET') {
        const response = await handleGetMeLiveCloudflareAccounts(request, env, decodeURIComponent(getMeLiveCloudflareAccountsMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveEmailSetupMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/email\/setup$/);
      if (getMeLiveEmailSetupMatch && method === 'POST') {
        const response = await handleGetMeLiveEmailSetup(request, env, decodeURIComponent(getMeLiveEmailSetupMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveStripeConnectMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/stripe\/connect$/);
      if (getMeLiveStripeConnectMatch && method === 'POST') {
        const response = await handleGetMeLiveStripeConnect(request, env, decodeURIComponent(getMeLiveStripeConnectMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveStripeStatusMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/stripe\/status$/);
      if (getMeLiveStripeStatusMatch && method === 'GET') {
        const response = await handleGetMeLiveStripeStatus(request, env, decodeURIComponent(getMeLiveStripeStatusMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLivePublishMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/publish$/);
      if (getMeLivePublishMatch && method === 'POST') {
        const response = await handleGetMeLivePublish(request, env, decodeURIComponent(getMeLivePublishMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLivePublishVerifyMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/publish\/verify$/);
      if (getMeLivePublishVerifyMatch && method === 'POST') {
        const response = await handleGetMeLivePublishVerify(request, env, decodeURIComponent(getMeLivePublishVerifyMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLivePublishStatusMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/publish\/status$/);
      if (getMeLivePublishStatusMatch && method === 'GET') {
        const response = await handleGetMeLivePublishStatus(request, env, decodeURIComponent(getMeLivePublishStatusMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveStoryMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/story-studio-handoff$/);
      if (getMeLiveStoryMatch && method === 'GET') {
        const response = await handleGetMeLiveStoryStudioHandoff(request, env, decodeURIComponent(getMeLiveStoryMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveLeadsMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/leads$/);
      if (getMeLiveLeadsMatch && method === 'GET') {
        const response = await handleGetMeLiveLeads(request, env, decodeURIComponent(getMeLiveLeadsMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveReceiptBackfillMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/release-receipt\/backfill$/);
      if (getMeLiveReceiptBackfillMatch && method === 'POST') {
        const response = await handleGetMeLiveReleaseReceiptBackfill(request, env, decodeURIComponent(getMeLiveReceiptBackfillMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveReleasesMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/releases$/);
      if (getMeLiveReleasesMatch && method === 'GET') {
        const response = await handleGetMeLiveReleases(request, env, decodeURIComponent(getMeLiveReleasesMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveCustomDomainZonesMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/custom-domain\/zones$/);
      if (getMeLiveCustomDomainZonesMatch && method === 'GET') {
        const response = await handleGetMeLiveCustomDomainZones(request, env, decodeURIComponent(getMeLiveCustomDomainZonesMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveCustomDomainReconcileMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/custom-domain\/reconcile$/);
      if (getMeLiveCustomDomainReconcileMatch && method === 'POST') {
        const response = await handleGetMeLiveCustomDomainReconcile(request, env, decodeURIComponent(getMeLiveCustomDomainReconcileMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveCustomDomainMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/custom-domain$/);
      if (getMeLiveCustomDomainMatch && (method === 'POST' || method === 'DELETE')) {
        const orderId = decodeURIComponent(getMeLiveCustomDomainMatch[1]);
        const response = method === 'POST'
          ? await handleGetMeLiveCustomDomainConnect(request, env, orderId)
          : await handleGetMeLiveCustomDomainDelete(request, env, orderId);
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveHealthMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/health$/);
      if (getMeLiveHealthMatch && method === 'GET') {
        const response = await handleGetMeLiveHealth(request, env, decodeURIComponent(getMeLiveHealthMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const getMeLiveReleaseReceiptMatch = path.match(/^\/api\/get-me-live\/orders\/([^/]+)\/release-receipt$/);
      if (getMeLiveReleaseReceiptMatch && method === 'GET') {
        const response = await handleGetMeLiveReleaseReceipt(request, env, decodeURIComponent(getMeLiveReleaseReceiptMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const publicGetMeLiveActivityMatch = path.match(/^\/api\/get-me-live\/sites\/([^/]+)\/activity$/);
      if (publicGetMeLiveActivityMatch && method === 'POST') { const response = await handlePublicGetMeLiveActivity(request, env, decodeURIComponent(publicGetMeLiveActivityMatch[1])); applyCors(response, corsHeaders); return response; }
      const publicGetMeLiveLeadMatch = path.match(/^\/api\/get-me-live\/sites\/([^/]+)\/leads$/);
      if (publicGetMeLiveLeadMatch && method === 'POST') {
        const response = await handlePublicGetMeLiveLead(request, env, decodeURIComponent(publicGetMeLiveLeadMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const publicGetMeLiveBuyMatch = path.match(/^\/api\/get-me-live\/sites\/([^/]+)\/buy$/);
      if (publicGetMeLiveBuyMatch && (method === 'GET' || method === 'POST')) {
        const response = await handlePublicGetMeLiveBuy(request, env, decodeURIComponent(publicGetMeLiveBuyMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }

      const publicLaunchLeadMatch = path.match(/^\/api\/launch-sites\/([^/]+)\/leads$/);
      if (publicLaunchLeadMatch && method === 'POST') {
        const response = await handlePublicLaunchLead(request, env, decodeURIComponent(publicLaunchLeadMatch[1]));
        applyCors(response, corsHeaders);
        return response;
      }
      const publicLaunchSiteMatch = path.match(/^\/launch\/([^/]+)$/);
      if (publicLaunchSiteMatch && method === 'GET') return handlePublicLaunchSite(request, env, decodeURIComponent(publicLaunchSiteMatch[1]));

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
      const blueprintAssetsMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint-assets\.zip$/);
      if (blueprintAssetsMatch && method === 'GET') {
        const response = await handleLaunchBlueprintAssets(request, env, blueprintAssetsMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const launchSiteOwnerMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/launch-site$/);
      if (launchSiteOwnerMatch && method === 'GET') {
        const response = await handleLaunchSiteOwner(request, env, launchSiteOwnerMatch[1], 'get');
        applyCors(response, corsHeaders);
        return response;
      }
      const launchSitePublishMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/launch-site\/(publish|unpublish)$/);
      if (launchSitePublishMatch && method === 'POST') {
        const response = await handleLaunchSiteOwner(request, env, launchSitePublishMatch[1], launchSitePublishMatch[2] as 'publish' | 'unpublish');
        applyCors(response, corsHeaders);
        return response;
      }
      const launchSiteLeadsMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/launch-site\/leads(?:\.csv)?$/);
      if (launchSiteLeadsMatch && method === 'GET') {
        const response = await handleLaunchSiteOwner(request, env, launchSiteLeadsMatch[1], path.endsWith('.csv') ? 'csv' : 'leads');
        applyCors(response, corsHeaders);
        return response;
      }
      const blueprintProgressMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint\/progress$/);
      if (blueprintProgressMatch && (method === 'GET' || method === 'POST')) {
        const response = await handleLaunchBlueprintProgress(request, env, blueprintProgressMatch[1]);
        applyCors(response, corsHeaders);
        return response;
      }
      const blueprintUncertaintyMatch = path.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint\/uncertainty$/);
      if (blueprintUncertaintyMatch && (method === 'GET' || method === 'POST')) {
        const response = await handleLaunchBlueprintUncertainty(request, env, blueprintUncertaintyMatch[1]);
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

  const configuredFrontend = env.FRONTEND_URL?.replace(/\/$/, '');
  if (LOCAL_ORIGINS.has(origin) || origin === configuredFrontend) return origin;

  // Acceptance and development fail closed for all non-configured remote origins.
  // The legacy production aliases are valid only in the production environment.
  if (env.DEPLOYMENT_ENV !== 'production') return undefined;

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
