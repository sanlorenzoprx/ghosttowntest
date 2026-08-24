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
  'src/api/vertexStructuredGeneration.ts',
  'src/api/websiteCreationService.ts'
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
    expect(sources[5]).toContain("from './generativeAIService'");
    expect(sources[5]).toContain("task: 'custom_website'");
  });

  it('uses the Cloudflare AI binding only as an AI Gateway control point for active inference', async () => {
    const service = await readText('src/api/generativeAIService.ts');
    const worker = await readText('src/api/worker.ts');

    expect(service).toContain("env.AI.gateway(gatewayId).getUrl('google-vertex-ai')");
    expect(service).not.toContain('env.AI.run(');
    expect(service).toContain("provider: 'google_vertex_ai'");
    expect(service).toContain("gateway: 'cloudflare_ai_gateway'");
    expect(service).toContain("custom_website: 'gemini-3.5-flash'");
    expect(worker).toContain("primary: 'google_vertex_ai_via_cloudflare_ai_gateway'");
  });

  it('keeps website manufacturing separate from Blueprint generation and arbitrary model-authored code', async () => {
    const website = await readText('src/api/websiteCreationService.ts');
    const builder = await readText('src/api/websiteBuildRunner.ts');
    const registry = await readText('src/api/websiteComponentRegistry.ts');
    const templates = await readText('src/api/websiteTemplateRegistry.ts');

    expect(website).toContain("task: 'custom_website'");
    expect(website).toContain('WebsiteDeploymentAdapter');
    expect(website).toContain('WebsiteBrowserTester');
    expect(website).toContain('ghosttown_conversion');
    expect(website).toContain('memories_story_editorial');
    expect(website).not.toContain('runVertexStructuredStage');
    expect(builder).toContain("runtime: 'cloudflare_spa'");
    expect(builder).toContain('single-page-application');
    expect(builder).toContain('src/App.jsx');
    expect(builder).not.toContain('dangerouslySetInnerHTML');
    expect(registry).toContain('WEBSITE_COMPONENT_REGISTRY');
    expect(templates).toContain("referenceProduct: 'GhostTown'");
    expect(templates).toContain("referenceProduct: 'MemoriesMyStory'");
  });

  it('documents and hash-locks the full v2.1.2 → v2.1.3 → v2.1.4 amendment chain without changing the base canonical blob', async () => {
    const platformAmendment = await readText('docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_2_VERTEX_AI_PLATFORM_AMENDMENT.md');
    const websiteAmendment = await readText('docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_3_CUSTOM_WEBSITE_CAPABILITY_AMENDMENT.md');
    const spaAmendment = await readText('docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_4_CLOUDFLARE_SPA_TEMPLATE_AMENDMENT.md');
    const evidence = JSON.parse(await readText('docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json')) as {
      canonical: { version: string; gitBlobSha1: string };
      platformAmendment: { version: string; gitBlobSha1: string };
      previousAmendment: { version: string; gitBlobSha1: string };
      amendment: { version: string; gitBlobSha1: string };
      changeId: string;
      previousChangeId: string;
    };

    expect(platformAmendment).toContain('Cloudflare remains the application platform; Google Vertex AI becomes GhostTown\'s canonical generative-AI platform.');
    expect(websiteAmendment).toContain('Custom website creation is a separate post-Blueprint `WebsiteCreationService` capability');
    expect(spaAmendment).toContain('Custom Website output is a React/Vite single-page application deployed on Cloudflare.');
    expect(spaAmendment).toContain('ghosttown_conversion');
    expect(spaAmendment).toContain('memories_story_editorial');
    expect(spaAmendment).toContain('"not_found_handling": "single-page-application"');

    expect(evidence.canonical).toEqual(expect.objectContaining({
      version: '2.1.1',
      gitBlobSha1: '616c691e6b4c9cea93615963a07375d13ffba57f'
    }));
    expect(evidence.platformAmendment).toEqual(expect.objectContaining({
      version: '2.1.2',
      gitBlobSha1: '5f63aa4cd694120018413c4c91f89df5ed76897e'
    }));
    expect(evidence.previousAmendment).toEqual(expect.objectContaining({
      version: '2.1.3',
      gitBlobSha1: '95fc94b75b88143a64896f7f7a030c6d00ae10f4'
    }));
    expect(evidence.amendment).toEqual(expect.objectContaining({
      version: '2.1.4',
      gitBlobSha1: 'e42d70aacef6f36f2f94f5a17dfe4bb58376799e'
    }));
    expect(evidence.previousChangeId).toBe('GT-BP-2026-08-15-V2.1.3');
    expect(evidence.changeId).toBe('GT-BP-2026-08-15-V2.1.4');
  });
});
