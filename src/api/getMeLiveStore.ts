import type { Env } from './env';
import type {
  GetMeLiveAsset,
  GetMeLiveConfiguration,
  GetMeLiveCustomDomain,
  GetMeLiveHosting,
  GetMeLiveOrder,
  GetMeLiveProviderState,
  GetMeLivePublishAttempt,
  GetMeLiveRelease,
  GetMeLiveReleaseKind,
  GetMeLiveShareDraft
} from '../types/getMeLive';
import type { WebsiteCreationResult } from '../types/customWebsite';

const PREVIEW_PREFIX = 'get-me-live';

function db(env: Env): D1Database {
  if (!env.DB) throw new Error('Get Me Live requires the D1 binding');
  return env.DB;
}

function bucket(env: Env): R2Bucket {
  if (!env.BLUEPRINTS) throw new Error('Get Me Live requires the private R2 binding');
  return env.BLUEPRINTS;
}

function previewKey(orderId: string): string {
  return `${PREVIEW_PREFIX}/${orderId}/preview.json`;
}

function htmlKey(orderId: string): string {
  return `${PREVIEW_PREFIX}/${orderId}/preview.html`;
}

function assetKey(orderId: string, assetId: string): string {
  return `${PREVIEW_PREFIX}/${orderId}/assets/${assetId}`;
}

interface GetMeLiveRow {
  order_id: string;
  owner_id: string;
  source_sprint_order_id: string;
  source_blueprint_id: string | null;
  offer_id: string;
  offer_version: string;
  stripe_price_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: GetMeLiveOrder['status'];
  configuration_json: string | null;
  provider_state_json: string;
  preview_r2_key: string | null;
  public_url: string | null;
  custom_domain: string | null;
  deployment_receipt_json: string | null;
  hosting_json?: string | null;
  custom_domain_json?: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  published_at: string | null;
  failure: string | null;
}

function toOrder(row: GetMeLiveRow): GetMeLiveOrder {
  return {
    orderId: row.order_id,
    ownerId: row.owner_id,
    sourceSprintOrderId: row.source_sprint_order_id,
    sourceBlueprintId: row.source_blueprint_id || undefined,
    offerId: 'ghosttown_get_me_live_v1',
    offerVersion: '1.0',
    stripePriceId: row.stripe_price_id,
    stripeCheckoutSessionId: row.stripe_checkout_session_id || undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id || undefined,
    status: row.status,
    configuration: row.configuration_json ? JSON.parse(row.configuration_json) as GetMeLiveConfiguration : undefined,
    providerState: JSON.parse(row.provider_state_json) as GetMeLiveProviderState,
    publicUrl: row.public_url || undefined,
    customDomain: row.custom_domain || undefined,
    deploymentReceipt: row.deployment_receipt_json ? JSON.parse(row.deployment_receipt_json) as GetMeLiveOrder['deploymentReceipt'] : undefined,
    hosting: row.hosting_json ? JSON.parse(row.hosting_json) as GetMeLiveHosting : undefined,
    customDomainState: row.custom_domain_json
      ? JSON.parse(row.custom_domain_json) as GetMeLiveCustomDomain
      : row.custom_domain ? legacyCustomDomain(row.custom_domain, row.updated_at) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at || undefined,
    publishedAt: row.published_at || undefined,
    failure: row.failure || undefined
  };
}
/**
 * A pre-v4 order stored only the domain name, written right after the attach
 * call, so it is never presumed active (plan §20.3). It reads as `connecting`
 * (version 0 = not persisted yet); the first explicit reconcile persists it.
 */
function legacyCustomDomain(name: string, at: string): GetMeLiveCustomDomain {
  const host = name.trim().toLowerCase();
  return {
    schemaVersion: 'get-me-live-custom-domain-v1', version: 0, name: host, hosts: [host], zoneId: '',
    status: 'connecting', step: 'attached', addedAt: at, legacy: true
  };
}
export async function loadGetMeLiveOrder(env: Env, orderId: string): Promise<GetMeLiveOrder | null> {
  const row = await db(env).prepare(`
    SELECT * FROM get_me_live_orders WHERE order_id = ?
  `).bind(orderId).first<GetMeLiveRow>();
  return row ? toOrder(row) : null;
}

export async function loadGetMeLiveBySprint(env: Env, ownerId: string, sourceSprintOrderId: string): Promise<GetMeLiveOrder | null> {
  const row = await db(env).prepare(`
    SELECT * FROM get_me_live_orders WHERE owner_id = ? AND source_sprint_order_id = ?
  `).bind(ownerId.trim().toLowerCase(), sourceSprintOrderId).first<GetMeLiveRow>();
  return row ? toOrder(row) : null;
}

