interface Env {
  DB: D1Database;
  KV: KVNamespace;
  BLUEPRINTS: R2Bucket;
  ACCEPTANCE_CLOUDFLARE_API_TOKEN?: string;
}

const PDF_SUFFIX = '/ghosttown-launch-blueprint-v2.pdf';
const JSON_SUFFIX = '/ghosttown-launch-blueprint-v2.json';
const ZIP_SUFFIX = '/ghosttown-launch-blueprint-v2-assets.zip';
const EXPECTED_SCHEMA = 'ghosttown-launch-blueprint-v2';

function allowedOrderId(value: string): boolean {
  return /^gtt_[A-Za-z0-9_-]+$/.test(value);
}

function artifactKeys(orderId: string) {
  return {
    json: `orders/${orderId}/ghosttown-launch-blueprint-v2.json`,
    pdf: `orders/${orderId}/ghosttown-launch-blueprint-v2.pdf`,
    zip: `orders/${orderId}/ghosttown-launch-blueprint-v2-assets.zip`
  };
}

function allowedKey(key: string): boolean {
  return /^orders\/gtt_[A-Za-z0-9_-]+\//.test(key)
    && [PDF_SUFFIX, JSON_SUFFIX, ZIP_SUFFIX].some(suffix => key.endsWith(suffix));
}

function writableKey(key: string): boolean {
  return allowedKey(key) && (key.endsWith(PDF_SUFFIX) || key.endsWith(ZIP_SUFFIX));
}

function bytesFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const input = bytes instanceof Uint8Array
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : bytes;
  const digest = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

async function loadCanonicalRow(env: Env, orderId: string): Promise<{ blueprintJson: string; researchReceiptJson: string }> {
  const row = await env.DB.prepare(`
    SELECT blueprint_json, research_receipt_json
    FROM launch_blueprints
    WHERE order_id = ?
    LIMIT 1
  `).bind(orderId).first<{ blueprint_json: string; research_receipt_json: string }>();
  if (!row?.blueprint_json || !row?.research_receipt_json) throw new Error('Canonical D1 Blueprint record was not found.');
  return { blueprintJson: row.blueprint_json, researchReceiptJson: row.research_receipt_json };
}

async function writeResearchReceipt(env: Env, orderId: string, researchReceiptJson: string): Promise<void> {
  await env.DB.prepare(`
    UPDATE launch_blueprints
    SET research_receipt_json = ?, updated_at = ?
    WHERE order_id = ?
  `).bind(researchReceiptJson, new Date().toISOString(), orderId).run();
}

async function objectBytes(object: R2ObjectBody | null, label: string): Promise<Uint8Array> {
  if (!object) throw new Error(`${label} R2 object was not found.`);
  return new Uint8Array(await object.arrayBuffer());
}

