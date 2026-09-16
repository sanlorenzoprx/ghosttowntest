import { describe, expect, it } from 'vitest';
import { handleAgentFreeVerdict, ghostTownProductMetadata } from '../src/api/agentVerdict';
import { handleMcp } from '../src/api/mcp';
import type { Env } from '../src/api/env';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../src/lib/ghosttownOffer';

describe('ASC-01 GhostTown agent surface', () => {
  it('returns needs_input instead of fabricating missing canonical verdict data', async () => {
    const request = new Request('https://api.ghosttowntest.com/api/v1/free-verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: 'Mobile dog grooming service for older adults',
        customer: 'Older adults who have difficulty transporting pets',
        public_content_acknowledged: true
      })
    });

    const response = await handleAgentFreeVerdict(request, {} as Env);
    expect(response.status).toBe(200);
    const body = await response.json() as { status: string; missing: string[]; questions: Array<{ field: string }> };
    expect(body.status).toBe('needs_input');
    expect(body.missing).toContain('painfulProblem');
    expect(body.missing).toContain('currentAlternative');
    expect(body.missing).toContain('motivation');
    expect(body.missing).toContain('gt_1');
    expect(body.questions.some(question => question.field === 'gt_1')).toBe(true);
  });

  it('requires explicit public-content acknowledgement before the agent verdict can run', async () => {
    const request = new Request('https://api.ghosttowntest.com/api/v1/free-verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea: 'A business idea' })
    });
    const response = await handleAgentFreeVerdict(request, {} as Env);
    const body = await response.json() as { missing: string[] };
    expect(body.missing).toContain('public_content_acknowledged');
  });

  it('reuses the canonical GhostTown $97 offer metadata', () => {
    const metadata = ghostTownProductMetadata({ FRONTEND_URL: 'https://ghosttowntest.com' } as Env);
    expect(metadata.paid_offer.name).toBe(GHOSTTOWN_30_DAY_PLAN_V1.name);
    expect(metadata.paid_offer.price_usd).toBe(97);
    expect(metadata.paid_offer.requires_user_action).toBe(true);
  });

  it('publishes the stateless MCP tool catalog for the current protocol revision', async () => {
    const request = new Request('https://api.ghosttowntest.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': '2026-07-28',
        'Mcp-Method': 'tools/list'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    const response = await handleMcp(request, {} as Env);
    expect(response.status).toBe(200);
    const body = await response.json() as { result: { tools: Array<{ name: string }> } };
    expect(body.result.tools.map(tool => tool.name)).toEqual([
      'ghosttown.explain',
      'ghosttown.validate_idea',
      'ghosttown.get_fastest_test',
      'ghosttown.get_offer'
    ]);
  });

  it('rejects MCP requests whose routing headers disagree with the body', async () => {
    const request = new Request('https://api.ghosttowntest.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': '2026-07-28',
        'Mcp-Method': 'tools/call',
        'Mcp-Name': 'ghosttown.get_offer'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'ghosttown.explain', arguments: {} } })
    });
    const response = await handleMcp(request, {} as Env);
    expect(response.status).toBe(400);
  });
});
