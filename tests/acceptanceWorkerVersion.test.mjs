import { describe, expect, it } from 'vitest';
import { deployedWorkerVersion, acceptanceProbeHeaders } from '../scripts/lib/acceptance-worker-version.mjs';
const version = '12345678-1234-4321-8765-123456789abc';
const acceptance = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
describe('temporary acceptance Worker version pinning', () => {
  it('reads the deployed version and sends it to the acceptance host', () => {
    expect(deployedWorkerVersion(`Uploaded worker\nCurrent Version ID: ${version}\n`)).toBe(version);
    const headers = acceptanceProbeHeaders('test-only-token', acceptance, version);
    expect(headers['Cloudflare-Workers-Version-Overrides']).toBe(`lit-ghost-town-api-acceptance="${version}"`);
    expect(headers['X-Acceptance-Token']).toBe('test-only-token');
  });
  it('fails closed if deployment identity is missing or the target is not acceptance', () => {
    expect(() => deployedWorkerVersion('Uploaded worker')).toThrow();
    expect(() => acceptanceProbeHeaders('test', acceptance, 'unknown')).toThrow();
    for (const url of ['https://api.ghosttownverdict.app', 'https://api.ghosttowntest.com', 'https://example.com']) {
      expect(() => acceptanceProbeHeaders('test', url, version)).toThrow();
    }
  });
});
