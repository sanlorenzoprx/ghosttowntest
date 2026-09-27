import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { PaidTestOrder, CompetitorSeed } from '../types/paidTest';
import type {
  BlueprintSource,
  CompetitorReviewIntelligence,
  CompetitorReviewObservation,
  CompetitorReviewPattern,
  CompetitorReviewProductImplication
} from '../types/launchBlueprint';
import { generateAI, type GenerativeAIResponseSchema } from './generativeAIService';
import { evidenceRecencyFromDate, extractEvidenceDateFromHtml } from './evidenceRecency';

const MAX_GROUNDED_SOURCES_PER_SEED = 10;
const MAX_REVIEW_PAGES_PER_SEED = 6;
const MAX_SNIPPETS_PER_PAGE = 6;
const MAX_SNIPPET_CHARS = 260;
const REVIEW_FETCH_TIMEOUT_MS = 15_000;

const REVIEW_INTELLIGENCE_SCHEMA: GenerativeAIResponseSchema = {
  type: 'OBJECT',
  properties: {
    patterns: {
      type: 'ARRAY',
      minItems: 1,
      maxItems: 24,
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING' },
          theme: { type: 'STRING' },
          customerLanguage: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 4 },
          sourceIds: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 1, maxItems: 8 },
          competitorNames: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 1, maxItems: 4 },
          confidence: { type: 'STRING' }
        },
        required: ['kind', 'theme', 'customerLanguage', 'sourceIds', 'competitorNames', 'confidence']
      }
    },
    customerLanguagePhrases: {
      type: 'ARRAY',
      minItems: 1,
      maxItems: 20,
      items: { type: 'STRING' }
    },
    productImplications: {
      type: 'ARRAY',
      minItems: 1,
      maxItems: 10,
      items: {
        type: 'OBJECT',
        properties: {
          hypothesis: { type: 'STRING' },
          whyItMatters: { type: 'STRING' },
          testQuestion: { type: 'STRING' },
          sourceIds: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 1, maxItems: 8 }
        },
        required: ['hypothesis', 'whyItMatters', 'testQuestion', 'sourceIds']
      }
    }
  },
  required: ['patterns', 'customerLanguagePhrases', 'productImplications']
};

type ReviewSynthesisPayload = {
  patterns?: Array<{
    kind?: unknown;
    theme?: unknown;
    customerLanguage?: unknown;
    sourceIds?: unknown;
    competitorNames?: unknown;
    confidence?: unknown;
  }>;
  customerLanguagePhrases?: unknown;
  productImplications?: Array<{
    hypothesis?: unknown;
    whyItMatters?: unknown;
    testQuestion?: unknown;
    sourceIds?: unknown;
  }>;
};

