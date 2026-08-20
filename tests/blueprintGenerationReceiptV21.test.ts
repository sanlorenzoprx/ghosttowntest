import { describe, expect, it } from 'vitest';
import type { Env } from '../src/api/env';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import type { CustomerAccessResearchResult } from '../src/api/customerAccessResearch';
import type { BlueprintVertexStageReceipt } from '../src/types/launchBlueprintV21';
import { upgradeGhostTownLaunchBlueprintToV21 } from '../src/api/launchBlueprintGeneratorV21';
import {
  applyBlueprintIntegrityReceiptV21,
  loadBlueprintIntegrityReceiptV21,
  prepareBlueprintGenerationReceiptV21,
  saveBlueprintRecordV21,
  sha256Hex
} from '../src/api/blueprintStoreV21';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const generatedAt = '2026-08-07T02:30:00.000Z';
const decoder = new TextDecoder();

function verdict(): EvaluationResult {
  return {
    resultId: 'fixture-verdict',
    generatedAt,
    idea: {
      ideaName: 'Family Game Night',
      description: 'Curated family game nights.',
      targetUser: 'Families with children',
      painfulProblem: 'Choosing games is difficult.',
      currentAlternative: 'Buying random games',
      motivation: 'Firsthand experience'
    },
    deterministicScores: {
      ghostTownScore: 3,
      ghostTownRisk: 'medium',
      leverageScore: 3,
      insightScore: 3,
      timingScore: 3,
      litScore: 3,
      litBand: 'unclear',
      highWallsScore: 2,
      highWallsBand: 'weak',
      businessDnaType: 'subscription',
      businessDnaTrap: 'Inventory risk',
      businessDnaWinStrategy: 'Concierge pilot',
      finalVerdict: 'test_first',
      verdictHeadline: 'Test first',
      verdictExplanation: 'Demand is not yet proven.',
      recommendedNextTest: 'Sell a pilot.',
      doNotBuildUntil: 'A family pays.',
      oneSentenceAdvice: 'Sell before stocking.'
    },
    usedAI: false,
    cacheHit: false,
    answers: {}
  } as EvaluationResult;
}

function order(): PaidTestOrder {
  return {
    orderId: 'gtt_fixture_12345678',
    email: 'founder@fixture.test',
    verdictId: 'fixture-verdict',
    status: 'generating',
    artifactType: 'launch_blueprint_v2',
    planVersion: '2.0',
    intake: {
      verdictId: 'fixture-verdict',
      targetBuyer: 'Families with children',
      problem: 'Choosing games is difficult.',
      currentWorkaround: 'Buying random games',
      offerHypothesis: 'A concierge family game-night pilot.',
      expectedPrice: '$49',
      currentStage: 'Idea with interviews but no paid pilot',
      geography: 'United States and Puerto Rico'
    },
    createdAt: generatedAt,
    updatedAt: generatedAt,
    paidAt: generatedAt
  };
}

function research(blueprint = launchBlueprintFixture()): CustomerAccessResearchResult {
  return {
    research: {
      status: 'complete',
      researchDate: '2026-08-07',
      sources: blueprint.sources,
      channels: blueprint.customerAccessPack.channels,
      publicExpertsAndPartners: blueprint.customerAccessPack.publicExpertsAndPartners
    },
    receipt: {
      provider: 'distribution_footprint',
      model: 'gemini-2.5-flash',
      requestedAt: generatedAt,
      completedAt: generatedAt,
      packs: ['customer_access'],
      webSearchQueries: [],
      attemptedSourceCount: 10,
      successfulSourceCount: 10,
      sourceTypeCount: 3,
      candidateChannelCount: 10,
      verifiedChannelCount: 10,
      rejectedUrls: [],
      failedSources: [],
      sourceDefinitionIds: blueprint.sources.map(source => source.sourceId),
      seedDomains: ['example.com', 'example.org'],
      targetTypeCounts: {
        podcast: 3,
        youtube_creator: 3,
        newsletter_or_publication: 4
      },
      responseHash: 'fixture-research-hash'
    }
  };
}

