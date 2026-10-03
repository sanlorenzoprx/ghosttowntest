import app from './index';
import type { Env } from './env';
import { resolveGenerativeModel } from './generativeAIService';
import { handleBlueprintExecutionCopilot } from './blueprintExecutionCopilot';
import { productionRuntimeBindingGuard } from './runtimeControls';
import { ghostTownProductMetadata, handleAgentFreeVerdict } from './agentVerdict';
import { handleAgentHandoffClaim, handleAgentHandoffResolve } from './agentHandoff';
import { handleMcp } from './mcp';

export { LaunchBlueprintWorkflow } from './launchBlueprintWorkflow';

const LOCAL_ORIGINS = new Set([
  'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5300',
  'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5300'
]);

function applyRuntimeCors(request: Request, env: Env, response: Response): Response {
  const origin = request.headers.get('Origin');
  const configured = env.FRONTEND_URL?.replace(/\/$/, '');
  if (origin && (origin === configured || LOCAL_ORIGINS.has(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

function agentOptions(request: Request, env: Env): Response {
  return applyRuntimeCors(request, env, new Response(null, {
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Client, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
      'Access-Control-Max-Age': '86400'
    }
  }));
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const unavailable = productionRuntimeBindingGuard(request, env);
    if (unavailable) return applyRuntimeCors(request, env, unavailable);

    if ((url.pathname === '/mcp' || url.pathname.startsWith('/api/v1/')) && request.method === 'OPTIONS') {
      return agentOptions(request, env);
    }

    if (url.pathname === '/api/v1/product' && request.method === 'GET') {
      return applyRuntimeCors(request, env, json(ghostTownProductMetadata(env)));
    }
    if (url.pathname === '/api/v1/free-verdict' && request.method === 'POST') {
      return applyRuntimeCors(request, env, await handleAgentFreeVerdict(request, env));
    }
    const agentResolveMatch = url.pathname.match(/^\/api\/v1\/agent-handoffs\/([a-f0-9]{64})\/resolve$/i);
    if (agentResolveMatch && request.method === 'POST') {
      return applyRuntimeCors(request, env, await handleAgentHandoffResolve(env, agentResolveMatch[1]));
    }
    const agentClaimMatch = url.pathname.match(/^\/api\/v1\/agent-handoffs\/([a-f0-9]{64})\/claim$/i);
    if (agentClaimMatch && request.method === 'POST') {
      return applyRuntimeCors(request, env, await handleAgentHandoffClaim(request, env, agentClaimMatch[1]));
    }
    if (url.pathname === '/mcp' && request.method === 'POST') {
      return applyRuntimeCors(request, env, await handleMcp(request, env));
    }

    const copilotMatch = url.pathname.match(/^\/api\/paid-test\/orders\/([^/]+)\/blueprint\/copilot$/);
    if (copilotMatch && request.method === 'OPTIONS') {
      const response = new Response(null, {
        headers: {
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
      return applyRuntimeCors(request, env, response);
    }
    if (copilotMatch && request.method === 'POST') {
      return applyRuntimeCors(request, env, await handleBlueprintExecutionCopilot(request, env, copilotMatch[1]));
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
        live_publishing_enabled: false,
        version_id: env.CF_VERSION_METADATA?.id ?? null
      }), { status: 200, headers });
    }
    return app.fetch(request, env);
  }
};
