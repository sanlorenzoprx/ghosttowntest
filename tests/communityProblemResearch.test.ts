import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import type { CustomerAccessChannel } from '../src/types/launchBlueprint';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';

const ai = vi.hoisted(() => ({ text: '', prompts: [] as string[], fail: false }));

vi.mock('../src/api/generativeAIService', () => {
  const receipt = { model: 'fixture-model', promptHash: 'p', responseHash: 'r', completedAt: '2026-10-20T00:00:00.000Z' };
  return {
    generateAI: async (_env: unknown, options: { prompt: string }) => {
      ai.prompts.push(options.prompt);
      if (ai.fail) throw new Error('fixture model unavailable');
      return { text: ai.text, receipt };
    },
    generateAIJson: async (_env: unknown, options: { prompt: string }) => {
      ai.prompts.push(options.prompt);
      throw new Error('fixture stops after capturing the prompt');
    }
  };
});

const {
  communityContextForAssets,
  researchCommunityProblems,
  selectCommunitiesToRead,
  validateCommunityProblems
} = await import('../src/api/communityProblemResearch');

const PAGE_A = 'Welcome to the parents forum. Every Friday we fight about which board game to play and nobody can agree, it ruins the evening. I usually just put a movie on instead because it is easier. Another parent wrote that the games in stores are too complicated for a seven year old. Reply from a dad: honestly we never have this problem, we just play Uno every week and the kids love it.';
const PAGE_B = 'Thread: game nights with young kids. I’m so tired of buying games that sit on the shelf after one try. We spent $60 last month on two games nobody plays. Members share lists of games here. No self-promotion: posts with affiliate links are removed.';

function channel(id: string, overrides: Partial<CustomerAccessChannel> = {}): CustomerAccessChannel {
  return {
    channelId: id,
    community: `Community ${id}`,
    platform: 'forum',
    publicUrl: `https://forum.example/${id}`,
    relevance: 'Parents discussing family game nights.',
    activity: 'recent',
    participationRules: 'Be helpful; no self-promotion.',
    recommendedApproach: 'Answer questions.',
    usefulTopic: 'Choosing games',
    risk: 'Promotion is removed.',
    firstAction: 'Read the rules.',
    confidence: 'high',
    researchDate: '2026-10-20',
    sourceIds: [],
    targetType: 'community',
    evidenceRole: 'customer_access',
    currentActivityStatus: 'verified_current',
    currentActivityVerifiedAt: '2026-10-20T00:00:00.000Z',
    ...overrides
  };
}

const pages = [
  { channel: channel('a'), page: { finalUrl: 'https://forum.example/a', visibleText: PAGE_A } },
  { channel: channel('b'), page: { finalUrl: 'https://forum.example/b', visibleText: PAGE_B } }
];

const order = { intake: { targetBuyer: 'Parents of young children', problem: 'Choosing games is difficult.' } } as PaidTestOrder;
const verdict = { idea: { ideaName: 'Family Game Night' } } as EvaluationResult;

const modelOutput = {
  problems: [
    { problemId: 'p1', title: 'Picking a game everyone will play', category: 'emotional', who: 'Parents of young kids', when: 'Friday game night', currentWorkaround: 'Put a movie on instead', whyItMatters: 'Game night keeps failing, so a plan that works the first time is what parents would value.', whatToAskNext: 'Ask a parent to describe the last game night that fell apart.', whatWouldChangePlan: 'If parents say a single favorite game is enough, reconsider.' },
    { problemId: 'p2', title: 'Money wasted on games nobody plays', category: 'price', who: 'Parents', when: 'After buying new games', currentWorkaround: 'Not stated', whatToAskNext: 'Ask what they spent on games last month.', whatWouldChangePlan: 'If nobody tracks this spend, reconsider.' },
    { problemId: 'p3', title: 'Invented problem', category: 'functional', who: 'x', when: 'x', currentWorkaround: 'x', whatToAskNext: 'x', whatWouldChangePlan: 'x' }
  ],
  observations: [
    { pageId: 'a', problemId: 'p1', stance: 'supports', kind: 'complaint', quote: 'we fight about which board game to play and nobody can agree, it ruins the evening' },
    { pageId: 'a', problemId: 'p1', stance: 'supports', kind: 'workaround', quote: 'I usually just put a movie on instead because it is easier' },
    // Curly apostrophe on the page, straight in the model output: still the same words.
    { pageId: 'b', problemId: 'p1', stance: 'supports', kind: 'complaint', quote: "I'm so tired of buying games that sit on the shelf after one try" },
    { pageId: 'a', problemId: 'p1', stance: 'contradicts', kind: 'alternative', quote: 'we never have this problem, we just play Uno every week' },
    { pageId: 'b', problemId: 'p2', stance: 'supports', kind: 'complaint', quote: 'We spent $60 last month on two games nobody plays.' },
    // A repost of the same words counts once.
    { pageId: 'b', problemId: 'p2', stance: 'supports', kind: 'complaint', quote: 'We spent $60 last month on two games nobody plays.' },
    // Paraphrase: not on the page.
    { pageId: 'a', problemId: 'p3', stance: 'supports', kind: 'complaint', quote: 'Parents desperately want a game subscription service' },
    // Unknown page.
    { pageId: 'zzz', problemId: 'p1', stance: 'supports', kind: 'complaint', quote: 'nobody can agree, it ruins the evening' }
  ],
  styles: [
    { pageId: 'b', howPeopleTalk: 'Short, practical, shares lists.', formatThatFits: 'A list of games by age', promotionRule: 'not_allowed', promotionEvidence: 'posts with affiliate links are removed' }
  ]
};