function stage(stage: BlueprintVertexStageReceipt['stage']): BlueprintVertexStageReceipt {
  return {
    stage,
    model: 'gemini-2.5-flash',
    modelVersion: 'gemini-2.5-flash-001',
    responseId: `response-${stage}`,
    promptHash: `prompt-${stage}`,
    responseHash: `response-${stage}`,
    completedAt: generatedAt
  };
}

function v21Blueprint() {
  const currentOrder = order();
  const currentVerdict = verdict();
  const blueprint = upgradeGhostTownLaunchBlueprintToV21(
    launchBlueprintFixture(currentOrder.email),
    currentOrder,
    currentVerdict
  );
  blueprint.status = 'ready';
  blueprint.qualityGate = { passed: true, failures: [], warnings: [] };
  blueprint.generationReceipt.vertexPipeline = {
    pipelineVersion: 'vertex-blueprint-staged-v1',
    required: true,
    status: 'complete',
    stages: [
      stage('evidence_normalization'),
      stage('strategy_synthesis'),
      stage('asset_generation'),
      stage('red_team_review')
    ],
    redTeam: { passed: true, findings: [] },
    completedAt: generatedAt
  };
  return { blueprint, currentOrder, currentVerdict, result: research(blueprint) };
}

function fakeEnvironment() {
  const kvValues = new Map<string, string>();
  const r2Values = new Map<string, Uint8Array>();
  let blueprintJson = '';
  let researchReceiptJson = '';
  let blueprintOwnerId = '';

  const db = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        run: async () => {
          if (sql.includes('INSERT INTO launch_blueprints')) {
            blueprintOwnerId = String(args[1]);
            blueprintJson = String(args[5]);
            researchReceiptJson = String(args[6]);
          }
          return { success: true, meta: { changes: 1 } };
        },
        first: async () => {
          if (sql.includes('SELECT owner_id')) {
            return blueprintOwnerId ? { owner_id: blueprintOwnerId } : null;
          }
          if (sql.includes('SELECT research_receipt_json')) {
            return researchReceiptJson ? { research_receipt_json: researchReceiptJson } : null;
          }
          return null;
        }
      })
    })
  } as unknown as D1Database;

  const bucket = {
    put: async (key: string, value: Uint8Array | ArrayBuffer | string, _options?: unknown) => {
      const bytes = typeof value === 'string'
        ? new TextEncoder().encode(value)
        : value instanceof Uint8Array
          ? new Uint8Array(value)
          : new Uint8Array(value);
      r2Values.set(key, bytes);
    },
    get: async (key: string) => {
      const bytes = r2Values.get(key);
      if (!bytes) return null;
      return {
        body: bytes,
        httpEtag: `etag-${key}`,
        text: async () => decoder.decode(bytes),
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        writeHttpMetadata: () => undefined
      };
    }
  } as unknown as R2Bucket;

  const kv = {
    get: async (key: string) => kvValues.get(key) ?? null,
    put: async (key: string, value: string) => { kvValues.set(key, value); },
    delete: async (key: string) => { kvValues.delete(key); }
  } as unknown as KVNamespace;

  const env = {
    DB: db,
    BLUEPRINTS: bucket,
    KV: kv,
    AI: {} as Ai,
    VERTEX_PROJECT_ID: 'ghosttown-acceptance',
    VERTEX_LOCATION: 'us-central1',
    VERTEX_BLUEPRINT_MODEL: 'gemini-2.5-flash',
    VERTEX_SERVICE_ACCOUNT_EMAIL: 'ghosttown@ghosttown-acceptance.iam.gserviceaccount.com',
    VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nSUPER_PRIVATE_FIXTURE_VALUE_123456789\n-----END PRIVATE KEY-----',
    JWT_SECRET: 'jwt_fixture_secret_123456789',
    STRIPE_SECRET_KEY: 'sk_test_fixture_secret_123456789',
    STRIPE_PRICE_ID: 'price_fixture',
    STRIPE_WEBHOOK_SECRET: 'whsec_fixture_secret_123456789'
  } as unknown as Env;

  return {
    env,
    r2Values,
    readBlueprintJson: () => blueprintJson,
    readResearchReceiptJson: () => researchReceiptJson
  };
}

