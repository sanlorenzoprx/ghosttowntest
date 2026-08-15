import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import type { GhostTownLaunchBlueprint } from '../src/types/launchBlueprint';

const generatedPlans = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));

vi.mock('../src/api/generativeAIService', () => ({
  generateAIJson: vi.fn(async (_env: unknown, options: Record<string, unknown>) => {
    generatedPlans.calls.push(options);
    return {
      data: {
        businessName: 'Model-invented business name',
        metadataTitle: 'Validated Agency QA',
        metadataDescription: 'A focused release QA offer for small agencies.',
        stylePreset: 'clean_saas',
        sections: [
          { sectionId: 'hero-model', component: 'hero', eyebrow: 'For agencies', heading: '<script>alert(1)</script> Ship with confidence', body: 'Reduce release risk with a focused validation offer.', items: [], primaryCtaLabel: 'Invented CTA', secondaryCtaLabel: '' },
          { sectionId: 'problem-model', component: 'problem', eyebrow: '', heading: 'Release QA is expensive', body: 'Manual release QA delays launches.', items: [], primaryCtaLabel: '', secondaryCtaLabel: '' },
          { sectionId: 'solution-model', component: 'solution', eyebrow: '', heading: 'A better path', body: 'Focused release verification.', items: [], primaryCtaLabel: '', secondaryCtaLabel: '' },
          { sectionId: 'comparison-model', component: 'comparison', eyebrow: '', heading: 'Different by design', body: 'Model-authored comparison.', items: [], primaryCtaLabel: '', secondaryCtaLabel: '' },
          { sectionId: 'pricing-model', component: 'pricing', eyebrow: '', heading: '$9 forever', body: 'Invented pricing.', items: [], primaryCtaLabel: 'Buy', secondaryCtaLabel: '' },
          { sectionId: 'proof-model', component: 'proof', eyebrow: '', heading: '500 happy customers', body: 'Best product in the market.', items: [{ title: 'Customer testimonial', body: 'Amazing.' }], primaryCtaLabel: '', secondaryCtaLabel: '' },
          { sectionId: 'faq-model', component: 'faq', eyebrow: '', heading: 'FAQ', body: '', items: [], primaryCtaLabel: '', secondaryCtaLabel: '' },
          { sectionId: 'contact-model', component: 'lead_capture', eyebrow: '', heading: 'Get started', body: '', items: [], primaryCtaLabel: 'Start', secondaryCtaLabel: '' },
          { sectionId: 'footer-model', component: 'footer', eyebrow: '', heading: 'Footer', body: '', items: [], primaryCtaLabel: '', secondaryCtaLabel: '' }
        ]
      },
      result: {
        text: '{}',
        receipt: {
          provider: 'google_vertex_ai',
          gateway: 'cloudflare_ai_gateway',
          gatewayId: 'default',
          task: 'custom_website',
          model: 'gemini-3.5-flash',
          promptHash: 'prompt-hash',
          responseHash: 'response-hash',
          completedAt: '2026-08-15T23:00:00.000Z'
        }
      }
    };
  })
}));

import { manufactureCustomWebsite } from '../src/api/websiteCreationService';