function clean(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function safeHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (/^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = REVIEW_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function titleFromHtml(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return clean(match?.[1]) || fallback;
}

export function hasFirstPersonUserSignal(value: string): boolean {
  const text = clean(value).toLowerCase();
  const firstPerson = /\b(?:i|i'm|i've|i'd|my|me|we|we're|we've|our)\b/.test(text);
  const experience = /\b(?:use|used|using|tried|bought|buy|paid|pay|switched|cancelled|canceled|love|hate|wish|found|had|got|needed|recommend)\b/.test(text);
  return firstPerson && experience;
}

export function isEligibleReviewSource(seed: CompetitorSeed, finalUrl: string, visibleText: string): boolean {
  let url: URL;
  try {
    url = new URL(finalUrl);
  } catch {
    return false;
  }
  if (!hasFirstPersonUserSignal(visibleText)) return false;
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const seedHost = seed.domain.replace(/^www\./, '').toLowerCase();
  const competitorOwned = host === seedHost || host.endsWith(`.${seedHost}`);
  if (!competitorOwned) return true;
  return /\/(?:reviews?|community|forum|discuss|discussion|support|threads?|comments?|feedback)(?:\/|$)/i.test(url.pathname);
}

export function phraseSupportedByObservations(
  phrase: string,
  observations: CompetitorReviewObservation[],
  sourceIds?: string[]
): boolean {
  const normalized = clean(phrase).toLowerCase();
  if (!normalized) return false;
  const allowedSources = sourceIds?.length ? new Set(sourceIds) : null;
  return observations.some(observation =>
    (!allowedSources || allowedSources.has(observation.sourceId))
    && observation.customerLanguage.some(snippet => clean(snippet).toLowerCase().includes(normalized))
  );
}

function reviewSignalScore(sentence: string): number {
  const s = sentence.toLowerCase();
  let score = 0;
  if (/\b(love|like|great|excellent|helpful|easy|fast|simple|useful|best|recommend)\b/.test(s)) score += 3;
  if (/\b(hate|bad|poor|hard|difficult|confusing|slow|broken|bug|issue|problem|frustrat|annoy|expensive|price|billing|support|refund|cancel)\b/.test(s)) score += 4;
  if (/\b(wish|need|missing|lack|should|could|feature|improve|alternative|switch|moved|replaced)\b/.test(s)) score += 4;
  if (/\b(bought|buy|paid|purchase|trial|subscription|customer|user|review)\b/.test(s)) score += 2;
  return score;
}

function reviewSnippets(visibleText: string): string[] {
  const sentences = visibleText
    .split(/(?<=[.!?])\s+/)
    .map(clean)
    .filter(value => value.length >= 35 && value.length <= 900)
    .map(value => ({ value, score: reviewSignalScore(value) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.value.length - b.value.length)
    .slice(0, MAX_SNIPPETS_PER_PAGE)
    .map(item => item.value.slice(0, MAX_SNIPPET_CHARS));
  return unique(sentences);
}

function sourceId(seed: CompetitorSeed, url: string): string {
  let hash = 2166136261;
  for (const char of url) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `review_${seed.seedId}_${(hash >>> 0).toString(16)}`;
}

function productContext(order: PaidTestOrder, verdict: EvaluationResult): string {
  return [
    verdict.idea.ideaName,
    verdict.idea.description,
    order.intake.targetBuyer,
    order.intake.problem,
    order.intake.currentWorkaround,
    order.intake.offerHypothesis
  ].map(clean).filter(Boolean).join(' | ');
}

async function groundedReviewUrls(env: Env, seed: CompetitorSeed, order: PaidTestOrder, verdict: EvaluationResult): Promise<Array<{ url: string; title: string }>> {
  const query = [
    `Product/competitor: ${seed.name} (${seed.domain})`,
    `Sprint product context: ${productContext(order, verdict)}`,
    'Find public customer review pages, user discussion threads, comparisons, complaint pages, app marketplace reviews, or community posts where users describe real experience with this exact competitor/product.',
    'Prioritize first-person customer language about what works, what fails, why they bought, switching reasons, pricing/value, support, missing features, workarounds, and requested improvements.',
    'Do not return generic vendor marketing pages unless they contain actual customer review material.',
    'Return grounded web citations; GhostTown will independently open and verify every source before it counts.'
  ].join('\n');

  const generated = await generateAI(env, {
    task: 'grounded_research',
    googleSearch: true,
    temperature: 0,
    maxOutputTokens: 1400,
    timeoutMs: 60_000,
    prompt: query
  });

  const chunks = generated.groundingMetadata?.groundingChunks || [];
  const seen = new Set<string>();
  const output: Array<{ url: string; title: string }> = [];
  for (const chunk of chunks) {
    const raw = clean(chunk.web?.uri);
    const safe = safeHttpsUrl(raw);
    if (!safe) continue;
    const key = safe.toString().toLowerCase().replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ url: safe.toString(), title: clean(chunk.web?.title) || seed.name });
    if (output.length >= MAX_GROUNDED_SOURCES_PER_SEED) break;
  }
  return output;
}

async function verifyReviewPage(seed: CompetitorSeed, candidate: { url: string; title: string }): Promise<{
  source: BlueprintSource;
  observation: CompetitorReviewObservation;
} | null> {
  try {
    const response = await fetchWithTimeout(candidate.url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.2',
        'User-Agent': 'GhostTownSprintResearch/1.0 (+https://ghosttowntest.com)'
      }
    });
    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }
    const contentType = response.headers.get('content-type') || '';
    if (!/(text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) {
      await response.body?.cancel();
      return null;
    }
    const html = await response.text();
    const visible = stripHtml(html);
    if (visible.length < 180) return null;

    const finalUrl = response.url || candidate.url;
    const haystack = `${finalUrl} ${candidate.title} ${visible.slice(0, 9000)}`.toLowerCase();
    const seedTokens = unique([seed.name, seed.domain.replace(/^www\./, '')])
      .flatMap(value => value.toLowerCase().split(/[^a-z0-9]+/))
      .filter(token => token.length >= 4);
    if (!seedTokens.some(token => haystack.includes(token))) return null;

    if (!isEligibleReviewSource(seed, finalUrl, visible)) return null;
    const snippets = reviewSnippets(visible);
    if (!snippets.length) return null;

    const id = sourceId(seed, finalUrl);
    const accessedAt = new Date().toISOString();
    const title = titleFromHtml(html, candidate.title);
    const extractedDate = extractEvidenceDateFromHtml(html, finalUrl, title);
    const evidenceDate = extractedDate.date;

    return {
      source: {
        sourceId: id,
        title,
        url: finalUrl,
        publisher: new URL(finalUrl).hostname.replace(/^www\./, ''),
        accessedAt,
        evidenceDate,
        evidenceDateSource: extractedDate.source,
        evidenceRecency: evidenceRecencyFromDate(evidenceDate),
        supports: snippets.slice(0, 4)
      },
      observation: {
        observationId: `obs_${id}`,
        competitorSeedId: seed.seedId,
        competitorName: seed.name,
        sourceId: id,
        sourceUrl: finalUrl,
        sourceTitle: title,
        accessedAt,
        evidenceDate,
        customerLanguage: snippets
      }
    };
  } catch {
    return null;
  }
}

function synthesisPrompt(order: PaidTestOrder, verdict: EvaluationResult, observations: CompetitorReviewObservation[]): string {
  return [
    'You are GhostTown product-specific competitor review intelligence.',
    'The evidence belongs only to this paid Sprint. Do not generalize from unrelated products or markets.',
    'Use only the supplied review observations and immutable source IDs.',
    'Observed review language is evidence. Patterns require repeated or clearly corroborated observations. Product implications are hypotheses to test, not facts.',
    'Identify strengths, weaknesses, customer jobs, switching signals, pricing/value signals, support signals, and requested improvements when supported.',
    'Prefer exact short customer phrases already present in the evidence; do not invent quotes.',
    'Every pattern and product implication must cite only source IDs in the supplied evidence.',
    'Return JSON only.',
    `Sprint product: ${productContext(order, verdict)}`,
    `Target buyer: ${clean(order.intake.targetBuyer)}`,
    `Problem: ${clean(order.intake.problem)}`,
    `Offer hypothesis: ${clean(order.intake.offerHypothesis)}`,
    `Review observations: ${JSON.stringify(observations)}`
  ].join('\n');
}

function normalizePatternKind(value: unknown): CompetitorReviewPattern['kind'] | null {
  const normalized = clean(value).toLowerCase().replace(/[\s-]+/g, '_');
  const allowed: CompetitorReviewPattern['kind'][] = [
    'strength', 'weakness', 'job', 'switching_signal', 'pricing_signal', 'support_signal', 'requested_improvement'
  ];
  return allowed.includes(normalized as CompetitorReviewPattern['kind'])
    ? normalized as CompetitorReviewPattern['kind']
    : null;
}

function normalizeConfidence(value: unknown): CompetitorReviewPattern['confidence'] {
  const normalized = clean(value).toLowerCase();
  return normalized === 'high' || normalized === 'medium' || normalized === 'low' ? normalized : 'low';
}

function parseJsonObject(text: string): ReviewSynthesisPayload {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1] || trimmed;
  return JSON.parse(fenced) as ReviewSynthesisPayload;
}

