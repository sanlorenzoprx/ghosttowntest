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
  const intake = readSource('src/components/IdeaIntake.tsx');
  const resultReport = readSource('src/components/ResultReport.tsx');
  const shareCard = readSource('src/components/ShareCard.tsx');
  const shareCopy = readSource('src/lib/share.ts');
  const paidSuccess = readSource('src/components/ActionPlanSuccess.tsx');
  const blueprintView = readSource('src/components/LaunchBlueprintView.tsx');
  const prePurchaseResearch = readSource('src/components/PrePurchaseResearchSignals.tsx');
  const checkoutIntake = readSource('src/components/ActionPlanModal.tsx');
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

  it('keeps research homework behind purchase and makes the paid value explicit', () => {
    expect(prePurchaseResearch).toContain('return null');
    expect(checkoutIntake).toContain('We do the research');
    expect(checkoutIntake).toContain('You do not need to hunt for competitors, podcasts, communities, or examples before you pay.');
    expect(checkoutIntake).toContain('GhostTown does that work and starts you with useful examples after purchase.');
    expect(checkoutIntake).not.toContain('Your research map is already attached');
    expect(checkoutIntake).toContain('<details');
    expect(checkoutIntake).toContain('Build My 30-Day Interactive Blueprint');
    expect(offer).toContain('Your 30-day plan, one clear next step at a time');
    expect(offer).toContain('Open GhostTown each day and see what to do next');
  });

  it('keeps the product story stable while the current price stays at the buying decision', () => {
    expect(landing).toContain('What do I get with the 30-day plan?');
    expect(landing).not.toContain('What do I get for $97?');
    expect(landing).not.toContain('The $97 plan comes later');
    expect(landing).toContain('displayPrice');
    expect(checkoutIntake).toContain('displayPrice');
  });

  it('uses test, verdict, and next-action language through the customer journey', () => {
    expect(intake).toContain('Start My Free Test · About 5 Minutes');
    expect(intake).not.toContain('Start Assessment · About 5 Minutes');
    expect(resultReport).toContain('Your verdict');
    expect(resultReport).toContain('Best next test');
    expect(dashboard).toContain('Previous Tests');
    expect(dashboard).toContain('Test Another Idea');
    expect(shareCard).toContain('Share My Verdict & Unlock 1 Free Test');
  });

  it('keeps post-payment work in customer language instead of implementation language', () => {
    expect(paidSuccess).toContain('Building your 30-day plan...');
    expect(paidSuccess).toContain('Open My Interactive Blueprint');
    expect(paidSuccess).not.toContain('Media & Distribution Network');
    expect(paidSuccess).not.toContain('Open executable Blueprint in Dashboard');

    expect(blueprintView).toContain('Where to find likely customers');
    expect(blueprintView).toContain('Review these opportunities');
    expect(blueprintView).not.toContain('Media & Distribution Network');
    expect(blueprintView).not.toContain('research.model');
    expect(blueprintView).not.toContain('owner-only Google research console');
  });

  it('makes shared verdicts carry the GhostTown promise rather than internal scores', () => {
    expect(shareCopy).toContain('I tested a business idea with GhostTown before building it.');
    expect(shareCopy).toContain('#GhostTownTest');
    expect(shareCopy).not.toContain('**Ghost Town Risk:**');
    expect(shareCopy).not.toContain('**LIT Score:**');
    expect(shareCopy).not.toContain('**Business DNA:**');
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
