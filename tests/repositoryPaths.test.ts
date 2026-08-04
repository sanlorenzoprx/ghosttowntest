import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function trackedPaths(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

describe('repository path portability', () => {
  it('has no tracked paths that collide on case-insensitive filesystems', () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];

    for (const path of trackedPaths()) {
      const key = path.normalize('NFC').toLowerCase();
      const existing = seen.get(key);
      if (existing && existing !== path) {
        collisions.push(`${existing} <> ${path}`);
      } else {
        seen.set(key, path);
      }
    }

    expect(
      collisions,
      'Tracked paths must remain unique when compared case-insensitively so Windows and macOS checkouts stay clean.'
    ).toEqual([]);
  });
});
