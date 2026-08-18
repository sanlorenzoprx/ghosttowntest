import app from './index';
import type { Env } from './env';
import { resolveGenerativeModel } from './generativeAIService';
import { handleBlueprintExecutionCopilot } from './blueprintExecutionCopilot';

export { LaunchBlueprintWorkflow } from './launchBlueprintWorkflow';

const LOCAL_ORIGINS = new Set([
  'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5300',
  'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5300'
]);

function applyCopilotCors(request: Request, env: Env, response: Response): Response {
  const origin = request.headers.get('Origin');
  const configured = env.FRONTEND_URL?.replace(/\/$/, '');
  if (origin && (origin === configured || LOCAL_ORIGINS.has(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const copilotMatch = url.pathname.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint\/copilot$/);
    if (copilotMatch && request.method === 'OPTIONS') {
      const response = new Response(null, {
        headers: {
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
      return applyCopilotCors(request, env, response);
    }
    if (copilotMatch && request.method === 'POST') {
      return applyCopilotCors(request, env, await handleBlueprintExecutionCopilot(request, env, copilotMatch[1]));
    }

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