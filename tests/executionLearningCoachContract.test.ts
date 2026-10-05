import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const memory = readFileSync(new URL('../src/api/executionCoachMemory.ts', import.meta.url), 'utf8');
const handler = readFileSync(new URL('../src/api/blueprintExecutionCopilot.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../migrations/0011_execution_learning_coach.sql', import.meta.url), 'utf8');
const recency = readFileSync(new URL('../src/api/evidenceRecency.ts', import.meta.url), 'utf8');
const executionHome = readFileSync(new URL('../src/components/LaunchBlueprintExecutionHomeV21.tsx', import.meta.url), 'utf8');
const productLearningReview = readFileSync(new URL('../scripts/execution-product-learning-review.mjs', import.meta.url), 'utf8');
const productLearningWorkflow = readFileSync(new URL('../.github/workflows/execution-product-learning-review.yml', import.meta.url), 'utf8');

describe('30-Day Sprint Learning Coach contract', () => {
  it('separates private evidence, cached coach responses, candidates, and promoted product knowledge', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS execution_coach_responses');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS execution_learning_candidates');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS execution_product_knowledge');
    expect(migration).toContain("status TEXT NOT NULL DEFAULT 'review_required'");
  });

  it('uses the existing market-evidence freshness policy instead of inventing a second clock', () => {
    expect(recency).toContain('export const CURRENT_EVIDENCE_MAX_DAYS = 90');
    expect(memory).toContain("import { CURRENT_EVIDENCE_MAX_DAYS } from './evidenceRecency'");
    expect(memory).toContain("candidate.knowledgeClass !== 'market_research'");
    expect(memory).toContain('CURRENT_EVIDENCE_MAX_DAYS * 86_400_000');
  });

  it('stages reusable lessons for governed review but never makes one customer result active product knowledge', () => {
    expect(memory).toContain("candidate.scope !== 'customer_specific'");
    expect(memory).toContain("input.phase === 'review'");
    expect(memory).toContain("requiresHumanApproval: true");
    expect(memory).toContain("'review_required'");
    expect(memory).toContain('supportingAccountHashes');
    expect(memory).toContain('distinctAccountSupport');
    expect(memory).toContain("WHERE status = 'active'");
    expect(memory).not.toContain("status = 'active' WHERE knowledge_fingerprint");
    expect(memory).not.toContain("SET status = 'active'");
  });

  it('keeps identifying customer material out of globally eligible learning candidates', () => {
    expect(memory).toContain('privacySafeLesson');
    expect(memory).toContain('@[A-Z0-9.-]+');
    expect(memory).toContain('https?:');
    expect(memory).toContain('globalEligible = input.allowGlobalLearning === true');
    expect(handler).toContain('containsSyntheticAcceptanceEvidence');
    expect(handler).toContain("!containsSyntheticAcceptanceEvidence(context)");
  });

  it('loads prior daily assessments into the next day and checks exact-context cache before model budget', () => {
    expect(memory).toContain("phase = 'review' AND day_number < ?");
    expect(memory).toContain('ORDER BY day_number DESC');
    expect(handler).toContain('context.coachMemory = await loadExecutionCoachMemory');
    expect(handler.indexOf('const cached = await loadCachedExecutionCoachResponse')).toBeLessThan(handler.indexOf('const budget = await consumeHourlyRateLimit'));
  });

  it('makes learning review part of the real customer completion flow without giving AI completion authority', () => {
    expect(executionHome).toContain("void reviewCompletedDay(dayNumber)");
    expect(executionHome).toContain("phase: 'review'");
    expect(executionHome).toContain('Your day is saved.');
    expect(executionHome).toContain('Retry Coach review');
    expect(executionHome).toContain('Saved to your Sprint learning history and available to the next day’s Coach.');
    expect(executionHome).toContain('[1, 15, 30].includes(dayNumber)');
    expect(executionHome).toContain('Keep external facts separate from the founder’s recorded customer evidence.');
  });

  it('backfills a missing latest-day review from persisted Sprint memory after reload', () => {
    expect(executionHome).toContain('/blueprint/coach-memory');
    expect(executionHome).toContain('latestCompletedDay');
    expect(executionHome).toContain('!reviews.some(review => review.dayNumber === latestCompletedDay)');
    expect(executionHome).toContain('void reviewCompletedDay(latestCompletedDay)');
  });

  it('requires governed human approval before reusable product learning becomes active', () => {
    expect(productLearningReview).toContain('At least three distinct customer accounts');
    expect(productLearningReview).toContain('distinctAccountSupport');
    expect(productLearningReview).toContain("row.scope !== 'universal' && row.scope !== 'lane'");
    expect(productLearningReview).toContain('Market-scoped learning remains review-only');
    expect(productLearningReview).toContain("status = 'active'");
    expect(productLearningWorkflow).toContain('environment:');
    expect(productLearningWorkflow).toContain('name: production');
    expect(productLearningWorkflow).toContain('EXPECTED_MAIN_SHA');
    expect(productLearningWorkflow).toContain('ACTIVATE PRODUCT LEARNING');
    expect(productLearningWorkflow).toContain('refs/heads/main');
  });
});
