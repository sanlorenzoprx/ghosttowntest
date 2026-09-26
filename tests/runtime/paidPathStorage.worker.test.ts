import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import type { EvaluationResult } from "../../src/types/lit";
import type { PaidTestOrder } from "../../src/types/paidTest";
import type { CustomerAccessResearchResult } from "../../src/api/customerAccessResearch";
import type { CustomerAccessResearchInput } from "../../src/api/launchBlueprintGenerator";
import type { BlueprintVertexStageReceipt } from "../../src/types/launchBlueprintV21";
import { createGhostTownLaunchBlueprintV21 } from "../../src/api/launchBlueprintGeneratorV21";
import {
  loadBlueprintIntegrityReceiptV21,
  prepareBlueprintGenerationReceiptV21,
  saveBlueprintRecordV21
} from "../../src/api/blueprintStoreV21";

const generatedAt = "2026-08-20T12:00:00.000Z";

function verdict(): EvaluationResult {
  return {
    resultId: "runtime-verdict",
    generatedAt,
    idea: {
      ideaName: "Family Game Night",
      description: "Curated family game nights.",
      targetUser: "Families with children",
      painfulProblem: "Choosing games is difficult.",
      currentAlternative: "Buying random games",
      motivation: "Firsthand experience"
    },
    deterministicScores: {
      ghostTownScore: 3,
      ghostTownRisk: "medium",
      leverageScore: 3,
      insightScore: 3,
      timingScore: 3,
      litScore: 3,
      litBand: "unclear",
      highWallsScore: 2,
      highWallsBand: "weak",
      businessDnaType: "subscription",
      businessDnaTrap: "Inventory risk",
      businessDnaWinStrategy: "Concierge pilot",
      finalVerdict: "test_first",
      verdictHeadline: "Test first",
      verdictExplanation: "Demand is not yet proven.",
      recommendedNextTest: "Sell a pilot.",
      doNotBuildUntil: "A family pays.",
      oneSentenceAdvice: "Sell before stocking."
    },
    usedAI: false,
    cacheHit: false,
    answers: {}
  } as EvaluationResult;
}

function order(owner = "founder@runtime.test"): PaidTestOrder {
  return {
    orderId: "gtt_runtime_12345678",
    email: owner,
    verdictId: "runtime-verdict",
    status: "generating",
    artifactType: "launch_blueprint_v2",
    planVersion: "2.0",
    intake: {
      verdictId: "runtime-verdict",
      targetBuyer: "Families with children",
      problem: "Choosing games is difficult.",
      currentWorkaround: "Buying random games",
      offerHypothesis: "A concierge family game-night pilot.",
      expectedPrice: "$49",
      currentStage: "Idea with interviews but no paid pilot",
      geography: "United States and Puerto Rico"
    },
    createdAt: generatedAt,
    updatedAt: generatedAt,
    paidAt: generatedAt
  };
}

function stage(stageName: BlueprintVertexStageReceipt["stage"]): BlueprintVertexStageReceipt {
  return {
    stage: stageName,
    model: "gemini-3.5-flash",
    modelVersion: "runtime-contract",
    responseId: `response-${stageName}`,
    promptHash: `prompt-${stageName}`,
    responseHash: `response-${stageName}`,
    completedAt: generatedAt
  };
}

function researchInput(): CustomerAccessResearchInput {
  const researchDate = "2026-08-20";
  const sources = Array.from({ length: 10 }, (_, index) => ({
    sourceId: `runtime-source-${index}`,
    title: `Runtime Source ${index}`,
    url: `https://example.com/runtime-source-${index}`,
    publisher: "Runtime Fixture",
    accessedAt: `${researchDate}T12:00:00.000Z`,
    evidenceDate: "2026-08-01T12:00:00.000Z",
    evidenceDateSource: "provider_activity" as const,
    evidenceRecency: "current" as const,
    supports: [`runtime-channel-${index}`]
  }));
  const channels = Array.from({ length: 10 }, (_, index) => {
    const targetType = index < 5 ? "community"
      : index < 7 ? "review_site"
        : index < 9 ? "youtube_creator"
          : "complementary_partner";
    const evidenceRole = index < 5 ? "customer_access"
      : index < 7 ? "market_evidence"
        : index < 9 ? "media_pr"
          : "partnership";
    return {
      channelId: `runtime-channel-${index}`,
      community: `Runtime Community ${index}`,
      platform: index < 5 ? "Community" : index < 7 ? "Review site" : index < 9 ? "YouTube" : "Partner",
      publicUrl: `https://example.com/runtime-channel-${index}`,
      relevance: "Families discuss game selection and purchases.",
      activity: "active",
      participationRules: "Read current rules.",
      recommendedApproach: "Contribute before pitching.",
      usefulTopic: "Choosing a family game.",
      risk: "Rules can change.",
      firstAction: "Read recent discussions.",
      confidence: "high",
      researchDate,
      evidenceDate: "2026-08-01T12:00:00.000Z",
      evidenceDateSource: "provider_activity" as const,
      evidenceRecency: "current" as const,
      currentActivityStatus: "verified_current" as const,
      currentActivityVerifiedAt: generatedAt,
      currentActivityEvidence: "Runtime fixture provider independently observed current public activity on 2026-08-01.",
      sourceIds: [`runtime-source-${index}`],
      targetType,
      evidenceRole
    };
  }) as CustomerAccessResearchInput["channels"];

  return {
    status: "complete",
    researchDate,
    sources,
    channels,
    publicExpertsAndPartners: [{
      name: "Runtime organizer",
      role: "Organizer",
      publicUrl: "https://example.com/runtime-organizer",
      relevance: "Runs family game events.",
      sourceIds: ["runtime-source-0"]
    }]
  };
}

