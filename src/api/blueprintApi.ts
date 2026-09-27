import { authenticateRequest } from './auth';
import type { Env } from './env';
import type { PaidTestOrder } from '../types/paidTest';
import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';
import type { GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';
import { queueLaunchBlueprintOrder, startLaunchBlueprintWorkflow } from './blueprintFulfillment';
import {
  loadBlueprintPdf,
  loadBlueprintAssets,
  loadBlueprintProgress,
  loadBlueprintRecord,
  saveBlueprintProgress,
  type BlueprintProgress
} from './blueprintStore';
import {
  applyBlueprintIntegrityReceiptV21,
  loadBlueprintIntegrityReceiptV21,
  loadCanonicalBlueprintJsonV21
} from './blueprintStoreV21';
import {
  DAILY_EXECUTION_LOG_SCHEMA_VERSION,
  attachCanonicalExecutionReferences,
  deriveAcsReadinessAssessment,
  persistBlueprintExecutionArchitecture,
  type ExecutionProgressSnapshot
} from './blueprintExecutionStore';

const json = (body: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', ...headers }
});

const ACTIVE_BLUEPRINT_WORKFLOW_STATUSES = new Set([
  'queued',
  'running',
  'paused',
  'waiting',
  'waitingForPause'
]);

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

const paidOrderKey = (orderId: string) => `paid_test_order_${orderId}`;
const userOrdersKey = (email: string) => `paid_test_orders_${normalizedEmail(email)}`;

async function persistUncertaintyOrder(env: Env, order: PaidTestOrder): Promise<void> {
  order.updatedAt = new Date().toISOString();
  await env.KV.put(paidOrderKey(order.orderId), JSON.stringify(order));
  const key = userOrdersKey(order.email);
  const raw = await env.KV.get(key);
  if (!raw) return;
  const summaries = JSON.parse(raw) as Array<Record<string, unknown>>;
  const next = summaries.map(summary => summary.orderId === order.orderId
    ? {
        ...summary,
        status: order.status,
        updatedAt: order.updatedAt,
        fulfillmentError: order.fulfillmentError,
        uncertaintySprint: order.uncertaintySprint
      }
    : summary);
  await env.KV.put(key, JSON.stringify(next));
}

function isV21(blueprint: GhostTownLaunchBlueprint): blueprint is GhostTownLaunchBlueprintV21 {
  return (blueprint as GhostTownLaunchBlueprint & { blueprintVersion?: string }).blueprintVersion === '2.1';
}

function versionAttachedProgress(
  blueprint: GhostTownLaunchBlueprint,
  ownerId: string,
  progress: BlueprintProgress
): BlueprintProgress {
  if (!isV21(blueprint)) return progress;
  return attachCanonicalExecutionReferences(
    blueprint,
    ownerId,
    progress as unknown as ExecutionProgressSnapshot
  ) as unknown as BlueprintProgress;
}

function executionMetadata(blueprint: GhostTownLaunchBlueprint, progress: BlueprintProgress) {
  if (!isV21(blueprint)) return undefined;
  return {
    schemaVersion: DAILY_EXECUTION_LOG_SCHEMA_VERSION,
    acsReadiness: deriveAcsReadinessAssessment(progress as unknown as ExecutionProgressSnapshot)
  };
}

async function workflowStatusForRetry(env: Env, workflowId: string | undefined): Promise<string | null> {
  if (!workflowId || !env.LAUNCH_BLUEPRINT_WORKFLOW) return null;
  try {
    const instance = await env.LAUNCH_BLUEPRINT_WORKFLOW.get(workflowId);
    return (await instance.status()).status;
  } catch (error) {
    console.warn('Launch Blueprint retry could not inspect Workflow status', workflowId, error);
    return null;
  }
}

