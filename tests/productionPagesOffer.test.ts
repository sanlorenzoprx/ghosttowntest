import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(new URL('../.github/workflows/production-pages-release.yml', import.meta.url), 'utf8');
describe('production Pages offer selection', () => {
  it('passes an explicitly selected offer into the local build and records it', () => {
    expect(workflow).toContain('default: waitlist');
    expect(workflow).toContain('VITE_POST_VERDICT_OFFER: ${{ inputs.post_verdict_offer }}');
    expect(workflow).toContain('post_verdict_offer: process.env.VITE_POST_VERDICT_OFFER');
    const guard = workflow.slice(workflow.indexOf('          case "$VITE_POST_VERDICT_OFFER"'), workflow.indexOf('          test "$CONFIRM"')).split('\n').map(line => line.slice(10)).join('\n');
    for (const offer of ['waitlist', 'first30', 'sprint']) expect(() => execFileSync('bash', ['-c', guard], { env: { ...process.env, VITE_POST_VERDICT_OFFER: offer } })).not.toThrow();
    for (const offer of ['', 'unknown']) expect(() => execFileSync('bash', ['-c', guard], { env: { ...process.env, VITE_POST_VERDICT_OFFER: offer }, stdio: 'pipe' })).toThrow();
  });
});
