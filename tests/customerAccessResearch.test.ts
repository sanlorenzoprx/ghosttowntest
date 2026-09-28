import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';

const aiState = vi.hoisted(() => ({ mode: 'valid' as 'valid' | 'unknown' | 'grounded_error' | 'invalid_control' }));

vi.mock('../src/api/generativeAIService', () => ({
  generateAI: async (_env: unknown, options: { prompt: string; task?: string; googleSearch?: boolean }) => {
    if (options.googleSearch || options.task === 'grounded_research') {
      if (aiState.mode === 'grounded_error') throw new Error('Vertex grounded_research returned no content');
      const groundingChunks = Array.from({ length: 5 }, (_, index) => ({
        web: {
          uri: `https://family-buyer-community-${index + 1}.example.com/forum/parents`,
          title: `Family buyer discussion community ${index + 1}`
        }
      }));
      return {
        text: 'Public family discussion communities grounded in Google Search.',
        groundingMetadata: {
          webSearchQueries: [options.prompt],
          groundingChunks,
          groundingSupports: groundingChunks.map((_chunk, index) => ({
            segment: { text: `Parents publicly discuss choosing and buying family games in community ${index + 1}.` },
            groundingChunkIndices: [index],
            confidenceScores: [0.9]
          }))
        },
        receipt: {
          provider: 'google_vertex_ai',
          gateway: 'cloudflare_ai_gateway',
          gatewayId: 'default',
          task: 'grounded_research',
          model: 'gemini-3.5-flash',
          promptHash: 'grounded-fixture-prompt',
          responseHash: 'grounded-fixture-response',
          completedAt: '2026-08-15T00:00:00.000Z'
        }
      };
    }

    const marker = 'Candidates:\n';
    const candidates = JSON.parse(options.prompt.slice(options.prompt.indexOf(marker) + marker.length).trim()) as Array<{
      candidateId: string;
      targetTypeHint: string;
      title: string;
    }>;
    const selected: typeof candidates = [];
    const byType = new Map<string, typeof candidates>();
    for (const candidate of candidates) {
      const group = byType.get(candidate.targetTypeHint) || [];
      group.push(candidate);
      byType.set(candidate.targetTypeHint, group);
    }
    for (const group of byType.values()) {
      selected.push(...group.slice(0, 4));
      if (selected.length >= 12) break;
    }
    for (const candidate of candidates) {
      if (selected.some(item => item.candidateId === candidate.candidateId)) continue;
      selected.push(candidate);
      if (selected.length >= 16) break;
    }
    const channels = selected.slice(0, 16).map((candidate, index) => ({
      candidateId: candidate.candidateId,
      targetType: candidate.targetTypeHint,
      relevance: 'This target reaches families already evaluating games, activities, or comparable subscriptions.',
      participationRules: 'Check current public contact, guest, review, sponsorship, or submission rules before outreach.',
      recommendedApproach: 'Lead with a useful family game-selection resource and a transparent request.',
      usefulTopic: 'How families choose games that work across mixed ages.',
      risk: 'Audience fit and response are not guaranteed; avoid mass promotional outreach.',
      firstAction: 'Open the public source and identify its current contact or submission route.',
      audienceOwner: candidate.title,
      accessPath: 'Use the current public contact or submission route.',
      preparedAsset: index % 2 ? 'Family game-selection checklist and guest article outline.' : 'Review brief and interview outline.',
      outreachScriptId: index % 3 === 0 ? 'script-06-referral_partner' : 'script-07-interview_invitation'
    }));
    if (aiState.mode === 'unknown' && channels.length) {
      channels[0] = { ...channels[0], candidateId: 'candidate_model_invented' };
      channels.splice(5);
    }
    let selectionText = JSON.stringify({ channels });
    if (aiState.mode === 'invalid_control') {
      selectionText = selectionText.replace('family game-selection resource', 'family game-selection\nresource');
    }
    return {
      text: selectionText,
      receipt: {
        provider: 'google_vertex_ai',
        gateway: 'cloudflare_ai_gateway',
        gatewayId: 'default',
        task: 'candidate_selection',
        model: 'gemini-3.5-flash-lite',
        promptHash: 'fixture-prompt',
        responseHash: 'fixture-response',
        completedAt: '2026-08-15T00:00:00.000Z'
      }
    };
  }
}));

