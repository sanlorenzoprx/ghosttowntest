interface Env {
  DB: D1Database;
  KV: KVNamespace;
  BLUEPRINTS: R2Bucket;
}

const EXPECTED_SCHEMA = 'ghosttown-launch-blueprint-v2';

function validOrderId(value: string): boolean {
  return /^gtt_[A-Za-z0-9_-]+$/.test(value);
}

function keysFor(orderId: string) {
  return {
    json: `orders/${orderId}/ghosttown-launch-blueprint-v2.json`,
    pdf: `orders/${orderId}/ghosttown-launch-blueprint-v2.pdf`,
    zip: `orders/${orderId}/ghosttown-launch-blueprint-v2-assets.zip`,
    integrity: `paid_test_blueprint_integrity_${orderId}`,
    pointer: `paid_test_blueprint_pointer_${orderId}`
  };
}

function ownedArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', ownedArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function responseJson(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

async function canonicalRow(env: Env, orderId: string) {
  const row = await env.DB.prepare(`
    SELECT blueprint_json, research_receipt_json
    FROM launch_blueprints
    WHERE order_id = ?
    LIMIT 1
  `).bind(orderId).first<{ blueprint_json: string; research_receipt_json: string }>();
  if (!row?.blueprint_json || !row?.research_receipt_json) throw new Error('Canonical D1 Blueprint record was not found.');
  return { blueprintJson: row.blueprint_json, researchReceiptJson: row.research_receipt_json };
}

async function updateResearchReceipt(env: Env, orderId: string, receiptJson: string): Promise<void> {
  await env.DB.prepare(`
    UPDATE launch_blueprints
    SET research_receipt_json = ?, updated_at = ?
    WHERE order_id = ?
  `).bind(receiptJson, new Date().toISOString(), orderId).run();
}

async function requiredObject(env: Env, key: string, label: string): Promise<{ object: R2ObjectBody; bytes: Uint8Array; sha256: string }> {
  const object = await env.BLUEPRINTS.get(key);
  if (!object) throw new Error(`${label} R2 object was not found.`);
  const bytes = new Uint8Array(await object.arrayBuffer());
  return { object, bytes, sha256: await sha256Hex(bytes) };
}

function allowedCurrent(actual: string, prior: string, intended: string, label: string): void {
  if (actual !== prior && actual !== intended) {
    throw new Error(`${label} is neither the Gate-27 baseline nor the intended rematerialized artifact: actual=${actual}, prior=${prior}, intended=${intended}.`);
  }
}

async function putArtifact(
  env: Env,
  key: string,
  bytes: Uint8Array,
  metadata: { orderId: string; ownerId: string; schemaVersion: string; sha256: string; contentType: string; contentDisposition: string }
): Promise<void> {
  await env.BLUEPRINTS.put(key, bytes, {
    httpMetadata: { contentType: metadata.contentType, contentDisposition: metadata.contentDisposition },
    customMetadata: {
      orderId: metadata.orderId,
      ownerId: metadata.ownerId,
      schemaVersion: metadata.schemaVersion,
      sha256: metadata.sha256
    }
  });
}

