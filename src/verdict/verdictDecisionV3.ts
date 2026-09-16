import type { GhostTownEvidenceScanV1 } from '../types/evidence';
import {
  buildVerdictDecisionV2,
  type VerdictDecision,
  type VerdictDecisionV2,
  type VerdictDecisionV2Inputs
} from './verdictDecisionV2';

export interface VerdictEvidenceTierSummary {
  count: number;
  state: 'observed' | 'not_observed';
  statement: string;
}

export interface VerdictDecisionV3 extends VerdictDecisionV2 {
  schemaVersion: 'ghosttown-verdict-decision-v3';
  evidenceScanFingerprint: string;
  evidenceScanStatus: GhostTownEvidenceScanV1['status'];
  evidenceTiers: {
    market: VerdictEvidenceTierSummary;
    customer: VerdictEvidenceTierSummary;
    commercial: VerdictEvidenceTierSummary;
  };
  evidenceContrast: {
    founderSays: string;
    marketEvidenceSays: string;
    ghostTownConcludes: string;
  };
}
function marketCount(scan: GhostTownEvidenceScanV1): number {
  return scan.competition.length + scan.demand.length + scan.access.length
    + scan.currentAlternatives.filter(item => item.provider !== 'founder_input').length;
}

function evidenceAdjustedDecision(base: VerdictDecisionV2, scan: GhostTownEvidenceScanV1): VerdictDecision {
  if (base.decision !== 'WEAK_EVIDENCE') return base.decision;
  const enoughMarketContext = scan.status === 'complete'
    && scan.competition.length >= 3
    && scan.demand.length >= 1
    && scan.access.length >= 1;
  // Market evidence can justify running a tighter test, but never upgrades a
  // founder-supplied hypothesis directly to WORTH_TESTING or proves demand.
  return enoughMarketContext ? 'REVISE_BEFORE_TESTING' : base.decision;
}

function founderStatement(idea: VerdictDecisionV2Inputs['idea']): string {
  return `The founder says ${idea.targetUser || 'a buyer'} has ${idea.painfulProblem || 'the stated problem'} and currently relies on ${idea.currentAlternative || 'an unspecified alternative'}.`;
}

function marketStatement(scan: GhostTownEvidenceScanV1): string {
  const count = marketCount(scan);
  if (!count) return 'The quick market check did not find useful outside signs. We still do not know if customers will buy.';
  return `The quick market check found ${count} useful signs across similar offers, searches, and places to reach buyers. These signs do not prove people will buy.`;
}
function conclusion(decision: VerdictDecision, scan: GhostTownEvidenceScanV1): string {
  const marketPresent = marketCount(scan) > 0;
  if (decision === 'DO_NOT_PURSUE_YET') {
    return marketPresent
      ? 'We found signs that the market exists, but the idea is still too broad to run a useful buying test.'
      : 'The idea is still too broad to run a useful buying test, and the quick market check did not add useful outside signs.';
  }
  if (decision === 'WORTH_TESTING') {
    return marketPresent
      ? 'The idea is clear enough to test, and we found signs that the market exists. We still need real buyers to take action before we can say demand is real.'
      : 'The idea is clear enough to test, but the quick market check found little outside information. The next step is to ask real buyers to act.';
  }
  if (decision === 'REVISE_BEFORE_TESTING') {
    return marketPresent
      ? 'We found enough market signs to keep testing, but the idea should be made clearer before you treat any signal as proof.'
      : 'Make the idea clearer before you test it. The quick market check did not find enough outside information.';
  }
  return marketPresent
    ? 'We found signs that the market exists, but we still need to see what real customers do. The next step should ask buyers to reply, book, pay, or make another clear move.'
    : 'We still have weak proof. Do not assume people want this just because the idea sounds good. Ask real buyers to take a clear next step.';
}

export function buildVerdictDecisionV3(inputs: VerdictDecisionV2Inputs & {
  evidenceScan: GhostTownEvidenceScanV1;
}): VerdictDecisionV3 {
  const base = buildVerdictDecisionV2(inputs);
  const decision = evidenceAdjustedDecision(base, inputs.evidenceScan);
  const market = marketCount(inputs.evidenceScan);
  return {
    ...base,
    decision,
    schemaVersion: 'ghosttown-verdict-decision-v3',
    evidenceScanFingerprint: inputs.evidenceScan.fingerprint,
    evidenceScanStatus: inputs.evidenceScan.status,
    confidence: {
      ...base.confidence,
      rationale: `${base.confidence.rationale} ${market
        ? 'Outside market signs help us see that the market and buyers may be there, but they do not prove people will buy.'
        : 'The quick market check did not add useful outside signs.'}`
    },
    reasonsFor: market
      ? [`The quick market check found ${market} useful market signs.`, ...base.reasonsFor]
      : base.reasonsFor,
    reasonsAgainst: [
      ...base.reasonsAgainst,
      'Market signs are not proof that customers want to buy. We need replies, talks, bookings, deposits, payments, or another clear action.'
    ],
    evidenceTiers: {
      market: {
        count: market,
        state: market ? 'observed' : 'not_observed',
        statement: market ? 'We found public signs that this market exists.' : 'We did not find useful public signs that this market exists.'
      },
      customer: {
        count: 0,
        state: 'not_observed',
        statement: 'We have not seen a useful reply, customer talk, proposal request, or similar customer action yet.'
      },
      commercial: {
        count: 0,
        state: 'not_observed',
        statement: 'We have not seen a deposit, payment, accepted offer, or similar buying action yet.'
      }
    },
    evidenceContrast: {
      founderSays: founderStatement(inputs.idea),
      marketEvidenceSays: marketStatement(inputs.evidenceScan),
      ghostTownConcludes: conclusion(decision, inputs.evidenceScan)
    }
  };
}