beforeEach(() => {
  ai.text = JSON.stringify(modelOutput);
  ai.prompts = [];
  ai.fail = false;
});

describe('community problem research', () => {
  it('keeps only quotes copied word for word from the page they link to', () => {
    const result = validateCommunityProblems(pages, modelOutput);
    const quotes = result.observations.map(item => item.quote);
    expect(quotes).toContain('we fight about which board game to play and nobody can agree, it ruins the evening');
    expect(quotes).not.toContain('Parents desperately want a game subscription service');
    expect(quotes.filter(quote => quote.startsWith('We spent $60'))).toHaveLength(1);
    expect(result.observations.every(item => item.url.startsWith('https://forum.example/'))).toBe(true);
    expect(result.problems.map(problem => problem.problemId)).toEqual(['p1', 'p2']);
    expect(result.quotesRejected).toBe(3);
  });

  it('labels how widely a problem was seen and keeps evidence against it', () => {
    const { problems } = validateCommunityProblems(pages, modelOutput);
    const p1 = problems.find(problem => problem.problemId === 'p1')!;
    const p2 = problems.find(problem => problem.problemId === 'p2')!;
    expect(p1.strength).toBe('seen_in_several_places');
    expect(p1.channelIds).toEqual(['a', 'b']);
    expect(p1.contradictingObservationIds).toHaveLength(1);
    expect(p2.strength).toBe('one_mention');
    expect(problems.every(problem => problem.evidenceLevel === 'problem_evidence')).toBe(true);
    expect(p1.whyItMatters).toMatch(/works the first time/);
    // A missing why gets a plain fallback, never an empty line.
    expect(p2.whyItMatters).toMatch(/worth checking with real buyers/);
  });

  it('drops a problem that only has evidence against it', () => {
    const output = {
      ...modelOutput,
      observations: [{ pageId: 'a', problemId: 'p1', stance: 'contradicts', kind: 'alternative', quote: 'we never have this problem, we just play Uno every week' }]
    };
    expect(validateCommunityProblems(pages, output).problems).toHaveLength(0);
  });

  it('reads only current customer-access communities, at most six', () => {
    const channels = [
      channel('market', { evidenceRole: 'market_evidence', targetType: 'newsletter_or_publication' }),
      channel('stale', { currentActivityStatus: 'verified_inactive' }),
      ...Array.from({ length: 8 }, (_, index) => channel(`c${index}`))
    ];
    const selected = selectCommunitiesToRead(channels).map(item => item.channelId);
    expect(selected).toHaveLength(6);
    expect(selected).not.toContain('market');
    expect(selected).not.toContain('stale');
  });

  it('shows a page it could not read as a research gap', async () => {
    const read = async (url: string) => {
      if (url.endsWith('/c')) throw new Error('Original source returned HTTP 403');
      return { finalUrl: url, visibleText: url.endsWith('/a') ? PAGE_A : PAGE_B };
    };
    const result = await researchCommunityProblems({} as Env, order, verdict, [channel('a'), channel('b'), channel('c')], read);
    expect(result.status).toBe('partial');
    expect(result.gaps).toEqual([expect.objectContaining({ channelId: 'c', reason: expect.stringContaining('HTTP 403') })]);
    expect(result.problems).toHaveLength(2);
    expect(result.receipt).toMatchObject({ pagesRead: 2, quotesKept: 5 });
    expect(result.boundary).toMatch(/do not show that anyone will buy/);
    expect(ai.prompts[0]).toContain('copied exactly from the page text');
    expect(ai.prompts[0]).toContain('Explain why it matters.');
  });

  it('reports research as unavailable, not as a finding, when nothing checks out', async () => {
    ai.text = JSON.stringify({ problems: modelOutput.problems.slice(2), observations: modelOutput.observations.slice(6, 7), styles: [] });
    const read = async (url: string) => ({ finalUrl: url, visibleText: PAGE_A });
    const result = await researchCommunityProblems({} as Env, order, verdict, [channel('a')], read);
    expect(result.status).toBe('unavailable');
    expect(result.problems).toHaveLength(0);
    expect(result.gaps[0].reason).toMatch(/word for word/);
  });

  it('does not call the model when no community page can be read', async () => {
    const read = async () => { throw new Error('timeout'); };
    const result = await researchCommunityProblems({} as Env, order, verdict, [channel('a')], read);
    expect(result.status).toBe('unavailable');
    expect(ai.prompts).toHaveLength(0);
  });

  it('gives the asset stage the customers\' words and each community\'s rules', () => {
    const research = {
      version: 'ghosttown-community-problem-research-v1' as const,
      researchedAt: '2026-10-20T00:00:00.000Z',
      status: 'complete' as const,
      gaps: [],
      boundary: 'b',
      ...validateCommunityProblems(pages, modelOutput)
    };
    const context = communityContextForAssets(research)!;
    expect(context.problems[0].customerWords).toContain('we fight about which board game to play and nobody can agree, it ruins the evening');
    expect(context.problems[0].contradictingWords).toHaveLength(1);
    expect(context.communities).toEqual([expect.objectContaining({ channelId: 'b', promotionRule: 'not_allowed' })]);
    expect(context.rule).toMatch(/Never present a quote as a testimonial/);
    expect(communityContextForAssets({ ...research, status: 'unavailable' })).toBeUndefined();
  });
});
