interface Env {
  BLUEPRINTS: R2Bucket;
}

const PDF_SUFFIX = '/ghosttown-launch-blueprint-v2.pdf';
const JSON_SUFFIX = '/ghosttown-launch-blueprint-v2.json';
const ZIP_SUFFIX = '/ghosttown-launch-blueprint-v2-assets.zip';

function allowedKey(key: string): boolean {
  return /^orders\/gtt_[A-Za-z0-9_-]+\//.test(key)
    && [PDF_SUFFIX, JSON_SUFFIX, ZIP_SUFFIX].some(suffix => key.endsWith(suffix));
}

function writableKey(key: string): boolean {
  return allowedKey(key) && (key.endsWith(PDF_SUFFIX) || key.endsWith(ZIP_SUFFIX));
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, binding: 'BLUEPRINTS', mode: 'remote-binding' });
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
      if (!/^gtt_[A-Za-z0-9_-]+$/.test(orderId) || !ownerId || schemaVersion !== 'ghosttown-launch-blueprint-v2') {
        return json({ error: 'Artifact metadata is incomplete' }, 400);
      }

      await env.BLUEPRINTS.put(key, bytes, {
        httpMetadata: {
          contentType: request.headers.get('content-type') || 'application/octet-stream',
          contentDisposition: request.headers.get('content-disposition') || undefined
        },
        customMetadata: {
          orderId,
          ownerId,
          schemaVersion,
          sha256: expectedSha256
        }
      });

      const verify = await env.BLUEPRINTS.get(key);
      if (!verify) return json({ error: 'Object missing after binding write' }, 500);
      const verifyBytes = await verify.arrayBuffer();
      const verifySha256 = await sha256Hex(verifyBytes);
      if (verifySha256 !== expectedSha256 || verifyBytes.byteLength !== bytes.byteLength) {
        return json({
          error: 'Binding write did not round-trip exactly',
          expectedSha256,
          actualSha256: verifySha256,
          expectedBytes: bytes.byteLength,
          actualBytes: verifyBytes.byteLength
        }, 500);
      }

      return json({ ok: true, key, sha256: verifySha256, size: verifyBytes.byteLength });
    }

    return json({ error: 'Method not allowed' }, 405);
  }
} satisfies ExportedHandler<Env>;