export async function ownedLaunchBlueprintOrder(request: Request, env: Env, orderId: string, requireReady = true): Promise<{ order: PaidTestOrder; email: string } | Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const raw = await env.KV.get(`paid_test_order_${orderId}`);
  if (!raw) return json({ error: 'Launch Blueprint not found' }, 404);
  const order = JSON.parse(raw) as PaidTestOrder;
  if (normalizedEmail(order.email) !== normalizedEmail(auth.email)) return json({ error: 'Launch Blueprint not found' }, 404);
  if (requireReady && (order.status !== 'ready' || order.artifactType !== 'launch_blueprint_v2')) {
    return json({
      error: order.fulfillmentError || (order.status === 'awaiting_seeds' || order.status === 'paid'
        ? 'Confirm two or three competitor or adjacent-product seeds to start research'
        : 'Launch Blueprint is not ready'),
      status: order.status,
      workflowId: order.fulfillmentWorkflowId,
      nextAction: order.status === 'awaiting_seeds' || order.status === 'paid'
        ? 'confirm_competitor_seeds'
        : order.status === 'uncertainty'
          ? 'answer_uncertainty_sprint'
          : undefined,
      uncertaintySprint: order.status === 'uncertainty' ? order.uncertaintySprint : undefined
    }, order.status === 'failed' || order.status === 'uncertainty' ? 409 : 425);
  }
  return { order, email: auth.email };
}

export async function handleLaunchBlueprint(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const record = await loadBlueprintRecord(env, orderId);
  if (!record) return json({ error: 'Canonical Launch Blueprint record not found' }, 404);
  const storedProgress = await loadBlueprintProgress(env, orderId, owned.email);
  const integrityReceipt = await loadBlueprintIntegrityReceiptV21(env, orderId);
  const blueprint = integrityReceipt && isV21(record.blueprint)
    ? applyBlueprintIntegrityReceiptV21(record.blueprint, integrityReceipt)
    : record.blueprint;
  const progress = versionAttachedProgress(blueprint, owned.email, storedProgress);
  return json({
    blueprint,
    progress,
    executionLog: executionMetadata(blueprint, progress),
    research: {
      provider: record.researchReceipt.provider,
      model: record.researchReceipt.model,
      completedAt: record.researchReceipt.completedAt,
      packs: record.researchReceipt.packs,
      webSearchQueries: record.researchReceipt.webSearchQueries,
      queryTerms: record.researchReceipt.webSearchQueries,
      attemptedSourceCount: record.researchReceipt.attemptedSourceCount,
      successfulSourceCount: record.researchReceipt.successfulSourceCount,
      sourceTypeCount: record.researchReceipt.sourceTypeCount,
      verifiedChannelCount: record.researchReceipt.verifiedChannelCount,
      rejectedUrlCount: record.researchReceipt.rejectedUrls.length,
      failedSourceCount: record.researchReceipt.failedSources.length,
      seedDomains: record.researchReceipt.seedDomains,
      targetTypeCounts: record.researchReceipt.targetTypeCounts
    }
  });
}

export async function handleLaunchBlueprintJson(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const record = await loadBlueprintRecord(env, orderId);
  if (!record) return json({ error: 'Canonical Launch Blueprint record not found' }, 404);
  const storedCanonicalJson = await loadCanonicalBlueprintJsonV21(env, orderId).catch(() => null);
  const canonicalJson = storedCanonicalJson || JSON.stringify(record.blueprint, null, 2);
  const integrityReceipt = await loadBlueprintIntegrityReceiptV21(env, orderId);
  return new Response(canonicalJson, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ghosttown-launch-blueprint-${orderId}.json"`,
      'Cache-Control': 'private, no-store',
      ...(integrityReceipt ? { 'X-GhostTown-SHA256': integrityReceipt.hashes.canonicalBlueprintSha256 } : {})
    }
  });
}

export async function handleLaunchBlueprintPdf(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const object = await loadBlueprintPdf(env, orderId);
  if (!object) return json({ error: 'Launch Blueprint PDF not found' }, 404);
  const integrityReceipt = await loadBlueprintIntegrityReceiptV21(env, orderId);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `attachment; filename="ghosttown-launch-blueprint-${orderId}.pdf"`);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('ETag', object.httpEtag);
  if (integrityReceipt) headers.set('X-GhostTown-SHA256', integrityReceipt.hashes.pdfSha256);
  return new Response(object.body, { headers });
}