function makeScenario(owner = "founder@runtime.test") {
  const currentOrder = order(owner);
  const currentVerdict = verdict();

  // One canonical scenario source: the production generator receives the same
  // order/verdict pair that every storage assertion below uses.
  const blueprint = createGhostTownLaunchBlueprintV21(
    currentOrder,
    currentVerdict,
    researchInput(),
    generatedAt
  );
  blueprint.status = "ready";
  blueprint.qualityGate = { passed: true, failures: [], warnings: [] };
  blueprint.generationReceipt.vertexPipeline = {
    pipelineVersion: "vertex-blueprint-staged-v2",
    required: true,
    status: "complete",
    stages: [
      stage("evidence_normalization"),
      stage("strategy_synthesis"),
      stage("strategic_coherence_gate"),
      stage("asset_generation"),
      stage("red_team_review")
    ],
    redTeam: { passed: true, findings: [] },
    completedAt: generatedAt
  };

  if (blueprint.orderId !== currentOrder.orderId) {
    throw new Error(`Runtime scenario order drift: ${blueprint.orderId} !== ${currentOrder.orderId}`);
  }
  if (blueprint.sourceVerdictId !== currentVerdict.resultId) {
    throw new Error(`Runtime scenario verdict drift: ${blueprint.sourceVerdictId} !== ${currentVerdict.resultId}`);
  }
  if (blueprint.ownerId !== currentOrder.email) {
    throw new Error(`Runtime scenario owner drift: ${blueprint.ownerId} !== ${currentOrder.email}`);
  }

  const result: CustomerAccessResearchResult = {
    research: {
      status: "complete",
      researchDate: "2026-08-20",
      sources: blueprint.sources,
      channels: blueprint.customerAccessPack.channels,
      publicExpertsAndPartners: blueprint.customerAccessPack.publicExpertsAndPartners
    },
    receipt: {
      provider: "distribution_footprint",
      model: "gemini-3.5-flash",
      requestedAt: generatedAt,
      completedAt: generatedAt,
      packs: ["customer_access"],
      webSearchQueries: [],
      attemptedSourceCount: 10,
      successfulSourceCount: 10,
      sourceTypeCount: 4,
      candidateChannelCount: 10,
      verifiedChannelCount: 10,
      rejectedUrls: [],
      failedSources: [],
      sourceDefinitionIds: blueprint.sources.map(source => source.sourceId),
      seedDomains: ["example.com", "example.org"],
      targetTypeCounts: {
        community: 5,
        review_site: 2,
        youtube_creator: 2,
        complementary_partner: 1
      },
      responseHash: "runtime-research-hash"
    }
  };
  return { currentOrder, currentVerdict, blueprint, result };
}

function runtimeEnv(): Env {
  return {
    KV: env.KV,
    DB: env.DB,
    BLUEPRINTS: env.BLUEPRINTS,
    AI: {} as Ai,
    DEPLOYMENT_ENV: "development",
    VERTEX_PROJECT_ID: env.VERTEX_PROJECT_ID,
    VERTEX_LOCATION: env.VERTEX_LOCATION,
    VERTEX_BLUEPRINT_MODEL: env.VERTEX_BLUEPRINT_MODEL,
    VERTEX_BLUEPRINT_REQUIRED: env.VERTEX_BLUEPRINT_REQUIRED,
    VERTEX_SERVICE_ACCOUNT_EMAIL: env.VERTEX_SERVICE_ACCOUNT_EMAIL,
    VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: env.VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY,
    JWT_SECRET: env.JWT_SECRET,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_ID: env.STRIPE_PRICE_ID,
    STRIPE_PAID_TEST_PRICE_ID: env.STRIPE_PAID_TEST_PRICE_ID,
    STRIPE_30_DAY_PLAN_PRICE_ID: env.STRIPE_30_DAY_PLAN_PRICE_ID,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET
  } as Env;
}