import { researchCustomerAccess } from '../src/api/customerAccessResearch';
import { customerAccessUsabilityFailure, extractProblemLanguageEvidence, planCustomerAccessResearch, sourceClaimSupportFailure, sourcePageUsabilityFailure } from '../src/api/distributionFootprintResearch';

const order = {
  orderId: 'gtt_research_1',
  email: 'buyer@example.com',
  verdictId: 'verdict_board_games',
  status: 'researching',
  intake: {
    verdictId: 'verdict_board_games',
    targetBuyer: 'Families with children ages 5-15',
    geography: 'United States',
    problem: 'Parents spend money on games their children do not enjoy',
    currentWorkaround: 'Retail stores, libraries, and recommendations',
    expectedPrice: '$39',
    competitorSeeds: [
      { seedId: 'competitor_seed_kiwico', name: 'KiwiCo', website: 'https://www.kiwico.com', domain: 'kiwico.com', relationship: 'adjacent_product', origin: 'customer_confirmed', verifiedAt: '2026-07-31T12:00:00.000Z' },
      { seedId: 'competitor_seed_bgg', name: 'BoardGameGeek', website: 'https://boardgamegeek.com', domain: 'boardgamegeek.com', relationship: 'adjacent_product', origin: 'customer_confirmed', verifiedAt: '2026-07-31T12:00:00.000Z' }
    ]
  },
  createdAt: '2026-07-31T12:00:00.000Z',
  updatedAt: '2026-07-31T12:00:00.000Z',
  paidAt: '2026-07-31T12:00:00.000Z',
  stripeCheckoutSessionId: 'cs_test_1'
} as PaidTestOrder;

const verdict = {
  resultId: 'verdict_board_games',
  generatedAt: '2026-07-31T12:00:00.000Z',
  idea: {
    ideaName: 'Board Game Subscription for Families',
    description: 'A curated family board-game subscription.',
    targetUser: 'Families with children ages 5-15',
    painfulProblem: 'Parents buy games their children do not enjoy.',
    currentAlternative: 'Retail stores, libraries, cafes, and recommendations.',
    motivation: 'Family game-night experience.'
  },
  deterministicScores: {
    ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3,
    litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak',
    businessDnaType: 'subscription', businessDnaTrap: 'Inventory risk',
    businessDnaWinStrategy: 'Validate curation before inventory', finalVerdict: 'test_first',
    verdictHeadline: 'Test the curation promise first',
    verdictExplanation: 'Prove family preference matching before buying inventory.',
    recommendedNextTest: 'Recruit founding families.', doNotBuildUntil: 'Families pay for a manual curated pilot.',
    oneSentenceAdvice: 'Sell the curation outcome before buying inventory.'
  },
  usedAI: false,
  cacheHit: false,
  answers: {}
} as EvaluationResult;

function env(): Env {
  return {
    KV: {} as KVNamespace,
    AI: {} as Ai,
    DISTRIBUTION_FOOTPRINT_ENABLED: 'true',
    VERTEX_PROJECT_ID: 'ghosttowntest',
    VERTEX_LOCATION: 'us',
    VERTEX_SELECTION_MODEL: 'gemini-3.5-flash-lite',
    AI_GATEWAY_ID: 'default',
    DATAFORSEO_LOGIN: 'login',
    DATAFORSEO_PASSWORD: 'password',
    PODCAST_INDEX_API_KEY: 'podcast-key',
    PODCAST_INDEX_API_SECRET: 'podcast-secret',
    YOUTUBE_API_KEY: 'youtube-key',
    JWT_SECRET: 'test',
    STRIPE_SECRET_KEY: 'sk_test',
    STRIPE_PRICE_ID: 'price_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test'
  };
}