async function synthesizeReviewIntelligence(
  env: Env,
  order: PaidTestOrder,
  verdict: EvaluationResult,
  observations: CompetitorReviewObservation[]
): Promise<{
  patterns: CompetitorReviewPattern[];
  customerLanguagePhrases: string[];
  productImplications: CompetitorReviewProductImplication[];
}> {
  if (!observations.length) return { patterns: [], customerLanguagePhrases: [], productImplications: [] };

  const ai = await generateAI(env, {
    task: 'review_intelligence',
    prompt: synthesisPrompt(order, verdict, observations),
    responseSchema: REVIEW_INTELLIGENCE_SCHEMA,
    temperature: 0,
    maxOutputTokens: 6000,
    timeoutMs: 60_000
  });
  const payload = parseJsonObject(ai.text);
  const knownSourceIds = new Set(observations.map(item => item.sourceId));

  const patterns: CompetitorReviewPattern[] = [];
  for (const raw of payload.patterns || []) {
    const kind = normalizePatternKind(raw.kind);
    const theme = clean(raw.theme);
    const sourceIds = Array.isArray(raw.sourceIds)
      ? unique(raw.sourceIds.map(clean)).filter(id => knownSourceIds.has(id))
      : [];
    if (!kind || !theme || !sourceIds.length) continue;
    const competitorNames = Array.isArray(raw.competitorNames)
      ? unique(raw.competitorNames.map(clean))
      : [];
    if (sourceIds.length < 2) continue;
    const supportedLanguage = Array.isArray(raw.customerLanguage)
      ? unique(raw.customerLanguage.map(clean))
          .filter(phrase => phraseSupportedByObservations(phrase, observations, sourceIds))
          .slice(0, 4)
      : [];
    patterns.push({
      patternId: `review_pattern_${patterns.length + 1}`,
      kind,
      theme,
      customerLanguage: supportedLanguage,
      sourceIds,
      competitorNames,
      confidence: normalizeConfidence(raw.confidence)
    });
  }

  const customerLanguagePhrases = Array.isArray(payload.customerLanguagePhrases)
    ? unique(payload.customerLanguagePhrases.map(clean))
        .filter(phrase => phraseSupportedByObservations(phrase, observations))
        .slice(0, 20)
    : [];

  const productImplications: CompetitorReviewProductImplication[] = [];
  for (const raw of payload.productImplications || []) {
    const hypothesis = clean(raw.hypothesis);
    const whyItMatters = clean(raw.whyItMatters);
    const testQuestion = clean(raw.testQuestion);
    const sourceIds = Array.isArray(raw.sourceIds)
      ? unique(raw.sourceIds.map(clean)).filter(id => knownSourceIds.has(id))
      : [];
    if (!hypothesis || !whyItMatters || !testQuestion || !sourceIds.length) continue;
    productImplications.push({
      implicationId: `review_implication_${productImplications.length + 1}`,
      hypothesis,
      whyItMatters,
      testQuestion,
      sourceIds
    });
  }

  return { patterns, customerLanguagePhrases, productImplications };
}

