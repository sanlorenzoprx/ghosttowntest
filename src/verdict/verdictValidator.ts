import {
  RICH_VERDICT_FIELDS,
  RISK_LEVELS,
  SIGNAL_STRENGTHS,
  type RichVerdict
} from './verdictSchema';

export interface RichVerdictValidation {
  valid: boolean;
  errors: string[];
  value?: RichVerdict;
}

const TEXT_FIELDS = [
  'verdict_headline', 'top_reason', 'unfair_advantage_check',
  'business_model_weakness', 'why_it_might_work', 'why_it_might_fail',
  'killer_question', 'mvp_test', 'next_step'
] as const;

const GENERIC_ADVICE = [
  'do more research', 'talk to users', 'build an mvp', 'use social media',
  'market it better'
];

const FAKE_CERTAINTY = [
  'this will definitely work', 'guaranteed success', '100% chance',
  'risk-free', 'everyone needs this'
];

const UNSUPPORTED_MARKET_CLAIMS = [
  /\bmarket (?:is|will be) (?:worth|growing)\b/i,
  /\b(?:cagr|market size|industry data|research shows|studies show|according to)\b/i,
  /\$\s*\d+(?:\.\d+)?\s*(?:million|billion|trillion)\b/i,
  /\b\d+(?:\.\d+)?%\s+(?:of|growth|increase|decrease)\b/i
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredText(record: Record<string, unknown>, field: typeof TEXT_FIELDS[number], errors: string[]): string {
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length < 10) {
    errors.push(`${field} must be specific non-empty text`);
    return '';
  }
  return value.trim();
}

export function validateRichVerdict(value: unknown): RichVerdictValidation {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['verdict must be an object'] };

  const allowed = new Set<string>(RICH_VERDICT_FIELDS);
  const extras = Object.keys(value).filter(key => !allowed.has(key));
  if (extras.length) errors.push(`unsupported fields: ${extras.sort().join(', ')}`);
  for (const field of RICH_VERDICT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) errors.push(`missing required field: ${field}`);
  }

  const texts = TEXT_FIELDS.map(field => requiredText(value, field, errors));
  if (!Number.isInteger(value.lit_score) || Number(value.lit_score) < 0 || Number(value.lit_score) > 100) {
    errors.push('lit_score must be an integer from 0 to 100');
  }
  if (!RISK_LEVELS.has(value.risk_level as never)) errors.push('risk_level must be low, medium, or high');
  if (!RISK_LEVELS.has(value.ghost_town_risk as never)) errors.push('ghost_town_risk must be low, medium, or high');
  if (!RISK_LEVELS.has(value.distribution_difficulty as never)) errors.push('distribution_difficulty must be low, medium, or high');
  if (!SIGNAL_STRENGTHS.has(value.buyer_pain_clarity as never)) errors.push('buyer_pain_clarity must be weak, medium, or strong');
  if (!SIGNAL_STRENGTHS.has(value.willingness_to_pay_signal as never)) errors.push('willingness_to_pay_signal must be weak, medium, or strong');
  if (!Array.isArray(value.warnings) || value.warnings.some(item => typeof item !== 'string')) {
    errors.push('warnings must be an array of strings');
  }
  if (value.source !== 'lit_api') errors.push('source must be lit_api');

  if (!isRecord(value.provenance)) {
    errors.push('provenance must be an object');
  } else {
    const provenanceKeys = new Set(['source', 'provider', 'model', 'generated_at', 'validated']);
    const extraProvenance = Object.keys(value.provenance).filter(key => !provenanceKeys.has(key));
    if (extraProvenance.length) errors.push(`unsupported provenance fields: ${extraProvenance.sort().join(', ')}`);
    if (value.provenance.source !== 'ai_verdict_engine') errors.push('provenance.source must be ai_verdict_engine');
    for (const field of ['provider', 'model', 'generated_at'] as const) {
      if (typeof value.provenance[field] !== 'string' || !value.provenance[field].trim()) {
        errors.push(`provenance.${field} must be non-empty text`);
      }
    }
    if (typeof value.provenance.generated_at === 'string' && Number.isNaN(Date.parse(value.provenance.generated_at))) {
      errors.push('provenance.generated_at must be ISO-8601');
    }
    if (value.provenance.validated !== true) errors.push('provenance.validated must be true');
  }

  const combined = texts.join(' ').toLowerCase();
  if (GENERIC_ADVICE.some(phrase => combined.includes(phrase))) errors.push('verdict contains generic advice');
  if (FAKE_CERTAINTY.some(phrase => combined.includes(phrase))) errors.push('verdict contains unsupported certainty');
  if (UNSUPPORTED_MARKET_CLAIMS.some(pattern => pattern.test(combined))) errors.push('verdict contains an unsupported market claim');
  if (typeof value.killer_question === 'string' && !value.killer_question.trim().endsWith('?')) {
    errors.push('killer_question must be a question');
  }

  return errors.length === 0
    ? { valid: true, errors: [], value: value as unknown as RichVerdict }
    : { valid: false, errors };
}
