#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const FRESH = join(ROOT, 'github-acceptance', 'fresh-sprint');
const ARCHIVE = join(ROOT, 'github-acceptance', 'sprint-autopilot', 'step-11-ready');
const APPROVAL = join(ROOT, 'roadmap', 'step-11-semantic-approval.json');
const AUDIT = resolve(ROOT, 'scripts/sprint-autopilot/step-11-audit-ready-artifacts.mjs');

function json(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
function runNode(script) {
  return spawnSync(process.execPath, [script], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
}

if (existsSync(APPROVAL) && existsSync(join(ARCHIVE, 'final-acceptance-receipt.json'))) {
  const approval = json(APPROVAL);
  const receipt = json(join(ARCHIVE, 'final-acceptance-receipt.json'));
  if (approval?.approved !== true || approval?.orderId !== receipt.orderId) {
    throw new Error('Step 11 semantic approval does not match the archived READY Sprint order.');
  }
  const audited = runNode(AUDIT);
  if ((audited.status ?? 1) !== 0) process.exit(audited.status ?? 1);
  console.log(`Step 11 READY Sprint approved for order ${receipt.orderId}.`);
  process.exit(0);
}

rmSync(FRESH, { recursive: true, force: true });
mkdirSync(FRESH, { recursive: true });

const fresh = runNode(resolve(ROOT, 'scripts/fresh-sprint-acceptance.mjs'));
if ((fresh.status ?? 1) !== 0) process.exit(fresh.status ?? 1);

const receiptPath = join(FRESH, 'final-acceptance-receipt.json');
if (!existsSync(receiptPath)) throw new Error('Fresh Sprint did not write a final acceptance receipt.');
const receipt = json(receiptPath);

if (receipt.finalOrderStatus !== 'ready' || receipt.audit?.outcome !== 'ready' || receipt.audit?.passed !== true) {
  mkdirSync(join(ROOT, 'github-acceptance', 'sprint-autopilot'), { recursive: true });
  writeFileSync(
    join(ROOT, 'github-acceptance', 'sprint-autopilot', 'step-11-nonready.json'),
    JSON.stringify({
      schemaVersion: 'ghosttown-step-11-nonready-v1',
      recordedAt: new Date().toISOString(),
      finalOrderStatus: receipt.finalOrderStatus,
      audit: receipt.audit,
      orderId: receipt.orderId
    }, null, 2) + '\n'
  );
  console.error(`STEP11_READY_REQUIRED: fresh Sprint ended as ${receipt.finalOrderStatus}; Step 11 requires a genuine READY result.`);
  process.exit(1);
}

rmSync(ARCHIVE, { recursive: true, force: true });
mkdirSync(ARCHIVE, { recursive: true });
for (const name of [
  'fresh-input-receipt.json',
  'latest-status.json',
  'blueprint.json',
  'research-receipt.json',
  'launch-blueprint.pdf',
  'assets.zip',
  'zip-manifest.json',
  'final-acceptance-receipt.json',
  'restore-receipt.json'
]) {
  const source = join(FRESH, name);
  if (existsSync(source)) cpSync(source, join(ARCHIVE, name));
}

const audited = runNode(AUDIT);
if ((audited.status ?? 1) !== 0) process.exit(audited.status ?? 1);

writeFileSync(
  join(ARCHIVE, 'human-review-required.json'),
  JSON.stringify({
    schemaVersion: 'ghosttown-step-11-human-review-v1',
    orderId: receipt.orderId,
    recordedAt: new Date().toISOString(),
    requiredReview: [
      'Read the READY Blueprint for product specificity and practical usefulness.',
      'Check the PDF presentation against the JSON content.',
      'Confirm the 30-day progression makes sense for this exact product and buyer.',
      'Confirm messages sound usable and no generic/template leakage is obvious.'
    ],
    approvalInstruction: 'Approve this exact orderId before Step 11 may advance.'
  }, null, 2) + '\n'
);

console.log(`STEP11_HUMAN_REVIEW_REQUIRED: genuine READY Sprint ${receipt.orderId} passed mechanical audit.`);
process.exit(2);
