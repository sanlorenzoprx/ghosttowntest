import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ResultReport from '../src/components/ResultReport';
import { buildVerdictDecisionV2, projectVerdictDecisionV2ToLegacy, projectVerdictDecisionV2ToVertexInput, validateVerdictDecisionV2 } from '../src/verdict/verdictDecisionV2';
import type { EvaluationResult } from '../src/types/lit';
import { createShareSummary } from '../src/lib/share';
import { createVerdictCardSvg } from '../src/lib/verdictCardImage';
import { createShortsFactoryVerdictResponse } from '../src/api/shortsFactoryVerdict';
import type { RichVerdict } from '../src/verdict/verdictSchema';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const goldens = [
  {
    id: 'specific-paid-pilot',
    input: {
      idea: {
        ideaName: 'Fractional accessibility audits', description: 'A fixed-scope accessibility audit for independent ecommerce stores.',
        targetUser: 'independent ecommerce stores with active checkout traffic',
        painfulProblem: 'Checkout accessibility issues create customer friction and support work.', currentAlternative: 'sporadic internal QA and generic automated scans'
      },
      scores: { litScore: 3.4, ghostTownRisk: 'medium', insightScore: 3.2, leverageScore: 3, timingScore: 3.5, highWallsScore: 2.4 },
      priceOrCommitmentRange: '$300–$500 paid audit pilot'
    },
    expected: {
      decision: 'REVISE_BEFORE_TESTING', confidence: 'MODERATE',
      fieldLabels: { customer: 'INFERRED', problem: 'INFERRED', alternative: 'INFERRED', offer: 'INFERRED' },
      repairAction: 'Prepare the concise paid-pilot invitation', card: { label: 'REVISE BEFORE TESTING', hook: 'SHARPEN THE TEST.', color: '#422006' }
    }
  },
  {
    id: 'broad-missing-intake',
    input: {
      idea: { ideaName: 'General productivity app', description: 'An app for everyone.', targetUser: '', painfulProblem: '', currentAlternative: '' },
      scores: { litScore: 4.8, ghostTownRisk: 'low', insightScore: 4.8, leverageScore: 4.8, timingScore: 4.8, highWallsScore: 4.8 }
    },
    expected: {
      decision: 'DO_NOT_PURSUE_YET', confidence: 'LOW',
      fieldLabels: { customer: 'UNKNOWN', problem: 'UNKNOWN', alternative: 'UNKNOWN', offer: 'UNKNOWN' },
      repairAction: 'specific customer, recent painful problem, current alternative, and fixed-scope offer', card: { label: 'DO NOT PURSUE YET', hook: 'DEFINE BEFORE OUTREACH.', color: '#450a0a' }
    }
  },
  {
    id: 'generic-offer',
    input: {
      idea: {
        ideaName: 'Universal workflow', description: 'An all-in-one platform for everyone.', targetUser: 'independent ecommerce stores with active checkout traffic',
        painfulProblem: 'Checkout accessibility issues create customer friction and support work.', currentAlternative: 'sporadic internal QA and generic automated scans'
      },
      scores: { litScore: 4.8, ghostTownRisk: 'low', insightScore: 4.8, leverageScore: 4.8, timingScore: 4.8, highWallsScore: 4.8 }
    },
    expected: {
      decision: 'DO_NOT_PURSUE_YET', confidence: 'LOW',
      fieldLabels: { customer: 'INFERRED', problem: 'INFERRED', alternative: 'INFERRED', offer: 'UNKNOWN' },
      repairAction: 'fixed-scope offer', card: { label: 'DO NOT PURSUE YET', hook: 'DEFINE BEFORE OUTREACH.', color: '#450a0a' }
    }
  },
  {
    id: 'partial-missing-alternative',
    input: {
      idea: {
        ideaName: 'Checkout accessibility audit', description: 'A fixed-scope accessibility audit for independent ecommerce stores.',
        targetUser: 'independent ecommerce stores with active checkout traffic',
        painfulProblem: 'Checkout accessibility issues create customer friction and support work.', currentAlternative: ''
      },
      scores: { litScore: 4.8, ghostTownRisk: 'low', insightScore: 4.8, leverageScore: 4.8, timingScore: 4.8, highWallsScore: 4.8 }
    },
    expected: {
      decision: 'DO_NOT_PURSUE_YET', confidence: 'LOW',
      fieldLabels: { customer: 'INFERRED', problem: 'INFERRED', alternative: 'UNKNOWN', offer: 'INFERRED' },
      repairAction: 'current alternative', card: { label: 'DO NOT PURSUE YET', hook: 'DEFINE BEFORE OUTREACH.', color: '#450a0a' }
    }
  }
] as const;

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function fixtureResult(decision: ReturnType<typeof buildVerdictDecisionV2>, id: string): EvaluationResult {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'https://ghosttowntest.test' } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => undefined } });
  const result: EvaluationResult = {
    resultId: id,
    idea: { ...goldens.find(item => item.id === id)!.input.idea, motivation: 'Golden receipt fixture' }, answers: {},
    deterministicScores: {
      ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3,
      litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'service',
      businessDnaTrap: 'Unverified demand', businessDnaWinStrategy: 'Ask for one paid pilot', finalVerdict: 'test_first',
      verdictHeadline: 'Legacy headline', verdictExplanation: 'Legacy explanation', recommendedNextTest: 'Build an MVP',
      doNotBuildUntil: 'Legacy guardrail', oneSentenceAdvice: 'Start building now.'
    },
    verdictDecisionV2: decision, usedAI: false, generatedAt: '2026-08-17T00:00:00.000Z', cacheHit: false
  };
  return result;
}

