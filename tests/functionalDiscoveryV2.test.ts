import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { handleAgentFreeVerdict } from '../src/api/agentVerdict';
import type { Env } from '../src/api/env';

const catalog = JSON.parse(fs.readFileSync(path.resolve('config/functional-discovery-intents.json'), 'utf8'));

describe('Functional Discovery v2', () => {
  it('keeps one canonical verdict capability behind bilingual intent clusters', () => {
    expect(catalog.schemaVersion).toBe('ghosttown-functional-discovery-v2');
    expect(catalog.intents).toHaveLength(20);
    const slugs = new Set<string>();
    let enKeywords = 0;
    let esKeywords = 0;
    for (const intent of catalog.intents) {
      expect(intent.canonicalCapability).toBe('/api/v1/free-verdict');
      expect(intent.locales.en.locale).toBe('en');
      expect(intent.locales.es.locale).toBe('es');
      expect(intent.locales.es.slug.startsWith('es/')).toBe(true);
      expect(slugs.has(intent.locales.en.slug)).toBe(false); slugs.add(intent.locales.en.slug);
      expect(slugs.has(intent.locales.es.slug)).toBe(false); slugs.add(intent.locales.es.slug);
      enKeywords += intent.locales.en.keywords.length;
      esKeywords += intent.locales.es.keywords.length;
    }
    expect(enKeywords).toBe(50);
    expect(esKeywords).toBe(50);
    expect(slugs.size).toBe(40);
  });

  it('preserves the original ten English discovery doors while expanding the catalog', () => {
    const slugs = catalog.intents.map((intent: any) => intent.locales.en.slug);
    for (const slug of ['validate-saas-idea','validate-ai-startup','validate-local-business-idea','validate-ecommerce-idea','validate-service-business-idea','validate-marketplace-idea','validate-app-idea','validate-side-hustle-idea','should-i-build-this','find-cheapest-startup-test']) {
      expect(slugs).toContain(slug);
    }
  });

  it('returns genuinely Spanish needs_input prompts and scoring choices', async () => {
    const request = new Request('https://api.ghosttowntest.com/api/v1/free-verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'es' })
    });
    const response = await handleAgentFreeVerdict(request, {} as Env);
    expect(response.status).toBe(200);
    const body = await response.json<any>();
    expect(body.status).toBe('needs_input');
    expect(body.questions.find((q: any) => q.field === 'ideaName')?.prompt).toContain('nombre corto');
    const firstAssessment = body.questions.find((q: any) => q.field === 'gt_1');
    expect(firstAssessment?.prompt).toContain('urgencia');
    expect(firstAssessment?.options?.[0]?.label).toBe('Todavía no estoy seguro');
    expect(body.questions.find((q: any) => q.field === 'public_content_acknowledged')?.prompt).toContain('Confirma');
  });

  it('keeps the build generator wired to the canonical API and intent attribution', () => {
    const source = fs.readFileSync(path.resolve('scripts/generate-functional-discovery-pages.mjs'), 'utf8');
    expect(source).toContain("const API_ORIGIN = 'https://api.ghosttowntest.com'");
    expect(source).toContain("canonicalCapability:'/api/v1/free-verdict'");
    expect(source).toContain("u.searchParams.set('intent',INTENT)");
    expect(source).toContain("u.searchParams.set('locale',LOCALE)");
    expect(source).not.toContain('must contain exactly 10 intents');
  });
});