export async function researchCompetitorReviews(
  env: Env,
  order: PaidTestOrder,
  verdict: EvaluationResult
): Promise<CompetitorReviewIntelligence> {
  const seeds = order.intake.competitorSeeds || [];
  const limitations: string[] = [];
  const observations: CompetitorReviewObservation[] = [];
  const sources: BlueprintSource[] = [];

  for (const seed of seeds) {
    let candidates: Array<{ url: string; title: string }> = [];
    try {
      candidates = await groundedReviewUrls(env, seed, order, verdict);
    } catch (error) {
      limitations.push(`${seed.name}: grounded review discovery failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    let accepted = 0;
    for (const candidate of candidates) {
      const verified = await verifyReviewPage(seed, candidate);
      if (!verified) continue;
      observations.push(verified.observation);
      sources.push(verified.source);
      accepted += 1;
      if (accepted >= MAX_REVIEW_PAGES_PER_SEED) break;
    }
    if (!accepted) limitations.push(`${seed.name}: no public review page passed direct source verification.`);
  }

  let synthesized = { patterns: [] as CompetitorReviewPattern[], customerLanguagePhrases: [] as string[], productImplications: [] as CompetitorReviewProductImplication[] };
  if (observations.length) {
    try {
      synthesized = await synthesizeReviewIntelligence(env, order, verdict, observations);
    } catch (error) {
      limitations.push(`Review synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
      synthesized.customerLanguagePhrases = unique(observations.flatMap(item => item.customerLanguage)).slice(0, 20);
    }
  }

  const status: CompetitorReviewIntelligence['status'] =
    observations.length >= Math.max(2, seeds.length) && synthesized.patterns.length
      ? 'complete'
      : observations.length
        ? 'partial'
        : 'not_available';

  return {
    schemaVersion: 'competitor-review-intelligence-v1',
    orderId: order.orderId,
    sourceVerdictId: verdict.resultId,
    productSpecific: true,
    generatedAt: new Date().toISOString(),
    status,
    competitorSeedIds: seeds.map(seed => seed.seedId),
    observations,
    patterns: synthesized.patterns,
    customerLanguagePhrases: synthesized.customerLanguagePhrases,
    productImplications: synthesized.productImplications,
    sources,
    limitations
  };
}