async function snapshotState(env: Env, orderId: string) {
  if (!allowedOrderId(orderId)) throw new Error('Invalid order ID.');
  const row = await loadCanonicalRow(env, orderId);
  const blueprint = JSON.parse(row.blueprintJson) as Record<string, unknown>;
  const researchReceipt = JSON.parse(row.researchReceiptJson) as Record<string, any>;
  const evidence = researchReceipt?.generationReceiptEvidence;
  if (!evidence?.hashes || !evidence?.artifactKeys) throw new Error('Canonical D1 generation integrity receipt is incomplete.');
  if (blueprint.schemaVersion !== EXPECTED_SCHEMA || blueprint.blueprintVersion !== '2.1' || blueprint.status !== 'ready') {
    throw new Error('Canonical D1 Blueprint is not the ready v2.1 artifact.');
  }
  const keys = artifactKeys(orderId);
  if (evidence.artifactKeys.json !== keys.json || evidence.artifactKeys.pdf !== keys.pdf || evidence.artifactKeys.zip !== keys.zip) {
    throw new Error('Canonical artifact key contract drifted.');
  }

  const [jsonObject, pdfObject, zipObject] = await Promise.all([
    env.BLUEPRINTS.get(keys.json),
    env.BLUEPRINTS.get(keys.pdf),
    env.BLUEPRINTS.get(keys.zip)
  ]);
  const [jsonBytes, pdfBytes, zipBytes] = await Promise.all([
    objectBytes(jsonObject, 'JSON'),
    objectBytes(pdfObject, 'PDF'),
    objectBytes(zipObject, 'ZIP')
  ]);
  const [jsonSha, pdfSha, zipSha] = await Promise.all([
    sha256Hex(jsonBytes), sha256Hex(pdfBytes), sha256Hex(zipBytes)
  ]);
  const d1Bytes = new TextEncoder().encode(row.blueprintJson);
  if (jsonSha !== evidence.hashes.canonicalBlueprintSha256 || pdfSha !== evidence.hashes.pdfSha256 || zipSha !== evidence.hashes.zipSha256) {
    throw new Error(`Binding-visible artifact integrity mismatch: json=${jsonSha}/${evidence.hashes.canonicalBlueprintSha256}, pdf=${pdfSha}/${evidence.hashes.pdfSha256}, zip=${zipSha}/${evidence.hashes.zipSha256}.`);
  }
  if (jsonBytes.byteLength !== d1Bytes.byteLength || jsonBytes.some((byte, index) => byte !== d1Bytes[index])) {
    throw new Error('Binding-visible canonical JSON does not exactly match D1 blueprint_json.');
  }

  const integrityKey = `paid_test_blueprint_integrity_${orderId}`;
  const pointerKey = `paid_test_blueprint_pointer_${orderId}`;
  const [integrityRaw, pointerRaw] = await Promise.all([
    env.KV.get(integrityKey), env.KV.get(pointerKey)
  ]);
  if (!integrityRaw || !pointerRaw) throw new Error('Acceptance KV integrity or Blueprint pointer is missing.');

  return {
    orderId,
    keys,
    blueprint,
    blueprintJson: row.blueprintJson,
    researchReceipt,
    researchReceiptJson: row.researchReceiptJson,
    evidence,
    integrityKey,
    pointerKey,
    integrityRaw,
    pointerRaw,
    integrity: JSON.parse(integrityRaw),
    pointer: JSON.parse(pointerRaw),
    objects: { jsonObject, pdfObject, zipObject },
    bytes: { json: jsonBytes, pdf: pdfBytes, zip: zipBytes },
    hashes: { json: jsonSha, pdf: pdfSha, zip: zipSha }
  };
}

async function restoreObject(
  env: Env,
  key: string,
  bytes: Uint8Array,
  priorObject: R2ObjectBody | null
): Promise<void> {
  await env.BLUEPRINTS.put(key, bytes, {
    httpMetadata: priorObject?.httpMetadata,
    customMetadata: priorObject?.customMetadata
  });
}

