import app from './index';
import type { Env } from './env';
import { resolveGenerativeModel } from './generativeAIService';

export { LaunchBlueprintWorkflow } from './launchBlueprintWorkflow';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/integrations/shorts-factory/health' && request.method === 'GET') {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const origin = request.headers.get('Origin');
      if (origin && env.FRONTEND_URL?.trim() === origin) headers['Access-Control-Allow-Origin'] = origin;
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'ghosttowntest',
        contract_version: 'lit-verdict-v1',
        verdict_endpoint: '/api/verdict',
        authentication: env.LIT_API_KEY?.trim() ? 'bearer_required' : 'not_configured',
        evaluation: {
          primary: 'google_vertex_ai_via_cloudflare_ai_gateway',
          verdict_model: resolveGenerativeModel(env, 'verdict'),
          fallback: 'deterministic',
          provenance_recorded: true
        },
        generative_ai: {
          platform: 'google_vertex_ai',
          routing: 'cloudflare_ai_gateway',
          gateway_id: env.AI_GATEWAY_ID?.trim() || 'default'
        },
        live_publishing_enabled: false
      }), { status: 200, headers });
    }
    return app.fetch(request, env);
  }
};