function extractStoredZipEntry(zip: Uint8Array, wanted: string): Uint8Array | null {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let offset = 0;
  while (offset + 30 <= zip.byteLength && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const name = decoder.decode(zip.slice(nameStart, nameStart + nameLength));
    const dataStart = nameStart + nameLength + extraLength;
    const data = zip.slice(dataStart, dataStart + size);
    if (name === wanted) return data;
    offset = dataStart + size;
  }
  return null;
}

describe('Blueprint v2.1 Step 3 generation and evidence receipts', () => {
  it('persists one canonical JSON byte sequence and exact PDF/ZIP hashes without secrets', async () => {
    const { blueprint, currentOrder, currentVerdict, result } = v21Blueprint();
    const fixture = fakeEnvironment();
    const prepared = await prepareBlueprintGenerationReceiptV21(
      fixture.env,
      currentOrder,
      currentVerdict,
      result,
      blueprint,
      true
    );

    expect(prepared.vertex).toMatchObject({
      required: true,
      projectId: 'ghosttown-acceptance',
      location: 'us-central1',
      configuredModel: 'gemini-2.5-flash'
    });
    expect(prepared.vertex.stages).toHaveLength(4);
    expect(prepared.hashes.normalizedInputSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(prepared.quality).toEqual({
      deterministicGatePassed: true,
      v21GatePassed: true,
      redTeamPassed: true,
      sourceVerificationPassed: true,
      candidateIdValidationPassed: true
    });

    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const exact = await saveBlueprintRecordV21(fixture.env, blueprint, result.receipt, pdf);
    const d1Json = fixture.readBlueprintJson();
    const r2Json = decoder.decode(fixture.r2Values.get(exact.artifactKeys.json)!);
    const zip = fixture.r2Values.get(exact.artifactKeys.zip)!;
    const zipJson = extractStoredZipEntry(zip, 'ghosttown-launch-blueprint/blueprint.json');

    expect(d1Json).toBe(r2Json);
    expect(zipJson).not.toBeNull();
    expect(decoder.decode(zipJson!)).toBe(d1Json);
    expect(await sha256Hex(new TextEncoder().encode(d1Json))).toBe(exact.hashes.canonicalBlueprintSha256);
    expect(await sha256Hex(pdf)).toBe(exact.hashes.pdfSha256);
    expect(await sha256Hex(zip)).toBe(exact.hashes.zipSha256);
    expect(d1Json).toContain(blueprint.generationReceipt.canonicalContract.gitBlobSha1);
    expect(JSON.stringify(exact)).not.toContain('SUPER_PRIVATE_FIXTURE_VALUE_123456789');
    expect(d1Json).not.toContain('SUPER_PRIVATE_FIXTURE_VALUE_123456789');

    const storedReceipt = await loadBlueprintIntegrityReceiptV21(fixture.env, blueprint.orderId);
    expect(storedReceipt).toEqual(exact);
    const apiBlueprint = applyBlueprintIntegrityReceiptV21(blueprint, exact);
    expect(apiBlueprint.generationReceipt.hashes).toEqual(exact.hashes);
    expect(apiBlueprint.generationReceipt.vertex).toEqual(exact.vertex);

    const d1Evidence = JSON.parse(fixture.readResearchReceiptJson()) as { generationReceiptEvidence: unknown };
    expect(d1Evidence.generationReceiptEvidence).toEqual(exact);
  });

  it('rejects configured secret values before customer artifacts are persisted', async () => {
    const { blueprint, currentOrder, currentVerdict, result } = v21Blueprint();
    const fixture = fakeEnvironment();
    await prepareBlueprintGenerationReceiptV21(
      fixture.env,
      currentOrder,
      currentVerdict,
      result,
      blueprint,
      true
    );
    blueprint.offer.pricingRationale = `Never persist ${fixture.env.VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY}`;
    await expect(saveBlueprintRecordV21(
      fixture.env,
      blueprint,
      result.receipt,
      new Uint8Array([1, 2, 3])
    )).rejects.toThrow(/configured secret value|prohibited private generation material/);
  });
});