function blueprint(): GhostTownLaunchBlueprint {
  return {
    schemaVersion: 'ghosttown-launch-blueprint-v2',
    blueprintId: 'bp_website_fixture',
    blueprintVersion: '2.1',
    status: 'ready',
    orderId: 'order_website_fixture',
    ownerId: 'owner@example.com',
    sourceVerdictId: 'verdict_fixture',
    createdAt: '2026-08-15T00:00:00.000Z',
    executiveDecision: {
      originalIdea: 'Agency QA', verdict: 'test first', strongestOpportunity: 'Release confidence', biggestRisk: 'Weak urgency',
      recommendedInitialCustomer: 'Small web agencies', validationObjective: 'Get three paid pilots', founderTimeRiskHours: 20,
      founderCashRiskMaximum: 250, currency: 'USD', continueEvidence: ['paid pilots'], stopEvidence: ['no paid interest']
    },
    offer: {
      offerName: 'Release Confidence Sprint', targetCustomer: 'Small web agencies', painfulProblem: 'Manual QA delays launches',
      desiredOutcome: 'Ship client sites with fewer release defects', oneSentencePromise: 'Catch release blockers before clients do.',
      deliverables: [{ name: 'Release review', description: 'A focused pre-launch review.' }], deliveryMethod: 'Service',
      timeToFirstUsefulResult: '48 hours', buyerResponsibilities: ['Provide staging URL'], exclusions: ['No guarantee of zero defects'],
      initialTestPrice: '$250 pilot', lowerTestBoundary: '$150', upperTestBoundary: '$500', pricingRationale: 'Enough commitment to test willingness to pay.',
      objections: [{ objection: 'We already use checklists', response: 'The pilot tests whether independent release verification adds value.' }],
      riskReversal: 'If the agreed review is not delivered, refund the pilot.', truthLabel: 'Test'
    },
    positioning: {
      firstTargetCustomer: 'Small web agencies', triggerEvents: ['Client launch'], currentAlternatives: ['Internal checklist', 'Manual browser review'],
      alternativeWeaknesses: ['Inconsistent coverage'], buyerLanguage: ['launch confidence'], actionTriggers: ['Upcoming launch'],
      rejectionReasons: ['No budget'], notFor: ['Teams without a staging URL'], positioningStatement: 'Independent release confidence for small agencies.',
      differentiator: 'A narrow release-focused validation service instead of generic QA staffing.'
    },
    customerAccessPack: {
      initialCustomerProfile: 'Small agencies', buyerTriggerEvents: [], searchPhrases: [], channels: [], publicExpertsAndPartners: [], helpfulPosts: [],
      outreachScripts: [], thirtyDayContactSchedule: [], responseTrackingColumns: []
    },
    landingPageCopy: {
      metadataTitle: 'Release Confidence Sprint', metadataDescription: 'Pre-launch QA for small web agencies.', socialDescription: 'Release QA pilot.',
      targetCustomerCallout: 'For small web agencies', headline: 'Catch release blockers before clients do',
      subheadline: 'A focused pre-launch QA sprint for teams that cannot afford avoidable launch-day surprises.', problemSection: 'Manual QA is inconsistent.',
      currentAlternativeSection: 'Most teams rely on internal checklists.', offerDescription: 'A focused release review.', deliverables: ['Release review'],
      howItWorks: [{ step: 'Share staging', description: 'Provide the staging URL.' }, { step: 'We review', description: 'We run the agreed release checks.' }],
      expectedTimeline: 'First useful result within 48 hours.', pricePresentation: '$250 pilot', faq: [{ question: 'Is this a guarantee?', answer: 'No. It is an independent release review.' }],
      proofPlaceholders: ['Three paid pilot customers'], riskReversal: 'Refund if the agreed review is not delivered.',
      primaryCallToAction: 'Request the $250 pilot', secondaryCallToAction: 'Ask a question', thankYouPageCopy: 'Thanks. We will follow up.',
      confirmationEmailSubject: 'Release Confidence Sprint', confirmationEmailBody: 'Thanks for your interest.'
    },
    launchSite: {
      schemaVersion: 'launch-site-config-v1',
      site: { businessName: 'Release Confidence', logoUrl: null, primaryDomain: null, contactEmail: 'hello@example.com', phone: null, location: null },
      offer: { offerName: 'Release Confidence Sprint', targetCustomer: 'Small web agencies', headline: 'Catch release blockers before clients do',
        subheadline: 'Focused pre-launch QA.', primaryOutcome: 'Fewer avoidable launch defects', price: '$250 pilot', priceExplanation: 'Validation price',
        deliveryMethod: 'Service', timeToFirstValue: '48 hours', callToAction: 'Request the $250 pilot', secondaryCallToAction: 'Ask a question' },
      problem: { summary: 'Manual QA delays launches and misses defects.', painPoints: ['Launch-day surprises', 'Inconsistent internal checklists'] },
      solution: { summary: 'Independent pre-launch release review.', deliverables: ['Release review'], exclusions: ['No zero-defect guarantee'] },
      positioning: { currentAlternatives: ['Internal checklist', 'Manual browser review'], differentiator: 'Release-focused independent validation.', idealFor: ['Small agencies'], notFor: ['No staging environment'] },
      proof: { status: 'validation-stage', claimsAllowed: ['The offer is being validated with paid pilots.'], proofPlaceholders: ['Three paid pilot customers'] },
      riskReversal: { type: 'deliverable', text: 'Refund if the agreed review is not delivered.' },
      faq: [{ question: 'Is this a guarantee?', answer: 'No. It is an independent release review.' }],
      leadCapture: { mode: 'email', destination: 'hello@example.com', buttonLabel: 'Request the $250 pilot' },
      legal: { privacyPolicy: true, termsOfService: true, refundPolicy: true, disclaimer: true }
    },
    weeklyMilestones: [], dailyCalendar: [],
    finalDecision: { options: ['continue', 'revise', 'pivot', 'stop'], criteria: [] },
    sources: [],
    qualityGate: { passed: true, failures: [], warnings: [] },
    generationReceipt: { sourceVerdictId: 'verdict_fixture', generatedAt: '2026-08-15T00:00:00.000Z', generatorVersion: 'launch-blueprint-v2.0', researchStatus: 'complete', sourceCount: 0, fallbackStatus: 'ai_enriched' }
  } as GhostTownLaunchBlueprint;
}

