import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const artifact = join(root, '.roadmap-autopilot', 'q2-daily-execution-assets-golden-output.json');
const adapter = join(root, 'scripts', 'roadmap-quality-q2-daily-execution-assets.mjs');

function rejects(mutator: (artifact: any) => void) {
  const original = readFileSync(artifact, 'utf8');
  try {
    const changed = JSON.parse(original); mutator(changed); writeFileSync(artifact, JSON.stringify(changed));
    const result = spawnSync(process.execPath, [adapter], { cwd: root, env: { ...process.env, ROADMAP_Q2_VALIDATION_ONLY: '1' }, encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain('Q2 acceptance failed');
  } finally { writeFileSync(artifact, original); }
}

describe('Q2 acceptance adapter adverse mutations', () => {
  it('fails closed for each independent packet-contract failure class', () => {
    execFileSync(process.execPath, [join(root, 'node_modules', 'vitest', 'vitest.mjs'), 'run', 'tests/q2DailyExecutionPackets.test.ts'], { cwd: root, env: { ...process.env, ROADMAP_Q2_GOLDEN_ARTIFACT_PATH: artifact }, stdio: 'pipe' });
    rejects(value => value.days.pop());
    rejects(value => { value.days[3].packet.assets[0].finishedContent = value.days[3].packet.assets[0].title; });
    rejects(value => { value.days[3].packet.actions[0].targetIds = ['missing-target']; });
    rejects(value => { value.days[6].packet.assets[0].lineage.sourceAssetIds = ['missing-asset']; });
    rejects(value => { value.days[6].packet.assets[0].targetChannel = 'Independent ecommerce checkout community 1'; });
    rejects(value => { value.days[11].packet.targets = value.days[11].packet.targets.filter((target: any) => target.kind !== 'launch_site'); });
    rejects(value => { value.days[0].legacy.objective = 'different legacy projection'; });
  }, 30_000);
});
