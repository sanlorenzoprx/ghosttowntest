import { describe, expect, it } from 'vitest';
import { handleLogin, handleSignup } from '../src/api/auth';
import { handleLaunchBlueprintProgress } from '../src/api/blueprintApi';
import { CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1 } from '../src/api/blueprintExecutionStore';
import type { Env } from '../src/api/env';
import type { GhostTownLaunchBlueprint } from '../src/types/launchBlueprint';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

function currentBlueprint(ownerId: string): GhostTownLaunchBlueprint {
  const base = launchBlueprintFixture(ownerId);
  return {
    ...base,
    blueprintVersion: '2.1',
    contractVersion: '2.1.1',
    generationReceipt: {
      ...base.generationReceipt,
      canonicalContract: {
        version: '2.1.1',
        gitBlobSha1: CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1,
        sourcePath: 'docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md',
        changeRecordPath: 'docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_1_CHANGE_RECORD.md',
        evidenceManifestPath: 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json',
        verifiedAt: base.createdAt
      }
    }
  } as unknown as GhostTownLaunchBlueprint;
}

function fakeEnvironment(blueprint: GhostTownLaunchBlueprint, ownerId: string) {
  const kvValues = new Map<string, string>();
  let progressJson: string | null = null;
  let normalizedBatchCount = 0;

  const KV = {
    get: async (key: string) => kvValues.get(key) ?? null,
    put: async (key: string, value: string) => { kvValues.set(key, value); },
    delete: async (key: string) => { kvValues.delete(key); },
    list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
      keys: [...kvValues.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name }))
    })
  };

  const DB = {
    prepare(sql: string) {
      let bindings: unknown[] = [];
      return {
        bind(...values: unknown[]) { bindings = values; return this; },
        async first() {
          if (sql.includes('FROM launch_blueprints')) {
            return {
              owner_id: ownerId,
              blueprint_json: JSON.stringify(blueprint),
              research_receipt_json: JSON.stringify({
                provider: 'distribution_footprint', model: 'gemini-2.5-flash', completedAt: blueprint.createdAt,
                packs: [], webSearchQueries: [], attemptedSourceCount: 6, successfulSourceCount: 6,
                sourceTypeCount: 1, verifiedChannelCount: 10, rejectedUrls: [], failedSources: [],
                seedDomains: ['example.com', 'example.org'], targetTypeCounts: { podcast: 10 }
              }),
              pdf_r2_key: `orders/${blueprint.orderId}/ghosttown-launch-blueprint-v2.pdf`
            };
          }
          if (sql.includes('FROM launch_blueprint_progress')) {
            return progressJson ? { progress_json: progressJson } : null;
          }
          return null;
        },
        async run() {
          if (sql.includes('INSERT INTO launch_blueprint_progress')) {
            progressJson = String(bindings[2]);
          }
          return { success: true, meta: { changes: 1 } };
        }
      };
    },
    async batch(statements: unknown[]) {
      normalizedBatchCount += statements.length;
      return statements.map(() => ({ success: true }));
    }
  };

  const env = {
    KV,
    DB,
    AI: {},
    JWT_SECRET: 'test-jwt-secret-with-enough-entropy',
    STRIPE_SECRET_KEY: 'sk_test_recovery',
    STRIPE_PRICE_ID: 'price_recovery',
    STRIPE_WEBHOOK_SECRET: 'whsec_recovery'
  } as unknown as Env;

  return { env, KV, getNormalizedBatchCount: () => normalizedBatchCount };
}

async function tokenFrom(response: Response) {
  expect(response.status).toBeLessThan(300);
  return (await response.json() as { token: string }).token;
}