describe("GhostTown paid-path storage on real local Cloudflare bindings", () => {
  it("persists the canonical Blueprint through production code into real D1/R2/KV", async () => {
    const scenario = makeScenario();
    const runtime = runtimeEnv();
    await prepareBlueprintGenerationReceiptV21(
      runtime,
      scenario.currentOrder,
      scenario.currentVerdict,
      scenario.result,
      scenario.blueprint,
      true
    );

    const pdf = new TextEncoder().encode("%PDF-1.7 runtime contract");
    // T04 canonical source-verdict lineage
    expect(scenario.currentOrder.verdictId).toBe(scenario.currentVerdict.resultId);
    scenario.blueprint.sourceVerdictId = scenario.currentVerdict.resultId;
    expect(scenario.blueprint.sourceVerdictId).toBe(scenario.currentOrder.verdictId);
    const receipt = await saveBlueprintRecordV21(
      runtime,
      scenario.blueprint,
      scenario.result.receipt,
      pdf
    );

    const row = await env.DB.prepare(
      "SELECT owner_id, source_verdict_id, status, research_receipt_json FROM launch_blueprints WHERE order_id = ?"
    ).bind(scenario.currentOrder.orderId).first<{
      owner_id: string;
      source_verdict_id: string;
      status: string;
      research_receipt_json: string;
    }>();

    expect(row?.owner_id).toBe(scenario.currentOrder.email);
    expect(row?.source_verdict_id).toBe(scenario.currentVerdict.resultId);
    expect(row?.status).toBe("ready");

    const storedJson = await env.BLUEPRINTS.get(receipt.artifactKeys.json);
    const storedPdf = await env.BLUEPRINTS.get(receipt.artifactKeys.pdf);
    const storedZip = await env.BLUEPRINTS.get(receipt.artifactKeys.zip);
    expect(storedJson).not.toBeNull();
    expect(storedPdf).not.toBeNull();
    expect(storedZip).not.toBeNull();
    expect(storedJson?.customMetadata?.ownerId).toBe(scenario.currentOrder.email);

    const pointer = await env.KV.get(`paid_test_blueprint_pointer_${scenario.currentOrder.orderId}`, "json") as {
      ownerId?: string;
      hashes?: { canonicalBlueprintSha256?: string };
    } | null;
    expect(pointer?.ownerId).toBe(scenario.currentOrder.email);
    expect(pointer?.hashes?.canonicalBlueprintSha256).toBe(receipt.hashes.canonicalBlueprintSha256);

    const loadedReceipt = await loadBlueprintIntegrityReceiptV21(runtime, scenario.currentOrder.orderId);
    expect(loadedReceipt?.hashes.canonicalBlueprintSha256).toBe(receipt.hashes.canonicalBlueprintSha256);
  }, 30000);

  it("refuses an ownership transfer through the production persistence boundary", async () => {
    const original = makeScenario("founder@runtime.test");
    const runtime = runtimeEnv();
    await prepareBlueprintGenerationReceiptV21(
      runtime,
      original.currentOrder,
      original.currentVerdict,
      original.result,
      original.blueprint,
      true
    );
    await saveBlueprintRecordV21(
      runtime,
      original.blueprint,
      original.result.receipt,
      new TextEncoder().encode("%PDF-1.7 owner contract")
    );

    const attacker = structuredClone(original.blueprint);
    attacker.ownerId = "attacker@runtime.test";

    await expect(saveBlueprintRecordV21(
      runtime,
      attacker,
      original.result.receipt,
      new TextEncoder().encode("%PDF-1.7 attacker")
    )).rejects.toThrow(/owner|immutable/i);

    const row = await env.DB.prepare(
      "SELECT owner_id FROM launch_blueprints WHERE order_id = ?"
    ).bind(original.currentOrder.orderId).first<{ owner_id: string }>();
    expect(row?.owner_id).toBe("founder@runtime.test");
  }, 30000);

  it("refuses a source verdict transfer through the production persistence boundary", async () => {
    const original = makeScenario("founder@runtime.test");
    const runtime = runtimeEnv();
    await prepareBlueprintGenerationReceiptV21(
      runtime,
      original.currentOrder,
      original.currentVerdict,
      original.result,
      original.blueprint,
      true
    );
    await saveBlueprintRecordV21(
      runtime,
      original.blueprint,
      original.result.receipt,
      new TextEncoder().encode("%PDF-1.7 owner contract")
    );

    const attacker = structuredClone(original.blueprint);
    attacker.sourceVerdictId = 'runtime-verdict-rebound';

    await expect(saveBlueprintRecordV21(
      runtime,
      attacker,
      original.result.receipt,
      new TextEncoder().encode("%PDF-1.7 attacker")
    )).rejects.toThrow("Launch Blueprint source verdict is immutable");

    const row = await env.DB.prepare(
      "SELECT owner_id FROM launch_blueprints WHERE order_id = ?"
    ).bind(original.currentOrder.orderId).first<{ owner_id: string }>();
    expect(row?.owner_id).toBe("founder@runtime.test");
  }, 30000);
});