function env(): Env {
  return {
    KV: {} as KVNamespace,
    AI: {} as Ai,
    JWT_SECRET: 'fixture',
    STRIPE_SECRET_KEY: 'fixture',
    STRIPE_PRICE_ID: 'fixture',
    STRIPE_WEBHOOK_SECRET: 'fixture'
  };
}

beforeEach(() => {
  generatedPlans.calls.length = 0;
});

describe('WebsiteCreationService', () => {
  it('uses a separate custom_website AI task while deterministic software owns truth-critical content and code', async () => {
    const result = await manufactureCustomWebsite(env(), blueprint(), { primaryActionUrl: 'mailto:hello@example.com' });
    expect(generatedPlans.calls[0]?.task).toBe('custom_website');
    expect(result.spec.businessName).toBe('Release Confidence');
    expect(result.spec.sections.find(section => section.component === 'pricing')?.heading).toBe('$250 pilot');
    expect(JSON.stringify(result.spec.sections.find(section => section.component === 'proof'))).not.toContain('500 happy customers');
    expect(JSON.stringify(result.spec.sections.find(section => section.component === 'proof'))).toContain('Three paid pilot customers');
    const html = result.build.files.find(file => file.path === 'index.html')?.content || '';
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(result.receipt).toMatchObject({
      websiteModel: 'gemini-3.5-flash',
      browserTested: false,
      browserPassed: false,
      deployed: false,
      productionAutoDeploy: false
    });
  });

  it('runs a bounded browser-test repair loop and still does not deploy automatically', async () => {
    let tests = 0;
    const result = await manufactureCustomWebsite(env(), blueprint(), {
      maxRepairAttempts: 2,
      browserTester: {
        test: vi.fn(async () => {
          tests += 1;
          return tests === 1
            ? { passed: false, testedAt: new Date().toISOString(), viewports: ['390x844'], findings: [{ findingId: 'f1', severity: 'high', viewport: '390x844', message: 'Primary CTA wraps badly.' }] }
            : { passed: true, testedAt: new Date().toISOString(), viewports: ['390x844'], findings: [] };
        })
      }
    });
    expect(tests).toBe(2);
    expect(generatedPlans.calls).toHaveLength(2);
    expect(result.receipt.repairCount).toBe(1);
    expect(result.receipt.browserPassed).toBe(true);
    expect(result.receipt.deployed).toBe(false);
  });

  it('requires explicit deployment plus a passing browser test before invoking a DeploymentAdapter', async () => {
    const deploymentAdapter = { deploy: vi.fn(async () => ({ provider: 'fixture', deploymentId: 'dep_1', publicUrl: 'https://example.com', deployedAt: new Date().toISOString(), buildId: 'ignored' })) };
    await expect(manufactureCustomWebsite(env(), blueprint(), {
      allowDeployment: true,
      deploymentAdapter
    })).rejects.toThrow(/passing browser-test/i);
    expect(deploymentAdapter.deploy).not.toHaveBeenCalled();
  });
});
