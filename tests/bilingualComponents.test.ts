import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Every customer-facing UI component must work in English and Spanish
// (AGENTS.md, "Languages"). A component counts as bilingual when it takes a
// `locale` and keeps its own Spanish words.

// Owner-only consoles that customers never see.
const OWNER_ONLY = new Set(['InternalGoogleSearchConsole.tsx', 'CommercialMetricsConsole.tsx']);

// Components that existed before the rule and do not yet carry their own
// Spanish copy. Some receive Spanish text from their parent. This list may
// only shrink: remove a file when you make it bilingual, and never add one.
const LEGACY_WITHOUT_OWN_SPANISH = new Set([
  'ActionPlanModal.tsx',
  'ActionPlanSuccess.tsx',
  'AgentHandoff.tsx',
  'CompetitorSeedStep.tsx',
  'Contact.tsx',
  'GetMeLiveLanding.tsx',
  'GetMeLiveOpening.tsx',
  'GetMeLiveStudio.tsx',
  'GetMeLiveUpsell.tsx',
  'GetMeLiveWorkspace.tsx',
  'IdeaIntake.tsx',
  'Landing.tsx',
  'LaunchBlueprintView.tsx',
  'LaunchSitePanel.tsx',
  'LoginModal.tsx',
  'PaywallModal.tsx',
  'PrePurchaseResearchSignals.tsx',
  'ProgressBar.tsx',
  'QuestionCard.tsx',
  'VerdictUnlockPage.tsx',
]);

const dir = new URL('../src/components/', import.meta.url);
const components = readdirSync(dir).filter(name => name.endsWith('.tsx'));
const bilingual = (source: string) => /\blocale\b/.test(source) && /\bes\s*:|=== 'es'|=== "es"|\bes \?/.test(source);

describe('bilingual UI components', () => {
  it('requires English and Spanish in every new customer-facing component', () => {
    const missing = components.filter(name =>
      !OWNER_ONLY.has(name) && !LEGACY_WITHOUT_OWN_SPANISH.has(name) && !bilingual(readFileSync(new URL(name, dir), 'utf8'))
    );
    expect(missing, 'Add a locale prop and a Record<Locale, …> copy object (see AGENTS.md)').toEqual([]);
  });

  it('only lets the legacy list shrink', () => {
    const nowBilingual = [...LEGACY_WITHOUT_OWN_SPANISH].filter(name => bilingual(readFileSync(new URL(name, dir), 'utf8')));
    expect(nowBilingual, 'These are bilingual now: remove them from LEGACY_WITHOUT_OWN_SPANISH').toEqual([]);
    expect([...LEGACY_WITHOUT_OWN_SPANISH].filter(name => !components.includes(name))).toEqual([]);
    expect(LEGACY_WITHOUT_OWN_SPANISH.size).toBeLessThanOrEqual(20);
  });
});