describe('Blueprint v2.1.1 account recovery', () => {
  it('persists evidence-led progress and restores it after a fresh login', async () => {
    const email = 'founder@example.com';
    const password = 'correct-horse-battery';
    const blueprint = currentBlueprint(email);
    const { env, KV, getNormalizedBatchCount } = fakeEnvironment(blueprint, email);

    const firstToken = await tokenFrom(await handleSignup(new Request('https://ghost.test/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    }), env));

    await KV.put(`paid_test_order_${blueprint.orderId}`, JSON.stringify({
      orderId: blueprint.orderId,
      email,
      verdictId: blueprint.sourceVerdictId,
      status: 'ready',
      artifactType: 'launch_blueprint_v2',
      intake: {},
      createdAt: blueprint.createdAt,
      updatedAt: blueprint.createdAt
    }));

    const save = await handleLaunchBlueprintProgress(new Request('https://ghost.test/api/progress', {
      method: 'POST',
      headers: { Authorization: `Bearer ${firstToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completedDays: [1, 7],
        evidenceLedger: [{
          entryId: 'recovery-evidence-1', contactOrChannel: 'Buyer A', date: '2026-08-07', action: 'Asked for paid pilot',
          response: 'Requested scope', customerLanguage: 'Send me the price.', alternativeMentioned: 'Spreadsheet', objection: '',
          commitmentOffered: 'Paid pilot', commitmentReceived: 'Proposal requested', revenueCents: 0, founderMinutes: 20,
          variableCostCents: 125, followUpDate: '2026-08-08', evidenceStrength: 'moderate', sourceNote: 'Call notes', actionId: 'day-7'
        }],
        checkpointReviews: [{
          dayNumber: 7, completedAt: '2026-08-07T15:00:00.000Z', answers: { access: 'reachable' },
          evidenceSummary: 'One qualified proposal request.', strongestEvidence: 'moderate', primaryConstraint: 'price',
          nextAction: 'Send the scoped paid pilot.'
        }],
        metrics: { commitments: 1, revenueCents: 0, founderMinutes: 20, variableCostCents: 125 }
      })
    }), env, blueprint.orderId);

    expect(save.status).toBe(200);
    const saved = await save.json() as { progress: { evidenceLedger: Array<Record<string, unknown>> }; executionLog?: { schemaVersion: string } };
    expect(saved.executionLog?.schemaVersion).toBe('ghosttown-daily-execution-log-v1');
    expect(saved.progress.evidenceLedger[0]).toMatchObject({
      entryId: 'recovery-evidence-1',
      blueprintId: blueprint.blueprintId,
      blueprintVersion: '2.1',
      actionId: 'day-7',
      checkpointId: 'day-7'
    });
    expect(getNormalizedBatchCount()).toBeGreaterThan(0);

    const secondToken = await tokenFrom(await handleLogin(new Request('https://ghost.test/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    }), env));
    expect(secondToken).toBeTruthy();

    const restoredResponse = await handleLaunchBlueprintProgress(new Request('https://ghost.test/api/progress', {
      headers: { Authorization: `Bearer ${secondToken}` }
    }), env, blueprint.orderId);
    expect(restoredResponse.status).toBe(200);
    expect(restoredResponse.headers.get('Cache-Control')).toBe('private, no-store');
    const restored = await restoredResponse.json() as {
      progress: { completedDays: number[]; evidenceLedger: Array<Record<string, unknown>>; checkpointReviews: Array<Record<string, unknown>>; metrics: Record<string, number> };
      executionLog?: { schemaVersion: string };
    };
    expect(restored.executionLog?.schemaVersion).toBe('ghosttown-daily-execution-log-v1');
    expect(restored.progress.completedDays).toEqual([1, 7]);
    expect(restored.progress.evidenceLedger[0]).toMatchObject({ entryId: 'recovery-evidence-1', blueprintVersion: '2.1' });
    expect(restored.progress.checkpointReviews[0]).toMatchObject({ dayNumber: 7, evidenceSummary: 'One qualified proposal request.' });
    expect(restored.progress.metrics).toMatchObject({ commitments: 1, founderMinutes: 20, variableCostCents: 125 });
  });
});
