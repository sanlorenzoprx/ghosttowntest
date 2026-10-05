import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const memory = readFileSync(new URL('../src/api/executionCoachMemory.ts', import.meta.url), 'utf8');
const handler = readFileSync(new URL('../src/api/blueprintExecutionCopilot.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../migrations/0011_execution_learning_coach.sql', import.meta.url), 'utf8');
const recency = readFileSync(new URL('../src/api/evidenceRecency.ts', import.meta.url), 'utf8');
const executionHome = readFileSync(new URL('../src/components/LaunchBlueprintExecutionHomeV21.tsx', import.meta.url), 'utf8');
const copilotUi = readFileSync(new URL('../src/components/LaunchBlueprintCopilotV21.tsx', import.meta.url), 'utf8');
const intelligence = readFileSync(new URL('../src/lib/blueprintExecutionIntelligence.ts', import.meta.url), 'utf8');
const aiService = readFileSync(new URL('../src/api/executionAIService.ts', import.meta.url), 'utf8');
const dailyAnalysisDoc = readFileSync(new URL('../docs/DAILY_ANALYSIS_CONTRACT_V1_0.md', import.meta.url), 'utf8');
const dailyAnalysisRuntime = readFileSync(new URL('../src/api/dailyAnalysisContract.ts', import.meta.url), 'utf8');
const productLearningReview = readFileSync(new URL('../scripts/execution-product-learning-review.mjs', import.meta.url), 'utf8');
const productLearningWorkflow = readFileSync(new URL('../.github/workflows/execution-product-learning-review.yml', import.meta.url), 'utf8');
const productLearningReviewPath = fileURLToPath(new URL('../scripts/execution-product-learning-review.mjs', import.meta.url));

describe('30-Day Sprint Learning Coach contract', () => {
  it('uses Daily Analysis Contract v1.0 as the canonical everyday review reference', () => {
    expect(dailyAnalysisDoc).toContain('GhostTown 30-Day Sprint — Daily Analysis Contract v1.0');
    expect(dailyAnalysisDoc).toContain('ghosttown-daily-analysis-v1.0');
    expect(dailyAnalysisDoc).toContain('Daily Analysis is the brain of the Sprint.');
    expect(dailyAnalysisDoc).toContain('One question at a time. No fixed maximum.');
    expect(dailyAnalysisDoc).toContain('KEEP');
    expect(dailyAnalysisDoc).toContain('MODIFY');
    expect(dailyAnalysisDoc).toContain('REPLACE');
    expect(dailyAnalysisDoc).toContain('ASK');
    expect(dailyAnalysisDoc).toContain('The adaptive task becomes the real task');
    expect(dailyAnalysisDoc).toContain('The canonical Blueprint remains unchanged.');
    expect(dailyAnalysisDoc).toContain('8th-grade reading level or simpler');
    expect(dailyAnalysisDoc).toContain('GhostTown applies what it knows now');

    expect(dailyAnalysisRuntime).toContain("DAILY_ANALYSIS_CONTRACT_ID = 'ghosttown-daily-analysis-v1.0'");
    expect(dailyAnalysisRuntime).toContain('what the founder may be missing');
    expect(dailyAnalysisRuntime).toContain('ask exactly one focused question and stop');
    expect(dailyAnalysisRuntime).toContain('KEEP, MODIFY, REPLACE, or ASK');
    expect(dailyAnalysisRuntime).toContain('effective-task overlay');
    expect(dailyAnalysisRuntime).toContain('eighth-grade reading level or simpler');

    expect(aiService).toContain('DAILY_ANALYSIS_RUNTIME_CONTRACT');
    expect(aiService).toContain("phase === 'review'");
    expect(aiService).toContain('DAILY_ANALYSIS_CONTRACT_ID');
  });

  it('keeps the governed product-learning operations script syntactically valid', () => {
    const checked = spawnSync(process.execPath, ['--check', productLearningReviewPath], { encoding: 'utf8' });
    expect(checked.status, checked.stderr).toBe(0);
  });

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
    expect(memory).toContain("candidate.confidence !== 'low'");
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

  it('makes learning review part of the real customer completion flow without giving AI completion authority or automatic web access', () => {
    expect(executionHome).toContain("void reviewCompletedDay(dayNumber)");
    expect(executionHome).toContain("phase: 'review'");
    expect(executionHome).toContain('Your day is saved.');
    expect(executionHome).toContain('Retry Coach review');
    expect(executionHome).toContain('Saved to your Sprint learning history and available to the next day’s Coach.');
    expect(executionHome).toContain('Use only this Sprint’s Blueprint, recorded evidence, saved Sprint research, and prior Sprint learning');
    expect(executionHome).not.toContain('[1, 15, 30].includes(dayNumber)');
  });

  it('backfills a missing latest-day review from persisted Sprint memory after reload', () => {
    expect(executionHome).toContain('/blueprint/coach-memory');
    expect(executionHome).toContain('latestCompletedDay');
    expect(executionHome).toContain('!reviews.some(review => review.dayNumber === latestCompletedDay)');
    expect(executionHome).toContain('void reviewCompletedDay(latestCompletedDay)');
  });

  it('puts checkpoint Coach assessment on the real checkpoint surface without mutating the deterministic review or automatically searching outside the Sprint', () => {
    expect(executionHome).toContain('Ask GhostTown to assess checkpoint');
    expect(executionHome).toContain("phase: 'checkpoint'");
    expect(executionHome).toContain('GhostTown checkpoint review');
    expect(executionHome).toContain('Do not use outside research unless I explicitly ask through the Sprint research control.');
    expect(executionHome).toContain('Advisory only. Your saved checkpoint evidence and deterministic branch rules remain authoritative.');
  });

  it('enforces the Sprint boundary and external-research relevance before any AI budget or model call', () => {
    expect(intelligence).toContain('evaluateExecutionInteraction');
    expect(intelligence).toContain('externalResearchAllowed');
    expect(handler).toContain("capability: 'sprint_boundary'");
    expect(handler).toContain("boundary: '30_day_sprint_only'");
    expect(handler).toContain('No Sprint evidence was changed and no outside research was performed.');
    expect(handler.indexOf('const interaction = evaluateExecutionInteraction')).toBeLessThan(handler.indexOf('context.coachMemory = await loadExecutionCoachMemory'));
    expect(handler.indexOf('const interaction = evaluateExecutionInteraction')).toBeLessThan(handler.indexOf('const budget = await consumeHourlyRateLimit'));
    expect(aiService).toContain('limited to the active 30-Day Sprint');
    expect(aiService).toContain('Do not answer unrelated general-knowledge, entertainment, news, weather, sports');
  });

  it('makes outside research an explicit Sprint-scoped customer control', () => {
    expect(copilotUi).toContain('GhostTown stays inside your 30-Day Sprint.');
    expect(copilotUi).toContain('Check current market information for this decision');
    expect(copilotUi).toContain('Outside research approved for this Sprint decision');
    expect(copilotUi).toContain('Outside research blocked');
    expect(copilotUi).toContain('Keep questions tied to the active 30-Day Sprint.');
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
