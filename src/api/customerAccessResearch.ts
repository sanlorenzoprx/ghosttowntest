import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { PaidTestOrder } from '../types/paidTest';
import type { BlueprintSource, CustomerAccessChannel, DistributionTargetType } from '../types/launchBlueprint';
import {
  finalizeCustomerAccessResearch as finalizeDistributionFootprintResearch,
  planCustomerAccessResearch,
  runResearchBatch,
  type CustomerAccessResearchReceipt,
  type CustomerAccessResearchResult,
  type DistributionFootprintPlan,
  type DistributionProvider,
  type FootprintCandidate,
  type ResearchBatchResult,
  type ResearchSourceAttempt
} from './distributionFootprintResearch';

export {
  planCustomerAccessResearch,
  runResearchBatch,
  type CustomerAccessResearchReceipt,
  type CustomerAccessResearchResult,
  type DistributionFootprintPlan,
  type FootprintCandidate,
  type ResearchBatchResult,
  type ResearchSourceAttempt
};

const MIN_VERIFIED_CANDIDATES = 10;
const MAX_DELIVERED_TARGETS = 25;
const MIN_TARGET_CATEGORIES = 3;

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function recoveryScore(candidate: FootprintCandidate): number {
  const confidence = { high: 4, medium: 3, low: 1, unverified: 0 }[candidate.confidence];
  const activity = { recent: 4, active: 3, occasional: 1, uncertain: 0 }[candidate.activity];
  return confidence + activity + Math.min(3, candidate.competitorEvidence.length);
}

function discoveredThrough(provider: DistributionProvider): NonNullable<CustomerAccessChannel['discoveredThrough']> {
  return provider === 'dataforseo_backlinks'
    ? 'competitor_backlink'
    : provider === 'podcast_index'
      ? 'podcast_search'
      : 'youtube_search';
}

function outreachScript(type: DistributionTargetType): string {
  if (type === 'association') return 'script-05-association_member';
  if (type === 'complementary_partner') return 'script-06-referral_partner';
  if (type === 'community') return 'script-03-community_member';
  return 'script-07-interview_invitation';
}

