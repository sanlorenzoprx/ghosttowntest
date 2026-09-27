#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'github-acceptance/sprint-autopilot/step-00-baseline.json');
if (!existsSync(path)) throw new Error('Step 0 baseline receipt is missing');
const receipt = JSON.parse(readFileSync(path, 'utf8'));
if (receipt.schemaVersion !== 'ghosttown-sprint-baseline-v1') throw new Error('Unexpected Step 0 receipt schema');
if (!/^[0-9a-f]{40}$/.test(receipt.headSha || '')) throw new Error('Step 0 did not record branch SHA');
if (!/^[0-9a-f]{40}$/.test(receipt.mainSha || '')) throw new Error('Step 0 did not record main SHA');
if (receipt.productionMutated !== false) throw new Error('Step 0 production mutation invariant failed');
if (receipt.secretValuesRecorded !== false) throw new Error('Step 0 secret invariant failed');
if (!receipt.lastKnownFreshSprintBlocker?.kind) throw new Error('Step 0 did not record the known E2E blocker');
console.log('Step 0 baseline receipt verified.');