export async function handleLaunchBlueprintAssets(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const object = await loadBlueprintAssets(env, orderId);
  if (!object) return json({ error: 'Launch Blueprint asset package not found' }, 404);
  const integrityReceipt = await loadBlueprintIntegrityReceiptV21(env, orderId);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', 'application/zip');
  headers.set('Content-Disposition', `attachment; filename="ghosttown-launch-blueprint-${orderId}-assets.zip"`);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('ETag', object.httpEtag);
  if (integrityReceipt) headers.set('X-GhostTown-SHA256', integrityReceipt.hashes.zipSha256);
  return new Response(object.body, { headers });
}

export async function handleLaunchBlueprintProgress(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const record = await loadBlueprintRecord(env, orderId);
  if (!record) return json({ error: 'Canonical Launch Blueprint record not found' }, 404);

  if (request.method === 'GET') {
    const stored = await loadBlueprintProgress(env, orderId, owned.email);
    const progress = versionAttachedProgress(record.blueprint, owned.email, stored);
    return json({
      progress,
      executionLog: executionMetadata(record.blueprint, progress)
    }, 200, { 'Cache-Control': 'private, no-store' });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const body = await request.json<Partial<BlueprintProgress>>();
  const initiallySaved = await saveBlueprintProgress(env, orderId, owned.email, body);
  const progress = versionAttachedProgress(record.blueprint, owned.email, initiallySaved);

  // Keep the existing progress JSON as a compatibility projection for the v2.1
  // account UI, but write the durable evidence/reminder/checkpoint architecture
  // into normalized, version-attached D1 tables.
  const compatibilityProgress = isV21(record.blueprint)
    ? await saveBlueprintProgress(env, orderId, owned.email, progress)
    : progress;
  const acsReadiness = isV21(record.blueprint)
    ? await persistBlueprintExecutionArchitecture(
        env,
        record.blueprint,
        owned.email,
        compatibilityProgress as unknown as ExecutionProgressSnapshot
      )
    : null;

  return json({
    progress: compatibilityProgress,
    executionLog: isV21(record.blueprint) ? {
      schemaVersion: DAILY_EXECUTION_LOG_SCHEMA_VERSION,
      acsReadiness
    } : undefined
  }, 200, { 'Cache-Control': 'private, no-store' });
}

export async function handleLaunchBlueprintUncertainty(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId, false);
  if (owned instanceof Response) return owned;
  const sprint = owned.order.uncertaintySprint;
  if (!sprint) return json({ error: 'No strategic uncertainty Sprint is available for this order' }, 404);
  if (request.method === 'GET') return json({ status: owned.order.status, sprint });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (owned.order.status !== 'uncertainty' || sprint.status !== 'open') {
    return json({ error: 'This strategic uncertainty Sprint is not waiting for answers' }, 409);
  }

  const body = await request.json<{ answers?: Array<{ questionId?: string; answer?: string }> }>();
  const supplied = new Map((body.answers || []).map(item => [String(item.questionId || ''), String(item.answer || '').trim()]));
  const now = new Date().toISOString();
  const responses = sprint.questions.map(question => {
    const answer = supplied.get(question.questionId) || '';
    if (answer.length < 3) throw new Error('Answer required: ' + question.question);
    if (answer.length > 4000) throw new Error('Answer is too long: ' + question.questionId);
    return {
      questionId: question.questionId,
      link: question.link,
      question: question.question,
      answer,
      answeredAt: now
    };
  });

  const previousIds = new Set(sprint.questions.map(question => question.questionId));
  owned.order.intake.strategicClarifications = [
    ...(owned.order.intake.strategicClarifications || []).filter(item => !previousIds.has(item.questionId)),
    ...responses
  ];
  owned.order.uncertaintySprint = {
    ...sprint,
    status: 'submitted',
    submittedAt: now,
    questions: sprint.questions.map(question => ({ ...question, answer: supplied.get(question.questionId) || '' }))
  };
  owned.order.updatedAt = now;
  owned.order.fulfillmentError = undefined;
  await env.KV.put('paid_test_order_' + orderId, JSON.stringify(owned.order));

  const queued = await startLaunchBlueprintWorkflow(env, orderId, 'uncertainty_resolved_' + crypto.randomUUID());
  return json({
    orderId,
    status: queued.order.status,
    workflowId: queued.workflowId,
    message: 'Answers saved. GhostTown is rerunning the Strategic Coherence Gate before building the 30-Day Sprint.'
  }, 202);
}

