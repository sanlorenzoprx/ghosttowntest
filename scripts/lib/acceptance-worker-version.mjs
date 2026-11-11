// Pin a temporary acceptance probe to the exact deployment that contains it.
// Repeated temporary deploy/restore operations can otherwise hit an older edge version.
export function deployedWorkerVersion(output) {
  const plain = output.replace(/\u001b\[[0-9;]*m/g, '');
  const match = plain.match(/Current Version ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (!match) throw new Error('Wrangler did not identify the temporary acceptance Worker version.');
  return match[1];
}

export function acceptanceProbeHeaders(token, workerUrl, versionId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(versionId)) throw new Error('Invalid acceptance Worker version.');
  const host = new URL(workerUrl).hostname;
  if (host !== 'lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev') throw new Error('Probe version overrides are acceptance-only.');
  return {
    'X-Acceptance-Token': token,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store',
    'Cloudflare-Workers-Version-Overrides': `lit-ghost-town-api-acceptance="${versionId}"`
  };
}