function richFixture(): RichVerdict {
  return {
    verdict_headline: 'Legacy headline', lit_score: 60, risk_level: 'medium', ghost_town_risk: 'medium', top_reason: 'Legacy reason.', buyer_pain_clarity: 'medium', willingness_to_pay_signal: 'weak', distribution_difficulty: 'medium', unfair_advantage_check: 'Legacy advantage is unverified.', business_model_weakness: 'Legacy model needs evidence.', why_it_might_work: 'Legacy reasons are replaced by the canonical decision.', why_it_might_fail: 'Legacy failure language is replaced by the canonical decision.', killer_question: 'Who will commit?', mvp_test: 'Legacy test.', next_step: 'Legacy next step.', warnings: [], provenance: { source: 'ai_verdict_engine', provider: 'golden', model: 'golden-v1', generated_at: '2026-08-17T00:00:00.000Z', validated: true }, source: 'lit_api'
  };
}

describe('Q1 golden decision receipt', () => {
  it('produces representative canonical decisions, adverse handling, and rendered report artifacts', () => {
    const outputs = goldens.map(golden => {
      const decision = buildVerdictDecisionV2(golden.input);
      const projection = projectVerdictDecisionV2ToLegacy(decision);
      const result = fixtureResult(decision, golden.id);
      const html = renderToStaticMarkup(<ResultReport result={result} onReset={() => {}} isLoggedIn={false} onLoginClick={() => {}} onRewardClaimed={() => {}} locale="en" />);
      const share = createShareSummary(result, 'https://ghosttowntest.test/share/golden', false);
      const card = createVerdictCardSvg(result, { format: 'landscape', includeIdeaName: false });
      const shorts = createShortsFactoryVerdictResponse({ name: result.idea.ideaName, description: result.idea.description, target_user: result.idea.targetUser, market: '' }, richFixture(), decision, 'deterministic_fallback', { clarity: 10, pain: 10, reachability: 10, willingness_to_pay: 10, advantage: 10 });
      const vertex = projectVerdictDecisionV2ToVertexInput(decision);
      const fieldLabels = Object.fromEntries([
        ['customer', 'intake.targetUser'], ['problem', 'intake.painfulProblem'],
        ['alternative', 'intake.currentAlternative'], ['offer', 'intake.description']
      ].map(([field, sourceId]) => [field, decision.evidenceLabels.find(label => label.sourceId === sourceId)?.truthLabel]));
      expect(validateVerdictDecisionV2(decision).valid).toBe(true);
      expect(decision.decision).toBe(golden.expected.decision);
      expect(decision.confidence.level).toBe(golden.expected.confidence);
      expect(fieldLabels).toEqual(golden.expected.fieldLabels);
      expect(decision.firstAction.action).toContain(golden.expected.repairAction);
      expect(projection.next_step).toBe(decision.firstAction.action);
      expect(shorts.verdict_headline).toBe(projection.verdict_headline);
      expect(shorts.recommended_next_test).toBe(projection.recommended_next_test);
      expect(vertex.recommendedNextTest).toBe(projection.recommended_next_test);
      expect(html).toContain(decision.customer.initialCustomer);
      expect(html).toContain(decision.offerHypothesis.offer);
      expect(html).not.toContain('Start building now.');
      expect(share).not.toContain('Build an MVP');
      expect(card).not.toContain('Start building now.');
      expect(card).toContain(golden.expected.card.label);
      expect(card).toContain(golden.expected.card.hook);
      expect(card).toContain(golden.expected.card.color);
      if (decision.decision === 'DO_NOT_PURSUE_YET') {
        expect(card).not.toMatch(/TEST FIRST|GOOD IDEA|MY IDEA SURVIVED/i);
      }
      return {
        fixture_id: golden.id,
        input_sha256: digest(golden.input),
        decision_sha256: digest(decision),
        rendered_report_sha256: digest(html),
        share_summary_sha256: digest(share),
        verdict_card_svg_sha256: digest(card),
        shorts_top_level_sha256: digest(shorts),
        vertex_input_sha256: digest(vertex),
        decision: decision.decision,
        confidence: decision.confidence.level,
        customer: decision.customer.initialCustomer,
        problem: decision.problem.painfulProblem,
        offer: decision.offerHypothesis.offer,
        commitment: decision.offerHypothesis.commitmentRequested,
        rationale: decision.confidence.rationale,
        input_field_truth_labels: fieldLabels,
        expected_repair_action: golden.expected.repairAction,
        card_semantics: golden.expected.card,
        first_action: decision.firstAction.action,
        falsification: decision.cheapestFalsification,
        evidence_labels: decision.evidenceLabels.map(label => label.truthLabel),
        semantic_checks: {
          bounded_commitment_prediction: /meaningful customer commitment/i.test(decision.predictionTarget),
          no_whole_business_claim: !/will succeed|guaranteed/i.test(JSON.stringify(decision)),
          no_build_before_demand: !/build.*(?:product|app|platform|software)/i.test(decision.firstAction.action),
          rendered_canonical_customer_offer_commitment: html.includes(decision.customer.initialCustomer) && html.includes(decision.offerHypothesis.commitmentRequested),
          share_card_short_vertex_parity: share.includes(decision.firstAction.action) && card.includes(decision.decision.replace(/_/g, ' ')) && shorts.next_step === decision.firstAction.action && vertex.recommendedNextTest === decision.cheapestFalsification.test,
          truthful_card_semantics: card.includes(golden.expected.card.label) && card.includes(golden.expected.card.hook) && card.includes(golden.expected.card.color) && (decision.decision !== 'DO_NOT_PURSUE_YET' || !/TEST FIRST|GOOD IDEA|MY IDEA SURVIVED/i.test(card)),
          exact_field_labels_and_repair_action: JSON.stringify(fieldLabels) === JSON.stringify(golden.expected.fieldLabels) && decision.firstAction.action.includes(golden.expected.repairAction),
          adverse_unknown_intake: !['broad-missing-intake', 'generic-offer'].includes(golden.id) || decision.evidenceLabels.some(label => label.truthLabel === 'UNKNOWN'),
          generic_offer_not_claimed_testable: golden.id !== 'generic-offer' || !/testable offer/i.test(decision.confidence.rationale),
          incomplete_intake_definition_before_outreach: golden.expected.decision !== 'DO_NOT_PURSUE_YET' || (/one-page evidence brief/i.test(decision.firstAction.action) && !/paid-pilot invitation/i.test(decision.firstAction.action))
        }
      };
    });
    const blueprint = launchBlueprintFixture();
    expect(blueprint.executiveDecision.verdict).not.toMatch(/start building|build an mvp/i);
    expect(blueprint.offer.desiredOutcome).toMatch(/Classify .* PASS|Do not run paid-pilot outreach/i);
    const blueprintArtifact = {
      sha256: digest(blueprint),
      executive_decision_sha256: digest(blueprint.executiveDecision),
      desired_outcome_sha256: digest(blueprint.offer.desiredOutcome),
      canonical_no_build_before_commitment: !/start building|build an mvp/i.test(JSON.stringify(blueprint))
    };
    const path = process.env.ROADMAP_Q1_GOLDEN_ARTIFACT_PATH;
    if (path) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `${JSON.stringify({ schema_version: 'ghosttown-q1-golden-output-v1', outputs, blueprint: blueprintArtifact }, null, 2)}\n`, 'utf8');
    }
  });
});
