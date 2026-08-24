import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:workers';
import type { Env } from '../../src/api/env';
import type { GhostTownLaunchBlueprint } from '../../src/types/launchBlueprint';
import type { CustomerAccessResearchReceipt } from '../../src/api/customerAccessResearch';
import {
  assertStoredBlueprintOwner,
  blueprintAssetsKey,
  blueprintJsonKey,
  blueprintPdfKey,
  saveBlueprintRecord
} from '../../src/api/blueprintStore';

function runtimeEnv(): Env {
  return env as unknown as Env;
}

function minimalBlueprint(orderId: string, ownerId: string, sourceVerdictId: string): GhostTownLaunchBlueprint {
  return { orderId, ownerId, sourceVerdictId } as unknown as GhostTownLaunchBlueprint;
}

describe('Launch Blueprint first-write identity reservation', () => {
  it('allows exactly one conflicting identity to win a concurrent first-write reservation', async () => {
    const runtime = runtimeEnv();
    const orderId = 'runtime-first-write-race';
    const attempts = await Promise.allSettled([
      assertStoredBlueprintOwner(runtime.DB!, orderId, 'owner-a@runtime.test', true, 'verdict-a'),
      assertStoredBlueprintOwner(runtime.DB!, orderId, 'owner-b@runtime.test', true, 'verdict-b')
    ]);

    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter(result => result.status === 'rejected')).toHaveLength(1);

    const reservation = await env.DB.prepare(`
      SELECT owner_id, source_verdict_id
      FROM launch_blueprint_identity_reservations
      WHERE order_id = ?
    `).bind(orderId).first<{ owner_id: string; source_verdict_id: string }>();

    expect(reservation).not.toBeNull();
    expect([
      'owner-a@runtime.test:verdict-a',
      'owner-b@runtime.test:verdict-b'
    ]).toContain(`${reservation?.owner_id}:${reservation?.source_verdict_id}`);
  });

  it('rejects a conflicting owner before the legacy persistence path can touch shared R2 keys', async () => {
    const runtime = runtimeEnv();
    const orderId = 'runtime-first-write-owner-guard';
    const sourceVerdictId = 'runtime-verdict-owner-guard';
    await assertStoredBlueprintOwner(runtime.DB!, orderId, 'owner@runtime.test', true, sourceVerdictId);

    await expect(saveBlueprintRecord(
      runtime,
      minimalBlueprint(orderId, 'attacker@runtime.test', sourceVerdictId),
      {} as CustomerAccessResearchReceipt,
      new TextEncoder().encode('%PDF-1.7 attacker')
    )).rejects.toThrow(/owner|immutable/i);

    expect(await env.BLUEPRINTS.get(blueprintPdfKey(orderId))).toBeNull();
    expect(await env.BLUEPRINTS.get(blueprintJsonKey(orderId))).toBeNull();
    expect(await env.BLUEPRINTS.get(blueprintAssetsKey(orderId))).toBeNull();
  });

  it('rejects a conflicting source verdict before the legacy persistence path can touch shared R2 keys', async () => {
    const runtime = runtimeEnv();
    const orderId = 'runtime-first-write-source-guard';
    const ownerId = 'owner@runtime.test';
    await assertStoredBlueprintOwner(runtime.DB!, orderId, ownerId, true, 'verdict-original');

    await expect(saveBlueprintRecord(
      runtime,
      minimalBlueprint(orderId, ownerId, 'verdict-rebound'),
      {} as CustomerAccessResearchReceipt,
      new TextEncoder().encode('%PDF-1.7 rebound')
    )).rejects.toThrow(/source verdict|immutable/i);

    expect(await env.BLUEPRINTS.get(blueprintPdfKey(orderId))).toBeNull();
    expect(await env.BLUEPRINTS.get(blueprintJsonKey(orderId))).toBeNull();
    expect(await env.BLUEPRINTS.get(blueprintAssetsKey(orderId))).toBeNull();
  });
});
