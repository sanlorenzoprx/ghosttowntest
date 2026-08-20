#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PACKAGE_VERSION = "0.21.3";
const MIGRATION_VERSION = "ghosttown-test-runtime-migration-v1";
const STAGES = [
  "T00_FREEZE",
  "T01_CLASSIFY",
  "T02_WORKERS_VITEST_BOOTSTRAP",
  "T03_D1_MIGRATIONS",
  "T04_PAID_PATH_STORAGE",
  "T05_R2_RUNTIME",
  "T06_KV_RUNTIME",
  "T07_LAUNCH_SITE_D1",
  "T08_WORKER_HARNESS",
  "T09_PROVIDER_CONTRACTS",
  "T10_PLATFORM_EMULATOR_GUARD",
  "T11_PLATFORM_SEMANTICS_RETIREMENT",
  "T12_FULL_VALIDATION",
  "T13_ACCEPTANCE_READINESS",
  "T14_EXTERNAL_ACCEPTANCE_REQUIRED"
];

const argv = process.argv.slice(2);
function arg(name, fallback = null) {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
}

const repo = path.resolve(arg("--repo", process.cwd()));
const evidenceRoot = path.resolve(arg("--evidence", path.join(path.dirname(repo), `${path.basename(repo)}-evidence`)));
const suppliedBaseHead = arg("--base-head", null);
const statePath = path.join(evidenceRoot, "state.json");
const receiptsDir = path.join(evidenceRoot, "receipts");

fs.mkdirSync(receiptsDir, { recursive: true });

function now() {
  return new Date().toISOString();
}

function sha256File(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function run(cmd, args = [], options = {}) {
  const label = `${cmd} ${args.join(" ")}`.trim();
  console.log(`\n$ ${label}`);
  const windowsCommandScript = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(cmd);
  const result = spawnSync(cmd, args, {
    cwd: options.cwd || repo,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    // Node 22 on Windows can return EINVAL when a .cmd/.bat shim is spawned
    // directly. Route only those command-script shims through cmd.exe.
    shell: windowsCommandScript,
    timeout: options.timeout || 0
  });
  if (result.error) throw result.error;
  if (options.capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.status !== 0 && !options.allowFailure) {
    const error = new Error(`${label} failed with exit code ${result.status}`);
    error.exitCode = result.status;
    error.stdout = result.stdout || "";
    error.stderr = result.stderr || "";
    throw error;
  }
  return result;
}

function capture(cmd, args = [], cwd = repo) {
  const result = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return (result.stdout || "").trim();
}

function git(args, options = {}) {
  return run("git", args, options);
}
function gitCapture(args) {
  return capture("git", args);
}
function npm(args, options = {}) {
  return run("npm.cmd", args, options);
}
function npx(args, options = {}) {
  return run("npx.cmd", args, options);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}
function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.replace(/\r\n/g, "\n"), "utf8");
}
function ensureText(rel, content) {
  const file = path.join(repo, rel);
  const normalized = content.replace(/\r\n/g, "\n");
  const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
  if (old !== normalized) {
    writeText(file, normalized);
    console.log(`WROTE ${rel}`);
    return true;
  }
  console.log(`UNCHANGED ${rel}`);
  return false;
}

function listTestFiles() {
  const root = path.join(repo, "tests");
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        out.push(path.relative(repo, full).replace(/\\/g, "/"));
      }
    }
  }
  walk(root);
  return out.sort();
}

function changedPaths() {
  const tracked = gitCapture(["diff", "--name-only"]).split(/\r?\n/).filter(Boolean);
  const untracked = gitCapture(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/).filter(Boolean);
  return [...new Set([...tracked, ...untracked])].sort();
}

function commitIfDirty(message) {
  const paths = changedPaths();
  if (!paths.length) {
    console.log(`NO COMMIT NEEDED: ${message}`);
    return null;
  }
  git(["diff", "--check"]);
  git(["add", "--all"]);
  git(["diff", "--cached", "--check"]);
  git(["commit", "-m", message]);
  return gitCapture(["rev-parse", "HEAD"]);
}

function loadState() {
  if (fs.existsSync(statePath)) return readJson(statePath);
  const head = gitCapture(["rev-parse", "HEAD"]);
  return {
    migrationVersion: MIGRATION_VERSION,
    createdAt: now(),
    updatedAt: now(),
    repo,
    evidenceRoot,
    baseHead: suppliedBaseHead || head,
    stages: {},
    terminalStatus: "RUNNING"
  };
}

let state = loadState();

if (argv.includes("--status")) {
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}

if (state.migrationVersion !== MIGRATION_VERSION) {
  throw new Error(`Evidence directory belongs to ${state.migrationVersion}, expected ${MIGRATION_VERSION}`);
}
if (suppliedBaseHead && state.baseHead !== suppliedBaseHead) {
  throw new Error(`Frozen base mismatch: state=${state.baseHead} supplied=${suppliedBaseHead}`);
}

function persistState() {
  state.updatedAt = now();
  writeJson(statePath, state);
}

function receipt(stage, status, details = {}) {
  const record = {
    migrationVersion: MIGRATION_VERSION,
    stage,
    status,
    at: now(),
    repo,
    baseHead: state.baseHead,
    head: gitCapture(["rev-parse", "HEAD"]),
    ...details
  };
  writeJson(path.join(receiptsDir, `${stage}.json`), record);
  state.stages[stage] = record;
  persistState();
  return record;
}

