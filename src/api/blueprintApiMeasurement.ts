import type { Env } from './env';
import {
  handleLaunchBlueprintProgress as handleCoreProgress,
  handleLaunchBlueprintRetry as handleCoreRetry,
  ownedLaunchBlueprintOrder
} from './blueprintApiCore';
import { loadBlueprintProgress } from './blueprintStore';
import { commercialEventAttribution } from './commercialAttribution';
import { recordCommercialFunnelEvent, type CommercialFunnelEventInput } from './analytics';
import type { CommercialEventName } from '../types/commercialAttribution';
import type { PaidTestOrder } from '../types/paidTest';

interface ProgressEvidenceEntry {
  entryId?: string;
  actionId?: string;
  checkpointId?: string;
}

interface ProgressShape {
  completedDays?: number[];
  evidenceLedger?: ProgressEvidenceEntry[];
}

async function safeRecord(
  env: Env,
  eventName: CommercialEventName,
  input: CommercialFunnelEventInput
): Promise<void> {
  try {
    await recordCommercialFunnelEvent(env, eventName, input);
  } catch (error) {
    // Measurement must not turn a successfully persisted customer action into a
    // failed product action. The Q5 acceptance gate separately verifies the
    // analytics store and will fail closed if measurement is unavailable.
    console.warn(`Commercial event ${eventName} could not be recorded`, error);
  }
}

function completedDays(progress: ProgressShape | null | undefined): Set<number> {
  return new Set((progress?.completedDays || []).filter(day => Number.isInteger(day) && day >= 1 && day <= 30));
}

function evidenceIds(progress: ProgressShape | null | undefined): Set<string> {
  return new Set((progress?.evidenceLedger || [])
    .map(entry => typeof entry.entryId === 'string' ? entry.entryId : '')
    .filter(Boolean));
}

function orderAttribution(order: PaidTestOrder) {
  return commercialEventAttribution(order.commercialAttribution || order.intake.attribution);
}

export async function handleLaunchBlueprintProgress(
  request: Request,
  env: Env,
  orderId: string
): Promise<Response> {
  if (request.method !== 'POST') return handleCoreProgress(request, env, orderId);

  const owned = await ownedLaunchBlueprintOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const before = await loadBlueprintProgress(env, orderId, owned.email) as unknown as ProgressShape;
  const response = await handleCoreProgress(request, env, orderId);
  if (!response.ok) return response;

  let after: ProgressShape = {};
  try {
    const body = await response.clone().json<{ progress?: ProgressShape }>();
    after = body.progress || {};
  } catch {
    return response;
  }

  const beforeDays = completedDays(before);
  const newlyCompleted = [...completedDays(after)].filter(day => !beforeDays.has(day)).sort((a, b) => a - b);
  const beforeEvidence = evidenceIds(before);
  const newEvidence = (after.evidenceLedger || []).filter(entry => entry.entryId && !beforeEvidence.has(entry.entryId));
  const common: CommercialFunnelEventInput = {
    ownerId: owned.email,
    orderId,
    verdictId: owned.order.verdictId,
    ...orderAttribution(owned.order)
  };

  for (const day of newlyCompleted) {
    await safeRecord(env, 'day_completed', { ...common, content: `day:${day}` });
  }
  for (const entry of newEvidence) {
    await safeRecord(env, 'evidence_recorded', {
      ...common,
      content: entry.actionId || entry.checkpointId || entry.entryId
    });
  }

  return response;
}

export async function handleLaunchBlueprintRetry(
  request: Request,
  env: Env,
  orderId: string
): Promise<Response> {
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId, false);
  if (owned instanceof Response) return owned;
  const response = await handleCoreRetry(request, env, orderId);
  if (response.status === 202) {
    await safeRecord(env, 'blueprint_retry_requested', {
      ownerId: owned.email,
      orderId,
      verdictId: owned.order.verdictId,
      content: 'retry_queued',
      ...orderAttribution(owned.order)
    });
  }
  return response;
}