function dataForSeoResponse(seed: string) {
  return {
    status_code: 20000,
    status_message: 'Ok.',
    tasks: [{ status_code: 20000, status_message: 'Ok.', result: [{ items: Array.from({ length: 6 }, (_, index) => ({
      url_from: `https://${seed}-media-${index + 1}.example.com/${index % 3 === 0 ? 'newsletter' : index % 3 === 1 ? 'events' : 'reviews'}/family-games`,
      domain_from: `${seed}-media-${index + 1}.example.com`,
      page_from_title: `${seed} family games coverage ${index + 1}`,
      rank: 70 - index,
      page_from_rank: 65 - index,
      first_seen: '2026-05-01T00:00:00.000Z',
      last_seen: '2026-07-25T00:00:00.000Z',
      dofollow: true,
      item_type: index % 3 === 0 ? 'blog' : index % 3 === 1 ? 'event' : 'review',
      backlink_spam_score: 2
    })) }] }]
  };
}

function podcastResponse(query: string) {
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 18);
  return {
    status: 'true',
    feeds: Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      title: `${query} Podcast ${index + 1}`,
      author: `Host ${index + 1}`,
      link: `https://podcast-${slug}-${index + 1}.example.com`,
      description: 'A current podcast about family activities and games.',
      language: 'en',
      lastUpdateTime: 1785100000,
      dead: 0
    }))
  };
}

function youtubeResponse(query: string) {
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10);
  return {
    items: Array.from({ length: 5 }, (_, index) => ({
      id: { videoId: `${slug}${index}` },
      snippet: {
        title: `${query} review video ${index + 1}`,
        description: 'Current creator coverage for families selecting games.',
        channelId: `${slug}-channel-${index + 1}`,
        channelTitle: `${query} Creator ${index + 1}`,
        publishedAt: '2026-07-20T00:00:00.000Z'
      }
    }))
  };
}

function youtubeCommentsResponse() {
  return {
    items: Array.from({ length: 4 }, (_, index) => ({
      snippet: {
        topLevelComment: {
          snippet: {
            textOriginal: index === 0
              ? 'We struggle to find family games our children enjoy after spending money on the wrong choices.'
              : 'I need help choosing family games because my children often do not enjoy what I buy.',
            publishedAt: `2026-09-${String(25 - index).padStart(2, '0')}T12:00:00.000Z`,
            updatedAt: `2026-09-${String(25 - index).padStart(2, '0')}T12:00:00.000Z`
          }
        }
      }
    }))
  };
}

