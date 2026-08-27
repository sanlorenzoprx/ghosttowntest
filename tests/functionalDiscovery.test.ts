import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

interface Intent {
  slug: string;
  title: string;
  headline: string;
  description: string;
  intent: string;
  customerPrompt: string;
  problemPrompt: string;
  alternativePrompt: string;
  examples: string[];
}

const root = process.cwd();
const intents = JSON.parse(fs.readFileSync(path.join(root, 'config', 'functional-discovery-intents.json'), 'utf8')) as Intent[];
const generator = fs.readFileSync(path.join(root, 'scripts', 'generate-functional-discovery-pages.mjs'), 'utf8');
const handoff = fs.readFileSync(path.join(root, 'src', 'components', 'AgentHandoff.tsx'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'public', 'robots.txt'), 'utf8');

const expectedSlugs = [
  'validate-saas-idea',
  'validate-ai-startup',
  'validate-local-business-idea',
  'validate-ecommerce-idea',
  'validate-service-business-idea',
  'validate-marketplace-idea',
  'validate-app-idea',
  'validate-side-hustle-idea',
  'should-i-build-this',
  'find-cheapest-startup-test'
];

describe('Functional Discovery Surface 01', () => {
  it('defines exactly ten distinct high-intent utility doors', () => {
    expect(intents).toHaveLength(10);
    expect(intents.map(intent => intent.slug)).toEqual(expectedSlugs);
    expect(new Set(intents.map(intent => intent.slug)).size).toBe(10);
    for (const intent of intents) {
      expect(intent.description.length).toBeGreaterThan(80);
      expect(intent.examples.length).toBeGreaterThanOrEqual(4);
      expect(intent.customerPrompt).toBeTruthy();
      expect(intent.problemPrompt).toBeTruthy();
      expect(intent.alternativePrompt).toBeTruthy();
    }
  });

  it('routes every utility through the canonical agent verdict and secure handoff', () => {
    expect(generator).toContain('https://api.ghosttowntest.com/api/v1/free-verdict');
    expect(generator).toContain("protocol: 'search'");
    expect(generator).toContain("data.status==='needs_input'");
    expect(generator).toContain("data.status==='complete'");
    expect(generator).toContain('/agent/handoff/');
    expect(generator).not.toContain("fetch('/api/verdict");
  });

  it('publishes crawlable indexes and explicitly allows OpenAI search discovery', () => {
    for (const slug of expectedSlugs) expect(sitemap).toContain(`https://ghosttowntest.com/${slug}`);
    expect(robots).toContain('User-agent: OAI-SearchBot');
    expect(robots).toContain('Allow: /');
  });

  it('supports multiple acquisition channels without duplicating landing pages', () => {
    for (const channel of ['storyStudio', 'partner', 'directory', 'newsletter', 'community', 'social']) {
      expect(generator).toContain(`${channel}:`);
    }
    expect(generator).toContain('source=story-studio');
    expect(generator).toContain('campaign=functional-discovery-01');
    expect(generator).toContain('creative_id={creative_id}');
  });

  it('forwards discovery attribution into the secure handoff before agent last-touch attribution', () => {
    expect(generator).toContain("handoff.searchParams.set(key,value)");
    expect(generator).toContain("handoff.searchParams.set('intent',INTENT)");
    expect(handoff).toContain('captureCommercialAttribution(window.location.search)');
    expect(handoff).toContain("params.set('source', value.attribution.source)");
  });
});
