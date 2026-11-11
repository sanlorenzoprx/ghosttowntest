import { beforeEach, describe, expect, it, vi } from 'vitest';

// Vertex answers in prose, not the requested JSON, when Google Search grounding
// is on in the same request. Acceptance runs 43105507992 and 43109842657 both hit
// this ("grounded_non_json"). The Coach now keeps the grounded answer and its
// sources, and asks a second, ungrounded call to put it into the Copilot schema.
const generateAI = vi.hoisted(() => vi.fn());
vi.mock('../src/api/generativeAIService', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/api/generativeAIService')>();
  return { ...actual, generateAI };
});

const { runExecutionCopilot, coachOutputTokenBudget, generativeTaskForExecutionCapability } = await import('../src/api/executionAIService');
const { buildExecutionRagContext } = await import('../src/lib/blueprintExecutionIntelligence');
const { checkoutAccessibilityBlueprintFixture } = await import('./fixtures/checkoutAccessibilityBlueprint');

const env = {} as never;
const progress = {
  completedDays: [], evidenceNotes: {}, evidenceLedger: [], checkpointReviews: [],
  metrics: { outreachSent: 0, replies: 0, interviews: 0, qualifiedConversations: 0, commitments: 0, revenueCents: 0, founderMinutes: 0, variableCostCents: 0, leads: 0 }
};
const context = buildExecutionRagContext(checkoutAccessibilityBlueprintFixture(), progress as never, 1, '');
const question = 'Search the web for current competitor information only if it directly helps this Day 1 Sprint decision.';
const groundedReceipt = { provider: 'google_vertex_ai', gateway: 'cloudflare_ai_gateway', gatewayId: 'default', task: 'grounded_research', model: 'm', completedAt: 'now' };
const sources = { groundingChunks: [{ web: { uri: 'https://example.com/a', title: 'Source A' } }] };
const structuredAnswer = {
  answer: 'Two competitors already sell a similar pilot (Source A).',
  evidenceAssessment: 'External context only; no customer evidence was created.',
  contradictionDetected: false,
  recommendedAction: 'Keep Day 1 outreach as written.',
  evidenceToRecord: ['Replies to the Day 1 message'],
  assumptions: [],
  learningCandidates: []
};

beforeEach(() => generateAI.mockReset());

describe('grounded research answers that come back as prose', () => {
  it('keeps the grounded receipt and sources and returns structured guidance without degradation', async () => {
    generateAI
      .mockResolvedValueOnce({ text: 'Two competitors already sell a similar pilot, according to Source A.', receipt: groundedReceipt, groundingMetadata: sources })
      .mockResolvedValueOnce({ text: JSON.stringify(structuredAnswer), receipt: { ...groundedReceipt, task: 'candidate_selection' } });

    const result = await runExecutionCopilot(env, 'grounded_research', 'current_experiment', context, question, [], 'chat');

    expect(result.degraded).toBeUndefined();
    expect(result.output.answer).toBe(structuredAnswer.answer);
    expect(result.receipt.task).toBe('grounded_research');
    expect(result.groundingMetadata).toBe(sources);
    expect(generateAI).toHaveBeenCalledTimes(2);
    const [first, second] = generateAI.mock.calls.map(call => call[1]);
    expect(first.googleSearch).toBe(true);
    expect(second.googleSearch).toBeUndefined();
    expect(second.responseSchema).toBe(first.responseSchema);
    expect(second.prompt).toContain('Two competitors already sell a similar pilot, according to Source A.');
    expect(second.systemInstruction).toContain('Do not add new market facts');
  });

  it('falls back to the safe degraded answer when the structuring call also fails', async () => {
    generateAI
      .mockResolvedValueOnce({ text: 'Prose only.', receipt: groundedReceipt, groundingMetadata: sources })
      .mockRejectedValueOnce(new Error('timeout'));

    const result = await runExecutionCopilot(env, 'grounded_research', 'current_experiment', context, question, [], 'chat');

    expect(result.degraded).toEqual({ active: true, reason: 'grounded_non_json' });
    expect(result.output.answer).toBe('Prose only.');
    expect(result.groundingMetadata).toBe(sources);
  });

  it('does not make a second call for ordinary (ungrounded) answers', async () => {
    generateAI.mockResolvedValueOnce({ text: 'not json', receipt: { ...groundedReceipt, task: 'candidate_selection' } });

    const result = await runExecutionCopilot(env, 'fast_assistant', 'current_experiment', context, 'What exactly do I do today?', [], 'chat');

    expect(result.degraded).toEqual({ active: true, reason: 'unstructured_response' });
    expect(generateAI).toHaveBeenCalledTimes(1);
  });
});

describe('Coach token budget', () => {
  // Run 43114798249: the thinking model used ~1,725 of 1,800 tokens thinking and
  // cut every plan-change review off after ~60 answer tokens.
  it('gives thinking-model capabilities room to think and still answer', () => {
    for (const capability of ['strategy_reasoner', 'critic'] as const) {
      expect(generativeTaskForExecutionCapability(capability)).toBe('blueprint');
      expect(coachOutputTokenBudget(capability)).toBeGreaterThanOrEqual(8192);
    }
    expect(coachOutputTokenBudget('fast_assistant')).toBe(1800);
  });

  it('sends that budget on the plan-change Coach call', async () => {
    generateAI.mockResolvedValueOnce({ text: JSON.stringify(structuredAnswer), receipt: { ...groundedReceipt, task: 'blueprint' } });
    await runExecutionCopilot(env, 'strategy_reasoner', 'current_experiment', context, 'Should I change the offer?', [], 'review');
    expect(generateAI.mock.calls[0][1].maxOutputTokens).toBeGreaterThanOrEqual(8192);
  });
});
