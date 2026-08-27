import type { Env } from './env';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import type { AgentVerdictInput } from '../types/agentSurface';
import { ghostTownProductMetadata, runAgentVerdictPayload } from './agentVerdict';
import { readAgentHandoff } from './agentHandoff';

const PROTOCOL_VERSION = '2026-07-28';

type JsonRpcId = string | number | null;
interface JsonRpcRequest {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}

function response(id: JsonRpcId, result: unknown, status = 200): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function error(id: JsonRpcId, code: number, message: string, status = 400, data?: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message, ...(data === undefined ? {} : { data }) } }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function toolResult(value: unknown, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
    ...(isError ? { isError: true } : {})
  };
}

const TOOLS = [
  {
    name: 'ghosttown.explain',
    description: 'Explain what GhostTown does, when to use it, its limitations, and its human-controlled paid offer.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'ghosttown.validate_idea',
    description: 'Run the canonical GhostTown verdict. Returns needs_input until the same idea fields and assessment answers used by GhostTown are supplied; never fabricates missing answers.',
    inputSchema: {
      type: 'object',
      properties: {
        idea: { oneOf: [{ type: 'string' }, { type: 'object', additionalProperties: true }] },
        customer: { type: 'string' },
        problem: { type: 'string' },
        alternative: { type: 'string' },
        motivation: { type: 'string' },
        geography: { type: 'string' },
        context: { type: 'string' },
        answers: { type: 'object', additionalProperties: { oneOf: [{ type: 'number' }, { type: 'string' }] } },
        locale: { type: 'string' },
        public_content_acknowledged: { type: 'boolean' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'ghosttown.get_fastest_test',
    description: 'Read the fastest falsification test from a GhostTown agent handoff capability. Does not regenerate a verdict.',
    inputSchema: {
      type: 'object',
      required: ['handoff_token'],
      properties: { handoff_token: { type: 'string', minLength: 64, maxLength: 64 } },
      additionalProperties: false
    }
  },
  {
    name: 'ghosttown.get_offer',
    description: 'Return the current GhostTown Launch Blueprint offer. This never creates a Stripe Checkout session and always requires human action.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  }
] as const;

function validateHeaders(request: Request, rpc: JsonRpcRequest): Response | null {
  const version = request.headers.get('MCP-Protocol-Version');
  const method = request.headers.get('Mcp-Method');
  const name = request.headers.get('Mcp-Name');
  if (version !== PROTOCOL_VERSION) return error(rpc.id ?? null, -32020, `MCP-Protocol-Version must be ${PROTOCOL_VERSION}`);
  if (!method || method !== rpc.method) return error(rpc.id ?? null, -32020, 'Mcp-Method header must match the JSON-RPC method');
  if (rpc.method === 'tools/call') {
    const bodyName = typeof rpc.params?.name === 'string' ? rpc.params.name : '';
    if (!name || name !== bodyName) return error(rpc.id ?? null, -32020, 'Mcp-Name header must match params.name');
  }
  return null;
}

function clientName(rpc: JsonRpcRequest): string | undefined {
  const meta = rpc.params?._meta;
  if (!meta || typeof meta !== 'object') return undefined;
  const info = (meta as Record<string, unknown>)['io.modelcontextprotocol/clientInfo'];
  if (!info || typeof info !== 'object') return undefined;
  const name = (info as Record<string, unknown>).name;
  return typeof name === 'string' ? name.slice(0, 80) : undefined;
}

async function callTool(request: Request, env: Env, rpc: JsonRpcRequest): Promise<Response> {
  const name = typeof rpc.params?.name === 'string' ? rpc.params.name : '';
  const args = rpc.params?.arguments && typeof rpc.params.arguments === 'object'
    ? rpc.params.arguments as Record<string, unknown>
    : {};

  if (name === 'ghosttown.explain') return response(rpc.id ?? null, toolResult(ghostTownProductMetadata(env)));

  if (name === 'ghosttown.get_offer') {
    const frontend = (env.FRONTEND_URL?.trim() || 'https://ghosttowntest.com').replace(/\/$/, '');
    return response(rpc.id ?? null, toolResult({
      offer_id: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
      offer: GHOSTTOWN_30_DAY_PLAN_V1.name,
      price_usd: GHOSTTOWN_30_DAY_PLAN_V1.amountCents / 100,
      currency: GHOSTTOWN_30_DAY_PLAN_V1.currency,
      url: frontend,
      requires_user_action: true
    }));
  }

  if (name === 'ghosttown.get_fastest_test') {
    const handoffToken = typeof args.handoff_token === 'string' ? args.handoff_token : '';
    const handoff = await readAgentHandoff(env, handoffToken);
    if (!handoff) return response(rpc.id ?? null, toolResult({ error: 'Agent handoff not found or expired' }, true));
    return response(rpc.id ?? null, toolResult({
      verdict_id: handoff.verdictId,
      fastest_test: handoff.publicVerdict.fastest_test,
      next_actions: handoff.publicVerdict.next_actions
    }));
  }

  if (name === 'ghosttown.validate_idea') {
    const input = { ...args, agent: { client: clientName(rpc), protocol: 'mcp' } } as AgentVerdictInput;
    const internal = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(input)
    });
    const result = await runAgentVerdictPayload(input, internal, env, { fallbackProtocol: 'mcp', tool: name });
    let value: unknown;
    try { value = await result.json(); } catch { value = { error: 'GhostTown verdict adapter returned an unreadable response' }; }
    return response(rpc.id ?? null, toolResult(value, result.status >= 400));
  }

  return response(rpc.id ?? null, toolResult({ error: `Unknown tool: ${name}` }, true));
}

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  let rpc: JsonRpcRequest;
  try {
    rpc = await request.json<JsonRpcRequest>();
  } catch {
    return error(null, -32700, 'Parse error');
  }
  if (rpc.jsonrpc !== '2.0' || !rpc.method) return error(rpc.id ?? null, -32600, 'Invalid Request');
  const headerError = validateHeaders(request, rpc);
  if (headerError) return headerError;

  if (rpc.method === 'server/discover') {
    return response(rpc.id ?? null, {
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: { name: 'ghosttown', version: 'asc-01' },
      capabilities: { tools: {} }
    });
  }
  if (rpc.method === 'tools/list') return response(rpc.id ?? null, { tools: TOOLS });
  if (rpc.method === 'tools/call') return callTool(request, env, rpc);
  return error(rpc.id ?? null, -32601, 'Method not found');
}
