import type { GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';

export interface ExecutionCompletionEvidenceEntry {
  entryId?: string;
  actionId?: string;
  contactOrChannel?: string;
  date?: string;
  action?: string;
  response?: string;
  customerLanguage?: string;
  commitmentOffered?: string;
  commitmentReceived?: string;
  revenueCents?: number;
  founderMinutes?: number;
  variableCostCents?: number;
  sourceNote?: string;
}

export interface ExecutionCompletionCheckpointReview {
  dayNumber: number;
  completedAt?: string;
  evidenceSummary?: string;
  strongestEvidence?: string;
  nextAction?: string;
}

export interface ExecutionCompletionMetrics {
  outreachSent?: number;
  replies?: number;
  interviews?: number;
  qualifiedConversations?: number;
  commitments?: number;
  revenueCents?: number;
  founderMinutes?: number;
  variableCostCents?: number;
  leads?: number;
}

export interface ExecutionCompletionProgress {
  completedDays?: number[];
  evidenceNotes?: Record<string, string>;
  evidenceLedger?: ExecutionCompletionEvidenceEntry[];
  checkpointReviews?: ExecutionCompletionCheckpointReview[];
  metrics?: ExecutionCompletionMetrics;
}

export interface DayCompletionReadiness {
  dayNumber: number;
  ready: boolean;
  requiresStructuredEvidence: boolean;
  requiredEvidenceCount: number;
  structuredEvidenceCount: number;
  hasExecutionNote: boolean;
  hasStructuredEvidence: boolean;
  checkpointRequired: boolean;
  checkpointComplete: boolean;
  missingPriorDays: number[];
  reasons: string[];
}

export interface ObservedExecutionMetrics {
  commitments: number;
  revenueCents: number;
  founderMinutes: number;
  variableCostCents: number;
}

const EXTERNAL_EVIDENCE_TARGETS = new Set([
  'verified_channel',
  'qualified_buyer_batch',
  'existing_contact',
  'fulfillment_run',
]);

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nonNegativeInteger(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function meaningfulEvidence(entry: ExecutionCompletionEvidenceEntry): boolean {
  if (!text(entry.date) || !text(entry.action)) return false;
  if (!text(entry.contactOrChannel)) return false;
  return Boolean(
    text(entry.response)
    || text(entry.customerLanguage)
    || text(entry.commitmentOffered)
    || text(entry.commitmentReceived)
    || text(entry.sourceNote)
  );
}

function positiveCommitment(entry: ExecutionCompletionEvidenceEntry): boolean {
  if (nonNegativeInteger(entry.revenueCents) > 0) return true;
  const commitment = text(entry.commitmentReceived);
  if (!commitment) return false;
  return !/^(?:no|none|no commitment|declined|rejected|not yet|n\/?a|no response)$/i.test(commitment);
}

export function deriveObservedExecutionMetrics(entries: ExecutionCompletionEvidenceEntry[] = []): ObservedExecutionMetrics {
  return entries.reduce<ObservedExecutionMetrics>((totals, entry) => ({
    commitments: totals.commitments + (positiveCommitment(entry) ? 1 : 0),
    revenueCents: totals.revenueCents + nonNegativeInteger(entry.revenueCents),
    founderMinutes: totals.founderMinutes + nonNegativeInteger(entry.founderMinutes),
    variableCostCents: totals.variableCostCents + nonNegativeInteger(entry.variableCostCents),
  }), { commitments: 0, revenueCents: 0, founderMinutes: 0, variableCostCents: 0 });
}

function checkpointComplete(review: ExecutionCompletionCheckpointReview | undefined): boolean {
  if (!review) return false;
  return Boolean(
    text(review.completedAt)
    && text(review.evidenceSummary)
    && text(review.nextAction)
    && text(review.strongestEvidence)
  );
}

function evidenceQuantity(quantity: string | undefined): number {
  const match = text(quantity).match(/\b([1-9]\d?)\b/);
  return match ? Math.max(1, Number(match[1])) : 1;
}

export function dayCompletionReadiness(
  blueprint: GhostTownLaunchBlueprintV21,
  progress: ExecutionCompletionProgress,
  dayNumber: number,
): DayCompletionReadiness {
  const day = blueprint.dailyCalendar.find(item => item.dayNumber === dayNumber);
  if (!day) {
    return {
      dayNumber,
      ready: false,
      requiresStructuredEvidence: true,
      requiredEvidenceCount: 1,
      structuredEvidenceCount: 0,
      hasExecutionNote: false,
      hasStructuredEvidence: false,
      checkpointRequired: false,
      checkpointComplete: false,
      missingPriorDays: [],
      reasons: [`Day ${dayNumber} is not part of the canonical 30-day Blueprint.`],
    };
  }

  const packet = day.executionPacket;
  const actionIds = new Set<string>([
    `day-${dayNumber}`,
    ...(packet?.actions || []).map(action => action.actionId),
  ]);
  const matchingEvidence = (progress.evidenceLedger || []).filter(entry =>
    Boolean(entry.actionId && actionIds.has(entry.actionId) && meaningfulEvidence(entry))
  );
  const requiresStructuredEvidence = Boolean(packet?.targets.some(target => EXTERNAL_EVIDENCE_TARGETS.has(target.kind)));
  const requiredEvidenceCount = requiresStructuredEvidence
    ? Math.max(1, ...(packet?.actions || []).map(action => evidenceQuantity(action.quantity)))
    : 1;
  const structuredEvidenceCount = matchingEvidence.length;
  const hasStructuredEvidence = structuredEvidenceCount >= requiredEvidenceCount;
  const hasExecutionNote = Boolean(text(progress.evidenceNotes?.[day.completionKey]));
  const completed = new Set(progress.completedDays || []);
  const missingPriorDays = Array.from({ length: Math.max(0, dayNumber - 1) }, (_, index) => index + 1)
    .filter(priorDay => !completed.has(priorDay));
  const checkpoint = blueprint.adaptiveCheckpoints.find(item => item.dayNumber === dayNumber);
  const review = checkpoint
    ? (progress.checkpointReviews || []).find(item => item.dayNumber === dayNumber)
    : undefined;
  const isCheckpointComplete = checkpoint ? checkpointComplete(review) : true;
  const reasons: string[] = [];

  if (missingPriorDays.length) {
    const preview = missingPriorDays.slice(0, 4).join(', ');
    reasons.push(`Complete the earlier execution sequence first (missing Day${missingPriorDays.length === 1 ? '' : 's'} ${preview}${missingPriorDays.length > 4 ? ', …' : ''}).`);
  }

  if (requiresStructuredEvidence && !hasStructuredEvidence) {
    reasons.push(`Record ${requiredEvidenceCount} meaningful structured result${requiredEvidenceCount === 1 ? '' : 's'} for this day's declared action before completing it (${structuredEvidenceCount}/${requiredEvidenceCount} recorded).`);
  } else if (!requiresStructuredEvidence && structuredEvidenceCount === 0 && !hasExecutionNote) {
    reasons.push('Record the day outcome in the execution note or structured evidence log before completing it.');
  }

  if (checkpoint && !isCheckpointComplete) {
    reasons.push(`Save the Day ${dayNumber} checkpoint review with evidence strength, evidence summary, and next action before continuing.`);
  }

  return {
    dayNumber,
    ready: reasons.length === 0,
    requiresStructuredEvidence,
    requiredEvidenceCount,
    structuredEvidenceCount,
    hasExecutionNote,
    hasStructuredEvidence,
    checkpointRequired: Boolean(checkpoint),
    checkpointComplete: isCheckpointComplete,
    missingPriorDays,
    reasons,
  };
}

function candidateProgress(
  before: ExecutionCompletionProgress,
  requested: ExecutionCompletionProgress,
): ExecutionCompletionProgress {
  return {
    completedDays: requested.completedDays ?? before.completedDays ?? [],
    evidenceNotes: requested.evidenceNotes
      ? { ...(before.evidenceNotes || {}), ...requested.evidenceNotes }
      : before.evidenceNotes || {},
    evidenceLedger: requested.evidenceLedger ?? before.evidenceLedger ?? [],
    checkpointReviews: requested.checkpointReviews ?? before.checkpointReviews ?? [],
    metrics: { ...(before.metrics || {}), ...(requested.metrics || {}) },
  };
}

export function completionTransitionFailures(
  blueprint: GhostTownLaunchBlueprintV21,
  before: ExecutionCompletionProgress,
  requested: ExecutionCompletionProgress,
): Array<{ dayNumber: number; reasons: string[] }> {
  const beforeCompleted = new Set(before.completedDays || []);
  const after = candidateProgress(before, requested);
  const newlyCompleted = [...new Set(after.completedDays || [])]
    .filter(day => Number.isInteger(day) && day >= 1 && day <= 30 && !beforeCompleted.has(day))
    .sort((left, right) => left - right);

  return newlyCompleted.flatMap(dayNumber => {
    const readiness = dayCompletionReadiness(blueprint, after, dayNumber);
    return readiness.ready ? [] : [{ dayNumber, reasons: readiness.reasons }];
  });
}

export function executionProgressWithObservedMetrics(
  before: ExecutionCompletionProgress,
  requested: ExecutionCompletionProgress,
): ExecutionCompletionProgress {
  const candidate = candidateProgress(before, requested);
  const ledger = candidate.evidenceLedger || [];
  if (!ledger.length) return candidate;
  const observed = deriveObservedExecutionMetrics(ledger);
  return {
    ...candidate,
    metrics: {
      ...(candidate.metrics || {}),
      ...observed,
    },
  };
}
