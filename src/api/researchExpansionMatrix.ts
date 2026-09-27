import type { PaidTestOrder } from '../types/paidTest';

export type ResearchExpansionIntentKind =
  | 'buyer_problem'
  | 'problem_discussion'
  | 'buyer_community'
  | 'current_alternative'
  | 'competitor_complaint'
  | 'competitor_alternative'
  | 'buyer_association'
  | 'buyer_event'
  | 'review_language';

export interface ResearchExpansionIntent {
  intentId: string;
  kind: ResearchExpansionIntentKind;
  query: string;
  evidenceGoal: 'customer_access' | 'market_evidence';
  derivedFrom: string[];
}

const STOPWORDS = new Set([
  'the','and','for','with','that','this','from','into','their','they','them','who','when','where',
  'what','why','how','are','was','were','has','have','had','need','needs','using','use','used',
  'about','through','while','your','you','our','not','but','too','very','more','most','some'
]);

function terms(value: string, limit = 10): string[] {
  const normalized = String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9+.-]*/g) || [];
  const out: string[] = [];
  for (const token of normalized) {
    if (STOPWORDS.has(token) || !/[a-z]/.test(token)) continue;
    if (!out.includes(token)) out.push(token);
    if (out.length >= limit) break;
  }
  return out;
}

function query(parts: string[], suffix: string, maxTerms = 12): string {
  const tokens: string[] = [];
  for (const part of parts) {
    for (const token of terms(part, maxTerms)) {
      if (!tokens.includes(token)) tokens.push(token);
      if (tokens.length >= maxTerms) break;
    }
    if (tokens.length >= maxTerms) break;
  }
  return [...tokens, ...terms(suffix, 4)].join(' ').trim();
}

function pushUnique(intents: ResearchExpansionIntent[], seen: Set<string>, item: ResearchExpansionIntent): void {
  const key = item.query.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!key || seen.has(key) || intents.length >= 15) return;
  seen.add(key);
  intents.push(item);
}

export function buildResearchExpansionMatrix(order: PaidTestOrder, reviewLanguage: string[] = []): ResearchExpansionIntent[] {
  const buyer = order.intake.targetBuyer || '';
  const problem = order.intake.problem || '';
  const workaround = order.intake.currentWorkaround || '';
  const geography = order.intake.geography || 'global';
  const seeds = (order.intake.competitorSeeds || []).slice(0, 3);
  const intents: ResearchExpansionIntent[] = [];
  const seen = new Set<string>();

  pushUnique(intents, seen, { intentId: 'buyer-problem', kind: 'buyer_problem', query: query([buyer, problem, geography], 'discussion'), evidenceGoal: 'customer_access', derivedFrom: ['targetBuyer', 'problem', 'geography'] });
  pushUnique(intents, seen, { intentId: 'problem-forum', kind: 'problem_discussion', query: query([problem, geography], 'forum discussion'), evidenceGoal: 'customer_access', derivedFrom: ['problem', 'geography'] });
  pushUnique(intents, seen, { intentId: 'buyer-community', kind: 'buyer_community', query: query([buyer, geography], 'community'), evidenceGoal: 'customer_access', derivedFrom: ['targetBuyer', 'geography'] });
  pushUnique(intents, seen, { intentId: 'current-alternative', kind: 'current_alternative', query: query([buyer, workaround, problem], 'alternative discussion'), evidenceGoal: 'market_evidence', derivedFrom: ['targetBuyer', 'currentWorkaround', 'problem'] });
  pushUnique(intents, seen, { intentId: 'buyer-association', kind: 'buyer_association', query: query([buyer, geography], 'association'), evidenceGoal: 'customer_access', derivedFrom: ['targetBuyer', 'geography'] });
  pushUnique(intents, seen, { intentId: 'buyer-event', kind: 'buyer_event', query: query([buyer, problem, geography], 'event meetup'), evidenceGoal: 'customer_access', derivedFrom: ['targetBuyer', 'problem', 'geography'] });

  seeds.forEach((seed, index) => {
    pushUnique(intents, seen, { intentId: `competitor-${index + 1}-complaint`, kind: 'competitor_complaint', query: query([seed.name, problem], 'complaint discussion'), evidenceGoal: 'market_evidence', derivedFrom: [`competitorSeed:${seed.seedId}`, 'problem'] });
    pushUnique(intents, seen, { intentId: `competitor-${index + 1}-alternative`, kind: 'competitor_alternative', query: query([seed.name, problem], 'alternative discussion'), evidenceGoal: 'market_evidence', derivedFrom: [`competitorSeed:${seed.seedId}`, 'problem'] });
  });

  [...new Set(reviewLanguage.map(value => String(value || '').trim()).filter(Boolean))]
    .slice(0, 4)
    .forEach((phrase, index) => {
      pushUnique(intents, seen, { intentId: `review-language-${index + 1}`, kind: 'review_language', query: query([phrase, buyer], 'community discussion'), evidenceGoal: 'customer_access', derivedFrom: [`reviewLanguage:${index + 1}`, 'targetBuyer'] });
    });

  const fallback: Array<[ResearchExpansionIntentKind, string, string, ResearchExpansionIntent['evidenceGoal'], string[]]> = [
    ['problem_discussion', 'problem-help', query([problem, buyer], 'help discussion'), 'customer_access', ['problem', 'targetBuyer']],
    ['buyer_community', 'buyer-question', query([buyer, problem], 'questions answers'), 'customer_access', ['targetBuyer', 'problem']],
    ['current_alternative', 'workaround-review', query([workaround, problem], 'review comparison'), 'market_evidence', ['currentWorkaround', 'problem']]
  ];
  for (const [kind, intentId, q, evidenceGoal, derivedFrom] of fallback) {
    if (intents.length >= 8) break;
    pushUnique(intents, seen, { intentId, kind, query: q, evidenceGoal, derivedFrom });
  }

  return intents.slice(0, 15);
}
