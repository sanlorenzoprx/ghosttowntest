import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const memory = readFileSync(new URL('../src/api/executionCoachMemory.ts', import.meta.url), 'utf8');
const handler = readFileSync(new URL('../src/api/blueprintExecutionCopilot.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../migrations/0011_execution_learning_coach.sql', import.meta.url), 'utf8');
const recency = readFileSync(new URL('../src/api/evidenceRecency.ts', import.meta.url), 'utf8');

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

  it('never auto-promotes one customer result into shared product knowledge', () => {
    expect(memory).toContain("candidate.scope !== 'customer_specific'");
    expect(memory).toContain("input.phase === 'review'");
    expect(memory).toContain("WHERE status = 'active'");
    expect(memory).not.toContain('INSERT INTO execution_product_knowledge');
    expect(memory).not.toContain('INSERT OR IGNORE INTO execution_product_knowledge');
  });

  it('keeps identifying customer material out of globally eligible learning candidates', () => {
    expect(memory).toContain('privacySafeLesson');
    expect(memory).toContain('@[A-Z0-9.-]+');
    expect(memory).toContain('https?:');
    expect(memory).toContain('globalEligible = privacySafe');
  });

  it('loads prior daily assessments into the next day and checks exact-context cache before model budget', () => {
    expect(memory).toContain("phase = 'review' AND day_number < ?");
    expect(memory).toContain('ORDER BY day_number DESC');
    expect(handler).toContain('context.coachMemory = await loadExecutionCoachMemory');
    expect(handler.indexOf('loadCachedExecutionCoachResponse')).toBeLessThan(handler.indexOf('consumeHourlyRateLimit'));
  });
});
