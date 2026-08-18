import type { GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';

export interface ExecutionCompletionEvidenceEntry {
  actionId?: string;
  contactOrChannel?: string;
  date?: string;
  action?: string;
  response?: string;
  customerLanguage?: string;
  commitmentOffered?: string;
  commitmentReceived?: string;
  sourceNote?: string;
}

export interface ExecutionCompletionCheckpointReview {
  dayNumber: number;
  completedAt?: string;
  evidenceSummary?: string;
  strongestEvidence?: string;
  nextAction?: string;
}

export interface ExecutionCompletionProgress {
  completedDays?: number[];
  evidenceNotes?: Record<string, string>;
  evidenceLedger?: ExecutionCompletionEvidenceEntry[];
  checkpointReviews?: ExecutionCompletionCheckpointReview[];
}

export interface DayCompletionReadiness {
  dayNumber: number;
  ready: boolean;
  requiresStructuredEvidence: boolean;
  hasExecutionNote: boolean;
  hasStructuredEvidence: boolean;
  checkpointRequired: boolean;
  checkpointComplete: boolean;
  reasons: string[];
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

function checkpointComplete(review: ExecutionCompletionCheckpointReview | undefined): boolean {
  if (!review) return false;
  return Boolean(
    text(review.completedAt)
    && text(review.evidenceSummary)
    && text(review.nextAction)
    && text(review.strongestEvidence)
    && review.strongestEvidence !== 'none'
  );
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
      hasExecutionNote: false,
      hasStructuredEvidence: false,
      checkpointRequired: false,
      checkpointComplete: false,
      reasons: [`Day ${dayNumber} is not part of the canonical 30-day Blueprint.`],
    };
  }

  const packet = day.executionPacket;
  const actionIds = new Set<string>([
    `day-${dayNumber}`,
    ...(packet?.actions || []).map(action => action.actionId),
  ]);
  const hasExecutionNote = Boolean(text(progress.evidenceNotes?.[day.completionKey]));
  const hasStructuredEvidence = (progress.evidenceLedger || []).some(entry =>
    Boolean(entry.actionId && actionIds.has(entry.actionId) && meaningfulEvidence(entry))
  );
  const requiresStructuredEvidence = Boolean(packet?.targets.some(target => EXTERNAL_EVIDENCE_TARGETS.has(target.kind)));
  const checkpoint = blueprint.adaptiveCheckpoints.find(item => item.dayNumber === dayNumber);
  const review = checkpoint
    ? (progress.checkpointReviews || []).find(item => item.dayNumber === dayNumber)
    : undefined;
  const isCheckpointComplete = checkpoint ? checkpointComplete(review) : true;
  const reasons: string[] = [];

  if (requiresStructuredEvidence && !hasStructuredEvidence) {
    reasons.push('Record at least one structured result for this day before completing it.');
  } else if (!requiresStructuredEvidence && !hasStructuredEvidence && !hasExecutionNote) {
    reasons.push('Record the day outcome in the execution note or structured evidence log before completing it.');
  }

  if (checkpoint && !isCheckpointComplete) {
    reasons.push(`Save the Day ${dayNumber} checkpoint review with evidence strength, evidence summary, and next action before continuing.`);
  }

  return {
    dayNumber,
    ready: reasons.length === 0,
    requiresStructuredEvidence,
    hasExecutionNote,
    hasStructuredEvidence,
    checkpointRequired: Boolean(checkpoint),
    checkpointComplete: isCheckpointComplete,
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
