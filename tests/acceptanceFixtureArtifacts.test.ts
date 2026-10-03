import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(
  new URL('../scripts/roadmap-r2-binding-worker.ts', import.meta.url),
  'utf8',
);

describe('acceptance Sprint fixture artifact fidelity', () => {
  it('gives the disposable Sprint its own private artifact keys and integrity pointers', () => {
    const start = worker.indexOf('async function createE2eSprintFixture');
    const end = worker.indexOf('async function deleteE2eSprintFixture');
    const fixture = worker.slice(start, end);

    expect(fixture).toContain('const sourceKeys = artifactKeys(source.order_id)');
    expect(fixture).toContain('const targetKeys = artifactKeys(orderId)');
    expect(fixture).toContain('env.BLUEPRINTS.put(targetKeys.pdf');
    expect(fixture).toContain('env.BLUEPRINTS.put(targetKeys.json');
    expect(fixture).toContain('env.BLUEPRINTS.put(targetKeys.zip');
    expect(fixture).toContain('canonicalBlueprintSha256 = await sha256Hex(canonicalBlueprintBytes)');
    expect(fixture).toContain("env.KV.put('paid_test_blueprint_pointer_' + orderId");
    expect(fixture).toContain("env.KV.put('paid_test_blueprint_integrity_' + orderId");
    expect(fixture).toContain('researchReceiptJson, targetKeys.pdf');
    expect(fixture).not.toContain('source.pdf_r2_key, now, now');
  });

  it('removes every disposable Sprint artifact and pointer during cleanup', () => {
    const start = worker.indexOf('async function deleteE2eSprintFixture');
    const cleanup = worker.slice(start);

    expect(cleanup).toContain('const sprintKeys = artifactKeys(orderId)');
    expect(cleanup).toContain('env.BLUEPRINTS.delete(sprintKeys.pdf)');
    expect(cleanup).toContain('env.BLUEPRINTS.delete(sprintKeys.json)');
    expect(cleanup).toContain('env.BLUEPRINTS.delete(sprintKeys.zip)');
    expect(cleanup).toContain("env.KV.delete('paid_test_blueprint_pointer_' + orderId)");
    expect(cleanup).toContain("env.KV.delete('paid_test_blueprint_integrity_' + orderId)");
  });
});
