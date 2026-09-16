import type { DirectEvidenceState, GhostTownEvidenceScanV1, PricingBandSummary } from '../types/evidence';
import {
  buildVerdictDecisionV2,
  type VerdictDecision,
  type VerdictDecisionV2,
  type VerdictDecisionV2Inputs
} from './verdictDecisionV2';

export type VerdictEvidenceState = 'observed' | 'not_observed' | 'not_collected';

export interface VerdictEvidenceTierSummary {
  count: number;
  state: VerdictEvidenceState;
  statement: string;
}

export interface VerdictDecisionV3 extends VerdictDecisionV2 {
  schemaVersion: 'ghosttown-verdict-decision-v3';
  evidenceScanFingerprint: string;
  evidenceScanStatus: GhostTownEvidenceScanV1['status'];
  evidenceModelVersion: 'seven-layer-v1';
  evidenceLayers: {
    marketExistence: VerdictEvidenceTierSummary;
    customerConsumption: VerdictEvidenceTierSummary;
    commercialConsumption: VerdictEvidenceTierSummary;
    pricingLandscape: VerdictEvidenceTierSummary;
    premiumPrecedent: VerdictEvidenceTierSummary;
    directOfferResponse: VerdictEvidenceTierSummary;
    directOfferPurchase: VerdictEvidenceTierSummary;
  };
  /** Backward-compatible projection for consumers that still expect the original three tiers. */
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

function customerConsumptionCount(scan: GhostTownEvidenceScanV1): number {
  return (scan.customerConsumption ?? []).length;
}

function commercialConsumptionCount(scan: GhostTownEvidenceScanV1): number {
  return (scan.commercialConsumption ?? []).length;
}
function pricingCount(scan: GhostTownEvidenceScanV1): number {
  return (scan.pricingLandscape ?? []).length;
}

function premiumCount(scan: GhostTownEvidenceScanV1): number {
  return (scan.premiumPrecedent ?? []).length;
}

function observed(count: number, yes: string, no: string): VerdictEvidenceTierSummary {
  return {
    count,
    state: count > 0 ? 'observed' : 'not_observed',
    statement: count > 0 ? yes : no
  };
}

function directSummary(
  fallbackLabel: 'response' | 'purchase',
  value?: { count: number; state: DirectEvidenceState; statement: string }
): VerdictEvidenceTierSummary {
  if (value) return { count: value.count, state: value.state, statement: value.statement };
  return {
    count: 0,
    state: 'not_collected',
    statement: fallbackLabel === 'response'
      ? 'This free verdict has not run your specific offer yet, so direct replies, leads, calls, bookings, or proposal requests have not been collected.'
      : 'This free verdict has not offered your specific deal for purchase yet, so deposits, paid pilots, accepted paid offers, or payments have not been collected.'
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function pricingBandText(bands: PricingBandSummary[]): string {
  if (!bands.length) return '';
  return bands.slice(0, 2).map(band => {
    const prefix = band.currency === 'UNSPECIFIED' ? '' : `${band.currency} `;
    return `${prefix}${formatNumber(band.minimum)}–${formatNumber(band.maximum)} (median ${formatNumber(band.median)}, n=${band.count})`;
  }).join('; ');
}

function evidenceAdjustedDecision(base: VerdictDecisionV2, scan: GhostTownEvidenceScanV1): VerdictDecision {
  if (base.decision !== 'WEAK_EVIDENCE') return base.decision;
  const categoryBehavior = customerConsumptionCount(scan) > 0 || commercialConsumptionCount(scan) > 0;
  const enoughMarketContext = (
    scan.status === 'complete'
      && scan.competition.length >= 3
      && scan.demand.length >= 1
      && scan.access.length >= 1
  ) || (marketCount(scan) >= 3 && categoryBehavior);
  // External customer/commercial precedent can justify a tighter test, but it
  // never proves this founder's positioning, offer, or price will convert.
  return enoughMarketContext ? 'REVISE_BEFORE_TESTING' : base.decision;
}
function founderStatement(idea: VerdictDecisionV2Inputs['idea']): string {
  return `The founder says ${idea.targetUser || 'a buyer'} has ${idea.painfulProblem || 'the stated problem'} and currently relies on ${idea.currentAlternative || 'an unspecified alternative'}.`;
}

function marketStatement(scan: GhostTownEvidenceScanV1): string {
  const market = marketCount(scan);
  const customer = customerConsumptionCount(scan);
  const commercial = commercialConsumptionCount(scan);
  const pricing = pricingCount(scan);
  const premium = premiumCount(scan);
  if (!market && !customer && !commercial) {
    return 'The bounded external scan did not establish useful category evidence. That is an information gap, not proof that the market has no customers or purchases.';
  }
  const parts = [
    market ? `${market} market-existence signal${market === 1 ? '' : 's'}` : '',
    customer ? `${customer} customer-consumption signal${customer === 1 ? '' : 's'} from public rating/review activity` : '',
    commercial ? `${commercial} commercial-consumption signal${commercial === 1 ? '' : 's'}` : '',
    pricing ? `${pricing} observed price point${pricing === 1 ? '' : 's'}` : '',
    premium ? `${premium} premium-price precedent${premium === 1 ? '' : 's'}` : ''
  ].filter(Boolean);
  return `The bounded external scan found ${parts.join(', ')}. That supports category behavior—people use, respond to, and in some cases pay for comparable solutions—without proving this founder's specific positioning or offer will capture those buyers.`;
}

function conclusion(decision: VerdictDecision, scan: GhostTownEvidenceScanV1): string {
  const categoryBehavior = customerConsumptionCount(scan) > 0 || commercialConsumptionCount(scan) > 0;
  const marketPresent = marketCount(scan) > 0;
  if (decision === 'DO_NOT_PURSUE_YET') {
    return categoryBehavior || marketPresent
      ? 'The category shows external activity, but this idea is still too broad or unclear to run a useful direct offer test.'
      : 'The idea is still too broad to run a useful direct offer test, and the bounded external scan did not add useful category evidence.';
  }
  if (decision === 'WORTH_TESTING') {
    return categoryBehavior
      ? 'Comparable customers already consume or buy in this category. The next question is whether this specific positioning and offer can capture them through direct response and purchase.'
      : 'The idea is clear enough to test. The next question is whether this specific offer can produce direct response and purchase.';
  }
  if (decision === 'REVISE_BEFORE_TESTING') {
    return categoryBehavior
      ? 'External customer/commercial behavior supports continued testing, but tighten the positioning or offer before treating category precedent as proof for your version.'
      : 'We found enough market context to keep testing, but the positioning or offer should be made clearer before direct outreach.';
  }
  return categoryBehavior
    ? 'The category has real consumption signals, but proof for this specific offer is still weak. Ask buyers to respond to a concrete offer and then ask for a real commitment.'
    : 'Proof is still weak. Do not assume the category will transfer to this offer; ask specific buyers to respond to a concrete offer and then request a commitment.';
}

export function buildVerdictDecisionV3(inputs: VerdictDecisionV2Inputs & {
  evidenceScan: GhostTownEvidenceScanV1;
}): VerdictDecisionV3 {
  const base = buildVerdictDecisionV2(inputs);
  const decision = evidenceAdjustedDecision(base, inputs.evidenceScan);
  const market = marketCount(inputs.evidenceScan);
  const customer = customerConsumptionCount(inputs.evidenceScan);
  const commercial = commercialConsumptionCount(inputs.evidenceScan);
  const pricing = pricingCount(inputs.evidenceScan);
  const premium = premiumCount(inputs.evidenceScan);
  const bands = inputs.evidenceScan.pricingBands ?? [];
  const directResponse = directSummary('response', inputs.evidenceScan.directEvidence?.response);
  const directPurchase = directSummary('purchase', inputs.evidenceScan.directEvidence?.purchase);

  const marketLayer = observed(
    market,
    `We found ${market} public sign${market === 1 ? '' : 's'} that the market/category exists.`,
    'We did not establish useful public market-existence signals in this bounded scan.'
  );
  const customerLayer = observed(
    customer,
    `We found ${customer} comparable result${customer === 1 ? '' : 's'} with public rating/review activity. That is external customer-consumption evidence, not a claim about your offer.`,
    'No structured public rating/review evidence surfaced in this bounded scan. That absence is not proof that comparable customers do not exist.'
  );
  const commercialLayer = observed(
    commercial,
    `We found ${commercial} comparable commercial-consumption signal${commercial === 1 ? '' : 's'} from rating/review activity and/or transaction/price context. Exact price is not required to establish commercial precedent.`,
    'No strong commercial-consumption metadata surfaced in this bounded scan. Exact price is optional, so missing price data alone is not a negative verdict.'
  );
  const pricingLayer = observed(
    pricing,
    pricing
      ? `Observed pricing landscape: ${pricingBandText(bands) || `${pricing} public price point${pricing === 1 ? '' : 's'}`}. These prices describe the market; they do not set your price.`
      : '',
    'No structured public prices surfaced in this bounded scan. GhostTown does not treat that as proof that buyers will not pay.'
  );
  const premiumLayer = observed(
    premium,
    `We found ${premium} observed price point${premium === 1 ? '' : 's'} materially above its currency's observed median. Premium precedent is a strategic option to study, not an automatic price recommendation.`,
    'No premium-priced outlier was established from the bounded price sample. That does not mean premium positioning is unavailable.'
  );

  const positiveEvidence = [
    market ? `The bounded scan found ${market} useful market-existence signal${market === 1 ? '' : 's'}.` : '',
    customer ? `Public rating/review activity supports external customer consumption for comparable solutions (${customer} signal${customer === 1 ? '' : 's'}).` : '',
    commercial ? `Comparable commercial consumption is visible (${commercial} signal${commercial === 1 ? '' : 's'}), even where exact transaction price is unknown.` : '',
    premium ? `Premium-priced precedent exists in the observed sample (${premium} signal${premium === 1 ? '' : 's'}).` : ''
  ].filter(Boolean);

  return {
    ...base,
    decision,
    schemaVersion: 'ghosttown-verdict-decision-v3',
    evidenceScanFingerprint: inputs.evidenceScan.fingerprint,
    evidenceScanStatus: inputs.evidenceScan.status,
    evidenceModelVersion: 'seven-layer-v1',
    confidence: {
      ...base.confidence,
      rationale: `${base.confidence.rationale} ${customer || commercial
        ? 'External consumption evidence reduces uncertainty about whether the category has real customers or commercial activity, but direct response to this offer is still uncollected.'
        : market
          ? 'Outside market signs help establish the category, but customer/commercial consumption for comparable solutions was not established in this bounded scan.'
          : 'The bounded external scan did not add useful category evidence.'}`
    },
    reasonsFor: [...positiveEvidence, ...base.reasonsFor],
    reasonsAgainst: [
      ...base.reasonsAgainst,
      'External reviews, ratings, purchases, and pricing can establish category precedent, but they do not prove this founder’s specific positioning or offer will convert.',
      'Observed prices are descriptive evidence only; GhostTown does not automatically recommend the lowest, average, median, highest, or premium price.'
    ],
    evidenceLayers: {
      marketExistence: marketLayer,
      customerConsumption: customerLayer,
      commercialConsumption: commercialLayer,
      pricingLandscape: pricingLayer,
      premiumPrecedent: premiumLayer,
      directOfferResponse: directResponse,
      directOfferPurchase: directPurchase
    },
    evidenceTiers: {
      market: marketLayer,
      customer: customerLayer,
      commercial: commercialLayer
    },
    evidenceContrast: {
      founderSays: founderStatement(inputs.idea),
      marketEvidenceSays: marketStatement(inputs.evidenceScan),
      ghostTownConcludes: conclusion(decision, inputs.evidenceScan)
    }
  };
}
