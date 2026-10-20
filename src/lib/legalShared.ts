import { GHOSTTOWN_FIRST_30_V1, GHOSTTOWN_YEAR_SQUARED_V1 } from './ghosttownOffer';

// Building blocks and money figures shared by the English and Spanish policy
// pages, so both languages always show the same amounts.
// Inline markup: **bold** and [label](href).

export type LegalPageKind = 'privacy' | 'terms' | 'refund' | 'disclaimer';
export type LegalLocale = 'en' | 'es';

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalPageContent {
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}

export const p = (text: string): LegalBlock => ({ kind: 'p', text });
export const list = (...items: string[]): LegalBlock => ({ kind: 'list', items });
export const table = (head: string[], rows: string[][]): LegalBlock => ({ kind: 'table', head, rows });

export const usd = (amount: number) => `$${amount.toLocaleString('en-US')}`;

const year = GHOSTTOWN_YEAR_SQUARED_V1;
const yearPrepayAfterCredit = year.prepayUsd - year.first30CreditUsd;
const yearFirstPaymentAfterCredit = year.installments.eachUsd - year.first30CreditUsd;
const yearPlanAfterCredit = year.installments.count * year.installments.eachUsd - year.first30CreditUsd;

// Tuition-style refunds: inside days 8-21 you owe half of the price of the plan
// you chose, after the First 30 credit, whatever you have paid so far.
export const LEGAL_FIGURES = {
  first30: GHOSTTOWN_FIRST_30_V1,
  year,
  yearPrepayAfterCredit,
  yearFirstPaymentAfterCredit,
  yearPlanAfterCredit,
  yearHalfPrepay: yearPrepayAfterCredit / 2,
  yearHalfPlan: yearPlanAfterCredit / 2,
  yearPlanTopUp: yearPlanAfterCredit / 2 - yearFirstPaymentAfterCredit
} as const;
