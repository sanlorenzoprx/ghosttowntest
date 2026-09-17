import type { Env } from './env';
import type {
  GetMeLiveAsset,
  GetMeLiveConfiguration,
  GetMeLiveOrder,
  GetMeLiveProviderState,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at || undefined,
    publishedAt: row.published_at || undefined,
    failure: row.failure || undefined
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
export async function updateGetMeLiveOrder(env: Env, order: GetMeLiveOrder): Promise<void> {
  await db(env).prepare(`
    UPDATE get_me_live_orders SET
      source_blueprint_id = ?, stripe_checkout_session_id = ?, stripe_payment_intent_id = ?,
      status = ?, configuration_json = ?, provider_state_json = ?, public_url = ?, custom_domain = ?, deployment_receipt_json = ?,
      updated_at = ?, paid_at = ?, published_at = ?, failure = ?
    WHERE order_id = ? AND owner_id = ?
  `).bind(
    order.sourceBlueprintId || null, order.stripeCheckoutSessionId || null,
    order.stripePaymentIntentId || null, order.status,
    order.configuration ? JSON.stringify(order.configuration) : null,
    JSON.stringify(order.providerState), order.publicUrl || null, order.customDomain || null,
    order.deploymentReceipt ? JSON.stringify(order.deploymentReceipt) : null, order.updatedAt, order.paidAt || null, order.publishedAt || null, order.failure || null,
    order.orderId, order.ownerId
  ).run();
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
