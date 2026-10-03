import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workspace = readFileSync(
  new URL('../src/components/GetMeLiveWorkspace.tsx', import.meta.url),
  'utf8',
);

describe('Get Me Live copy controls', () => {
  it('uses one resilient clipboard helper with a DOM fallback', () => {
    expect(workspace).toContain('async function copyText(text: string): Promise<boolean>');
    expect(workspace).toContain('navigator.clipboard?.writeText');
    expect(workspace).toContain('document.execCommand("copy")');
    expect(workspace).toContain('copyText(liveUrl)');
    expect(workspace).toContain('copyText(draft.editedText)');
    expect(workspace).toContain('copyText(idea)');
    expect(workspace).toContain('aria-label="Launch Share Pack drafts"');
    // Direct clipboard calls should exist only inside copyText itself.
    expect(workspace.match(/navigator\.clipboard/g)?.length).toBe(2);
  });

  it('announces successful copy actions and gives a visible failure path', () => {
    expect(workspace).toContain('setNotice("Post copied.")');
    expect(workspace).toContain('setNotice("Website link copied.")');
    expect(workspace).toContain('Select the post text and copy it instead.');
    expect(workspace).toContain('role="status" aria-live="polite"');
  });
});
