import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { PaidTestOrder } from '../types/paidTest';
import type { BlueprintSource, CompetitorReviewIntelligence, CustomerAccessChannel, DistributionTargetType } from '../types/launchBlueprint';
import { currentCustomerAccessChannels, researchEvidenceRoleForTargetType, researchEvidenceRoleReason } from './researchEvidenceRole';
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

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function recoveryScore(candidate: FootprintCandidate): number {
  const confidence = { high: 4, medium: 3, low: 1, unverified: 0 }[candidate.confidence];
  const activity = { recent: 4, active: 3, occasional: 1, uncertain: 0 }[candidate.activity];
  const currentActivity = candidate.currentActivityStatus === 'verified_current' ? 6 : candidate.currentActivityStatus === 'verified_inactive' ? -2 : 0;
  return confidence + activity + currentActivity + Math.min(3, candidate.competitorEvidence.length);
}

function discoveredThrough(provider: DistributionProvider): NonNullable<CustomerAccessChannel['discoveredThrough']> {
  return provider === 'dataforseo_backlinks' || provider === 'rankparse_backlinks'
    ? 'competitor_backlink'
    : provider === 'podcast_index'
      ? 'podcast_search'
      : provider === 'google_grounded_customer_access'
        ? 'grounded_customer_access_search'
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

function recoverableDiversityOrSelectionFailure(message: string): boolean {
  return message.includes('STEP5_RESEARCH_UNKNOWN_CANDIDATE_ID')
    || /used only \d+ provider types/i.test(message)
    || /Research & Customer Access failed its quality gate/i.test(message);
}

/**
 * Recovery path for selection drift or a provider/content diversity-only failure.
 * The customer is never released an invented target. Recovery uses only candidates
 * already verified by provider research and still fails closed when the canonical
 * minimum of ten verified candidates cannot be satisfied. Content/provider type
 * diversity is useful ranking metadata, not a release quota.
 */
export function recoverCustomerAccessFromVerifiedCandidates(
  order: PaidTestOrder,
  verdict: EvaluationResult,
  plan: DistributionFootprintPlan,
  batches: ResearchBatchResult[],
  competitorReviewIntelligence?: CompetitorReviewIntelligence
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

  const currentAccessCandidates = candidates.filter(candidate =>
    candidate.targetTypeHint === 'community'
    && candidate.currentActivityStatus === 'verified_current'
    && Boolean(candidate.currentActivityVerifiedAt)
  );
  if (currentAccessCandidates.length < 3) {
    const accessAttempts = attempts
      .filter(attempt => attempt.sourceId.startsWith('customer_access:') || attempt.sourceId.startsWith('youtube_access:'))
      .map(attempt => `${attempt.sourceId}=${attempt.success ? `ok:${attempt.candidateCount}` : `failed:${attempt.error || 'unknown'}`}`)
      .join(' | ');
    const candidateDiagnostics = candidates
      .filter(candidate => candidate.targetTypeHint === 'community')
      .slice(0, 8)
      .map(candidate => `${candidate.provider}:${candidate.currentActivityStatus}:${candidate.evidenceDate || 'undated'}:${candidate.publicUrl}`)
      .join(' | ');
    throw new Error(
      `Distribution Footprint recovery found only ${currentAccessCandidates.length} currently verified customer-access candidates; at least 3 are required. ` +
      `Access attempts: ${accessAttempts || 'none'}. Community candidates: ${candidateDiagnostics || 'none'}`
    );
  }
  const priorityAccess = currentAccessCandidates.slice(0, 5);
  const priorityIds = new Set(priorityAccess.map(candidate => candidate.candidateId));
  const selected = [
    ...priorityAccess,
    ...candidates.filter(candidate => !priorityIds.has(candidate.candidateId))
  ].slice(0, MAX_DELIVERED_TARGETS);
  const researchDate = new Date().toISOString().slice(0, 10);
  const sources: BlueprintSource[] = [...(competitorReviewIntelligence?.sources || [])];
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
      evidenceDate: candidate.evidenceDate,
      evidenceDateSource: candidate.evidenceDateSource,
      evidenceRecency: candidate.evidenceRecency,
      supports: [...candidate.competitorEvidence, ...candidate.factualSignals].slice(0, 8)
    });
    return {
      channelId: `channel_recovered_${token}`,
      community: candidate.title,
      platform: candidate.platform,
      publicUrl: candidate.publicUrl,
      relevance: `${candidate.title} was retained from provider-verified research for ${clean(order.intake.targetBuyer)} after the model-selection layer could not produce a release-safe network.`,
      activity: candidate.activity,
      participationRules: 'Review the target’s current public contact, submission, sponsorship, review, guest, speaker, or participation rules before outreach.',
      recommendedApproach: 'Lead with a useful, audience-specific contribution and a transparent request rather than a mass promotional pitch.',
      usefulTopic: clean(order.intake.problem || verdict.idea.painfulProblem),
      risk: 'Audience fit, timing, commercial terms, and response are not guaranteed.',
      firstAction: 'Open the verified public source, confirm its current access route, and personalize the prepared asset.',
      confidence: candidate.confidence,
      researchDate,
      evidenceDate: candidate.evidenceDate,
      evidenceDateSource: candidate.evidenceDateSource,
      evidenceRecency: candidate.evidenceRecency,
      currentActivityStatus: candidate.currentActivityStatus,
      currentActivityVerifiedAt: candidate.currentActivityVerifiedAt,
      currentActivityEvidence: candidate.currentActivityEvidence,
      sourceIds: [sourceId],
      targetType: type,
      evidenceRole: researchEvidenceRoleForTargetType(type),
      evidenceRoleReason: researchEvidenceRoleReason(researchEvidenceRoleForTargetType(type)),
      discoveredThrough: discoveredThrough(candidate.provider),
      competitorEvidence: candidate.competitorEvidence,
      audienceOwner: candidate.audienceOwner,
      accessPath: 'Use the target’s current public contact or submission route.',
      preparedAsset: 'Audience-specific interview or educational resource outline.',
      outreachScriptId: outreachScript(type)
    };
  });

  const currentCustomerAccess = currentCustomerAccessChannels(channels);
  if (currentCustomerAccess.length < 3) {
    throw new Error(`Distribution Footprint recovery retained only ${currentCustomerAccess.length} currently verified customer-access targets; at least 3 are required`);
  }

  const targetTypeCounts = channels.reduce<Record<string, number>>((counts, channel) => {
    const type = channel.targetType || 'community';
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  const publicExpertsAndPartners = channels
    .filter(channel => channel.evidenceRole === 'partnership')
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
      publicExpertsAndPartners,
      competitorReviewIntelligence
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
  batches: ResearchBatchResult[],
  competitorReviewIntelligence?: CompetitorReviewIntelligence
): Promise<CustomerAccessResearchResult> {
  try {
    return await finalizeDistributionFootprintResearch(
      env,
      order,
      verdict,
      plan,
      batches,
      competitorReviewIntelligence
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!recoverableDiversityOrSelectionFailure(message)) throw error;
    return recoverCustomerAccessFromVerifiedCandidates(
      order,
      verdict,
      plan,
      batches,
      competitorReviewIntelligence
    );
  }
}

export async function researchCustomerAccess(
  env: Env,
  order: PaidTestOrder,
  verdict: EvaluationResult,
  competitorReviewIntelligence?: CompetitorReviewIntelligence
): Promise<CustomerAccessResearchResult> {
  const plan = planCustomerAccessResearch(
    order,
    verdict,
    competitorReviewIntelligence?.customerLanguagePhrases || []
  );
  const batch = await runResearchBatch(env, order, plan, plan.sourceIds);
  return finalizeCustomerAccessResearch(
    env,
    order,
    verdict,
    plan,
    [batch],
    competitorReviewIntelligence
  );
}
