import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const law = readFileSync(new URL('../docs/GHOSTTOWN_CUSTOMER_JOURNEY_LAW_V1.md', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../src/components/LandingCommercial.tsx', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../src/components/ActionPlanModal.tsx', import.meta.url), 'utf8');
const offer = readFileSync(new URL('../src/lib/ghosttownOffer.ts', import.meta.url), 'utf8');

const customerFacingPaidCopy = `${checkout}\n${offer}`;

const bannedPaidCopy = [
  'evidence capture',
  'customer-access',
  'adaptive execution intelligence',
  'grounded research',
  'execution system',
  'deterministic',
  ' RAG ',
];

describe('GhostTown Customer Journey Law', () => {
  it('makes plain language and low mental effort governing customer-facing rules', () => {
    expect(law).toContain('The customer should never have to translate GhostTown.');
    expect(law).toContain('GhostTown may be complex underneath. It must feel simple on top.');
    expect(law).toContain('Target roughly fifth-to-eighth-grade clarity');
    expect(law).toContain('Plain does not mean childish or patronizing. It means low mental effort.');
  });

  it('defines the full journey instead of governing only the landing page', () => {
    for (const stage of [
      'Stage 1 — Arrival',
      'Stage 2 — Idea intake',
      'Stage 3 — Free verdict',
      'Stage 4 — Paid offer',
      'Stage 5 — Checkout',
      'Stage 6 — After payment',
      'Stage 7 — Research and examples',
      'Stage 8 — Blueprint ready',
      'Stage 9 — Daily use',
      'Stage 10 — Reminders',
      'Stage 11 — AI help',
      'Stage 12 — Change the plan',
      'Stage 13 — Finish',
    ]) {
      expect(law).toContain(stage);
    }
  });

  it('preserves the simple acquisition promise', () => {
    expect(landing).toContain('Test your idea first. See if people want it. Then decide if it’s worth building.');
    expect(law).toContain("I have an idea. Let's test it.");
  });

  it('makes the paid offer about help doing the work, not startup jargon', () => {
    expect(checkout).toContain('You tested your idea. Now let’s help you make it real.');
    expect(checkout).toContain('The PDF shows the whole 30-day plan. Your Interactive Blueprint shows what to do today.');
    expect(checkout).toContain('Build My 30-Day Interactive Blueprint — ${ctaPrice}');
    expect(offer).toContain('Open GhostTown each day and see what to do next');
    expect(offer).toContain('Tell GhostTown what happened and get help deciding what to do next');
  });

  it('keeps known internal jargon out of the paid customer copy', () => {
    const lower = customerFacingPaidCopy.toLowerCase();
    for (const phrase of bannedPaidCopy) {
      expect(lower).not.toContain(phrase.toLowerCase());
    }
  });

  it('requires customer journey acceptance in addition to technical green checks', () => {
    expect(law).toContain('A customer-facing change does not pass because TypeScript, Vitest, CI, or screenshots pass.');
    expect(law).toContain('10-second test');
    expect(law).toContain('no-translation test');
    expect(law).toContain('heavy-lifting test');
    expect(law).toContain('continuity test');
  });
});
