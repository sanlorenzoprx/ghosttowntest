import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

const ACTIVE_GENERATIVE_MODULES = [
  'src/api/verdict.ts',
  'src/api/shortsFactoryVerdict.ts',
  'src/api/distributionFootprintResearch.ts',
  'src/api/internalGoogleSearch.ts',
  'src/api/vertexStructuredGeneration.ts'
];

describe('GhostTown generative AI architecture', () => {
  it('routes every active generative module through GenerativeAIService', async () => {
    const sources = await Promise.all(ACTIVE_GENERATIVE_MODULES.map(readText));
    for (const source of sources) {
      expect(source).not.toContain('generativelanguage.googleapis.com');
      expect(source).not.toContain('.AI.run(');
      expect(source).not.toContain('env.GEMINI_API_KEY');
    }

    expect(sources[0]).toContain("from './generativeAIService'");
    expect(sources[1]).toContain('VertexVerdictProvider');
    expect(sources[2]).toContain("from './generativeAIService'");
    expect(sources[3]).toContain("from './generativeAIService'");
    expect(sources[4]).toContain("from './generativeAIService'");
  });

  it('uses the Cloudflare AI binding only as an AI Gateway control point for active inference', async () => {
    const service = await readText('src/api/generativeAIService.ts');
    const worker = await readText('src/api/worker.ts');

    expect(service).toContain("env.AI.gateway(gatewayId).getUrl('google-vertex-ai')");
    expect(service).not.toContain('env.AI.run(');
    expect(service).toContain("provider: 'google_vertex_ai'");
    expect(service).toContain("gateway: 'cloudflare_ai_gateway'");
    expect(worker).toContain("primary: 'google_vertex_ai_via_cloudflare_ai_gateway'");
  });

  it('documents and hash-locks the v2.1.2 platform amendment without changing the base canonical blob', async () => {
    const amendment = await readText('docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_2_VERTEX_AI_PLATFORM_AMENDMENT.md');
    const evidence = JSON.parse(await readText('docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json')) as {
      canonical: { version: string; gitBlobSha1: string };
      amendment: { version: string; gitBlobSha1: string };
      changeId: string;
    };

    expect(amendment).toContain('Cloudflare remains the application platform; Google Vertex AI becomes GhostTown\'s canonical generative-AI platform.');
    expect(amendment).toContain('one first-party `GenerativeAIService`');
    expect(evidence.canonical).toEqual(expect.objectContaining({
      version: '2.1.1',
      gitBlobSha1: '616c691e6b4c9cea93615963a07375d13ffba57f'
    }));
    expect(evidence.amendment).toEqual(expect.objectContaining({
      version: '2.1.2',
      gitBlobSha1: '5f63aa4cd694120018413c4c91f89df5ed76897e'
    }));
    expect(evidence.changeId).toBe('GT-BP-2026-08-15-V2.1.2');
  });
});