export async function handleLaunchBlueprintRetry(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId, false);
  if (owned instanceof Response) return owned;
  if (owned.order.uncertaintySprint?.status === 'open') {
    return json({
      error: 'Resolve the Strategic Uncertainty Sprint before retrying the 30-Day Sprint.',
      status: owned.order.status,
      nextAction: 'resolve_uncertainty_sprint',
      uncertaintySprint: owned.order.uncertaintySprint
    }, 409);
  }
  if (owned.order.status === 'ready' && owned.order.artifactType === 'launch_blueprint_v2') return json({ error: 'Launch Blueprint is already ready' }, 409);
  if (owned.order.status === 'awaiting_seeds' || owned.order.status === 'paid') {
    return json({ error: 'Confirm competitor seeds before starting research', nextAction: 'confirm_competitor_seeds' }, 409);
  }
  if (owned.order.status === 'uncertainty') {
    return json({ error: 'Answer the strategic uncertainty Sprint before retrying the 30-Day Sprint', nextAction: 'answer_uncertainty_sprint' }, 409);
  }
  if (owned.order.status === 'researching' || owned.order.status === 'generating') {
    const workflowStatus = await workflowStatusForRetry(env, owned.order.fulfillmentWorkflowId);
    if (!workflowStatus || ACTIVE_BLUEPRINT_WORKFLOW_STATUSES.has(workflowStatus) || workflowStatus === 'unknown') {
      return json({
        error: 'A Blueprint Workflow is already running',
        workflowId: owned.order.fulfillmentWorkflowId,
        workflowStatus: workflowStatus || 'unavailable'
      }, 409);
    }
    if (workflowStatus === 'complete') {
      return json({
        error: 'The Blueprint Workflow completed; refresh the Dashboard before retrying',
        workflowId: owned.order.fulfillmentWorkflowId,
        workflowStatus
      }, 409);
    }
    // The persisted order can remain researching/generating when an errored or
    // terminated Workflow exhausts resources before its catch handler updates KV.
    // Terminal Workflow truth wins here; the Stripe session is still reverified
    // below before a new, uniquely-idempotent Workflow instance can be queued.
  }
  if (!owned.order.stripeCheckoutSessionId) return json({ error: 'Stripe checkout session is missing' }, 409);
  const lockKey = `launch_blueprint_retry_${orderId}`;
  if (await env.KV.get(lockKey)) return json({ error: 'A Blueprint retry is already being queued' }, 409);
  await env.KV.put(lockKey, new Date().toISOString(), { expirationTtl: 900 });
  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(owned.order.stripeCheckoutSessionId)}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
    });
    const session = await response.json() as Record<string, unknown> & { error?: { message?: string } };
    if (!response.ok) return json({ error: session.error?.message || 'Stripe session could not be verified' }, 502);
    const retryEventId = `manual_retry_${crypto.randomUUID()}`;
    const queued = await queueLaunchBlueprintOrder(env, orderId, session, retryEventId);
    return json({
      orderId: queued.order.orderId,
      status: queued.order.status,
      artifactType: queued.order.artifactType,
      workflowId: queued.workflowId
    }, 202);
  } finally {
    await env.KV.delete(lockKey);
  }
}