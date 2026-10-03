import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const apiSource = readFileSync(new URL('../src/api/blueprintApi.ts', import.meta.url), 'utf8');
const routerSource = readFileSync(new URL('../src/api/index.ts', import.meta.url), 'utf8');

describe('Sprint website evidence contract', () => {
  it('keeps Get Me Live separate and owner-linked', () => {
    expect(apiSource).toContain('loadGetMeLiveBySprint(env, owned.email, orderId)');
    expect(apiSource).toContain('separateProduct: true');
    expect(apiSource).toContain("getGetMeLiveActivity(env, getMeLive.orderId, orderId)");
    expect(routerSource).toContain('/blueprint\\/website-evidence');
  });

  it('projects anonymous recent feedback rather than lead identity fields', () => {
    expect(apiSource).toContain('recentFeedback: leads');
    expect(apiSource).toContain('message: lead.message!.trim()');
    expect(apiSource).toContain('sourcePath: lead.sourcePath');
    expect(apiSource).not.toContain('recentFeedback: leads.map(lead => ({ name:');
    expect(apiSource).not.toContain('recentFeedback: leads.map(lead => ({ email:');
  });
});