async function executeStage(stage, fn) {
  if (state.stages[stage]?.status === "PASS"
      || state.stages[stage]?.status === "PASS_WITH_RETAINED_BUSINESS_TESTS"
      || state.stages[stage]?.status === "EXTERNAL_ACCEPTANCE_REQUIRED") {
    console.log(`\n=== ${stage} already ${state.stages[stage].status}; skipping ===`);
    return;
  }
  state.terminalStatus = "RUNNING";
  persistState();
  console.log(`\n\n============================================================`);
  console.log(`=== ${stage} ===`);
  console.log(`============================================================`);
  const startedAt = Date.now();
  try {
    const details = await fn();
    const status = details?.status || "PASS";
    receipt(stage, status, {
      durationMs: Date.now() - startedAt,
      ...(details || {})
    });
    console.log(`=== ${stage}: ${status} ===`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    receipt(stage, "BLOCKED_UNKNOWN", {
      durationMs: Date.now() - startedAt,
      blocker: message,
      stack: error instanceof Error ? error.stack : undefined
    });
    state.terminalStatus = "BLOCKED_UNKNOWN";
    persistState();
    console.error(`\n=== ${stage}: BLOCKED_UNKNOWN ===`);
    console.error(message);
    process.exit(2);
  }
}

function classifyTests() {
  const providerRe = /(stripe|vertex|generativeai|dataforseo|podcast|youtube|research)/i;
  const browserRe = /(from\s+['"]playwright['"]|\bchromium\.launch\b|Browser\.test)/i;
  const platformMockRe = /(\bas unknown as D1Database\b|\bas D1Database\b|\bD1Database\b[\s\S]{0,400}\bprepare\s*[:(]|\bR2Bucket\b|\bKVNamespace\b|class\s+MemoryKv\b|\bBLUEPRINTS\s*[:=]|\bKV\s*[:=]\s*\{)/i;
  const workerFetchRe = /(src\/api\/(?:index|worker)|\bworker\.fetch\s*\()/i;

  return listTestFiles().map(file => {
    const content = fs.readFileSync(path.join(repo, file), "utf8");
    let category = "PURE_OR_BUSINESS_UNIT";
    const flags = [];
    if (browserRe.test(content) || /Browser\.test\./i.test(file)) {
      category = "BROWSER_EVIDENCE";
      flags.push("browser");
    } else if (workerFetchRe.test(content)) {
      category = "HTTP_WORKER_INTEGRATION";
      flags.push("worker_fetch");
    } else if (providerRe.test(file) || providerRe.test(content)) {
      category = "EXTERNAL_PROVIDER_CONTRACT";
      flags.push("provider");
    }
    if (platformMockRe.test(content)) {
      flags.push("platform_emulator");
      if (category === "PURE_OR_BUSINESS_UNIT") category = "LEGACY_PLATFORM_EMULATOR";
    }
    return {
      file,
      category,
      flags,
      sha256: sha256File(path.join(repo, file))
    };
  });
}

function runtimePackageUpdate() {
  const packagePath = path.join(repo, "package.json");
  const pkg = readJson(packagePath);
  pkg.scripts ||= {};

  // Preserve the stabilized Slice B browser orchestration, but ensure the new
  // runtime tests are never collected by the normal Node Vitest pool.
  const browserA = "tests/q4LaunchSiteBrowser.test.ts";
  const browserB = "tests/gate34VisualFixtureBrowser.test.ts";
  pkg.scripts["test:fast"] =
    `vitest run --exclude ${browserA} --exclude ${browserB} --exclude "tests/runtime/**"`;
  pkg.scripts["test:browser"] =
    `vitest run ${browserA} ${browserB} --no-file-parallelism`;
  pkg.scripts["test:workers-runtime"] =
    "npm run verify:blueprint && vitest run --config vitest.worker.config.ts";
  pkg.scripts["test:worker-harness"] =
    "npm run verify:blueprint && vitest run --config vitest.harness.config.ts";
  pkg.scripts["test:provider-contracts"] =
    "node scripts/check-provider-contract-isolation.mjs";
  pkg.scripts["test:platform-guard"] =
    "node scripts/check-platform-test-emulators.mjs";
  pkg.scripts.test =
    "npm run test:fast && npm run test:browser && npm run test:workers-runtime && npm run test:worker-harness && npm run test:provider-contracts && npm run test:platform-guard";
  pkg.scripts["test-runtime:status"] =
    "node scripts/test-runtime-migration-autopilot.mjs --status";
  pkg.scripts["test-runtime:autopilot"] =
    "node scripts/test-runtime-migration-autopilot.mjs";
  writeText(packagePath, JSON.stringify(pkg, null, 2) + "\n");
}

const workerVitestConfig = `import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(here, "migrations"));
      return {
        miniflare: {
          compatibilityDate: "2024-01-01",
          kvNamespaces: ["KV"],
          r2Buckets: ["BLUEPRINTS", "VIDEOS"],
          d1Databases: {
            DB: "00000000-0000-0000-0000-000000000001"
          },
          bindings: {
            TEST_MIGRATIONS: migrations,
            DEPLOYMENT_ENV: "development",
            FRONTEND_URL: "http://127.0.0.1:5300",
            JWT_SECRET: "runtime_test_jwt_secret_123456789",
            STRIPE_SECRET_KEY: "sk_test_runtime_contract_123456789",
            STRIPE_PRICE_ID: "price_runtime_contract",
            STRIPE_PAID_TEST_PRICE_ID: "price_runtime_contract",
            STRIPE_30_DAY_PLAN_PRICE_ID: "price_runtime_contract",
            STRIPE_WEBHOOK_SECRET: "whsec_runtime_contract_123456789",
            AI_GATEWAY_ID: "default",
            VERTEX_PROJECT_ID: "ghosttown-runtime-test",
            VERTEX_LOCATION: "us",
            VERTEX_BLUEPRINT_MODEL: "gemini-3.5-flash",
            VERTEX_BLUEPRINT_REQUIRED: "true",
            VERTEX_SERVICE_ACCOUNT_EMAIL: "runtime-test@example.invalid",
            VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\\\nRUNTIME_TEST_ONLY_NOT_REAL_123456789\\\\n-----END PRIVATE KEY-----"
          }
        }
      };
    })
  ],
  test: {
    include: ["tests/runtime/**/*.worker.test.ts"],
    setupFiles: ["./tests/runtime/apply-migrations.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: true
  }
});
`;

const runtimeEnvTypes = `declare module "cloudflare:workers" {
  interface ProvidedEnv {
    KV: KVNamespace;
    DB: D1Database;
    BLUEPRINTS: R2Bucket;
    VIDEOS: R2Bucket;
    TEST_MIGRATIONS: D1Migration[];
    DEPLOYMENT_ENV: "development";
    FRONTEND_URL: string;
    JWT_SECRET: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_PRICE_ID: string;
    STRIPE_PAID_TEST_PRICE_ID: string;
    STRIPE_30_DAY_PLAN_PRICE_ID: string;
    STRIPE_WEBHOOK_SECRET: string;
    AI_GATEWAY_ID: string;
    VERTEX_PROJECT_ID: string;
    VERTEX_LOCATION: string;
    VERTEX_BLUEPRINT_MODEL: string;
    VERTEX_BLUEPRINT_REQUIRED: string;
    VERTEX_SERVICE_ACCOUNT_EMAIL: string;
    VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: string;
  }
}
export {};
`;

const runtimeTsconfig = `{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "moduleResolution": "bundler",
    "types": [
      "@cloudflare/workers-types",
      "@cloudflare/vitest-pool-workers/types",
      "vitest/globals"
    ],
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": [
    "./**/*.ts",
    "./runtime-env.d.ts",
    "../../src/**/*.ts"
  ]
}
`;

const applyMigrations = `import { beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";

beforeEach(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
`;

const schemaTest = `import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";

async function columns(table: string): Promise<string[]> {
  const result = await env.DB.prepare(\`PRAGMA table_info(\${table})\`).all<{ name: string }>();
  return result.results.map(row => row.name);
}

describe("GhostTown real local D1 migration contract", () => {
  it("applies the canonical migrations and exposes ownership-critical columns", async () => {
    const tables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    ).all<{ name: string }>();
    const names = tables.results.map(row => row.name);
    expect(names).toContain("launch_blueprints");
    expect(names).toContain("launch_blueprint_progress");
    expect(names).toContain("launch_sites");
    expect(names).toContain("launch_site_leads");

    expect(await columns("launch_blueprints")).toEqual(expect.arrayContaining([
      "order_id", "owner_id", "source_verdict_id", "schema_version",
      "status", "blueprint_json", "research_receipt_json", "pdf_r2_key"
    ]));
    expect(await columns("launch_blueprint_progress")).toEqual(expect.arrayContaining([
      "order_id", "owner_id", "progress_json", "updated_at"
    ]));
    expect(await columns("launch_sites")).toEqual(expect.arrayContaining([
      "site_id", "order_id", "owner_id", "public_slug", "status"
    ]));
    expect(await columns("launch_site_leads")).toEqual(expect.arrayContaining([
      "lead_id", "site_id", "email", "source_path", "consent_text"
    ]));
  });

  it("returns real D1 affected-row metadata", async () => {
    const now = new Date().toISOString();
    const result = await env.DB.prepare(
      "INSERT INTO launch_blueprints (order_id, owner_id, source_verdict_id, schema_version, status, blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      "runtime-d1-meta",
      "owner@example.com",
      "verdict-runtime",
      "ghosttown-launch-blueprint-v2.1",
      "ready",
      "{}",
      "{}",
      "private/runtime.pdf",
      now,
      now
    ).run();

    expect(result.success).toBe(true);
    expect(result.meta.changes).toBe(1);
  });
});
`;

const paidPathTest = `import { describe, expect, it } from "vitest";
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
    responseId: \`response-\${stageName}\`,
    promptHash: \`prompt-\${stageName}\`,
    responseHash: \`response-\${stageName}\`,
    completedAt: generatedAt
  };
}

function researchInput(): CustomerAccessResearchInput {
  const researchDate = "2026-08-20";
  const sources = Array.from({ length: 10 }, (_, index) => ({
    sourceId: \`runtime-source-\${index}\`,
    title: \`Runtime Source \${index}\`,
    url: \`https://example.com/runtime-source-\${index}\`,
    publisher: "Runtime Fixture",
    accessedAt: \`\${researchDate}T12:00:00.000Z\`,
    supports: [\`runtime-channel-\${index}\`]
  }));
  const channels = Array.from({ length: 10 }, (_, index) => ({
    channelId: \`runtime-channel-\${index}\`,
    community: \`Runtime Community \${index}\`,
    platform: index < 3 ? "Podcast" : index < 6 ? "YouTube" : "Publication",
    publicUrl: \`https://example.com/runtime-channel-\${index}\`,
    relevance: "Families discuss game selection and purchases.",
    activity: "active",
    participationRules: "Read current rules.",
    recommendedApproach: "Contribute before pitching.",
    usefulTopic: "Choosing a family game.",
    risk: "Rules can change.",
    firstAction: "Read recent discussions.",
    confidence: "high",
    researchDate,
    sourceIds: [\`runtime-source-\${index}\`],
    targetType: index < 3 ? "podcast" : index < 6 ? "youtube_creator" : "newsletter_or_publication"
  })) as CustomerAccessResearchInput["channels"];

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
    pipelineVersion: "vertex-blueprint-staged-v1",
    required: true,
    status: "complete",
    stages: [
      stage("evidence_normalization"),
      stage("strategy_synthesis"),
      stage("asset_generation"),
      stage("red_team_review")
    ],
    redTeam: { passed: true, findings: [] },
    completedAt: generatedAt
  };

  if (blueprint.orderId !== currentOrder.orderId) {
    throw new Error(\`Runtime scenario order drift: \${blueprint.orderId} !== \${currentOrder.orderId}\`);
  }
  if (blueprint.sourceVerdictId !== currentVerdict.resultId) {
    throw new Error(\`Runtime scenario verdict drift: \${blueprint.sourceVerdictId} !== \${currentVerdict.resultId}\`);
  }
  if (blueprint.ownerId !== currentOrder.email) {
    throw new Error(\`Runtime scenario owner drift: \${blueprint.ownerId} !== \${currentOrder.email}\`);
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
      sourceTypeCount: 3,
      candidateChannelCount: 10,
      verifiedChannelCount: 10,
      rejectedUrls: [],
      failedSources: [],
      sourceDefinitionIds: blueprint.sources.map(source => source.sourceId),
      seedDomains: ["example.com", "example.org"],
      targetTypeCounts: {
        podcast: 3,
        youtube_creator: 3,
        newsletter_or_publication: 4
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

    const pointer = await env.KV.get(\`paid_test_blueprint_pointer_\${scenario.currentOrder.orderId}\`, "json") as {
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
});
`;

const r2Test = `import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";

describe("GhostTown real local R2 contract", () => {
  it("round-trips bytes plus HTTP/custom metadata through R2ObjectBody", async () => {
    const key = "runtime/contracts/object.txt";
    await env.BLUEPRINTS.put(key, "runtime-body", {
      httpMetadata: {
        contentType: "text/plain; charset=utf-8",
        contentDisposition: 'attachment; filename="runtime.txt"'
      },
      customMetadata: {
        ownerId: "owner@example.com",
        contract: "ghosttown-runtime-v1"
      }
    });

    const object = await env.BLUEPRINTS.get(key);
    expect(object).not.toBeNull();
    expect(await object?.text()).toBe("runtime-body");
    expect(object?.httpMetadata?.contentType).toContain("text/plain");
    expect(object?.customMetadata?.ownerId).toBe("owner@example.com");
    expect(object?.httpEtag).toBeTruthy();
  });

  it("supports the arrayBuffer body method production delivery paths consume", async () => {
    const key = "runtime/contracts/object.bin";
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await env.BLUEPRINTS.put(key, bytes);
    const object = await env.BLUEPRINTS.get(key);
    expect(Array.from(new Uint8Array(await object!.arrayBuffer()))).toEqual([1, 2, 3, 4]);
  });
});
`;

const kvTest = `import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";

describe("GhostTown real local KV contract", () => {
  it("round-trips owner-scoped records and exposes real list pagination shape", async () => {
    await env.KV.put("user_result_owner@example.com_11111111-1111-4111-8111-111111111111", JSON.stringify({ ok: true }));
    await env.KV.put("user_result_owner@example.com_22222222-2222-4222-8222-222222222222", JSON.stringify({ ok: true }));

    const result = await env.KV.list({ prefix: "user_result_owner@example.com_", limit: 1 });
    expect(result.keys).toHaveLength(1);
    expect(typeof result.list_complete).toBe("boolean");
    expect(typeof result.cursor).toBe("string");

    const first = await env.KV.get(result.keys[0].name, "json") as { ok?: boolean } | null;
    expect(first?.ok).toBe(true);

    if (!result.list_complete) {
      const second = await env.KV.list({
        prefix: "user_result_owner@example.com_",
        limit: 1,
        cursor: result.cursor
      });
      expect(second.keys.length).toBeGreaterThan(0);
    }
  });
});
`;

const launchSiteTest = `import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import { handlePublicLaunchLead } from "../../src/api/launchSite";
import { launchBlueprintFixture } from "../fixtures/launchBlueprint";

function runtimeEnv(): Env {
  return {
    KV: env.KV,
    DB: env.DB,
    BLUEPRINTS: env.BLUEPRINTS,
    AI: {} as Ai,
    JWT_SECRET: env.JWT_SECRET,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_ID: env.STRIPE_PRICE_ID,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET
  } as Env;
}

describe("GhostTown Launch Site on real local D1/KV", () => {
  it("persists a public lead through the production handler and real migration schema", async () => {
    const owner = "launch-owner@runtime.test";
    const blueprint = launchBlueprintFixture(owner);
    const now = new Date().toISOString();
    const slug = "runtime-launch-site";
    const siteId = "site_runtime_contract";

    await env.DB.prepare(
      "INSERT INTO launch_blueprints (order_id, owner_id, source_verdict_id, schema_version, status, blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      blueprint.orderId,
      owner,
      blueprint.sourceVerdictId,
      blueprint.schemaVersion,
      blueprint.status,
      JSON.stringify(blueprint),
      "{}",
      "private/runtime.pdf",
      blueprint.createdAt,
      now
    ).run();

    await env.DB.prepare(
      "INSERT INTO launch_sites (site_id, order_id, owner_id, public_slug, status, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'published', ?, ?, ?)"
    ).bind(siteId, blueprint.orderId, owner, slug, now, now, now).run();

    const request = new Request(\`https://runtime.test/api/launch/\${slug}/lead\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.0.2.10"
      },
      body: JSON.stringify({
        email: "buyer@example.com",
        name: "Runtime Buyer",
        message: "Interested",
        consent: true
      })
    });

    const response = await handlePublicLaunchLead(request, runtimeEnv(), slug);
    expect(response.status).toBe(201);

    const row = await env.DB.prepare(
      "SELECT email, name, source_path, consent_text FROM launch_site_leads WHERE site_id = ?"
    ).bind(siteId).first<{
      email: string;
      name: string | null;
      source_path: string;
      consent_text: string;
    }>();
    expect(row?.email).toBe("buyer@example.com");
    expect(row?.name).toBe("Runtime Buyer");
    expect(row?.source_path).toBe(\`/launch/\${slug}\`);
    expect(row?.consent_text).toMatch(/agree/i);

    const rateKeys = await env.KV.list({ prefix: "launch_lead_rate_" });
    expect(rateKeys.keys.length).toBe(1);
    expect(await env.KV.get(rateKeys.keys[0].name)).toBe("1");
  });
});
`;

const harnessConfig = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/runtime/**/*.node.test.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false
  }
});
`;

const harnessTest = `import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness, type TestHarness } from "wrangler";

let server: TestHarness;

describe("GhostTown production Worker build harness", () => {
  beforeAll(async () => {
    server = createTestHarness({
      workers: [{
        config: {
          name: "ghosttown-runtime-harness",
          main: "src/api/worker.ts",
          compatibility_date: "2024-01-01",
          vars: {
            DEPLOYMENT_ENV: "development",
            FRONTEND_URL: "http://127.0.0.1:5300",
            AI_GATEWAY_ID: "default",
            VERTEX_VERDICT_MODEL: "gemini-3.5-flash-lite",
            VERTEX_SELECTION_MODEL: "gemini-3.5-flash-lite",
            VERTEX_RESEARCH_MODEL: "gemini-3.5-flash",
            VERTEX_BLUEPRINT_MODEL: "gemini-3.5-flash",
            VERTEX_WEBSITE_MODEL: "gemini-3.5-flash",
            JWT_SECRET: "runtime_harness_jwt_secret",
            STRIPE_SECRET_KEY: "sk_test_runtime_harness",
            STRIPE_PRICE_ID: "price_runtime_harness",
            STRIPE_WEBHOOK_SECRET: "whsec_runtime_harness"
          }
        }
      }]
    });
    await server.listen();
  });

  afterAll(async () => {
    await server.close();
  });

  it("serves the production health route from a Wrangler-built Worker", async () => {
    const response = await server.fetch("/api/integrations/shorts-factory/health");
    expect(response.status).toBe(200);
    const body = await response.json() as {
      status?: string;
      service?: string;
      evaluation?: { primary?: string };
      live_publishing_enabled?: boolean;
    };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("ghosttowntest");
    expect(body.evaluation?.primary).toBe("google_vertex_ai_via_cloudflare_ai_gateway");
    expect(body.live_publishing_enabled).toBe(false);
  });
});
`;

const providerGuardScript = `import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const runtimeDir = path.join(root, "tests", "runtime");
const prohibited = [
  /api\\.stripe\\.com/i,
  /aiplatform\\.googleapis\\.com/i,
  /dataforseo/i,
  /podcastindex/i,
  /youtube\\.googleapis\\.com/i,
  /generativelanguage\\.googleapis\\.com/i
];

const failures = [];
for (const name of fs.readdirSync(runtimeDir)) {
  if (!/\\.(ts|tsx)$/.test(name)) continue;
  const file = path.join(runtimeDir, name);
  const text = fs.readFileSync(file, "utf8");
  for (const rule of prohibited) {
    if (rule.test(text)) failures.push(\`\${name}: contains external provider endpoint/token pattern \${rule}\`);
  }
}

if (failures.length) {
  console.error("PROVIDER_CONTRACT_ISOLATION_FAILED");
  for (const failure of failures) console.error(\`- \${failure}\`);
  process.exit(1);
}
console.log("PROVIDER_CONTRACT_ISOLATION_OK");
`;

const emulatorGuardScript = `import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const allowlistPath = path.join(root, "tests", "runtime", "platform-emulator-allowlist.json");
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
const allowed = new Set(allowlist.files || []);

const patterns = [
  /as unknown as D1Database/,
  /as D1Database/,
  /class\\s+MemoryKv\\b/,
  /as unknown as R2Bucket/,
  /as R2Bucket/,
  /as unknown as KVNamespace/,
  /as KVNamespace/,
  /\\bprepare\\s*:\\s*\\(/,
  /\\bBLUEPRINTS\\s*:\\s*\\{/,
  /\\bKV\\s*:\\s*\\{/
];

const failures = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "runtime") continue;
      walk(full);
      continue;
    }
    if (!/\\.(test|spec)\\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    const rel = path.relative(root, full).replace(/\\\\/g, "/");
    const text = fs.readFileSync(full, "utf8");
    const hasEmulator = patterns.some(pattern => pattern.test(text));
    if (hasEmulator && !allowed.has(rel)) {
      failures.push(rel);
    }
  }
}
walk(path.join(root, "tests"));

if (failures.length) {
  console.error("PLATFORM_EMULATOR_FORBIDDEN");
  console.error("Use Cloudflare runtime bindings (env.DB/env.KV/env.BLUEPRINTS) instead of adding new platform emulators.");
  console.error("Only existing grandfathered business/failure tests may remain on the allowlist.");
  for (const failure of failures) console.error(\`- \${failure}\`);
  process.exit(1);
}
console.log(\`PLATFORM_EMULATOR_GUARD_OK grandfathered=\${allowed.size}\`);
`;

const contractDoc = `# GhostTown Test Runtime Migration Contract v1

Status: active migration contract

## Objective

Replace handwritten Cloudflare platform semantics as a source of release confidence with Cloudflare's supported local Workers runtime while preserving useful business and failure-injection tests.

## Known-outcome rule

Cloudflare owns the semantics of D1, KV, R2 and the Workers runtime. GhostTown tests those semantics through the platform-native local runtime rather than recreating them in handwritten JavaScript objects.

## Runtime layers

1. Pure/business tests remain ordinary Vitest tests.
2. D1/KV/R2 tests use \`@cloudflare/vitest-pool-workers\`.
3. D1 schema tests apply the repository's real \`migrations/\` files through \`readD1Migrations()\` and \`applyD1Migrations()\`.
4. Production Worker HTTP integration uses Wrangler \`createTestHarness()\`.
5. Browser evidence remains Playwright and executes sequentially.
6. Stripe, Vertex and research providers remain deterministic provider-contract boundaries in local tests.
7. Existing mock-heavy business/failure tests may be grandfathered, but no new Cloudflare platform emulators are permitted.

## Commercial stop rule

After the paid-path D1/R2/KV runtime, production Worker harness, security regressions and acceptance dry-run are green, stop infrastructure work. The next mission is external Stripe/customer acceptance and the first real $97 purchase.

## External acceptance boundary

This migration must not push, merge, deploy, charge a card, mutate production/acceptance storage, or invoke live paid providers.
`;

function makeProviderLedger(classification) {
  const srcRoot = path.join(repo, "src", "api");
  const providers = [
    { id: "stripe", re: /stripe/i },
    { id: "vertex", re: /(vertex|aiplatform|generativeAI)/i },
    { id: "dataforseo", re: /dataforseo/i },
    { id: "podcast_index", re: /podcast/i },
    { id: "youtube", re: /youtube/i }
  ];
  const sourceFiles = [];
  for (const name of fs.readdirSync(srcRoot)) {
    if (!name.endsWith(".ts")) continue;
    const full = path.join(srcRoot, name);
    const text = fs.readFileSync(full, "utf8");
    const matched = providers.filter(p => p.re.test(name) || p.re.test(text)).map(p => p.id);
    if (matched.length) sourceFiles.push({ file: `src/api/${name}`, providers: matched });
  }
  return {
    schemaVersion: "ghosttown-provider-contract-ledger-v1",
    generatedAt: now(),
    policy: "External providers are deterministic contract boundaries in local tests; platform-runtime migration tests must not invoke live providers.",
    sourceFiles,
    existingContractTests: classification
      .filter(item => item.category === "EXTERNAL_PROVIDER_CONTRACT")
      .map(item => item.file)
  };
}

function installPermanentController() {
  const selfPath = fileURLToPath(import.meta.url);
  const target = path.join(repo, "scripts", "test-runtime-migration-autopilot.mjs");
  const source = fs.readFileSync(selfPath, "utf8");
  ensureText(path.relative(repo, target), source);
}

await executeStage("T00_FREEZE", async () => {
  const branch = gitCapture(["branch", "--show-current"]);
  const head = gitCapture(["rev-parse", "HEAD"]);
  if (head !== state.baseHead && Object.keys(state.stages).length === 0) {
    throw new Error(`Migration worktree does not start at frozen base. expected=${state.baseHead} actual=${head}`);
  }
  npm(["run", "verify:blueprint"]);
  const packageLock = path.join(repo, "package-lock.json");
  return {
    branch,
    frozenBaseHead: state.baseHead,
    initialHead: head,
    packageLockSha256: sha256File(packageLock),
    blueprintVerification: "PASS"
  };
});

await executeStage("T01_CLASSIFY", async () => {
  const classification = classifyTests();
  const out = path.join(evidenceRoot, "test-classification.json");
  writeJson(out, {
    schemaVersion: "ghosttown-test-classification-v1",
    generatedAt: now(),
    tests: classification
  });
  const counts = {};
  for (const item of classification) counts[item.category] = (counts[item.category] || 0) + 1;
  return {
    testCount: classification.length,
    counts,
    platformEmulatorFiles: classification.filter(item => item.flags.includes("platform_emulator")).map(item => item.file),
    artifact: out
  };
});

await executeStage("T02_WORKERS_VITEST_BOOTSTRAP", async () => {
  installPermanentController();
  npm(["install", "--save-dev", "--save-exact", `@cloudflare/vitest-pool-workers@${PACKAGE_VERSION}`], { timeout: 180000 });
  runtimePackageUpdate();
  ensureText("vitest.worker.config.ts", workerVitestConfig);
  ensureText("tests/runtime/runtime-env.d.ts", runtimeEnvTypes);
  ensureText("tests/runtime/tsconfig.json", runtimeTsconfig);
  ensureText("docs/GHOSTTOWN_TEST_RUNTIME_MIGRATION_CONTRACT_V1.md", contractDoc);
  const head = commitIfDirty("test-runtime T02: bootstrap Cloudflare Workers Vitest");
  return {
    package: `@cloudflare/vitest-pool-workers@${PACKAGE_VERSION}`,
    checkpointCommit: head,
    sourceBasis: [
      "https://developers.cloudflare.com/workers/testing/vitest-integration/",
      "https://developers.cloudflare.com/workers/testing/vitest-integration/configuration/",
      "https://developers.cloudflare.com/workers/testing/test-harness/get-started/"
    ]
  };
});

await executeStage("T03_D1_MIGRATIONS", async () => {
  ensureText("tests/runtime/apply-migrations.ts", applyMigrations);
  ensureText("tests/runtime/d1Migrations.worker.test.ts", schemaTest);
  npx(["vitest", "run", "--config", "vitest.worker.config.ts", "tests/runtime/d1Migrations.worker.test.ts"], { timeout: 120000 });
  const head = commitIfDirty("test-runtime T03: apply real D1 migrations");
  return { checkpointCommit: head, migrationsDirectory: "migrations/" };
});

await executeStage("T04_PAID_PATH_STORAGE", async () => {
  ensureText("tests/runtime/paidPathStorage.worker.test.ts", paidPathTest);
  npx(["vitest", "run", "--config", "vitest.worker.config.ts", "tests/runtime/paidPathStorage.worker.test.ts"], { timeout: 180000 });
  const head = commitIfDirty("test-runtime T04: exercise paid path on real D1 R2 KV");
  return {
    checkpointCommit: head,
    invariants: [
      "production saveBlueprintRecordV21 writes real local D1/R2/KV",
      "owner is persisted canonically",
      "attempted ownership transfer is rejected"
    ]
  };
});

await executeStage("T05_R2_RUNTIME", async () => {
  ensureText("tests/runtime/r2Binding.worker.test.ts", r2Test);
  npx(["vitest", "run", "--config", "vitest.worker.config.ts", "tests/runtime/r2Binding.worker.test.ts"], { timeout: 120000 });
  const head = commitIfDirty("test-runtime T05: use real local R2 contract");
  return { checkpointCommit: head };
});

await executeStage("T06_KV_RUNTIME", async () => {
  ensureText("tests/runtime/kvBinding.worker.test.ts", kvTest);
  npx(["vitest", "run", "--config", "vitest.worker.config.ts", "tests/runtime/kvBinding.worker.test.ts"], { timeout: 120000 });
  const head = commitIfDirty("test-runtime T06: use real local KV contract");
  return { checkpointCommit: head };
});

await executeStage("T07_LAUNCH_SITE_D1", async () => {
  ensureText("tests/runtime/launchSiteStorage.worker.test.ts", launchSiteTest);
  npx(["vitest", "run", "--config", "vitest.worker.config.ts", "tests/runtime/launchSiteStorage.worker.test.ts"], { timeout: 120000 });
  const head = commitIfDirty("test-runtime T07: exercise Launch Site on real D1 KV");
  return { checkpointCommit: head };
});

await executeStage("T08_WORKER_HARNESS", async () => {
  ensureText("vitest.harness.config.ts", harnessConfig);
  ensureText("tests/runtime/workerHarness.node.test.ts", harnessTest);
  npx(["vitest", "run", "--config", "vitest.harness.config.ts"], { timeout: 180000 });
  const head = commitIfDirty("test-runtime T08: add production Worker integration harness");
  return {
    checkpointCommit: head,
    route: "/api/integrations/shorts-factory/health",
    mechanism: "wrangler.createTestHarness"
  };
});

await executeStage("T09_PROVIDER_CONTRACTS", async () => {
  const classificationDoc = readJson(path.join(evidenceRoot, "test-classification.json"));
  const ledger = makeProviderLedger(classificationDoc.tests);
  writeJson(path.join(repo, "tests", "runtime", "provider-contract-ledger.json"), ledger);
  ensureText("scripts/check-provider-contract-isolation.mjs", providerGuardScript);
  npm(["run", "test:provider-contracts"]);
  const head = commitIfDirty("test-runtime T09: isolate external provider contracts");
  return {
    checkpointCommit: head,
    providerSourceFileCount: ledger.sourceFiles.length,
    existingContractTestCount: ledger.existingContractTests.length
  };
});

await executeStage("T10_PLATFORM_EMULATOR_GUARD", async () => {
  const classificationDoc = readJson(path.join(evidenceRoot, "test-classification.json"));
  const emulatorFiles = classificationDoc.tests
    .filter(item => item.flags.includes("platform_emulator"))
    .map(item => item.file)
    .sort();
  writeJson(path.join(repo, "tests", "runtime", "platform-emulator-allowlist.json"), {
    schemaVersion: "ghosttown-platform-emulator-allowlist-v1",
    generatedAt: now(),
    policy: "Grandfathered files may retain business/failure test doubles; new Cloudflare platform emulators are forbidden.",
    files: emulatorFiles
  });
  ensureText("scripts/check-platform-test-emulators.mjs", emulatorGuardScript);
  npm(["run", "test:platform-guard"]);
  const head = commitIfDirty("test-runtime T10: forbid new Cloudflare platform emulators");
  return {
    checkpointCommit: head,
    grandfatheredFiles: emulatorFiles.length
  };
});

await executeStage("T11_PLATFORM_SEMANTICS_RETIREMENT", async () => {
  const coverage = {
    schemaVersion: "ghosttown-platform-semantics-retirement-v1",
    generatedAt: now(),
    rule: "Cloudflare runtime tests are authoritative for D1/KV/R2 semantics. Grandfathered mock-heavy tests are retained only for business/failure semantics.",
    runtimeAuthorities: {
      D1_migrations_and_meta: ["tests/runtime/d1Migrations.worker.test.ts"],
      paid_path_D1_R2_KV: ["tests/runtime/paidPathStorage.worker.test.ts"],
      R2_object_body_and_metadata: ["tests/runtime/r2Binding.worker.test.ts"],
      KV_pagination_and_values: ["tests/runtime/kvBinding.worker.test.ts"],
      Launch_Site_D1_KV: ["tests/runtime/launchSiteStorage.worker.test.ts"],
      Worker_HTTP_build: ["tests/runtime/workerHarness.node.test.ts"]
    },
    grandfatheredBusinessTests: [
      "tests/blueprintGenerationReceiptV21.test.ts",
      "tests/blueprintDeliveryVerifierV21.test.ts",
      "tests/blueprintRecoveryV21.test.ts",
      "tests/integration.test.ts",
      "tests/launchSite.test.ts",
      "tests/blueprintAssets.test.ts"
    ],
    deletionDecision: "Do not delete tests that still contain unique business/failure assertions. Their platform emulation is no longer release-authoritative."
  };
  writeJson(path.join(repo, "tests", "runtime", "platform-semantics-retirement.json"), coverage);
  const head = commitIfDirty("test-runtime T11: retire mocks as platform-semantic authorities");
  return {
    status: "PASS_WITH_RETAINED_BUSINESS_TESTS",
    checkpointCommit: head,
    retainedBusinessTests: coverage.grandfatheredBusinessTests.length
  };
});

await executeStage("T12_FULL_VALIDATION", async () => {
  npm(["run", "verify:blueprint"], { timeout: 120000 });
  npm(["run", "regression:blueprint-upgrade"], { timeout: 600000 });
  npm(["run", "check"], { timeout: 900000 });
  return {
    blueprint: "PASS",
    blueprintRegression: "PASS",
    fullRepositoryCheck: "PASS",
    platformRuntimeIncludedInNpmTest: true
  };
});

await executeStage("T13_ACCEPTANCE_READINESS", async () => {
  npm(["run", "worker:check:acceptance"], { timeout: 300000 });

  const completion = `# GhostTown Test Runtime Migration v1 — Completion Receipt

Status: deterministic local migration complete

Base commit: \`${state.baseHead}\`

Validated commit: \`${gitCapture(["rev-parse", "HEAD"])}\`

## Completed

- Existing tests classified.
- Cloudflare Workers Vitest integration installed at \`@cloudflare/vitest-pool-workers@${PACKAGE_VERSION}\`.
- Real repository D1 migrations execute inside the Workers runtime.
- Paid Blueprint persistence is exercised through production code against real local D1, R2 and KV bindings.
- R2 object body and metadata behavior is tested using the real local binding.
- KV list/pagination semantics are tested using the real local binding.
- Launch Site lead persistence is exercised through the production handler with real local D1/KV.
- Production Worker build is exercised with Wrangler \`createTestHarness()\`.
- External providers remain isolated deterministic contract boundaries.
- CI/test guard forbids new handwritten Cloudflare platform emulators.
- Grandfathered mock-heavy tests remain only where they still provide unique business/failure assertions.
- Canonical Blueprint regression and full repository checks pass.
- Acceptance Worker dry-run passes.

## Commercial stop

Infrastructure migration stops here.

Next state: \`EXTERNAL_ACCEPTANCE_REQUIRED\`.

The next mission is the real Stripe acceptance/customer path and commercial proof. This migration does not push, merge, deploy, charge a card, or mutate live Cloudflare resources.
`;
  ensureText("docs/GHOSTTOWN_TEST_RUNTIME_MIGRATION_COMPLETION_V1.md", completion);
  const head = commitIfDirty("test-runtime T13: record deterministic migration completion");
  return {
    checkpointCommit: head,
    acceptanceWorkerDryRun: "PASS",
    commercialStop: "RETURN_TO_COMMERCIAL_VALIDATION"
  };
});

await executeStage("T14_EXTERNAL_ACCEPTANCE_REQUIRED", async () => {
  state.terminalStatus = "EXTERNAL_ACCEPTANCE_REQUIRED";
  persistState();
  return {
    status: "EXTERNAL_ACCEPTANCE_REQUIRED",
    reason: "Stripe/customer acceptance is external and intentionally not executed by the deterministic local migration.",
    nextMission: "Stripe sandbox paid acceptance -> fulfillment -> artifacts -> dashboard -> attribution -> first stranger $97",
    pushPerformed: false,
    mergePerformed: false,
    deployPerformed: false
  };
});

state.terminalStatus = "EXTERNAL_ACCEPTANCE_REQUIRED";
state.completedAt = now();
state.finalHead = gitCapture(["rev-parse", "HEAD"]);
persistState();

console.log("\n\n============================================================");
console.log("GHOSTTOWN TEST RUNTIME MIGRATION COMPLETE");
console.log("============================================================");
console.log(`Base:       ${state.baseHead}`);
console.log(`Final HEAD: ${state.finalHead}`);
console.log(`Worktree:   ${repo}`);
console.log(`Evidence:   ${evidenceRoot}`);
console.log("");
console.log("Terminal status: EXTERNAL_ACCEPTANCE_REQUIRED");
console.log("No push, merge, deploy, live provider call, or charge was performed.");