function recoveryToken(candidate: FootprintCandidate): string {
  return candidate.candidateId.replace(/^candidate_/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
}

/**
 * Recovery path for model-selection drift. Candidate IDs returned by the model are
 * advisory selection references, not customer evidence. If selection references an
 * ID outside the immutable provider candidate set, preserve the paid research by
 * building the network directly from provider-verified candidates instead of
 * failing the order. Canonical research minimums still fail closed.
 */
export function recoverCustomerAccessFromVerifiedCandidates(
  order: PaidTestOrder,
  verdict: EvaluationResult,
  plan: DistributionFootprintPlan,
  batches: ResearchBatchResult[]
): CustomerAccessResearchResult {
  const attempts = batches.flatMap(batch => batch.attempts);
  const successful = attempts.filter(attempt => attempt.success);
  const providerTypes = new Set(successful.map(attempt => attempt.sourceType));
  const rejectedUrls = batches.flatMap(batch => batch.rejectedUrls);
  const deduped = new Map<string, FootprintCandidate>();

  for (const candidate of batches.flatMap(batch => batch.candidates)) {
    const key = candidate.publicUrl.trim().toLowerCase().replace(/\/$/, '');
    if (!key) continue;
    const current = deduped.get(key);
    if (!current || recoveryScore(candidate) > recoveryScore(current)) deduped.set(key, candidate);
  }

  const candidates = [...deduped.values()].sort((left, right) => recoveryScore(right) - recoveryScore(left));
  if (candidates.length < MIN_VERIFIED_CANDIDATES) {
    throw new Error(`Distribution Footprint recovery found only ${candidates.length} verified candidates; ${MIN_VERIFIED_CANDIDATES} are required`);
  }

  const byType = new Map<DistributionTargetType, FootprintCandidate[]>();
  for (const candidate of candidates) {
    const group = byType.get(candidate.targetTypeHint) || [];
    group.push(candidate);
    byType.set(candidate.targetTypeHint, group);
  }
  if (byType.size < MIN_TARGET_CATEGORIES) {
    throw new Error(`Distribution Footprint recovery found only ${byType.size} target categories; ${MIN_TARGET_CATEGORIES} are required`);
  }

  const selected: FootprintCandidate[] = [];
  const selectedIds = new Set<string>();
  for (const group of byType.values()) {
    const candidate = group[0];
    if (!candidate) continue;
    selected.push(candidate);
    selectedIds.add(candidate.candidateId);
    if (selected.length >= MIN_TARGET_CATEGORIES) break;
  }
  for (const candidate of candidates) {
    if (selected.length >= MAX_DELIVERED_TARGETS) break;
    if (selectedIds.has(candidate.candidateId)) continue;
    selected.push(candidate);
    selectedIds.add(candidate.candidateId);
  }

  const researchDate = new Date().toISOString().slice(0, 10);
  const sources: BlueprintSource[] = [];
  const channels: CustomerAccessChannel[] = selected.map(candidate => {
    const token = recoveryToken(candidate);
    const sourceId = `source_recovered_${token}`;
    const type = candidate.targetTypeHint;
    sources.push({
      sourceId,
      title: candidate.title,
      url: candidate.publicUrl,
      publisher: candidate.publisher,
      accessedAt: candidate.observedAt,
      supports: [...candidate.competitorEvidence, ...candidate.factualSignals].slice(0, 8)
    });
    return {
      channelId: `channel_recovered_${token}`,
      community: candidate.title,
      platform: candidate.platform,
      publicUrl: candidate.publicUrl,
      relevance: `${candidate.title} was retained from verified provider research for ${clean(order.intake.targetBuyer)} after model selection referenced an unknown candidate ID.`,
      activity: candidate.activity,
      participationRules: 'Review the target’s current public contact, submission, sponsorship, review, guest, speaker, or participation rules before outreach.',
      recommendedApproach: 'Lead with a useful, audience-specific contribution and a transparent request rather than a mass promotional pitch.',
      usefulTopic: clean(order.intake.problem || verdict.idea.painfulProblem),
      risk: 'Audience fit, timing, commercial terms, and response are not guaranteed.',
      firstAction: 'Open the verified public source, confirm its current access route, and personalize the prepared asset.',
      confidence: candidate.confidence,
      researchDate,
      sourceIds: [sourceId],
      targetType: type,
      discoveredThrough: discoveredThrough(candidate.provider),
      competitorEvidence: candidate.competitorEvidence,
      audienceOwner: candidate.audienceOwner,
      accessPath: 'Use the target’s current public contact or submission route.',
      preparedAsset: 'Audience-specific interview or educational resource outline.',
      outreachScriptId: outreachScript(type)
    };
  });

  const targetTypeCounts = channels.reduce<Record<string, number>>((counts, channel) => {
    const type = channel.targetType || 'community';
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  const publicExpertsAndPartners = channels
    .filter(channel => channel.targetType !== 'community')
    .slice(0, 8)
    .map(channel => ({
      name: channel.community,
      role: channel.targetType?.replace(/_/g, ' ') || channel.platform,
      publicUrl: channel.publicUrl,
      relevance: channel.relevance,
      sourceIds: channel.sourceIds
    }));

  return {
    research: {
      status: 'complete',
      researchDate,
      sources,
      channels,
      publicExpertsAndPartners
    },
    receipt: {
      provider: 'distribution_footprint',
      model: 'verified-provider-recovery',
      requestedAt: plan.createdAt,
      completedAt: new Date().toISOString(),
      packs: plan.packs,
      webSearchQueries: [...new Set(attempts.map(attempt => attempt.query).filter(Boolean))],
      attemptedSourceCount: attempts.length,
      successfulSourceCount: successful.length,
      sourceTypeCount: providerTypes.size,
      candidateChannelCount: candidates.length,
      verifiedChannelCount: channels.length,
      rejectedUrls,
      failedSources: attempts.filter(attempt => !attempt.success).map(attempt => ({
        sourceId: attempt.sourceId,
        reason: attempt.error || 'Provider task failed'
      })),
      sourceDefinitionIds: attempts.map(attempt => attempt.sourceId),
      seedDomains: plan.seedDomains,
      targetTypeCounts,
      responseHash: `verified-provider-recovery:${selected.map(candidate => candidate.candidateId).join(',')}`
    }
  };
}

export async function finalizeCustomerAccessResearch(
  env: Env,
  order: PaidTestOrder,
  verdict: EvaluationResult,
  plan: DistributionFootprintPlan,
  batches: ResearchBatchResult[]
): Promise<CustomerAccessResearchResult> {
  try {
    return await finalizeDistributionFootprintResearch(env, order, verdict, plan, batches);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('STEP5_RESEARCH_UNKNOWN_CANDIDATE_ID')) throw error;
    return recoverCustomerAccessFromVerifiedCandidates(order, verdict, plan, batches);
  }
}

export async function researchCustomerAccess(
  env: Env,
  order: PaidTestOrder,
  verdict: EvaluationResult
): Promise<CustomerAccessResearchResult> {
  const plan = planCustomerAccessResearch(order, verdict);
  const batch = await runResearchBatch(env, order, plan, plan.sourceIds);
  return finalizeCustomerAccessResearch(env, order, verdict, plan, [batch]);
}