function mockProviders() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = String(input);
    if (url.includes('api.dataforseo.com')) return new Response(JSON.stringify(dataForSeoResponse('seed')), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url.includes('api.podcastindex.org')) return new Response(JSON.stringify(podcastResponse(new URL(url).searchParams.get('q') || 'family games')), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url.includes('youtube/v3/commentThreads')) return new Response(JSON.stringify(youtubeCommentsResponse()), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url.includes('www.youtube.com/oembed')) return new Response(JSON.stringify({ title: 'KiwiCo BoardGameGeek board game subscription families children ages review video', author_name: 'Family Games Creator' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url.includes('www.googleapis.com/youtube')) return new Response(JSON.stringify(youtubeResponse(new URL(url).searchParams.get('q') || 'family games')), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url.includes('family-buyer-community')) {
      return new Response('<html><head><title>Family buyer discussion community</title><meta property="article:published_time" content="2026-09-25T12:00:00.000Z"><meta name="description" content="Parents and families with children discuss buying games, what children enjoy, and family game choices."></head><body>Members can reply, comment, ask a question, and start a new topic about family games and buying choices.</body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('<html><head><title>KiwiCo BoardGameGeek Family Games Podcast Media</title><meta property="article:published_time" content="2026-07-25T12:00:00.000Z"><meta name="description" content="Active source covering KiwiCo, BoardGameGeek, board games, podcasts, reviews, events, and family activities."></head><body>Current public source about KiwiCo, BoardGameGeek, family board games, podcasts, reviews, and events.</body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
  });
}

afterEach(() => {
  aiState.mode = 'valid';
  vi.restoreAllMocks();
});

describe('verified problem-language extraction', () => {
  it('keeps first-person friction that overlaps the actual problem claim', () => {
    const evidence = extractProblemLanguageEvidence(
      'I cannot get deployment and payments working together, and I need help before launch.',
      'Founders struggle to make deployment, authentication, payments, domains, and production configuration work together.',
      'public_discussion',
      '2026-09-27T00:00:00.000Z',
      '2026-09-26T00:00:00.000Z'
    );
    expect(evidence).toHaveLength(1);
    expect(evidence[0].text).toMatch(/deployment/i);
  });

  it('rejects generic articles and non-problem first-person statements', () => {
    expect(extractProblemLanguageEvidence(
      'Deployment platforms support authentication and payments for modern applications.',
      'Founders struggle to make deployment, authentication, payments, domains, and production configuration work together.',
      'public_discussion',
      '2026-09-27T00:00:00.000Z'
    )).toEqual([]);
    expect(extractProblemLanguageEvidence(
      'I like reading about software startups and new application launches.',
      'Founders struggle to make deployment, authentication, payments, domains, and production configuration work together.',
      'public_discussion',
      '2026-09-27T00:00:00.000Z'
    )).toEqual([]);
  });
});

describe('source usability gate', () => {
  it('rejects the historical Invalid Podbean Site error URL even when fetched today', () => {
    expect(sourcePageUsabilityFailure(
      new URL('https://example.com/podcast?error=Invalid%20Podbean%20Site(2)'),
      '<html><head><title>Podcast</title></head><body>Podcast page</body></html>',
      'Podcast',
      ''
    )).toMatch(/explicit error/i);
  });

  it('rejects a 200 error page that says the requested page could not be found', () => {
    expect(sourcePageUsabilityFailure(
      new URL('https://example.com/old-story'),
      '<html><head><title>Archive</title></head><body>The requested page could not be found. Please return home.</body></html>',
      'Archive',
      ''
    )).toMatch(/removed page|unavailable/i);
  });

  it('keeps a substantive public source that does not expose error semantics', () => {
    expect(sourcePageUsabilityFailure(
      new URL('https://example.com/current-story'),
      '<html><head><title>Medication reminder research</title><meta name="description" content="Current public research and discussion."></head><body>This article describes medication reminder behavior, caregiver coordination, and current alternatives in detail for readers.</body></html>',
      'Medication reminder research',
      'Current public research and discussion.'
    )).toBeUndefined();
  });

  it('rejects a long soft-404 page instead of letting boilerplate hide the error', () => {
    const html = '<html><head><title>Archive</title></head><body>The requested page could not be found. ' + 'Navigation and archive links. '.repeat(250) + '</body></html>';
    expect(sourcePageUsabilityFailure(new URL('https://example.com/archive/item'), html, 'Archive', '')).toMatch(/removed page|unavailable/i);
  });

  it('requires the destination to contain evidence for the claim it is supporting', () => {
    expect(sourceClaimSupportFailure(
      'independent short-term rental hosts cleaner turnover photos checklist',
      'A public discussion where short-term rental hosts compare cleaner turnover checklists and required photos.'
    )).toBeUndefined();
    expect(sourceClaimSupportFailure(
      'independent short-term rental hosts cleaner turnover photos checklist',
      'A general technology article about venture funding and software engineering.'
    )).toMatch(/supports only/i);
  });

  it('requires a usable participation path before a source can count as Customer Access', () => {
    expect(customerAccessUsabilityFailure(
      new URL('https://example.com/news/host-cleaning-trends'),
      'A current news article describing industry trends and vendor statistics.'
    )).toMatch(/participation|conversation/i);
    expect(customerAccessUsabilityFailure(
      new URL('https://example.com/forum/host-cleaning'),
      'Members can reply, comment, and start a new topic.'
    )).toBeUndefined();
  });
});

describe('customer access distribution footprint provider', () => {
  it('carries typed audience and ecosystem clues into Podcast Index and YouTube planning', () => {
    const signaledOrder: PaidTestOrder = {
      ...order,
      intake: {
        ...order.intake,
        researchSignals: {
          schemaVersion: 'pre-purchase-research-signals-v1',
          resultId: order.verdictId,
          targetCustomer: order.intake.targetBuyer,
          origin: 'free_verdict',
          verificationStatus: 'unverified',
          updatedAt: '2026-07-31T12:00:00.000Z',
          audience: { type: 'audience', value: 'Family game podcasts', source: 'user_typed', verificationStatus: 'unverified', selectedAt: '2026-07-31T12:00:00.000Z' },
          ecosystem: { type: 'ecosystem', value: 'Family recreation associations', source: 'user_typed', verificationStatus: 'unverified', selectedAt: '2026-07-31T12:00:00.000Z' }
        }
      }
    };
    const plan = planCustomerAccessResearch(signaledOrder, verdict);
    expect(plan.queryBySourceId['podcast:audience']).toContain('Family game podcasts');
    expect(plan.queryBySourceId['youtube:audience']).toContain('Family game podcasts');
    expect(plan.queryBySourceId['podcast:ecosystem']).toContain('Family recreation associations');
    expect(plan.queryBySourceId['youtube:ecosystem']).toContain('Family recreation associations');
    expect(plan.queryBySourceId['customer_access:problem']).toContain('families');
    expect(plan.queryBySourceId['customer_access:problem']).not.toContain('subscription');
    expect(plan.queryBySourceId['customer_access:problem']).toContain('forum discussion');
    expect(plan.queryBySourceId['customer_access:buyer']).toContain('families');
    expect(plan.queryBySourceId['customer_access:buyer']).toContain('community question');
    expect(plan.queryBySourceId['youtube_access:problem']).toContain('families');
    expect(plan.queryBySourceId['youtube_access:problem']).toContain('game');
    expect(plan.queryBySourceId['youtube_access:buyer']).toContain('families');
    expect(plan.queryBySourceId['youtube_access:buyer']).toContain('children');
  });

  it('builds a verified media and distribution network from competitor seeds using Vertex selection', async () => {
    const fetchMock = mockProviders();
    const result = await researchCustomerAccess(env(), order, verdict);
    expect(fetchMock).toHaveBeenCalled();
    expect(result.research.status).toBe('complete');
    expect(result.research.channels.length).toBeGreaterThanOrEqual(10);
    expect(result.research.channels.length).toBeLessThanOrEqual(25);
    expect(result.research.sources.length).toBe(result.research.channels.length);
    expect(new Set(result.research.channels.map(channel => channel.targetType)).size).toBeGreaterThanOrEqual(3);
    const customerAccess = result.research.channels.filter(channel => channel.evidenceRole === 'customer_access');
    expect(customerAccess.length).toBeGreaterThanOrEqual(3);
    expect(customerAccess.every(channel => channel.currentActivityStatus === 'verified_current' && Boolean(channel.currentActivityVerifiedAt))).toBe(true);
    expect(result.research.channels.filter(channel => channel.discoveredThrough === 'competitor_backlink').every(channel => channel.currentActivityStatus === 'unverified')).toBe(true);
    expect(result.research.channels.some(channel => channel.evidenceRole === 'media_pr')).toBe(true);
    expect(result.research.channels.every(channel => channel.evidenceRole && channel.evidenceRoleReason)).toBe(true);
    expect(result.research.channels.every(channel => channel.evidenceRole === 'customer_access' || Boolean(channel.competitorEvidence?.length))).toBe(true);
    expect(result.research.channels.every(channel => channel.preparedAsset && channel.outreachScriptId)).toBe(true);
    expect(result.receipt.provider).toBe('distribution_footprint');
    expect(result.receipt.seedDomains).toEqual(['kiwico.com', 'boardgamegeek.com']);
    expect(result.receipt.successfulSourceCount).toBeGreaterThanOrEqual(4);
    expect(result.receipt.model).toBe('gemini-3.5-flash-lite');
  });

  it('keeps real Customer Access when grounded search fails by using recent relevant YouTube buyer discussions, not creators', async () => {
    aiState.mode = 'grounded_error';
    mockProviders();
    const result = await researchCustomerAccess(env(), order, verdict);
    const customerAccess = result.research.channels.filter(channel => channel.evidenceRole === 'customer_access');

    expect(result.research.status).toBe('complete');
    expect(customerAccess.length).toBeGreaterThanOrEqual(3);
    expect(customerAccess.every(channel => channel.platform === 'YouTube public discussion')).toBe(true);
    expect(customerAccess.every(channel => channel.targetType === 'community')).toBe(true);
    expect(customerAccess.every(channel => channel.currentActivityStatus === 'verified_current')).toBe(true);
    expect(customerAccess.filter(channel => channel.problemLanguageEvidence?.length).length).toBeGreaterThanOrEqual(3);
    expect(result.receipt.evidenceSufficiency?.problemLanguageObservationCount).toBeGreaterThanOrEqual(3);
    expect(result.research.channels.filter(channel => channel.platform === 'YouTube creator').every(channel => channel.evidenceRole !== 'customer_access')).toBe(true);
  });

  it('recovers an unknown Vertex candidate ID from the provider-verified candidate pool', async () => {
    aiState.mode = 'unknown';
    mockProviders();
    const result = await researchCustomerAccess(env(), order, verdict);
    expect(result.research.status).toBe('complete');
    expect(result.research.channels.length).toBeGreaterThanOrEqual(10);
    expect(result.research.sources.length).toBe(result.research.channels.length);
    expect(result.receipt.model).toBe('verified-provider-recovery');
    expect(result.receipt.candidateChannelCount).toBeGreaterThanOrEqual(10);
    expect(result.research.channels.every(channel => channel.publicUrl.startsWith('https://'))).toBe(true);
  });

  it('repairs raw control characters inside candidate-selection JSON strings without weakening source gates', async () => {
    aiState.mode = 'invalid_control';
    mockProviders();
    const result = await researchCustomerAccess(env(), order, verdict);
    expect(result.research.status).toBe('complete');
    expect(result.research.channels.length).toBeGreaterThanOrEqual(10);
    expect(result.research.channels.filter(channel => channel.evidenceRole === 'customer_access').length).toBeGreaterThanOrEqual(3);
  });

  it('rejects HTTP 404 and removed-page destinations instead of counting them as verified sources', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url.includes('api.dataforseo.com')) return new Response(JSON.stringify(dataForSeoResponse('seed')), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.includes('api.podcastindex.org')) return new Response(JSON.stringify(podcastResponse(new URL(url).searchParams.get('q') || 'family games')), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.includes('www.googleapis.com/youtube')) return new Response(JSON.stringify(youtubeResponse(new URL(url).searchParams.get('q') || 'family games')), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.includes('www.youtube.com/channel/')) {
        return new Response('<html><head><title>Family Games Creator</title><meta name="description" content="Family games review video creator channel with current family game coverage."></head><body>Family games review video creator channel.</body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
      }
      if (url.includes('family-buyer-community-1.example.com')) {
        return new Response('<html><head><title>Page not found</title></head><body>404 - this page is not available.</body></html>', { status: 404, headers: { 'Content-Type': 'text/html' } });
      }
      if (url.includes('family-buyer-community-2.example.com')) {
        return new Response('<html><head><title>Invalid Community Site</title></head><body>This page was removed and is no longer available.</body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
      }
      if (url.includes('family-buyer-community-3.example.com')) {
        return new Response('<html><head><title>Community unavailable</title></head><body>The requested resource does not exist.</body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
      }
      if (url.includes('family-buyer-community-')) {
        const n = url.match(/community-(\d+)/)?.[1] || '3';
        return new Response(`<html><head><title>Family buyer discussion community ${n}</title><meta property="article:published_time" content="2026-07-25T12:00:00.000Z"><meta name="description" content="Parents and buyers discuss choosing family games in this public community."></head><body>Recent family buyer discussion community.</body></html>`, { status: 200, headers: { 'Content-Type': 'text/html' } });
      }
      return new Response('<html><head><title>Family Games Media</title><meta property="article:published_time" content="2026-07-25T12:00:00.000Z"><meta name="description" content="KiwiCo kiwico.com BoardGameGeek boardgamegeek.com family games podcasts."></head><body>KiwiCo BoardGameGeek family games podcast evidence.</body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    });

    await expect(researchCustomerAccess(env(), order, verdict)).rejects.toThrow(/customer-access targets|quality gate|recovery found/i);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('fails closed when Distribution Footprint research is disabled', async () => {
    const disabled = env();
    disabled.DISTRIBUTION_FOOTPRINT_ENABLED = 'false';
    await expect(researchCustomerAccess(disabled, order, verdict)).rejects.toThrow(/not enabled/i);
  });
});
