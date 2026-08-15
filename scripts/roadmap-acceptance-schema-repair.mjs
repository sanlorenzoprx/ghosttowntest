#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const RECEIPT_PATH = join(STATE_DIR, 'acceptance-schema-repair.json');
const QUERY_PATH = join(STATE_DIR, 'acceptance-schema-query.sql');
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

function run(args) {
  const result = spawnSync('npx', ['wrangler', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`wrangler ${args.join(' ')} failed (${result.status}).\n${result.stderr || result.stdout}`.trim());
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function tableNames(output) {
  const names = new Set();
  for (const table of REQUIRED_TABLES) {
    const quoted = new RegExp(`\\"name\\"\\s*:\\s*\\"${table}\\"`);
    if (quoted.test(output) || output.includes(table)) names.add(table);
  }
  return names;
}

function inspectSchema() {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(QUERY_PATH, "SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;\n", 'utf8');
  const output = run([
    'd1', 'execute', DATABASE,
    '--remote', '--env', ENVIRONMENT,
    '--file', '.roadmap-autopilot/acceptance-schema-query.sql',
    '--json'
  ]);
  const present = tableNames(output);
  return {
    present: [...present].sort(),
    missing: REQUIRED_TABLES.filter(table => !present.has(table))
  };
}

function shouldRun() {
  if (!existsSync(STATE_PATH)) return false;
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  return state?.gates?.['9']?.status === 'PASS' && state?.gates?.['10']?.status !== 'PASS';
}

if (!shouldRun()) process.exit(0);

const before = inspectSchema();
if (!before.missing.length) process.exit(0);

const migrationStatus = run([
  'd1', 'migrations', 'list', DATABASE,
  '--remote', '--env', ENVIRONMENT
]);
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
}

const after = inspectSchema();
if (after.missing.length) {
  throw new Error(`Acceptance schema reconciliation did not restore required tables: ${after.missing.join(', ')}`);
}

writeFileSync(RECEIPT_PATH, `${JSON.stringify({
  schema_version: 'ghosttown-acceptance-schema-repair-v1',
  repaired_at: now(),
  database: DATABASE,
  environment: ENVIRONMENT,
  reason: 'migration ledger reported complete while required acceptance tables were absent',
  missing_before: before.missing,
  migration_files_replayed_idempotently: MIGRATIONS,
  required_tables_after: after.present,
  production_mutated: false
}, null, 2)}\n`, 'utf8');

console.log(`Acceptance D1 schema drift repaired automatically: restored ${before.missing.length} required tables from canonical idempotent migrations.`);
