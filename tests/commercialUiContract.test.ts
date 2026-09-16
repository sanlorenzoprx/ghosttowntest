import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

describe('commercial UI acceptance contract', () => {
  const app = readSource('src/app/App.tsx');
  const hero = readSource('src/components/FounderJourneyHero.tsx');
  const landing = readSource('src/components/LandingCommercial.tsx');
  const examples = readSource('src/components/ExampleIdeaGallery.tsx');
  const proof = readSource('src/components/ProofStandard.tsx');
  const dashboard = readSource('src/components/UserDashboard.tsx');
  const prePurchaseResearch = readSource('src/components/PrePurchaseResearchSignals.tsx');
  const checkoutIntake = readSource('src/components/ActionPlanModal.tsx');
  const evidenceScan = readSource('src/api/evidenceScan.ts');
  const competitorSeeds = readSource('src/components/CompetitorSeedStep.tsx');
  const offer = readSource('src/lib/ghosttownOffer.ts');

  it('keeps the founder carousel titles clean and uses the older-woman laptop image', () => {
    for (const title of ['The Idea', 'You Start', 'More Work', 'The Problem', 'The Reality', 'The Cost', 'Clarity']) {
      expect(hero).toContain(`eyebrow: '${title}'`);
    }

    expect(hero).not.toContain('olderCouple');
    expect(hero).not.toContain('Older couple using a laptop together');
    expect(hero).toContain('olderWoman');
    expect(hero).toContain('Older woman working at a laptop at a table');
    expect(hero).not.toMatch(/eyebrow:\s*['"]0\d/);
  });

  it('keeps the verdict action concrete instead of reverting to TEST NOW word salad', () => {
    expect(landing.toUpperCase()).not.toContain('TEST NOW');
    expect(landing).not.toContain('Offer a simple pilot');
    expect(landing).not.toContain('real commitment');
    expect(landing).toContain("Prove they'll pay");
    expect(landing).toContain('Ask likely customers to pay for a simple version before you build more.');

    expect(hero).toContain('NEXT STEP');
    expect(hero).toContain('Ask a few likely customers to buy a simple version before you build it.');
  });

  it('preserves the readability and contrast pass on supporting UI copy', () => {
    expect(examples).not.toContain('text-[0.68rem]');
    expect(examples).toContain('text-lg leading-8 text-[#3F4944]');
    expect(examples).toContain('text-lg font-semibold leading-7 text-[#202825]');

    expect(hero).not.toContain('inline-block text-xs');
    expect(hero).toContain('inline-block text-sm');
    expect(proof).not.toContain('text-xs font-bold uppercase');
    expect(proof).toContain('text-xl leading-9 text-white/88');
    expect(proof).toContain('text-base leading-7 text-white/85');
  });

  it('keeps carousel controls keyboard-visible and avoids hiding the mobile CTA', () => {
    expect(hero).toContain('focus:ring-2 focus:ring-white/45');
    expect(hero).toContain('h-11 w-11');
    expect(landing).toContain('id="ghosttown-commercial-sticky"');
    expect(landing).not.toContain('id="ghosttown-commercial-sticky" aria-hidden="true"');
    expect(landing).not.toContain('tabIndex={-1}');
  });

  it('keeps the site header responsive instead of absolutely overlapping the brand', () => {
    expect(app).toContain('site-header');
    expect(app).toContain('lg:grid-cols-[1fr_auto_1fr]');
    expect(app).toContain('site-nav flex flex-wrap');
    expect(app).not.toContain('site-nav absolute right-4');
  });

  it('refreshes paid Blueprint status while background fulfillment is active', () => {
    expect(dashboard).toContain('plan.status === "researching" || plan.status === "generating"');
    expect(dashboard).toContain('window.setInterval');
    expect(dashboard).toContain('}, 3000);');
    expect(dashboard).toContain('window.clearInterval(timer)');
  });

  it('does the research for the customer before the verdict and keeps the paid value simple', () => {
    expect(prePurchaseResearch).toContain('return null');
    expect(checkoutIntake).toContain('We do the research');
    expect(evidenceScan).toContain('runEvidenceScanV1');
    expect(checkoutIntake).toContain('You do not need to search for competitors or places to find buyers.');
    expect(checkoutIntake).toContain('GhostTown starts that work before your verdict and keeps going during the Sprint.');
    expect(checkoutIntake).not.toContain('Your research map is already attached');
    expect(checkoutIntake).toContain('<details');
    expect(checkoutIntake).toContain('Start My 30-Day Evidence Sprint');
    expect(offer).toContain('Your 30-day plan, one clear next step at a time');
    expect(offer).toContain('Open GhostTown each day and see what to do next');
    expect(offer).toContain('The Sprint does not include a live website, domain, publishing, or payment setup.');
    expect(offer).not.toContain('Get a real launch website built around your idea and offer');
  });

  it('preselects post-purchase market references instead of making the buyer start from zero', () => {
    expect(competitorSeeds).toContain('defaultSuggestionSelection');
    expect(competitorSeeds).toContain('setSelected(defaultSuggestionSelection(loadedSuggestions))');
    expect(competitorSeeds).toContain('setSelected(defaultSuggestionSelection(generatedSuggestions))');
    expect(competitorSeeds).toContain("direct_competitor: 'Same market'");
    expect(competitorSeeds).toContain("adjacent_product: 'Similar or adjacent market'");
    expect(competitorSeeds).toContain('GhostTown already did the first pass.');
    expect(competitorSeeds).toContain('Use These Resources and Build My Blueprint');
  });
});