async function canonicalSnapshot(env: Env, orderId: string): Promise<Response> {
  if (!validOrderId(orderId)) return responseJson({ error: 'Invalid order ID' }, 400);
  try {
    const row = await canonicalRow(env, orderId);
    const blueprint = JSON.parse(row.blueprintJson);
    if (blueprint?.schemaVersion !== EXPECTED_SCHEMA || blueprint?.blueprintVersion !== '2.1' || blueprint?.status !== 'ready') {
      throw new Error('Canonical D1 Blueprint is not the ready v2.1 artifact.');
    }
    const d1Bytes = new TextEncoder().encode(row.blueprintJson);
    const canonicalSha256 = await sha256Hex(d1Bytes);
    const jsonObject = await requiredObject(env, keysFor(orderId).json, 'canonical JSON');
    if (jsonObject.sha256 !== canonicalSha256 || jsonObject.bytes.byteLength !== d1Bytes.byteLength
        || jsonObject.bytes.some((byte, index) => byte !== d1Bytes[index])) {
      throw new Error('Canonical JSON differs between D1 and the Worker-visible R2 binding.');
    }
    return responseJson({
      ok: true,
      orderId,
      blueprintJson: row.blueprintJson,
      canonicalBlueprintSha256: canonicalSha256,
      currentResearchReceipt: JSON.parse(row.researchReceiptJson),
      data_read_path: 'single_worker_remote_bindings'
    });
  } catch (error) {
    return responseJson({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}

async function rematerialize(env: Env, request: Request): Promise<Response> {
  let payload: any;
  try { payload = await request.json(); } catch { return responseJson({ error: 'Invalid JSON body' }, 400); }
  const orderId = String(payload?.orderId || '');
  if (!validOrderId(orderId)) return responseJson({ error: 'Invalid order ID' }, 400);
  const requiredHashes = ['canonicalBlueprintSha256', 'priorPdfSha256', 'priorZipSha256', 'pdfSha256', 'zipSha256'];
  if (requiredHashes.some(key => !/^[a-f0-9]{64}$/i.test(String(payload?.[key] || '')))
      || typeof payload?.priorPdfBase64 !== 'string'
      || typeof payload?.priorZipBase64 !== 'string'
      || typeof payload?.pdfBase64 !== 'string'
      || typeof payload?.zipBase64 !== 'string'
      || !payload?.priorResearchReceipt
      || !payload?.priorIntegrity
      || !payload?.priorPointer
      || !payload?.documentReceipt) {
    return responseJson({ error: 'Recovery payload is incomplete' }, 400);
  }

  const keys = keysFor(orderId);
  try {
    const row = await canonicalRow(env, orderId);
    const blueprint = JSON.parse(row.blueprintJson);
    if (blueprint?.schemaVersion !== EXPECTED_SCHEMA || blueprint?.blueprintVersion !== '2.1' || blueprint?.status !== 'ready') {
      throw new Error('Canonical D1 Blueprint is not the ready v2.1 artifact.');
    }
    const canonicalBytes = new TextEncoder().encode(row.blueprintJson);
    const canonicalSha256 = await sha256Hex(canonicalBytes);
    if (canonicalSha256 !== payload.canonicalBlueprintSha256) throw new Error('Canonical Blueprint hash changed before v4 recovery.');

    const [jsonObject, currentPdf, currentZip] = await Promise.all([
      requiredObject(env, keys.json, 'canonical JSON'),
      requiredObject(env, keys.pdf, 'current PDF'),
      requiredObject(env, keys.zip, 'current ZIP')
    ]);
    if (jsonObject.sha256 !== canonicalSha256 || jsonObject.bytes.byteLength !== canonicalBytes.byteLength
        || jsonObject.bytes.some((byte, index) => byte !== canonicalBytes[index])) {
      throw new Error('Canonical JSON differs between D1 and Worker-visible R2 during v4 recovery.');
    }

    const priorPdf = fromBase64(payload.priorPdfBase64);
    const priorZip = fromBase64(payload.priorZipBase64);
    const newPdf = fromBase64(payload.pdfBase64);
    const newZip = fromBase64(payload.zipBase64);
    const [priorPdfSha, priorZipSha, newPdfSha, newZipSha] = await Promise.all([
      sha256Hex(priorPdf), sha256Hex(priorZip), sha256Hex(newPdf), sha256Hex(newZip)
    ]);
    if (priorPdfSha !== payload.priorPdfSha256 || priorZipSha !== payload.priorZipSha256
        || newPdfSha !== payload.pdfSha256 || newZipSha !== payload.zipSha256) {
      throw new Error('Recovery payload artifact hashes do not match their supplied bytes.');
    }

    const priorEvidence = payload.priorResearchReceipt?.generationReceiptEvidence;
    if (!priorEvidence?.hashes || !priorEvidence?.artifactKeys
        || priorEvidence.hashes.canonicalBlueprintSha256 !== canonicalSha256
        || priorEvidence.hashes.pdfSha256 !== priorPdfSha
        || priorEvidence.hashes.zipSha256 !== priorZipSha
        || priorEvidence.artifactKeys.json !== keys.json
        || priorEvidence.artifactKeys.pdf !== keys.pdf
        || priorEvidence.artifactKeys.zip !== keys.zip) {
      throw new Error('Gate-27 baseline research receipt does not match the recovery baseline.');
    }
    if (payload.priorIntegrity?.hashes?.canonicalBlueprintSha256 !== canonicalSha256
        || payload.priorIntegrity?.hashes?.pdfSha256 !== priorPdfSha
        || payload.priorIntegrity?.hashes?.zipSha256 !== priorZipSha) {
      throw new Error('Gate-27 baseline KV integrity receipt does not match the recovery baseline.');
    }

    allowedCurrent(currentPdf.sha256, priorPdfSha, newPdfSha, 'Current PDF');
    allowedCurrent(currentZip.sha256, priorZipSha, newZipSha, 'Current ZIP');
    const currentResearchReceipt = JSON.parse(row.researchReceiptJson);
    const currentEvidence = currentResearchReceipt?.generationReceiptEvidence;
    if (!currentEvidence?.hashes || currentEvidence.hashes.canonicalBlueprintSha256 !== canonicalSha256) {
      throw new Error('Current D1 integrity receipt lost canonical Blueprint identity.');
    }
    allowedCurrent(String(currentEvidence.hashes.pdfSha256 || ''), priorPdfSha, newPdfSha, 'Current D1 PDF receipt');
    allowedCurrent(String(currentEvidence.hashes.zipSha256 || ''), priorZipSha, newZipSha, 'Current D1 ZIP receipt');

    const nextReceipt = JSON.parse(JSON.stringify(payload.priorResearchReceipt));
    nextReceipt.generationReceiptEvidence.hashes.pdfSha256 = newPdfSha;
    nextReceipt.generationReceiptEvidence.hashes.zipSha256 = newZipSha;
    nextReceipt.generationReceiptEvidence.document = payload.documentReceipt;
    nextReceipt.artifactRematerialization = {
      schemaVersion: 'ghosttown-acceptance-artifact-rematerialization-v4',
      reason: 'Recover any interrupted Gate 28 rematerialization and finalize PDF/ZIP plus integrity receipts inside one remote DB/KV/R2 binding transaction.',
      canonicalBlueprintSha256: canonicalSha256,
      priorPdfSha256: priorPdfSha,
      priorZipSha256: priorZipSha,
      pdfSha256: newPdfSha,
      zipSha256: newZipSha,
      renderer: 'renderLaunchBlueprintPdfV21',
      dataMutationPath: 'single-worker-remote-bindings',
      documentReceipt: payload.documentReceipt,
      purchaseReplayed: false,
      researchReplayed: false,
      modelInvoked: false,
      acceptanceOnly: true,
      productionDeployed: false,
      rematerializedAt: new Date().toISOString()
    };
    const nextReceiptJson = JSON.stringify(nextReceipt);
    const nextIntegrity = nextReceipt.generationReceiptEvidence;
    const nextPointer = JSON.parse(JSON.stringify(payload.priorPointer));
    nextPointer.hashes = nextIntegrity.hashes;
    nextPointer.updatedAt = new Date().toISOString();

    const metadataBase = {
      orderId,
      ownerId: String(blueprint.ownerId || ''),
      schemaVersion: String(blueprint.schemaVersion || '')
    };
    if (!metadataBase.ownerId || metadataBase.schemaVersion !== EXPECTED_SCHEMA) throw new Error('Canonical Blueprint metadata is incomplete.');

    try {
      await putArtifact(env, keys.pdf, newPdf, {
        ...metadataBase,
        sha256: newPdfSha,
        contentType: 'application/pdf',
        contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${orderId}.pdf"`
      });
      await putArtifact(env, keys.zip, newZip, {
        ...metadataBase,
        sha256: newZipSha,
        contentType: 'application/zip',
        contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${orderId}-assets.zip"`
      });
      await updateResearchReceipt(env, orderId, nextReceiptJson);
      await Promise.all([
        env.KV.put(keys.integrity, JSON.stringify(nextIntegrity)),
        env.KV.put(keys.pointer, JSON.stringify(nextPointer))
      ]);

      const [verifyPdf, verifyZip, verifyJson, verifyRow] = await Promise.all([
        requiredObject(env, keys.pdf, 'verification PDF'),
        requiredObject(env, keys.zip, 'verification ZIP'),
        requiredObject(env, keys.json, 'verification JSON'),
        canonicalRow(env, orderId)
      ]);
      const verifyReceipt = JSON.parse(verifyRow.researchReceiptJson);
      if (verifyPdf.sha256 !== newPdfSha || verifyZip.sha256 !== newZipSha) throw new Error('R2 exact-byte verification failed after v4 rematerialization.');
      if (verifyJson.sha256 !== canonicalSha256 || verifyRow.blueprintJson !== row.blueprintJson) throw new Error('Canonical JSON changed during v4 rematerialization.');
      if (verifyReceipt?.generationReceiptEvidence?.hashes?.canonicalBlueprintSha256 !== canonicalSha256
          || verifyReceipt?.generationReceiptEvidence?.hashes?.pdfSha256 !== newPdfSha
          || verifyReceipt?.generationReceiptEvidence?.hashes?.zipSha256 !== newZipSha) {
        throw new Error('D1 integrity receipt verification failed after v4 rematerialization.');
      }

      return responseJson({
        ok: true,
        decision: 'REMATERIALIZED_REVERIFY',
        canonical_blueprint_sha256: canonicalSha256,
        canonical_blueprint_unchanged: true,
        recovered_partial_state: currentPdf.sha256 !== priorPdfSha || currentZip.sha256 !== priorZipSha
          || currentEvidence.hashes.pdfSha256 !== priorPdfSha || currentEvidence.hashes.zipSha256 !== priorZipSha,
        prior: { pdf_sha256: priorPdfSha, zip_sha256: priorZipSha },
        current: { pdf_sha256: newPdfSha, zip_sha256: newZipSha, document_receipt: payload.documentReceipt },
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
        await putArtifact(env, keys.pdf, priorPdf, {
          ...metadataBase,
          sha256: priorPdfSha,
          contentType: 'application/pdf',
          contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${orderId}.pdf"`
        });
        await putArtifact(env, keys.zip, priorZip, {
          ...metadataBase,
          sha256: priorZipSha,
          contentType: 'application/zip',
          contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${orderId}-assets.zip"`
        });
        const priorReceiptJson = JSON.stringify(payload.priorResearchReceipt);
        await updateResearchReceipt(env, orderId, priorReceiptJson);
        await Promise.all([
          env.KV.put(keys.integrity, JSON.stringify(payload.priorIntegrity)),
          env.KV.put(keys.pointer, JSON.stringify(payload.priorPointer))
        ]);
        const [rollbackPdf, rollbackZip, rollbackJson, rollbackRow] = await Promise.all([
          requiredObject(env, keys.pdf, 'rollback PDF'),
          requiredObject(env, keys.zip, 'rollback ZIP'),
          requiredObject(env, keys.json, 'rollback JSON'),
          canonicalRow(env, orderId)
        ]);
        if (rollbackPdf.sha256 !== priorPdfSha || rollbackZip.sha256 !== priorZipSha
            || rollbackJson.sha256 !== canonicalSha256 || rollbackRow.blueprintJson !== row.blueprintJson
            || rollbackRow.researchReceiptJson !== priorReceiptJson) {
          throw new Error('v4 rollback did not restore the Gate-27 baseline exactly.');
        }
      } catch (caught) {
        rollbackError = caught;
      }
      const original = error instanceof Error ? error.message : String(error);
      if (rollbackError) {
        return responseJson({ error: 'v4 rematerialization failed and rollback also failed', original, rollback: rollbackError instanceof Error ? rollbackError.message : String(rollbackError) }, 500);
      }
      return responseJson({ error: 'v4 rematerialization failed; Gate-27 baseline restored', original, rollback_verified: true }, 500);
    }
  } catch (error) {
    return responseJson({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') return responseJson({ ok: true, bindings: ['DB', 'KV', 'BLUEPRINTS'], mode: 'remote-binding-recovery' });
    if (url.pathname === '/canonical' && request.method === 'GET') return canonicalSnapshot(env, url.searchParams.get('orderId') || '');
    if (url.pathname === '/rematerialize' && request.method === 'POST') return rematerialize(env, request);
    return responseJson({ error: 'Not found' }, 404);
  }
} satisfies ExportedHandler<Env>;
