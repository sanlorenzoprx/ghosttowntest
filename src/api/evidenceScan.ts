import type { Env } from './env';
import type { IdeaIntake } from '../types/lit';
import type {
  EvidenceProviderReceipt,
  EvidenceScanItem,
  GhostTownEvidenceClass,
  GhostTownEvidenceScanV1,
  GhostTownEvidenceStrength,
  PricingBandSummary
} from '../types/evidence';
import type { ResearchPreviewSuggestion } from '../types/researchSignals';
import { hashObject } from '../lib/utils';
import { consumeHourlyRateLimit } from './runtimeControls';
import {
  dataForSeoSuggestions,
  podcastSuggestions,
  youtubeSuggestions
} from './researchPreview';

const FREE_SCAN_LIMIT_PER_HOUR = 4;
const MAX_ITEMS_PER_SECTION = 5;

function clean(value: string | undefined, fallback: string): string {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function configured(env: Env) {
  return {
    dataforseo: Boolean(env.DATAFORSEO_LOGIN?.trim() && env.DATAFORSEO_PASSWORD?.trim()),
    podcast_index: Boolean(env.PODCAST_INDEX_API_KEY?.trim() && env.PODCAST_INDEX_API_SECRET?.trim()),
    youtube_api: Boolean(env.YOUTUBE_API_KEY?.trim())
  };
}

function directEvidence(): NonNullable<GhostTownEvidenceScanV1['directEvidence']> {
  return {
    response: {
      count: 0,
      state: 'not_collected',
      statement: 'This free scan has not run your specific offer yet, so direct replies, leads, calls, bookings, or proposal requests have not been collected.'
    },
    purchase: {
      count: 0,
      state: 'not_collected',
      statement: 'This free scan has not offered your specific deal for purchase yet, so deposits, paid pilots, accepted paid offers, or payments have not been collected.'
    }
  };
}

function ratingStrength(suggestion: ResearchPreviewSuggestion): GhostTownEvidenceStrength {
  const reviews = suggestion.rating?.reviewCount || 0;
  return reviews >= 100 ? 'moderate' : reviews > 0 ? 'early' : 'weak';
}

function evidenceItem(
  suggestion: ResearchPreviewSuggestion,
  category: EvidenceScanItem['category'],
  note: string,
  evidenceClass: GhostTownEvidenceClass = 'market',
  strength: GhostTownEvidenceStrength = 'weak'
): EvidenceScanItem {
  return {
    evidenceId: `${category}:${suggestion.candidateId}`,
    category,
    label: suggestion.label,
    publicUrl: suggestion.publicUrl,
    provider: suggestion.provider,
    evidenceClass,
    evidenceScope: 'external',
    strength,
    verificationStatus: 'provider_candidate',
    note,
    ...(suggestion.rating ? { rating: suggestion.rating } : {}),
    ...(suggestion.price ? { price: suggestion.price } : {})
  };
}

function founderAlternative(idea: IdeaIntake): EvidenceScanItem {
  const label = clean(idea.currentAlternative, 'No current alternative supplied');
  return {
    evidenceId: `current_alternative:founder:${hashObject(label)}`,
    category: 'current_alternative',
    label,
    provider: 'founder_input',
    evidenceClass: 'market',
    evidenceScope: 'founder',
    strength: 'weak',
    verificationStatus: 'founder_supplied',
    note: 'Founder-supplied behavior hypothesis. External evidence has not verified that buyers actually use this alternative.'
  };
}

function dedupeSuggestions(items: ResearchPreviewSuggestion[]): ResearchPreviewSuggestion[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.publicUrl.toLowerCase().replace(/\/$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function priceValue(suggestion: ResearchPreviewSuggestion): number | undefined {
  const price = suggestion.price;
  if (!price) return undefined;
  for (const value of [price.current, price.maximum, price.regular]) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  }
  return undefined;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function pricingBands(items: ResearchPreviewSuggestion[]): PricingBandSummary[] {
  const groups = new Map<string, number[]>();
  for (const item of items) {
    const amount = priceValue(item);
    if (amount === undefined) continue;
    const currency = item.price?.currency?.trim().toUpperCase() || 'UNSPECIFIED';
    const list = groups.get(currency) || [];
    list.push(amount);
    groups.set(currency, list);
  }
  return [...groups.entries()].map(([currency, values]) => ({
    currency,
    count: values.length,
    minimum: Math.min(...values),
    median: median(values),
    maximum: Math.max(...values)
  })).sort((a, b) => b.count - a.count || a.currency.localeCompare(b.currency));
}

function premiumCandidates(items: ResearchPreviewSuggestion[], bands: PricingBandSummary[]): ResearchPreviewSuggestion[] {
  return items.filter(item => {
    const amount = priceValue(item);
    if (amount === undefined) return false;
    const currency = item.price?.currency?.trim().toUpperCase() || 'UNSPECIFIED';
    const band = bands.find(candidate => candidate.currency === currency);
    if (!band || band.count < 2 || band.median <= 0) return false;
    return amount > band.median && amount >= band.median * 1.5;
  });
}

function ratingNote(suggestion: ResearchPreviewSuggestion): string {
  const rating = suggestion.rating;
  if (!rating) return 'Public review/rating activity indicates comparable customer consumption.';
  const maximum = rating.maximum ? `/${rating.maximum}` : '';
  return `Public rating metadata shows ${rating.value}${maximum} across ${rating.reviewCount} review${rating.reviewCount === 1 ? '' : 's'}, supporting comparable customer consumption.`;
}

function unavailableScan(
  idea: IdeaIntake,
  generatedAt: string,
  providerReceipts: EvidenceProviderReceipt[],
  reason: string
): GhostTownEvidenceScanV1 {
  const currentAlternatives = [founderAlternative(idea)];
  const founderSays = {
    customer: clean(idea.targetUser, 'No specific customer supplied'),
    problem: clean(idea.painfulProblem, 'No specific problem supplied'),
    currentAlternative: clean(idea.currentAlternative, 'No current alternative supplied'),
    offer: clean(idea.description, 'No concrete offer supplied')
  };
  const direct = directEvidence();
  return {
    schemaVersion: 'ghosttown-evidence-scan-v1',
    modelVersion: 'seven-layer-v1',
    status: 'unavailable',
    generatedAt,
    fingerprint: hashObject({ modelVersion: 'seven-layer-v1', founderSays, currentAlternatives, direct }),
    founderSays,
    competition: [],
    demand: [],
    access: [],
    currentAlternatives,
    customerConsumption: [],
    commercialConsumption: [],
    pricingLandscape: [],
    premiumPrecedent: [],
    pricingBands: [],
    directEvidence: direct,
    uncertainty: [
      reason,
      'No external customer-consumption evidence was established in this bounded scan.',
      'No external commercial-consumption evidence was established in this bounded scan.',
      'Direct response and direct purchase evidence for your specific offer have not been collected yet.'
    ],
    providerReceipts,
    evidenceBoundary: {
      market: 'Market existence evidence can show competitors, search behavior, communities, alternatives, and places buyers gather.',
      customer: 'Public reviews, ratings, comments, and similar post-consumption activity can support external customer-consumption evidence without proving your specific offer will convert.',
      commercial: 'Comparable commercial products or services with review activity or transaction/price context can support external commercial-consumption evidence. Exact price is optional.',
      pricing: 'Observed prices describe the landscape. GhostTown does not automatically recommend the lowest, average, median, highest, or premium price.',
      direct: 'Direct offer evidence begins only when buyers respond to or purchase this founder’s specific offer.'
    }
  };
}

async function scanBudget(request: Request, env: Env): Promise<boolean> {
  if (!env.DB) return true;
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'anonymous';
  const scope = `free_evidence_scan:${hashObject(ip)}`;
  try {
    return (await consumeHourlyRateLimit(env, scope, FREE_SCAN_LIMIT_PER_HOUR)).allowed;
  } catch (error) {
    console.warn('Evidence Scan rate-limit check failed open for verdict availability', error);
    return true;
  }
}

function providerReceipt(
  provider: EvidenceProviderReceipt['provider'],
  status: EvidenceProviderReceipt['status'],
  queryCount: number,
  resultCount: number,
  error?: unknown
): EvidenceProviderReceipt {
  return {
    provider,
    status,
    queryCount,
    resultCount,
    ...(error ? { error: error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240) } : {})
  };
}

export async function runEvidenceScanV1(
  request: Request,
  env: Env,
  idea: IdeaIntake,
  locale: 'en' | 'es' = 'en'
): Promise<GhostTownEvidenceScanV1> {
  const generatedAt = new Date().toISOString();
  const available = configured(env);
  const providerReceipts: EvidenceProviderReceipt[] = [];

  if (!await scanBudget(request, env)) {
    for (const provider of ['dataforseo', 'podcast_index', 'youtube_api'] as const) {
      providerReceipts.push(providerReceipt(provider, 'rate_limited', 0, 0));
    }
    return unavailableScan(idea, generatedAt, providerReceipts, 'The bounded free Evidence Scan limit was reached. The verdict remains available, but no new external scan was performed.');
  }

  if (!available.dataforseo && !available.podcast_index && !available.youtube_api) {
    providerReceipts.push(providerReceipt('dataforseo', 'not_configured', 0, 0));
    providerReceipts.push(providerReceipt('podcast_index', 'not_configured', 0, 0));
    providerReceipts.push(providerReceipt('youtube_api', 'not_configured', 0, 0));
    return unavailableScan(idea, generatedAt, providerReceipts, 'External Evidence Scan providers are not configured in this environment.');
  }

  const customer = clean(idea.targetUser, idea.ideaName);
  const problem = clean(idea.painfulProblem, idea.description);
  const competitionQuery = `${customer} ${problem} alternatives products services reviews pricing`;
  const demandQuery = `${customer} ${problem} reviews ratings problem solution`;
  const accessQuery = `${customer} ${problem}`;

  const competitionPromise = available.dataforseo
    ? dataForSeoSuggestions(env, competitionQuery, locale)
    : Promise.reject(new Error('DataForSEO is not configured'));
  const demandPromise = available.dataforseo
    ? dataForSeoSuggestions(env, demandQuery, locale)
    : Promise.reject(new Error('DataForSEO is not configured'));
  const youtubePromise = available.youtube_api
    ? youtubeSuggestions(env, accessQuery, locale)
    : Promise.reject(new Error('YouTube Data API is not configured'));
  const podcastPromise = available.podcast_index
    ? podcastSuggestions(env, accessQuery)
    : Promise.reject(new Error('Podcast Index is not configured'));

  const [competitionResult, demandResult, youtubeResult, podcastResult] = await Promise.allSettled([
    competitionPromise,
    demandPromise,
    youtubePromise,
    podcastPromise
  ]);

  const competitionSuggestions = competitionResult.status === 'fulfilled' ? competitionResult.value : [];
  const demandSuggestions = demandResult.status === 'fulfilled' ? demandResult.value : [];
  const youtubeSuggestionsResult = youtubeResult.status === 'fulfilled' ? youtubeResult.value : [];
  const podcastSuggestionsResult = podcastResult.status === 'fulfilled' ? podcastResult.value : [];

  providerReceipts.push(providerReceipt(
    'dataforseo',
    !available.dataforseo ? 'not_configured' : competitionResult.status === 'fulfilled' && demandResult.status === 'fulfilled' ? 'complete' : 'failed',
    available.dataforseo ? 2 : 0,
    competitionSuggestions.length + demandSuggestions.length,
    competitionResult.status === 'rejected' ? competitionResult.reason : demandResult.status === 'rejected' ? demandResult.reason : undefined
  ));
  providerReceipts.push(providerReceipt(
    'youtube_api',
    !available.youtube_api ? 'not_configured' : youtubeResult.status === 'fulfilled' ? 'complete' : 'failed',
    available.youtube_api ? 1 : 0,
    youtubeSuggestionsResult.length,
    youtubeResult.status === 'rejected' ? youtubeResult.reason : undefined
  ));
  providerReceipts.push(providerReceipt(
    'podcast_index',
    !available.podcast_index ? 'not_configured' : podcastResult.status === 'fulfilled' ? 'complete' : 'failed',
    available.podcast_index ? 1 : 0,
    podcastSuggestionsResult.length,
    podcastResult.status === 'rejected' ? podcastResult.reason : undefined
  ));

  const competition = competitionSuggestions.slice(0, MAX_ITEMS_PER_SECTION).map(item =>
    evidenceItem(item, 'competition', 'Comparable public market result. This supports market existence, not conversion of this founder’s offer.')
  );
  const demand = demandSuggestions.slice(0, MAX_ITEMS_PER_SECTION).map(item =>
    evidenceItem(item, 'demand', 'Public search footprint around the stated problem/customer. This is market evidence, not direct offer response.')
  );
  const access = [...youtubeSuggestionsResult, ...podcastSuggestionsResult]
    .filter((item, index, all) => all.findIndex(candidate => candidate.publicUrl === item.publicUrl) === index)
    .slice(0, MAX_ITEMS_PER_SECTION)
    .map(item => evidenceItem(item, 'access', 'Public audience or distribution surface where the stated buyer/problem may already receive attention.'));
  const currentAlternatives = [
    founderAlternative(idea),
    ...competitionSuggestions.slice(0, 4).map(item =>
      evidenceItem(item, 'current_alternative', 'Comparable public offer or workaround candidate to inspect during customer interviews.')
    )
  ];

  const externalCandidates = dedupeSuggestions([...competitionSuggestions, ...demandSuggestions]);
  const customerConsumptionSuggestions = externalCandidates
    .filter(item => (item.rating?.reviewCount || 0) > 0)
    .slice(0, MAX_ITEMS_PER_SECTION);
  const customerConsumption = customerConsumptionSuggestions.map(item =>
    evidenceItem(
      item,
      'customer_consumption',
      `${ratingNote(item)} This is category-level evidence; it does not prove response to this founder’s offer.`,
      'customer',
      ratingStrength(item)
    )
  );

  const commercialSuggestions = dedupeSuggestions([
    ...competitionSuggestions.filter(item => Boolean(item.price) || (item.rating?.reviewCount || 0) > 0),
    ...demandSuggestions.filter(item => Boolean(item.price))
  ]).slice(0, MAX_ITEMS_PER_SECTION);
  const commercialConsumption = commercialSuggestions.map(item =>
    evidenceItem(
      item,
      'commercial_consumption',
      item.price
        ? 'Comparable commercial result includes structured price/transaction context. Exact price is useful context but is not required to establish that paid consumption exists.'
        : 'Comparable commercial result has post-consumption rating/review activity. That supports an inference of category-level commercial consumption while the exact transaction amount remains unknown.',
      'commercial',
      item.price && (item.rating?.reviewCount || 0) > 0 ? 'moderate' : 'early'
    )
  );

  const pricingSuggestions = externalCandidates.filter(item => Boolean(item.price)).slice(0, MAX_ITEMS_PER_SECTION);
  const pricingLandscape = pricingSuggestions.map(item =>
    evidenceItem(
      item,
      'pricing',
      'Observed public price point. It describes the market and must not be turned into an automatic low, average, median, high, or premium price recommendation.',
      'commercial',
      'weak'
    )
  );
  const bands = pricingBands(pricingSuggestions);
  const premiumSuggestionList = premiumCandidates(pricingSuggestions, bands).slice(0, MAX_ITEMS_PER_SECTION);
  const premiumPrecedent = premiumSuggestionList.map(item => {
    const amount = priceValue(item);
    const currency = item.price?.currency?.trim().toUpperCase() || 'UNSPECIFIED';
    const band = bands.find(candidate => candidate.currency === currency);
    const comparison = amount !== undefined && band
      ? `Observed ${currency} price ${amount} is materially above the observed median ${band.median}.`
      : 'Observed price appears above the common band in this bounded scan.';
    return evidenceItem(
      item,
      'premium_precedent',
      `${comparison} This is premium precedent, not a recommendation to copy the price; inspect what differentiation supports it.`,
      'commercial',
      'moderate'
    );
  });

  const direct = directEvidence();
  const uncertainty = [
    competition.length < 3 ? 'We found fewer than three similar public offers in this quick check.' : '',
    demand.length === 0 ? 'We did not find a useful search sign for this customer and problem.' : '',
    access.length === 0 ? 'We did not find a useful public place where you may reach these buyers.' : '',
    customerConsumption.length === 0 ? 'No structured review/rating metadata surfaced in this bounded scan. That does not mean customers do not consume comparable solutions.' : '',
    commercialConsumption.length === 0 ? 'No strong commercial-consumption metadata surfaced in this bounded scan. That does not mean no commercial market exists.' : '',
    pricingLandscape.length === 0 ? 'No structured prices surfaced. Exact price is optional for establishing commercial consumption and should not block the verdict.' : '',
    premiumPrecedent.length === 0 ? 'No premium-priced outlier was established from the observed price sample. That is not evidence that premium positioning is unavailable.' : '',
    'External consumption evidence can establish category behavior; it does not prove this founder’s positioning or offer will capture those buyers.',
    'Direct response and purchase evidence for this specific offer have not been collected yet.'
  ].filter(Boolean);

  const externalCount = competition.length + demand.length + access.length;
  const status: GhostTownEvidenceScanV1['status'] = externalCount === 0
    ? 'unavailable'
    : competition.length >= 3 && demand.length > 0 && access.length > 0
      ? 'complete'
      : 'partial';
  const founderSays = {
    customer: clean(idea.targetUser, 'No specific customer supplied'),
    problem: clean(idea.painfulProblem, 'No specific problem supplied'),
    currentAlternative: clean(idea.currentAlternative, 'No current alternative supplied'),
    offer: clean(idea.description, 'No concrete offer supplied')
  };

  const fingerprintPayload = {
    modelVersion: 'seven-layer-v1',
    founderSays,
    competition: competition.map(({ evidenceId, label, publicUrl, provider }) => ({ evidenceId, label, publicUrl, provider })),
    demand: demand.map(({ evidenceId, label, publicUrl, provider }) => ({ evidenceId, label, publicUrl, provider })),
    access: access.map(({ evidenceId, label, publicUrl, provider }) => ({ evidenceId, label, publicUrl, provider })),
    currentAlternatives: currentAlternatives.map(({ evidenceId, label, publicUrl, provider }) => ({ evidenceId, label, publicUrl, provider })),
    customerConsumption: customerConsumption.map(({ evidenceId, rating }) => ({ evidenceId, rating })),
    commercialConsumption: commercialConsumption.map(({ evidenceId, rating, price }) => ({ evidenceId, rating, price })),
    pricingLandscape: pricingLandscape.map(({ evidenceId, price }) => ({ evidenceId, price })),
    premiumPrecedent: premiumPrecedent.map(({ evidenceId, price }) => ({ evidenceId, price })),
    pricingBands: bands,
    directEvidence: direct,
    providerReceipts: providerReceipts.map(({ provider, status, queryCount, resultCount }) => ({ provider, status, queryCount, resultCount }))
  };

  return {
    schemaVersion: 'ghosttown-evidence-scan-v1',
    modelVersion: 'seven-layer-v1',
    status,
    generatedAt,
    fingerprint: hashObject(fingerprintPayload),
    founderSays,
    competition,
    demand,
    access,
    currentAlternatives,
    customerConsumption,
    commercialConsumption,
    pricingLandscape,
    premiumPrecedent,
    pricingBands: bands,
    directEvidence: direct,
    uncertainty,
    providerReceipts,
    evidenceBoundary: {
      market: 'Market existence evidence can show competitors, search behavior, communities, alternatives, and places buyers gather.',
      customer: 'Public reviews, ratings, comments, and similar post-consumption activity can support external customer-consumption evidence without proving your specific offer will convert.',
      commercial: 'Comparable commercial products or services with review activity or transaction/price context can support external commercial-consumption evidence. Exact price is optional.',
      pricing: 'Observed prices describe the landscape. GhostTown does not automatically recommend the lowest, average, median, highest, or premium price.',
      direct: 'Direct offer evidence begins only when buyers respond to or purchase this founder’s specific offer.'
    }
  };
}
