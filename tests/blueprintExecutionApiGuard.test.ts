import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const api = readFileSync(new URL('../src/api/blueprintApi.ts', import.meta.url), 'utf8');

describe('Sprint server-side completion guard', () => {
  it('rejects invalid day-completion transitions before progress is persisted', () => {
    expect(api).toContain("import { completionTransitionFailures } from '../lib/blueprintExecutionCompletion';");
    expect(api).toContain('const failures = completionTransitionFailures(');
    expect(api).toContain("error: 'Day completion blocked by Sprint execution rules'");
    expect(api).toContain('completionFailures: failures');
    expect(api).toContain("}, 409, { 'Cache-Control': 'private, no-store' });");
    expect(api.indexOf('const failures = completionTransitionFailures('))
      .toBeLessThan(api.indexOf('const initiallySaved = await saveBlueprintProgress'));
  });
});
