import type { Env } from './env';
import type { IdeaIntake } from '../types/lit';
import type {
  EvidenceProviderReceipt,
  EvidenceScanItem,
  GhostTownEvidenceScanV1
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
function evidenceItem(
  suggestion: ResearchPreviewSuggestion,
  category: EvidenceScanItem['category'],
  note: string
): EvidenceScanItem {
  return {
    evidenceId: `${category}:${suggestion.candidateId}`,
    category,
    label: suggestion.label,
    publicUrl: suggestion.publicUrl,
    provider: suggestion.provider,
    evidenceClass: 'market',
    strength: 'weak',
    verificationStatus: 'provider_candidate',
    note
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
    strength: 'weak',
    verificationStatus: 'founder_supplied',
    note: 'Founder-supplied behavior hypothesis. External evidence has not verified that buyers actually use this alternative.'
  };
}
function unavailableScan(idea: IdeaIntake, generatedAt: string, providerReceipts: EvidenceProviderReceipt[], reason: string): GhostTownEvidenceScanV1 {
  const currentAlternatives = [founderAlternative(idea)];
  const founderSays = {
    customer: clean(idea.targetUser, 'No specific customer supplied'),
    problem: clean(idea.painfulProblem, 'No specific problem supplied'),
    currentAlternative: clean(idea.currentAlternative, 'No current alternative supplied'),
    offer: clean(idea.description, 'No concrete offer supplied')
  };
  return {
    schemaVersion: 'ghosttown-evidence-scan-v1',
    status: 'unavailable',
    generatedAt,
    fingerprint: hashObject({ founderSays, currentAlternatives }),
    founderSays,
    competition: [],
    demand: [],
    access: [],
    currentAlternatives,
    uncertainty: [reason, 'No customer-behavior evidence has been observed yet.', 'No payment, deposit, or other buying action has been observed yet.'],
    providerReceipts,
    evidenceBoundary: {
      market: 'Market evidence can show that similar offers, interest, and places to reach buyers exist. It does not prove people will buy.',
      customer: 'Customer evidence starts when real buyers reply, talk with you, ask for a proposal, book, or take another clear next step.',
      commercial: 'Buying evidence starts when a buyer pays, leaves a deposit, accepts an offer, or takes another clear buying action.'
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
    return unavailableScan(idea, generatedAt, providerReceipts, 'The bounded free Evidence Scan limit was reached. The verdict remains available, but no new external market scan was performed.');
  }

  if (!available.dataforseo && !available.podcast_index && !available.youtube_api) {
    providerReceipts.push(providerReceipt('dataforseo', 'not_configured', 0, 0));
    providerReceipts.push(providerReceipt('podcast_index', 'not_configured', 0, 0));
    providerReceipts.push(providerReceipt('youtube_api', 'not_configured', 0, 0));
    return unavailableScan(idea, generatedAt, providerReceipts, 'External Evidence Scan providers are not configured in this environment.');
  }

  const customer = clean(idea.targetUser, idea.ideaName);
  const problem = clean(idea.painfulProblem, idea.description);
  const competitionQuery = `${customer} ${problem} alternatives products services`;
  const demandQuery = `${customer} ${problem} problem solution`;
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

  const competition = competitionSuggestions.slice(0, MAX_ITEMS_PER_SECTION).map(item => evidenceItem(item, 'competition', 'Comparable public market result. This establishes competitive pressure or an adjacent alternative, not customer demand.'));
  const demand = demandSuggestions.slice(0, MAX_ITEMS_PER_SECTION).map(item => evidenceItem(item, 'demand', 'Public search footprint around the stated problem/customer. This is market evidence only; it does not prove willingness to pay.'));
  const access = [...youtubeSuggestionsResult, ...podcastSuggestionsResult]
    .filter((item, index, all) => all.findIndex(candidate => candidate.publicUrl === item.publicUrl) === index)
    .slice(0, MAX_ITEMS_PER_SECTION)
    .map(item => evidenceItem(item, 'access', 'Public audience or distribution surface where the stated buyer/problem may already receive attention. Reachability still requires a real response.'));
  const currentAlternatives = [
    founderAlternative(idea),
    ...competitionSuggestions.slice(0, 4).map(item => evidenceItem(item, 'current_alternative', 'Comparable public offer or workaround candidate to inspect during customer interviews.'))
  ];

  const uncertainty = [
    competition.length < 3 ? 'We found fewer than three similar public offers in this quick check.' : '',
    demand.length === 0 ? 'We did not find a useful search sign for this customer and problem.' : '',
    access.length === 0 ? 'We did not find a useful public place where you may reach these buyers.' : '',
    'Market signs do not tell us if real customers care enough to act.',
    'We have not seen a payment, deposit, accepted offer, or other buying action yet.'
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
    founderSays,
    competition: competition.map(({ evidenceId, label, publicUrl, provider }) => ({ evidenceId, label, publicUrl, provider })),
    demand: demand.map(({ evidenceId, label, publicUrl, provider }) => ({ evidenceId, label, publicUrl, provider })),
    access: access.map(({ evidenceId, label, publicUrl, provider }) => ({ evidenceId, label, publicUrl, provider })),
    currentAlternatives: currentAlternatives.map(({ evidenceId, label, publicUrl, provider }) => ({ evidenceId, label, publicUrl, provider })),
    providerReceipts: providerReceipts.map(({ provider, status, queryCount, resultCount }) => ({ provider, status, queryCount, resultCount }))
  };

  return {
    schemaVersion: 'ghosttown-evidence-scan-v1',
    status,
    generatedAt,
    fingerprint: hashObject(fingerprintPayload),
    founderSays,
    competition,
    demand,
    access,
    currentAlternatives,
    uncertainty,
    providerReceipts,
    evidenceBoundary: {
      market: 'Market evidence can show that similar offers, interest, and places to reach buyers exist. It does not prove people will buy.',
      customer: 'Customer evidence starts when real buyers reply, talk with you, ask for a proposal, book, or take another clear next step.',
      commercial: 'Buying evidence starts when a buyer pays, leaves a deposit, accepts an offer, or takes another clear buying action.'
    }
  };
}
