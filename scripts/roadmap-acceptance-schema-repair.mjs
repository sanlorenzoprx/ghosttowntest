#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const RECEIPT_PATH = join(STATE_DIR, 'acceptance-schema-repair.json');
const DATABASE = 'ghosttowntest-blueprints-acceptance';
const ENVIRONMENT = 'acceptance';
const MIGRATIONS = [
  'migrations/0002_launch_blueprints.sql',
  'migrations/0003_launch_sites.sql',
  'migrations/0004_blueprint_execution_log.sql'
];
const REQUIRED_TABLES = [
  'launch_blueprints',
  'launch_blueprint_progress',
  'launch_sites',
  'launch_site_leads',
  'accounts',
  'blueprints',
  'blueprint_actions',
  'action_progress',
  'journal_entries',
  'journal_evidence',
  'reminder_preferences',
  'scheduled_reminders',
  'checkpoint_reviews',
  'acs_readiness_assessments'
];

function now() {
  return new Date().toISOString();
}

function run(args, { allowFailure = false } = {}) {
  const result = spawnSync('npx', ['wrangler', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`wrangler ${args.join(' ')} failed (${result.status}).\n${result.stderr || result.stdout}`.trim());
  }
  return {
    status: result.status ?? 0,
    output: `${result.stdout || ''}\n${result.stderr || ''}`
  };
}

function headSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error('Could not resolve Git HEAD while recording schema acceptance evidence.');
  return result.stdout.trim();
}

function probeRequiredTables() {
  mkdirSync(STATE_DIR, { recursive: true });
  const present = [];
  const missing = [];

  for (const table of REQUIRED_TABLES) {
    const queryPath = join(STATE_DIR, `probe-${table}.sql`);
    writeFileSync(queryPath, `SELECT 1 AS table_exists FROM "${table}" LIMIT 1;\n`, 'utf8');
    const result = run([
      'd1', 'execute', DATABASE,
      '--remote', '--env', ENVIRONMENT,
      '--file', `.roadmap-autopilot/probe-${table}.sql`,
      '--json'
    ], { allowFailure: true });

    if (result.status === 0) present.push(table);
    else if (/no such table/i.test(result.output)) missing.push(table);
    else throw new Error(`Could not verify acceptance D1 table ${table}.\n${result.output}`.trim());
  }

  return { present, missing };
}

function loadState() {
  if (!existsSync(STATE_PATH)) return null;
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}

function shouldRun(state) {
  return state?.gates?.['9']?.status === 'PASS' && state?.gates?.['10']?.status !== 'PASS';
}

function recordGate10Pass(state, evidence) {
  state.gates ||= {};
  state.gates['10'] = {
    id: 10,
    phase: 3,
    slug: 'ghosttown-schema',
    title: 'Verify GhostTown acceptance D1 schema',
    status: 'PASS',
    checked_at: now(),
    head: headSha(),
    evidence,
    message: ''
  };
  state.updated_at = now();
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

const state = loadState();
if (!shouldRun(state)) process.exit(0);

const before = probeRequiredTables();
let replayed = [];

if (before.missing.length) {
  const migrationStatus = run([
    'd1', 'migrations', 'list', DATABASE,
    '--remote', '--env', ENVIRONMENT
  ]).output;
  if (!/No migrations to apply/i.test(migrationStatus)) {
    throw new Error('Acceptance schema is incomplete and Wrangler reports unapplied migrations. Refusing direct reconciliation; let the migration gate resolve the ledger first.');
  }

  for (const migration of MIGRATIONS) {
    if (!existsSync(join(ROOT, migration))) throw new Error(`Missing canonical migration file ${migration}`);
    run([
      'd1', 'execute', DATABASE,
      '--remote', '--env', ENVIRONMENT,
      '--file', migration,
      '--yes'
    ]);
    replayed.push(migration);
  }
}

const after = probeRequiredTables();
if (after.missing.length) {
  throw new Error(`Acceptance schema reconciliation did not restore required tables: ${after.missing.join(', ')}`);
}

const evidence = {
  database: DATABASE,
  required_tables: REQUIRED_TABLES,
  missing_tables: [],
  verification: 'per-table SELECT probe against remote acceptance D1',
  repaired: before.missing.length > 0,
  missing_before: before.missing,
  migration_files_replayed_idempotently: replayed,
  production_mutated: false
};

recordGate10Pass(state, evidence);
writeFileSync(RECEIPT_PATH, `${JSON.stringify({
  schema_version: 'ghosttown-acceptance-schema-repair-v2',
  verified_at: now(),
  ...evidence
}, null, 2)}\n`, 'utf8');

if (before.missing.length) {
  console.log(`Acceptance D1 schema drift repaired and verified: ${REQUIRED_TABLES.length}/${REQUIRED_TABLES.length} required tables passed direct probes.`);
} else {
  console.log(`Acceptance D1 schema verified: ${REQUIRED_TABLES.length}/${REQUIRED_TABLES.length} required tables passed direct probes.`);
}
