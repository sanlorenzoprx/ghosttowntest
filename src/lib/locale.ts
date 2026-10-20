// Every customer-facing UI component supports both languages. Components take
// `locale` and keep their words in a `Record<Locale, …>` so TypeScript fails
// the build when one language is missing. See AGENTS.md.
export type Locale = 'en' | 'es';
export const LOCALES: readonly Locale[] = ['en', 'es'];