export async function listGetMeLiveOrders(env: Env, ownerId: string): Promise<GetMeLiveOrder[]> {
  const result = await db(env).prepare(`
    SELECT * FROM get_me_live_orders WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50
  `).bind(ownerId.trim().toLowerCase()).all<GetMeLiveRow>();
  return (result.results || []).map(toOrder);
}

export async function createGetMeLiveOrder(env: Env, order: GetMeLiveOrder): Promise<void> {
  await db(env).prepare(`
    INSERT INTO get_me_live_orders (
      order_id, owner_id, source_sprint_order_id, source_blueprint_id, offer_id,
      offer_version, stripe_price_id, status, provider_state_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    order.orderId, order.ownerId, order.sourceSprintOrderId, order.sourceBlueprintId || null,
    order.offerId, order.offerVersion, order.stripePriceId, order.status,
    JSON.stringify(order.providerState), order.createdAt, order.updatedAt
  ).run();
}
/** Statuses a generic order write can never move an order out of (plan §2.6). */
const PUBLICATION_HELD_STATUSES = `('publishing', 'verifying', 'live')`;

/**
 * Generic order write for business choices and provider connections.
 *
 * It never writes publication-owned columns (`public_url`, `custom_domain`,
 * `deployment_receipt_json`, `published_at`, `failure`, `hosting_json`,
 * `custom_domain_json`); only the targeted publication functions below do. Its
 * status write cannot knock an order out of an in-flight or live publication
 * state, so a stale full-row write racing a publish is harmless.
 */
export async function updateGetMeLiveOrder(env: Env, order: GetMeLiveOrder): Promise<void> {
  await db(env).prepare(`
    UPDATE get_me_live_orders SET
      source_blueprint_id = ?, stripe_checkout_session_id = ?, stripe_payment_intent_id = ?,
      status = CASE WHEN status IN ${PUBLICATION_HELD_STATUSES} THEN status ELSE ? END,
      configuration_json = ?, provider_state_json = ?, updated_at = ?, paid_at = ?
    WHERE order_id = ? AND owner_id = ?
  `).bind(
    order.sourceBlueprintId || null, order.stripeCheckoutSessionId || null,
    order.stripePaymentIntentId || null, order.status,
    order.configuration ? JSON.stringify(order.configuration) : null,
    JSON.stringify(order.providerState), order.updatedAt, order.paidAt || null,
    order.orderId, order.ownerId
  ).run();
}

/** Compare-and-swap status transition made by publication (plan §2.6 rule 5). */
export async function transitionGetMeLiveStatus(
  env: Env,
  orderId: string,
  to: GetMeLiveOrder['status'],
  from: { only?: GetMeLiveOrder['status'][]; except?: GetMeLiveOrder['status'][] }
): Promise<boolean> {
  const list = from.only || from.except || [];
  const placeholders = list.map(() => '?').join(', ');
  const condition = from.only ? `status IN (${placeholders})` : `status NOT IN (${placeholders})`;
  const result = await db(env).prepare(`UPDATE get_me_live_orders SET status = ?, updated_at = ? WHERE order_id = ? AND ${condition}`)
    .bind(to, new Date().toISOString(), orderId, ...list).run();
  return (result.meta?.changes ?? 0) === 1;
}

interface PublishAttemptRow {
  get_me_live_order_id: string;
  attempt_id: string;
  kind: GetMeLiveReleaseKind;
  build_id: string;
  custom_domain: string | null;
  phase: GetMeLivePublishAttempt['phase'];
  deployment_id: string | null;
  deployment_url: string | null;
  claimed_at: string;
  deployed_at: string | null;
  expires_at: string;
}

function toPublishAttempt(row: PublishAttemptRow): GetMeLivePublishAttempt {
  return {
    orderId: row.get_me_live_order_id,
    attemptId: row.attempt_id,
    kind: row.kind,
    buildId: row.build_id,
    customDomain: row.custom_domain || undefined,
    phase: row.phase,
    deploymentId: row.deployment_id || undefined,
    deploymentUrl: row.deployment_url || undefined,
    claimedAt: row.claimed_at,
    deployedAt: row.deployed_at || undefined,
    expiresAt: row.expires_at
  };
}

export const PUBLISH_CLAIM_TTL_MS = 5 * 60 * 1000;
export const PUBLISH_DEPLOY_TTL_MS = 10 * 60 * 1000;
export const CLAIM_EXPIRED_MESSAGE = 'Your website did not finish going online. Please try Go Live again.';
export const DEPLOY_EXPIRED_MESSAGE = 'Cloudflare accepted the site but it did not come online in time. Please try Go Live again.';

export function newReleaseId(): string {
  return `rel_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

export function isPublishAttemptExpired(attempt: GetMeLivePublishAttempt, now = Date.now()): boolean {
  return Date.parse(attempt.expiresAt) <= now;
}

export async function loadPublishAttempt(env: Env, orderId: string): Promise<GetMeLivePublishAttempt | null> {
  const row = await db(env).prepare(`SELECT * FROM get_me_live_publish_attempts WHERE get_me_live_order_id = ?`)
    .bind(orderId).first<PublishAttemptRow>();
  return row ? toPublishAttempt(row) : null;
}

/**
 * Claims the single unverified publish attempt an order may have (plan §2.4).
 * The table's primary key on the order is what enforces "one at a time"; an
 * expired attempt is settled as failed (compare-and-swap) and the claim retried once.
 */
export async function claimPublishAttempt(
  env: Env,
  orderId: string,
  input: { kind: GetMeLiveReleaseKind; buildId: string; customDomain?: string }
): Promise<{ claimed: true; attempt: GetMeLivePublishAttempt } | { claimed: false; existing: GetMeLivePublishAttempt }> {
  for (let round = 0; round < 2; round += 1) {
    const now = new Date();
    const attempt: GetMeLivePublishAttempt = {
      orderId, attemptId: newReleaseId(), kind: input.kind, buildId: input.buildId, customDomain: input.customDomain,
      phase: 'claimed', claimedAt: now.toISOString(), expiresAt: new Date(now.getTime() + PUBLISH_CLAIM_TTL_MS).toISOString()
    };
    const result = await db(env).prepare(`
      INSERT INTO get_me_live_publish_attempts (
        get_me_live_order_id, attempt_id, kind, build_id, custom_domain, phase, claimed_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'claimed', ?, ?)
      ON CONFLICT(get_me_live_order_id) DO NOTHING
    `).bind(orderId, attempt.attemptId, attempt.kind, attempt.buildId, attempt.customDomain || null, attempt.claimedAt, attempt.expiresAt).run();
    if ((result.meta?.changes ?? 0) === 1) return { claimed: true, attempt };
    const existing = await loadPublishAttempt(env, orderId);
    if (!existing) continue;
    if (!isPublishAttemptExpired(existing, now.getTime()) || round === 1) return { claimed: false, existing };
    await settlePublishFailure(env, existing, existing.phase === 'deployed' ? DEPLOY_EXPIRED_MESSAGE : CLAIM_EXPIRED_MESSAGE);
  }
  const existing = await loadPublishAttempt(env, orderId);
  if (existing) return { claimed: false, existing };
  throw new Error('Publishing is busy right now. Please try again.');
}

/** Compare-and-swap: false means the claim was lost to a takeover and the caller must stop. */
export async function recordPublishDeployment(
  env: Env,
  attempt: GetMeLivePublishAttempt,
  deployment: { deploymentId: string; deploymentUrl?: string }
): Promise<GetMeLivePublishAttempt | null> {
  const now = new Date();
  const deployedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + PUBLISH_DEPLOY_TTL_MS).toISOString();
  const result = await db(env).prepare(`
    UPDATE get_me_live_publish_attempts
    SET phase = 'deployed', deployment_id = ?, deployment_url = ?, deployed_at = ?, expires_at = ?
    WHERE get_me_live_order_id = ? AND attempt_id = ? AND phase = 'claimed'
  `).bind(deployment.deploymentId, deployment.deploymentUrl || null, deployedAt, expiresAt, attempt.orderId, attempt.attemptId).run();
  if ((result.meta?.changes ?? 0) !== 1) return null;
  return { ...attempt, phase: 'deployed', deploymentId: deployment.deploymentId, deploymentUrl: deployment.deploymentUrl, deployedAt, expiresAt };
}

const ATTEMPT_STILL_OPEN = `EXISTS (SELECT 1 FROM get_me_live_publish_attempts WHERE get_me_live_order_id = ? AND attempt_id = ?)`;

/**
 * Atomic success settlement (one D1 batch = one transaction). Every statement is
 * guarded by the attempt still being open, so a second verifier that observed the
 * same marker changes nothing. Returns true only for the call that settled it.
 */
export async function settlePublishSuccess(env: Env, input: {
  attempt: GetMeLivePublishAttempt;
  release: { pagesUrl: string; verifiedUrl: string; verifiedAt: string; receiptJson: string; customDomain?: string };
  order: { deploymentReceiptJson: string; hostingJson: string; publicUrl?: string; publishedAt?: string };
}): Promise<boolean> {
  const { attempt, release, order } = input;
  if (attempt.phase !== 'deployed' || !attempt.deploymentId) throw new Error('Only a deployed publish attempt can be settled as verified');
  const insert = db(env).prepare(`
    INSERT INTO get_me_live_releases (
      release_id, get_me_live_order_id, kind, build_id, deployment_id, deployment_url, pages_url,
      custom_domain, verified_url, verified_at, backfilled, receipt_json, created_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?
    WHERE ${ATTEMPT_STILL_OPEN}
    ON CONFLICT DO NOTHING
  `).bind(
    attempt.attemptId, attempt.orderId, attempt.kind, attempt.buildId, attempt.deploymentId, attempt.deploymentUrl || null,
    release.pagesUrl, release.customDomain || null, release.verifiedUrl, release.verifiedAt, release.receiptJson, release.verifiedAt,
    attempt.orderId, attempt.attemptId
  );
  const update = attempt.kind === 'launch'
    ? db(env).prepare(`
        UPDATE get_me_live_orders SET status = 'live', public_url = ?, published_at = ?, failure = NULL,
          deployment_receipt_json = ?, hosting_json = ?, updated_at = ?
        WHERE order_id = ? AND ${ATTEMPT_STILL_OPEN}
      `).bind(order.publicUrl || release.pagesUrl, order.publishedAt || release.verifiedAt, order.deploymentReceiptJson, order.hostingJson, release.verifiedAt, attempt.orderId, attempt.orderId, attempt.attemptId)
    : db(env).prepare(`
        UPDATE get_me_live_orders SET deployment_receipt_json = ?, hosting_json = ?, updated_at = ?
        WHERE order_id = ? AND ${ATTEMPT_STILL_OPEN}
      `).bind(order.deploymentReceiptJson, order.hostingJson, release.verifiedAt, attempt.orderId, attempt.orderId, attempt.attemptId);
  const remove = db(env).prepare(`DELETE FROM get_me_live_publish_attempts WHERE get_me_live_order_id = ? AND attempt_id = ?`)
    .bind(attempt.orderId, attempt.attemptId);
  const results = await db(env).batch([insert, update, remove]);
  return (results[2]?.meta?.changes ?? 0) === 1;
}

/**
 * Atomic failure settlement. A failed launch marks the order failed; a failed
 * republish or domain activation keeps the order live and records the failure on
 * `hosting.lastReleaseFailure`. Returns true only for the call that settled it.
 */
export async function settlePublishFailure(env: Env, attempt: GetMeLivePublishAttempt, message: string): Promise<boolean> {
  const at = new Date().toISOString();
  const update = attempt.kind === 'launch'
    ? db(env).prepare(`
        UPDATE get_me_live_orders SET status = 'failed', failure = ?, updated_at = ?
        WHERE order_id = ? AND ${ATTEMPT_STILL_OPEN}
      `).bind(message, at, attempt.orderId, attempt.orderId, attempt.attemptId)
    : db(env).prepare(`
        UPDATE get_me_live_orders SET hosting_json = json_set(hosting_json, '$.lastReleaseFailure', json(?)), updated_at = ?
        WHERE order_id = ? AND hosting_json IS NOT NULL AND ${ATTEMPT_STILL_OPEN}
      `).bind(JSON.stringify({ releaseId: attempt.attemptId, message, at }), at, attempt.orderId, attempt.orderId, attempt.attemptId);
  const remove = db(env).prepare(`DELETE FROM get_me_live_publish_attempts WHERE get_me_live_order_id = ? AND attempt_id = ?`)
    .bind(attempt.orderId, attempt.attemptId);
  const results = await db(env).batch([update, remove]);
  return (results[1]?.meta?.changes ?? 0) === 1;
}

interface ReleaseRow {
  release_id: string;
  get_me_live_order_id: string;
  kind: GetMeLiveReleaseKind;
  build_id: string;
  deployment_id: string;
  deployment_url: string | null;
  pages_url: string;
  custom_domain: string | null;
  verified_url: string;
  verified_at: string;
  backfilled: number;
  receipt_json: string;
  created_at: string;
}

function toRelease(row: ReleaseRow): GetMeLiveRelease {
  return {
    releaseId: row.release_id,
    orderId: row.get_me_live_order_id,
    kind: row.kind,
    buildId: row.build_id,
    deploymentId: row.deployment_id,
    deploymentUrl: row.deployment_url || undefined,
    pagesUrl: row.pages_url,
    customDomain: row.custom_domain || undefined,
    verifiedUrl: row.verified_url,
    verifiedAt: row.verified_at,
    backfilled: row.backfilled === 1,
    receiptJson: row.receipt_json,
    createdAt: row.created_at
  };
}

export async function listGetMeLiveReleases(env: Env, orderId: string): Promise<GetMeLiveRelease[]> {
  const result = await db(env).prepare(`
    SELECT * FROM get_me_live_releases WHERE get_me_live_order_id = ? ORDER BY created_at, rowid
  `).bind(orderId).all<ReleaseRow>();
  return (result.results || []).map(toRelease);
}

export async function loadLatestGetMeLiveRelease(env: Env, orderId: string): Promise<GetMeLiveRelease | null> {
  const row = await db(env).prepare(`
    SELECT * FROM get_me_live_releases WHERE get_me_live_order_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1
  `).bind(orderId).first<ReleaseRow>();
  return row ? toRelease(row) : null;
}

/**
 * Targeted write for publication hosting facts. `hosting_json` is publication-owned:
 * the generic order update never writes it. When `publicUrl` is given, `public_url`
 * is rewritten in the same statement so it always mirrors `hosting.pagesUrl`.
 */
export async function recordHosting(
  env: Env,
  orderId: string,
  hosting: GetMeLiveHosting,
  options: { publicUrl?: string } = {}
): Promise<void> {
  const now = new Date().toISOString();
  if (options.publicUrl) {
    await db(env).prepare(`UPDATE get_me_live_orders SET hosting_json = ?, public_url = ?, updated_at = ? WHERE order_id = ?`)
      .bind(JSON.stringify(hosting), options.publicUrl, now, orderId).run();
    return;
  }
  await db(env).prepare(`UPDATE get_me_live_orders SET hosting_json = ?, updated_at = ? WHERE order_id = ?`)
    .bind(JSON.stringify(hosting), now, orderId).run();
}

export async function saveGetMeLivePreview(
  env: Env,
  orderId: string,
  preview: WebsiteCreationResult,
  html: string
): Promise<void> {
  await bucket(env).put(previewKey(orderId), JSON.stringify(preview), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
  await bucket(env).put(htmlKey(orderId), html, {
    httpMetadata: { contentType: 'text/html; charset=utf-8' }
  });
  await db(env).prepare(`UPDATE get_me_live_orders SET preview_r2_key = ?, updated_at = ? WHERE order_id = ?`)
    .bind(previewKey(orderId), new Date().toISOString(), orderId).run();
}
export async function loadGetMeLivePreview(env: Env, orderId: string): Promise<{ preview: WebsiteCreationResult; html: string } | null> {
  const [previewObject, htmlObject] = await Promise.all([
    bucket(env).get(previewKey(orderId)),
    bucket(env).get(htmlKey(orderId))
  ]);
  if (!previewObject || !htmlObject) return null;
  return {
    preview: JSON.parse(await previewObject.text()) as WebsiteCreationResult,
    html: await htmlObject.text()
  };
}

export async function saveGetMeLiveLead(env: Env, input: {
  leadId: string;
  orderId: string;
  name: string;
  email: string;
  message?: string;
  consentText: string;
  sourcePath: string;
  createdAt: string;
}): Promise<void> {
  const result = await db(env).prepare(`
    INSERT INTO get_me_live_leads (
      lead_id, get_me_live_order_id, name, email, message, consent_text, source_path, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.leadId, input.orderId, input.name, input.email, input.message || null,
    input.consentText, input.sourcePath, input.createdAt
  ).run();
  if ((result.meta?.changes ?? 0) !== 1) throw new Error('Get Me Live lead could not be persisted');
}
export async function countGetMeLiveLeads(env: Env, orderId: string): Promise<number> {
  const row = await db(env).prepare(`SELECT COUNT(*) AS count FROM get_me_live_leads WHERE get_me_live_order_id = ?`)
    .bind(orderId).first<{ count: number }>();
  return Number(row?.count || 0);
}

export async function listGetMeLiveLeads(env: Env, orderId: string): Promise<Array<{
  leadId: string;
  name: string;
  email: string;
  message?: string;
  consentText: string;
  sourcePath: string;
  createdAt: string;
}>> {
  const result = await db(env).prepare(`
    SELECT lead_id, name, email, message, consent_text, source_path, created_at
    FROM get_me_live_leads WHERE get_me_live_order_id = ? ORDER BY created_at DESC LIMIT 500
  `).bind(orderId).all<{
    lead_id: string; name: string; email: string; message: string | null;
    consent_text: string; source_path: string; created_at: string;
  }>();
  return (result.results || []).map(row => ({
    leadId: row.lead_id,
    name: row.name,
    email: row.email,
    message: row.message || undefined,
    consentText: row.consent_text,
    sourcePath: row.source_path,
    createdAt: row.created_at
  }));
}

interface GetMeLiveAssetRow {
  asset_id: string;
  get_me_live_order_id: string;
  kind: GetMeLiveAsset['kind'];
  filename: string;
  content_type: string;
  byte_size: number;
  r2_key: string;
  position: number;
  is_main: number;
  generated: number;
  published_path: string | null;
  created_at: string;
  updated_at: string;
}

function toAsset(row: GetMeLiveAssetRow): GetMeLiveAsset {
  return {
    assetId: row.asset_id,
    orderId: row.get_me_live_order_id,
    kind: row.kind,
    filename: row.filename,
    contentType: row.content_type,
    byteSize: row.byte_size,
    position: row.position,
    isMain: row.is_main === 1,
    generated: row.generated === 1,
    publishedPath: row.published_path || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function saveGetMeLiveAsset(
  env: Env,
  input: Omit<GetMeLiveAsset, 'orderId' | 'createdAt' | 'updatedAt' | 'publishedPath'> & { orderId: string; bytes: ArrayBuffer }
): Promise<GetMeLiveAsset> {
  const now = new Date().toISOString();
  const key = assetKey(input.orderId, input.assetId);
  await bucket(env).put(key, input.bytes, { httpMetadata: { contentType: input.contentType } });
  await db(env).prepare(`
    INSERT INTO get_me_live_assets (
      asset_id, get_me_live_order_id, kind, filename, content_type, byte_size,
      r2_key, position, is_main, generated, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.assetId, input.orderId, input.kind, input.filename, input.contentType,
    input.byteSize, key, input.position, input.isMain ? 1 : 0,
    input.generated ? 1 : 0, now, now
  ).run();
  const saved = await loadGetMeLiveAsset(env, input.orderId, input.assetId);
  if (!saved) throw new Error('The file could not be saved');
  return saved;
}

export async function loadGetMeLiveAsset(env: Env, orderId: string, assetId: string): Promise<GetMeLiveAsset | null> {
  const row = await db(env).prepare(`
    SELECT * FROM get_me_live_assets WHERE get_me_live_order_id = ? AND asset_id = ?
  `).bind(orderId, assetId).first<GetMeLiveAssetRow>();
  return row ? toAsset(row) : null;
}

export async function loadGetMeLiveAssetBytes(env: Env, orderId: string, assetId: string): Promise<ArrayBuffer | null> {
  const row = await db(env).prepare(`
    SELECT r2_key FROM get_me_live_assets WHERE get_me_live_order_id = ? AND asset_id = ?
  `).bind(orderId, assetId).first<{ r2_key: string }>();
  if (!row) return null;
  const object = await bucket(env).get(row.r2_key);
  return object ? object.arrayBuffer() : null;
}

export async function listGetMeLiveAssets(env: Env, orderId: string): Promise<GetMeLiveAsset[]> {
  const result = await db(env).prepare(`
    SELECT * FROM get_me_live_assets WHERE get_me_live_order_id = ? ORDER BY kind, position, created_at
  `).bind(orderId).all<GetMeLiveAssetRow>();
  return (result.results || []).map(toAsset);
}

export async function removeGetMeLiveAsset(env: Env, orderId: string, assetId: string): Promise<boolean> {
  const row = await db(env).prepare(`
    SELECT r2_key FROM get_me_live_assets WHERE get_me_live_order_id = ? AND asset_id = ?
  `).bind(orderId, assetId).first<{ r2_key: string }>();
  if (!row) return false;
  await bucket(env).delete(row.r2_key);
  const result = await db(env).prepare(`
    DELETE FROM get_me_live_assets WHERE get_me_live_order_id = ? AND asset_id = ?
  `).bind(orderId, assetId).run();
  return (result.meta?.changes ?? 0) === 1;
}

export async function orderGetMeLiveAssets(
  env: Env,
  orderId: string,
  assetIds: string[],
  mainAssetId?: string
): Promise<void> {
  const current = await listGetMeLiveAssets(env, orderId);
  const photos = new Set(current.filter(asset => asset.kind === 'photo').map(asset => asset.assetId));
  if (assetIds.length !== photos.size || assetIds.some(assetId => !photos.has(assetId))) {
    throw new Error('Choose each saved photo once');
  }
  if (mainAssetId && !photos.has(mainAssetId)) throw new Error('Choose a saved photo as the main image');
  await db(env).batch(assetIds.map((assetId, position) => db(env).prepare(`
    UPDATE get_me_live_assets SET position = ?, is_main = ?, updated_at = ?
    WHERE get_me_live_order_id = ? AND asset_id = ? AND kind = 'photo'
  `).bind(position, assetId === mainAssetId ? 1 : 0, new Date().toISOString(), orderId, assetId)));
}

export async function markGetMeLiveAssetPublished(env: Env, orderId: string, assetId: string, publishedPath: string): Promise<void> {
  await db(env).prepare(`
    UPDATE get_me_live_assets SET published_path = ?, updated_at = ?
    WHERE get_me_live_order_id = ? AND asset_id = ?
  `).bind(publishedPath, new Date().toISOString(), orderId, assetId).run();
}

interface ShareDraftRow {
  draft_id: string;
  owner_id: string;
  source_sprint_order_id: string;
  get_me_live_order_id: string | null;
  draft_type: GetMeLiveShareDraft['draftType'];
  position: number;
  generated_text: string;
  edited_text: string;
  created_at: string;
  approved_at: string | null;
  shared_at: string | null;
}

function toShareDraft(row: ShareDraftRow): GetMeLiveShareDraft {
  return {
    draftId: row.draft_id,
    ownerId: row.owner_id,
    sourceSprintOrderId: row.source_sprint_order_id,
    getMeLiveOrderId: row.get_me_live_order_id || undefined,
    draftType: row.draft_type,
    position: row.position,
    generatedText: row.generated_text,
    editedText: row.edited_text,
    createdAt: row.created_at,
    approvedAt: row.approved_at || undefined,
    sharedAt: row.shared_at || undefined
  };
}

export async function listGetMeLiveShareDrafts(
  env: Env,
  input: { ownerId: string; sourceSprintOrderId: string; orderId?: string; draftType?: GetMeLiveShareDraft['draftType'] }
): Promise<GetMeLiveShareDraft[]> {
  const result = input.orderId
    ? await db(env).prepare(`SELECT * FROM get_me_live_share_drafts WHERE owner_id = ? AND get_me_live_order_id = ? AND (? IS NULL OR draft_type = ?) ORDER BY position`)
      .bind(input.ownerId, input.orderId, input.draftType || null, input.draftType || null).all<ShareDraftRow>()
    : await db(env).prepare(`SELECT * FROM get_me_live_share_drafts WHERE owner_id = ? AND source_sprint_order_id = ? AND (? IS NULL OR draft_type = ?) ORDER BY position`)
      .bind(input.ownerId, input.sourceSprintOrderId, input.draftType || null, input.draftType || null).all<ShareDraftRow>();
  return (result.results || []).map(toShareDraft);
}

export async function saveGetMeLiveShareDraft(env: Env, draft: GetMeLiveShareDraft): Promise<void> {
  await db(env).prepare(`
    INSERT INTO get_me_live_share_drafts (
      draft_id, owner_id, source_sprint_order_id, get_me_live_order_id, draft_type,
      position, generated_text, edited_text, created_at, approved_at, shared_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(draft_id) DO UPDATE SET edited_text = excluded.edited_text,
      approved_at = excluded.approved_at, shared_at = excluded.shared_at
  `).bind(
    draft.draftId, draft.ownerId, draft.sourceSprintOrderId, draft.getMeLiveOrderId || null,
    draft.draftType, draft.position, draft.generatedText, draft.editedText, draft.createdAt,
    draft.approvedAt || null, draft.sharedAt || null
  ).run();
}

export async function incrementGetMeLiveActivity(env: Env, orderId: string, kind: 'visit' | 'share'): Promise<void> {
  const column = kind === 'visit' ? 'visit_count' : 'share_count';
  await db(env).prepare(`
    INSERT INTO get_me_live_activity_counts (get_me_live_order_id, ${column}, updated_at)
    VALUES (?, 1, ?)
    ON CONFLICT(get_me_live_order_id) DO UPDATE SET ${column} = ${column} + 1, updated_at = excluded.updated_at
  `).bind(orderId, new Date().toISOString()).run();
}

export async function getGetMeLiveActivity(env: Env, orderId: string, sourceSprintOrderId: string): Promise<{
  visits: number; shares: number; sales: number; revenueCents: number;
}> {
  const counters = await db(env).prepare(`
    SELECT visit_count, share_count FROM get_me_live_activity_counts WHERE get_me_live_order_id = ?
  `).bind(orderId).first<{ visit_count: number; share_count: number }>();
  const payments = await db(env).prepare(`
    SELECT COUNT(*) AS sales, COALESCE(SUM(CAST(json_extract(payload_json, '$.revenueCents') AS INTEGER)), 0) AS revenue_cents
    FROM observed_evidence_events
    WHERE order_id = ? AND event_type = 'payment'
      AND json_extract(payload_json, '$.sourceReference') LIKE ?
  `).bind(sourceSprintOrderId, `get-me-live:${orderId}:%`).first<{ sales: number; revenue_cents: number }>();
  return {
    visits: Number(counters?.visit_count || 0),
    shares: Number(counters?.share_count || 0),
    sales: Number(payments?.sales || 0),
    revenueCents: Number(payments?.revenue_cents || 0)
  };
}

/** One release row by id, if it exists. */
export async function loadGetMeLiveRelease(env: Env, orderId: string, releaseId: string): Promise<GetMeLiveRelease | null> {
  const row = await db(env).prepare(`
    SELECT * FROM get_me_live_releases WHERE get_me_live_order_id = ? AND release_id = ?
  `).bind(orderId, releaseId).first<ReleaseRow>();
  return row ? toRelease(row) : null;
}

/**
 * Compare-and-swap write of `custom_domain_json` (plan §8.5). `expectedVersion`
 * null means "only if there is no record yet"; `next` null clears the record.
 * `custom_domain` is non-null only while the record is active. Returns false
 * when another request changed the record first; the caller re-reads.
 */
export async function updateCustomDomainCas(
  env: Env,
  orderId: string,
  expectedVersion: number | null,
  next: GetMeLiveCustomDomain | null
): Promise<boolean> {
  const now = new Date().toISOString();
  const guard = expectedVersion === null
    ? 'custom_domain_json IS NULL'
    : `json_extract(custom_domain_json, '$.version') = ?`;
  const binds: unknown[] = [
    next ? JSON.stringify(next) : null,
    next?.status === 'active' ? next.name : null,
    now,
    orderId
  ];
  if (expectedVersion !== null) binds.push(expectedVersion);
  const result = await db(env).prepare(`
    UPDATE get_me_live_orders SET custom_domain_json = ?, custom_domain = ?, updated_at = ?
    WHERE order_id = ? AND ${guard}
  `).bind(...binds).run();
  return (result.meta?.changes ?? 0) === 1;
}

/** The launch release row, if one exists (at most one per order, enforced by a unique index). */
export async function loadLaunchGetMeLiveRelease(env: Env, orderId: string): Promise<GetMeLiveRelease | null> {
  const row = await db(env).prepare(`
    SELECT * FROM get_me_live_releases WHERE get_me_live_order_id = ? AND kind = 'launch'
  `).bind(orderId).first<ReleaseRow>();
  return row ? toRelease(row) : null;
}

/**
 * Inserts the backfilled launch row for a legacy order (plan §20.2). Idempotent:
 * an existing launch row (real or backfilled) is never replaced.
 */
export async function insertBackfilledLaunchRelease(env: Env, input: {
  orderId: string;
  releaseId: string;
  buildId: string;
  deploymentId: string;
  deploymentUrl?: string;
  pagesUrl: string;
  verifiedUrl: string;
  verifiedAt: string;
  receiptJson: string;
}): Promise<void> {
  await db(env).prepare(`
    INSERT INTO get_me_live_releases (
      release_id, get_me_live_order_id, kind, build_id, deployment_id, deployment_url, pages_url,
      custom_domain, verified_url, verified_at, backfilled, receipt_json, created_at
    ) VALUES (?, ?, 'launch', ?, ?, ?, ?, NULL, ?, ?, 1, ?, ?)
    ON CONFLICT DO NOTHING
  `).bind(
    input.releaseId, input.orderId, input.buildId, input.deploymentId, input.deploymentUrl || null, input.pagesUrl,
    input.verifiedUrl, input.verifiedAt, input.receiptJson, input.verifiedAt
  ).run();
}