async function rematerialize(env: Env, request: Request): Promise<Response> {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const orderId = String(body?.orderId || '');
  if (!allowedOrderId(orderId)) return json({ error: 'Invalid order ID' }, 400);
  if (!/^[a-f0-9]{64}$/i.test(String(body?.canonicalBlueprintSha256 || ''))
      || !/^[a-f0-9]{64}$/i.test(String(body?.pdfSha256 || ''))
      || !/^[a-f0-9]{64}$/i.test(String(body?.zipSha256 || ''))
      || typeof body?.pdfBase64 !== 'string'
      || typeof body?.zipBase64 !== 'string'
      || !body?.documentReceipt) {
    return json({ error: 'Rematerialization payload is incomplete' }, 400);
  }

  const state = await snapshotState(env, orderId);
  if (state.hashes.json !== body.canonicalBlueprintSha256) {
    return json({ error: 'Canonical Blueprint hash changed before rematerialization' }, 409);
  }

  const newPdf = bytesFromBase64(body.pdfBase64);
  const newZip = bytesFromBase64(body.zipBase64);
  const [computedPdfSha, computedZipSha] = await Promise.all([sha256Hex(newPdf), sha256Hex(newZip)]);
  if (computedPdfSha !== body.pdfSha256 || computedZipSha !== body.zipSha256) {
    return json({ error: 'Rematerialization request-body hash mismatch', computedPdfSha, computedZipSha }, 400);
  }

  const nextReceipt = JSON.parse(JSON.stringify(state.researchReceipt));
  nextReceipt.generationReceiptEvidence.hashes.pdfSha256 = computedPdfSha;
  nextReceipt.generationReceiptEvidence.hashes.zipSha256 = computedZipSha;
  nextReceipt.generationReceiptEvidence.document = body.documentReceipt;
  nextReceipt.artifactRematerialization = {
    schemaVersion: 'ghosttown-acceptance-artifact-rematerialization-v3',
    reason: 'Gate 28 premium-document presentation rematerialized inside one remote DB/KV/R2 binding transaction.',
    canonicalBlueprintSha256: state.hashes.json,
    priorPdfSha256: state.hashes.pdf,
    priorZipSha256: state.hashes.zip,
    pdfSha256: computedPdfSha,
    zipSha256: computedZipSha,
    renderer: 'renderLaunchBlueprintPdfV21',
    dataMutationPath: 'single-worker-remote-bindings',
    documentReceipt: body.documentReceipt,
    purchaseReplayed: false,
    researchReplayed: false,
    modelInvoked: false,
    acceptanceOnly: true,
    productionDeployed: false,
    rematerializedAt: new Date().toISOString()
  };
  const nextReceiptJson = JSON.stringify(nextReceipt);
  const nextIntegrity = nextReceipt.generationReceiptEvidence;
  const nextPointer = JSON.parse(JSON.stringify(state.pointer));
  nextPointer.hashes = nextIntegrity.hashes;
  nextPointer.updatedAt = new Date().toISOString();

  const ownerId = String((state.blueprint as any).ownerId || '');
  const schemaVersion = String((state.blueprint as any).schemaVersion || '');
  const metadataBase = { orderId, ownerId, schemaVersion };
  if (!ownerId || schemaVersion !== EXPECTED_SCHEMA) return json({ error: 'Canonical Blueprint metadata is incomplete' }, 409);

  try {
    await env.BLUEPRINTS.put(state.keys.pdf, newPdf, {
      httpMetadata: {
        contentType: 'application/pdf',
        contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${orderId}.pdf"`
      },
      customMetadata: { ...metadataBase, sha256: computedPdfSha }
    });
    await env.BLUEPRINTS.put(state.keys.zip, newZip, {
      httpMetadata: {
        contentType: 'application/zip',
        contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${orderId}-assets.zip"`
      },
      customMetadata: { ...metadataBase, sha256: computedZipSha }
    });

    await writeResearchReceipt(env, orderId, nextReceiptJson);
    await Promise.all([
      env.KV.put(state.integrityKey, JSON.stringify(nextIntegrity)),
      env.KV.put(state.pointerKey, JSON.stringify(nextPointer))
    ]);

    const [verifyPdfObject, verifyZipObject, verifyRow, verifyJsonObject] = await Promise.all([
      env.BLUEPRINTS.get(state.keys.pdf),
      env.BLUEPRINTS.get(state.keys.zip),
      loadCanonicalRow(env, orderId),
      env.BLUEPRINTS.get(state.keys.json)
    ]);
    const [verifyPdf, verifyZip, verifyJson] = await Promise.all([
      objectBytes(verifyPdfObject, 'verification PDF'),
      objectBytes(verifyZipObject, 'verification ZIP'),
      objectBytes(verifyJsonObject, 'verification JSON')
    ]);
    const [verifyPdfSha, verifyZipSha, verifyJsonSha] = await Promise.all([
      sha256Hex(verifyPdf), sha256Hex(verifyZip), sha256Hex(verifyJson)
    ]);
    const verifyReceipt = JSON.parse(verifyRow.researchReceiptJson);
    if (verifyPdfSha !== computedPdfSha || verifyZipSha !== computedZipSha) throw new Error('R2 exact-byte verification failed after rematerialization.');
    if (verifyJsonSha !== state.hashes.json || verifyRow.blueprintJson !== state.blueprintJson) throw new Error('Canonical JSON changed during rematerialization.');
    if (verifyReceipt?.generationReceiptEvidence?.hashes?.pdfSha256 !== computedPdfSha
        || verifyReceipt?.generationReceiptEvidence?.hashes?.zipSha256 !== computedZipSha
        || verifyReceipt?.generationReceiptEvidence?.hashes?.canonicalBlueprintSha256 !== state.hashes.json) {
      throw new Error('D1 integrity receipt verification failed after rematerialization.');
    }

    return json({
      ok: true,
      decision: 'REMATERIALIZED_REVERIFY',
      canonical_blueprint_sha256: state.hashes.json,
      canonical_blueprint_unchanged: true,
      prior: { pdf_sha256: state.hashes.pdf, zip_sha256: state.hashes.zip },
      current: { pdf_sha256: computedPdfSha, zip_sha256: computedZipSha, document_receipt: body.documentReceipt },
      data_mutation_path: 'single_worker_remote_bindings',
      r2_exact_round_trip_verified: true,
      d1_integrity_receipt_verified: true,
      kv_writes_acknowledged: true,
      purchase_replayed: false,
      research_replayed: false,
      vertex_invoked: false,
      acceptance_only: true,
      production_mutated: false,
      rollback_on_partial_failure: true
    });
  } catch (error) {
    let rollbackError: unknown = null;
    try {
      await restoreObject(env, state.keys.pdf, state.bytes.pdf, state.objects.pdfObject);
      await restoreObject(env, state.keys.zip, state.bytes.zip, state.objects.zipObject);
      await writeResearchReceipt(env, orderId, state.researchReceiptJson);
      await Promise.all([
        env.KV.put(state.integrityKey, state.integrityRaw),
        env.KV.put(state.pointerKey, state.pointerRaw)
      ]);
      const [rollbackPdfObject, rollbackZipObject, rollbackRow] = await Promise.all([
        env.BLUEPRINTS.get(state.keys.pdf), env.BLUEPRINTS.get(state.keys.zip), loadCanonicalRow(env, orderId)
      ]);
      const [rollbackPdf, rollbackZip] = await Promise.all([
        objectBytes(rollbackPdfObject, 'rollback PDF'), objectBytes(rollbackZipObject, 'rollback ZIP')
      ]);
      if (await sha256Hex(rollbackPdf) !== state.hashes.pdf || await sha256Hex(rollbackZip) !== state.hashes.zip) {
        throw new Error('Rollback did not restore original R2 bytes.');
      }
      if (rollbackRow.researchReceiptJson !== state.researchReceiptJson || rollbackRow.blueprintJson !== state.blueprintJson) {
        throw new Error('Rollback did not restore original D1 receipt/canonical JSON state.');
      }
    } catch (caught) {
      rollbackError = caught;
    }
    const original = error instanceof Error ? error.message : String(error);
    if (rollbackError) {
      return json({ error: 'Rematerialization failed and rollback also failed', original, rollback: rollbackError instanceof Error ? rollbackError.message : String(rollbackError) }, 500);
    }
    return json({ error: 'Rematerialization failed; original state restored', original, rollback_verified: true }, 500);
  }
}

