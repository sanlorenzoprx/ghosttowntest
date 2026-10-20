import type { Locale } from './locale';

// A Sprint has two languages. The founder reads the plan in one; the buyers
// read the founder's posts, messages and pages in the other. A founder in San
// Juan may read in Spanish and sell to English-speaking buyers, or the
// reverse. Content is written in the right language from the start, never
// translated afterwards. See AGENTS.md, "Languages".

export interface BlueprintLanguages {
  founder: Locale;
  buyer: Locale;
}

const NAMES: Record<Locale, string> = { en: 'English', es: 'Spanish (Puerto Rico–friendly, informal tú)' };

const pick = (value: unknown): Locale => (value === 'es' ? 'es' : 'en');

export function blueprintLanguages(intake: { founderLanguage?: unknown; buyerLanguage?: unknown } | undefined): BlueprintLanguages {
  return { founder: pick(intake?.founderLanguage), buyer: pick(intake?.buyerLanguage) };
}

export function blueprintLanguageInstruction(languages: BlueprintLanguages): string {
  return [
    `Write everything the founder reads (decisions, daily actions, why it matters, guidance, checkpoints, fulfillment notes) in ${NAMES[languages.founder]}.`,
    `Write everything the founder sends or publishes to buyers (posts, outreach messages, interview and offer questions, landing-page copy, emails) in ${NAMES[languages.buyer]}, written natively for that audience, not translated.`,
    'Keep product names, prices, dates, counts, URLs and IDs exactly as given. Customer quotes stay in their original words.'
  ].join(' ');
}

export function blueprintLanguageStatement(languages: BlueprintLanguages, supplied: boolean): string {
  const name = (locale: Locale) => (locale === 'es' ? 'Spanish' : 'English');
  return supplied
    ? `The founder reads the plan in ${name(languages.founder)}. Messages, posts and pages for buyers are written in ${name(languages.buyer)}.`
    : 'Language constraints were not supplied; current customer artifacts are generated in English.';
}
