import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEvaluationStageState } from '../src/lib/evaluationStages';
import { getFeaturedExampleBySlug, toIdeaIntake } from '../src/lib/exampleIdeas';
import {
  clearEvaluationDraft,
  loadEvaluationDraft,
  loadResearchSignals,
  saveResearchSignals,
  saveEvaluationDraft
} from '../src/lib/storage';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null; }
  get length() { return this.data.size; }
}

describe('mobile assessment funnel', () => {
  beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('loads a curated example by its video deep-link slug', () => {
    const featured = getFeaturedExampleBySlug('ai-agency-qa');
    expect(featured?.category).toBe('AI SaaS');
    expect(toIdeaIntake(featured!.idea)).toMatchObject({
      ideaName: 'SiteProof - AI Quality Assurance for Web Design',
      targetUser: 'Web design agencies and freelancers'
    });
  });

  it('groups all questions into five meaningful progress stages', () => {
    expect(getEvaluationStageState(0).stage.label).toBe('Demand');
    expect(getEvaluationStageState(4).stage.label).toBe('Passion vs Proof');
    expect(getEvaluationStageState(5).stage.label).toBe('LIT Score');
    expect(getEvaluationStageState(14).stage.label).toBe('Business DNA');
    expect(getEvaluationStageState(16).stage.label).toBe('High Walls');
    expect(getEvaluationStageState(16).totalStages).toBe(5);
  });

  it('persists and clears an in-progress assessment draft', () => {
    const idea = toIdeaIntake(getFeaturedExampleBySlug('ai-tutor')!.idea);
    saveEvaluationDraft(idea, { gt_1: 4, gt_2: 3 }, 2);

    expect(loadEvaluationDraft()).toMatchObject({
      idea: { ideaName: 'AI Tutoring for High School Students' },
      answers: { gt_1: 4, gt_2: 3 },
      currentIndex: 2
    });

    clearEvaluationDraft();
    expect(loadEvaluationDraft()).toBeNull();
  });

  it('persists the optional research map by verdict result', () => {
    saveResearchSignals({
      schemaVersion: 'pre-purchase-research-signals-v1',
      resultId: 'result-signals',
      targetCustomer: 'Independent dental offices',
      origin: 'free_verdict',
      verificationStatus: 'provider_candidate',
      updatedAt: '2026-07-31T12:00:00.000Z',
      commercial: { type: 'commercial', value: 'Scheduling tool', source: 'suggestion', candidateId: 'preview_dataforseo_1', publicUrl: 'https://example.com/tool', verificationStatus: 'provider_candidate', selectedAt: '2026-07-31T12:00:00.000Z' }
    });
    expect(loadResearchSignals('result-signals')).toMatchObject({
      targetCustomer: 'Independent dental offices',
      commercial: { candidateId: 'preview_dataforseo_1', source: 'suggestion' }
    });
    expect(loadResearchSignals('different-result')).toBeNull();
  });
});