async function createE2eSprintFixture(env: Env, request: Request): Promise<Response> {
  let body: any; try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const ownerId = String(body?.ownerId || '').trim().toLowerCase();
  const orderId = String(body?.orderId || '');
  const gmlOrderId = String(body?.gmlOrderId || '');
  if (!ownerId.includes('@') || !allowedOrderId(orderId) || !orderId.startsWith('gtt_e2e_') || !/^gml_e2e_[A-Za-z0-9_-]+$/.test(gmlOrderId)) {
    return json({ error: 'Invalid E2E fixture identity' }, 400);
  }

  const sprintRows = await env.DB.prepare(`
    SELECT order_id, blueprint_json, research_receipt_json, schema_version, status, pdf_r2_key, created_at
    FROM launch_blueprints WHERE status = 'ready' ORDER BY updated_at DESC LIMIT 50
  `).all<any>();
  let source: any = null; let sourceOrder: any = null;
  for (const row of sprintRows.results || []) {
    const raw = await env.KV.get('paid_test_order_' + row.order_id);
    if (!raw) continue;
    const order = JSON.parse(raw);
    let candidateBlueprint: any = null;
    try { candidateBlueprint = JSON.parse(row.blueprint_json); } catch { continue; }
    const canonicalSprint = candidateBlueprint?.schemaVersion === EXPECTED_SCHEMA
      && candidateBlueprint?.blueprintVersion === '2.1'
      && candidateBlueprint?.status === 'ready'
      && Array.isArray(candidateBlueprint?.dailyCalendar)
      && candidateBlueprint.dailyCalendar.length === 30;
    if (order?.status === 'ready'
        && order?.stripeMode === 'test'
        && order?.artifactType === 'launch_blueprint_v2'
        && canonicalSprint) {
      source = row; sourceOrder = order; break;
    }
  }
  if (!source || !sourceOrder) return json({ error: 'No ready Stripe-test Sprint acceptance source exists' }, 409);

  const now = new Date().toISOString();
  const blueprint = JSON.parse(source.blueprint_json);
  blueprint.orderId = orderId; blueprint.ownerId = ownerId; blueprint.blueprintId = 'bp_e2e_' + crypto.randomUUID();
  blueprint.createdAt = now; blueprint.updatedAt = now;
  const sourceVerdictId = String(blueprint.sourceVerdictId || sourceOrder.verdictId || '');

  const order = JSON.parse(JSON.stringify(sourceOrder));
  order.orderId = orderId; order.email = ownerId; order.status = 'ready';
  order.stripeCheckoutSessionId = 'cs_test_e2e_fixture_no_charge'; order.stripePaymentIntentId = 'pi_test_e2e_fixture_no_charge';
  order.paidAt = now; order.createdAt = now; order.updatedAt = now; order.idempotencyKey = 'e2e_' + crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO launch_blueprints (
      order_id, owner_id, source_verdict_id, schema_version, status,
      blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'ready', ?, ?, ?, ?, ?)
  `).bind(orderId, ownerId, sourceVerdictId, source.schema_version, JSON.stringify(blueprint), source.research_receipt_json, source.pdf_r2_key, now, now).run();

  const pagesProjectName = ('ghosttown-e2e-' + gmlOrderId.replace(/^gml_e2e_/, '')).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 58);
  const config = {
    schemaVersion: 'get-me-live-config-v1',
    brand: { businessName: 'Synthetic Acceptance Business', stylePreset: 'clean_saas', templateId: 'ghosttown_conversion' },
    offer: {
      intent: 'interest',
      headline: 'A simple test page for a synthetic acceptance journey',
      offer: 'Synthetic Acceptance Offer',
      price: '$10 test',
      ctaLabel: 'I am interested'
    },
    contact: { contactEmail: ownerId, leadDestinationEmail: ownerId, businessEmailLocalPart: 'hello' },
    domain: { cloudflareAccountId: String(body?.cloudflareAccountId || ''), pagesProjectName },
    payments: { enabled: false }
  };
  if (!config.domain.cloudflareAccountId) return json({ error: 'Acceptance Cloudflare account ID is required for the disposable Get Me Live site' }, 400);
  const provider = { cloudflareConnected: true, stripeConnected: false, businessEmailVerified: false, domainReady: false };
  const acceptanceCloudflareToken = String(env.ACCEPTANCE_CLOUDFLARE_API_TOKEN || '').trim();
  if (!acceptanceCloudflareToken) return json({ error: 'Acceptance Cloudflare API token is not bound to the disposable fixture bridge' }, 500);
  await env.DB.prepare(`
    INSERT INTO get_me_live_orders (
      order_id, owner_id, source_sprint_order_id, source_blueprint_id, offer_id, offer_version,
      stripe_price_id, stripe_checkout_session_id, stripe_payment_intent_id, status,
      configuration_json, provider_state_json, preview_r2_key, public_url, custom_domain,
      deployment_receipt_json, created_at, updated_at, paid_at, published_at, failure
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'ready_to_publish', ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, NULL, NULL)
  `).bind(
    gmlOrderId, ownerId, orderId, blueprint.blueprintId, 'ghosttown-get-me-live', '1.0',
    'acceptance-no-charge', JSON.stringify(config), JSON.stringify(provider), 'get-me-live/' + gmlOrderId + '/preview.json',
    now, now, now
  ).run();

  await env.KV.put('get_me_live_cf_token_' + gmlOrderId, JSON.stringify({
    accessToken: acceptanceCloudflareToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    scope: 'acceptance-workflow-token'
  }), { expirationTtl: 3600 });

  await env.KV.put('paid_test_order_' + orderId, JSON.stringify(order), { expirationTtl: 86400 });
  await env.KV.put('paid_test_orders_' + ownerId, JSON.stringify([{
    orderId, ideaName: 'Synthetic Acceptance Sprint', status: 'ready', createdAt: now, updatedAt: now,
    artifactType: 'execution_plan_30day_v1', offerName: '30-Day Evidence Sprint', sourceVerdictId, planVersion: order.planVersion || '1.0'
  }]), { expirationTtl: 86400 });
  return json({ ok: true, orderId, gmlOrderId, ownerId, sourceOrderId: source.order_id, expiresInSeconds: 86400, stripeChargeCreated: false, productionMutated: false });
}

async function deleteE2eSprintFixture(env: Env, request: Request): Promise<Response> {
  let body: any; try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const ownerId = String(body?.ownerId || '').trim().toLowerCase();
  const orderId = String(body?.orderId || '');
  const gmlOrderId = String(body?.gmlOrderId || '');
  if (!ownerId.includes('@') || !allowedOrderId(orderId) || !orderId.startsWith('gtt_e2e_') || !/^gml_e2e_[A-Za-z0-9_-]+$/.test(gmlOrderId)) return json({ error: 'Invalid E2E fixture identity' }, 400);
  await env.DB.prepare('DELETE FROM get_me_live_leads WHERE get_me_live_order_id = ?').bind(gmlOrderId).run().catch(() => undefined);
  await env.DB.prepare('DELETE FROM get_me_live_share_drafts WHERE get_me_live_order_id = ?').bind(gmlOrderId).run().catch(() => undefined);
  await env.DB.prepare('DELETE FROM get_me_live_orders WHERE order_id = ? AND owner_id = ?').bind(gmlOrderId, ownerId).run();
  await env.DB.prepare('DELETE FROM blueprint_execution_log WHERE order_id = ?').bind(orderId).run().catch(() => undefined);
  await env.DB.prepare('DELETE FROM launch_blueprints WHERE order_id = ? AND owner_id = ?').bind(orderId, ownerId).run();
  await Promise.all([
    env.BLUEPRINTS.delete('get-me-live/' + gmlOrderId + '/preview.json'),
    env.BLUEPRINTS.delete('get-me-live/' + gmlOrderId + '/preview.html'),
    env.KV.delete('get_me_live_cf_token_' + gmlOrderId),
    env.KV.delete('paid_test_order_' + orderId),
    env.KV.delete('paid_test_orders_' + ownerId),
    env.KV.delete('user_' + ownerId)
  ]);
  return json({ ok: true, deleted: true, orderId, gmlOrderId, productionMutated: false });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, bindings: ['DB', 'KV', 'BLUEPRINTS'], mode: 'remote-binding' });

    if (url.pathname === '/snapshot' && request.method === 'GET') {
      const orderId = url.searchParams.get('orderId') || '';
      try {
        const state = await snapshotState(env, orderId);
        return json({
          ok: true,
          orderId,
          blueprintJson: state.blueprintJson,
          evidence: state.evidence,
          hashes: state.hashes,
          data_read_path: 'single_worker_remote_bindings'
        });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, 500);
      }
    }

    if (url.pathname === '/rematerialize' && request.method === 'POST') return rematerialize(env, request);
    if (url.pathname === '/e2e-sprint-fixture' && request.method === 'POST') return createE2eSprintFixture(env, request);
    if (url.pathname === '/e2e-sprint-fixture' && request.method === 'DELETE') return deleteE2eSprintFixture(env, request);

    if (url.pathname !== '/object') return json({ error: 'Not found' }, 404);
    const key = url.searchParams.get('key') || '';
    if (!allowedKey(key)) return json({ error: 'Invalid artifact key' }, 400);

    if (request.method === 'GET') {
      const object = await env.BLUEPRINTS.get(key);
      if (!object) return json({ error: 'Object not found' }, 404);
      const headers = new Headers({
        'cache-control': 'no-store',
        'x-ghosttown-r2-key': key,
        'x-ghosttown-r2-size': String(object.size)
      });
      object.writeHttpMetadata(headers);
      return new Response(object.body, { headers });
    }

    if (request.method === 'PUT') {
      if (!writableKey(key)) return json({ error: 'Canonical JSON is read-only through this bridge' }, 405);
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength) return json({ error: 'Empty artifact body' }, 400);
      const expectedSha256 = request.headers.get('x-ghosttown-sha256') || '';
      const actualSha256 = await sha256Hex(bytes);
      if (!/^[a-f0-9]{64}$/i.test(expectedSha256) || actualSha256 !== expectedSha256) {
        return json({ error: 'Request body SHA-256 mismatch', expectedSha256, actualSha256, size: bytes.byteLength }, 400);
      }
      const orderId = request.headers.get('x-ghosttown-order-id') || '';
      const ownerId = request.headers.get('x-ghosttown-owner-id') || '';
      const schemaVersion = request.headers.get('x-ghosttown-schema-version') || '';
      if (!allowedOrderId(orderId) || !ownerId || schemaVersion !== EXPECTED_SCHEMA) return json({ error: 'Artifact metadata is incomplete' }, 400);
      await env.BLUEPRINTS.put(key, bytes, {
        httpMetadata: {
          contentType: request.headers.get('content-type') || 'application/octet-stream',
          contentDisposition: request.headers.get('content-disposition') || undefined
        },
        customMetadata: { orderId, ownerId, schemaVersion, sha256: expectedSha256 }
      });
      const verify = await env.BLUEPRINTS.get(key);
      if (!verify) return json({ error: 'Object missing after binding write' }, 500);
      const verifyBytes = await verify.arrayBuffer();
      const verifySha256 = await sha256Hex(verifyBytes);
      if (verifySha256 !== expectedSha256 || verifyBytes.byteLength !== bytes.byteLength) {
        return json({ error: 'Binding write did not round-trip exactly', expectedSha256, actualSha256: verifySha256, expectedBytes: bytes.byteLength, actualBytes: verifyBytes.byteLength }, 500);
      }
      return json({ ok: true, key, sha256: verifySha256, size: verifyBytes.byteLength });
    }

    return json({ error: 'Method not allowed' }, 405);
  }
} satisfies ExportedHandler<Env>;
