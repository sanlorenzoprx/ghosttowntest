import type { Env } from './env';
import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';
import type {
  CustomWebsiteSpec,
  WebsiteBrowserTestResult,
  WebsiteCreationResult,
  WebsiteDeploymentReceipt,
  WebsiteSectionSpec,
  WebsiteStylePreset
} from '../types/customWebsite';
import {
  generateAIJson,
  type GenerativeAIReceipt,
  type GenerativeAIResponseSchema
} from './generativeAIService';
import { buildCustomWebsite } from './websiteBuildRunner';
import { assertWebsiteComponentContract, websiteComponentIds } from './websiteComponentRegistry';

export interface WebsiteBrowserTester {
  test(input: { spec: CustomWebsiteSpec; build: Awaited<ReturnType<typeof buildCustomWebsite>> }): Promise<WebsiteBrowserTestResult>;
}

export interface WebsiteDeploymentAdapter {
  deploy(input: { spec: CustomWebsiteSpec; build: Awaited<ReturnType<typeof buildCustomWebsite>>; sourceBlueprintId: string }): Promise<WebsiteDeploymentReceipt>;
}

export interface ManufactureWebsiteOptions {
  browserTester?: WebsiteBrowserTester;
  deploymentAdapter?: WebsiteDeploymentAdapter;
  allowDeployment?: boolean;
  maxRepairAttempts?: number;
  primaryActionUrl?: string;
  secondaryActionUrl?: string;
}

interface GeneratedWebsitePlan {
  businessName: string;
  metadataTitle: string;
  metadataDescription: string;
  stylePreset: WebsiteStylePreset;
  sections: WebsiteSectionSpec[];
}

const STYLE_PRESETS: WebsiteStylePreset[] = [
  'warm_editorial',
  'clean_saas',
  'local_trust',
  'premium_service',
  'bold_validation'
];

const COMPONENT_ORDER = [
  'hero',
  'problem',
  'solution',
  'how_it_works',
  'comparison',
  'pricing',
  'proof',
  'faq',
  'lead_capture',
  'footer'
] as const;

const REQUIRED_COMPONENTS = new Set(['hero', 'problem', 'solution', 'pricing', 'proof', 'faq', 'lead_capture', 'footer']);

const ITEM_SCHEMA: GenerativeAIResponseSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    body: { type: 'STRING' }
  },
  required: ['title', 'body']
};

const SECTION_SCHEMA: GenerativeAIResponseSchema = {
  type: 'OBJECT',
  properties: {
    sectionId: { type: 'STRING' },
    component: { type: 'STRING', enum: websiteComponentIds() },
    eyebrow: { type: 'STRING' },
    heading: { type: 'STRING' },
    body: { type: 'STRING' },
    items: { type: 'ARRAY', items: ITEM_SCHEMA, maxItems: 12 },
    primaryCtaLabel: { type: 'STRING' },
    secondaryCtaLabel: { type: 'STRING' }
  },
  required: ['sectionId', 'component', 'eyebrow', 'heading', 'body', 'items', 'primaryCtaLabel', 'secondaryCtaLabel']
};

const WEBSITE_SCHEMA: GenerativeAIResponseSchema = {
  type: 'OBJECT',
  properties: {
    businessName: { type: 'STRING' },
    metadataTitle: { type: 'STRING' },
    metadataDescription: { type: 'STRING' },
    stylePreset: { type: 'STRING', enum: STYLE_PRESETS },
    sections: { type: 'ARRAY', items: SECTION_SCHEMA, minItems: 6, maxItems: 10 }
  },
  required: ['businessName', 'metadataTitle', 'metadataDescription', 'stylePreset', 'sections']
};

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim() : fallback;
}

function items(values: Array<{ title: string; body: string }>): WebsiteSectionSpec['items'] {
  return values.map(item => ({ title: text(item.title), body: text(item.body) })).filter(item => item.title || item.body);
}

function section(
  component: WebsiteSectionSpec['component'],
  values: Partial<WebsiteSectionSpec>
): WebsiteSectionSpec {
  return {
    sectionId: values.sectionId || component.replace(/_/g, '-'),
    component,
    eyebrow: text(values.eyebrow),
    heading: text(values.heading),
    body: text(values.body),
    items: Array.isArray(values.items) ? items(values.items) : [],
    primaryCtaLabel: text(values.primaryCtaLabel),
    secondaryCtaLabel: text(values.secondaryCtaLabel)
  };
}

export function websiteCreationFailures(blueprint: GhostTownLaunchBlueprint): string[] {
  const failures: string[] = [];
  if (blueprint.status !== 'ready') failures.push('The source Blueprint is not ready.');
  if (!blueprint.qualityGate.passed) failures.push('The source Blueprint quality gate has not passed.');
  if (blueprint.launchSite.proof.status !== 'validation-stage') failures.push('Proof status must remain validation-stage.');
  if (!blueprint.offer.initialTestPrice.trim()) failures.push('The source Blueprint has no approved test price.');
  if (!blueprint.launchSite.site.businessName.trim()) failures.push('The source Blueprint has no business name.');
  if (!blueprint.launchSite.site.contactEmail.trim()) failures.push('The source Blueprint has no contact email.');
  return failures;
}

function sourceContext(blueprint: GhostTownLaunchBlueprint): Record<string, unknown> {
  return {
    blueprintId: blueprint.blueprintId,
    businessName: blueprint.launchSite.site.businessName,
    executiveDecision: {
      recommendedInitialCustomer: blueprint.executiveDecision.recommendedInitialCustomer,
      validationObjective: blueprint.executiveDecision.validationObjective,
      biggestRisk: blueprint.executiveDecision.biggestRisk
    },
    offer: {
      offerName: blueprint.offer.offerName,
      targetCustomer: blueprint.offer.targetCustomer,
      painfulProblem: blueprint.offer.painfulProblem,
      desiredOutcome: blueprint.offer.desiredOutcome,
      oneSentencePromise: blueprint.offer.oneSentencePromise,
      deliverables: blueprint.offer.deliverables,
      exclusions: blueprint.offer.exclusions,
      initialTestPrice: blueprint.offer.initialTestPrice,
      riskReversal: blueprint.offer.riskReversal,
      objections: blueprint.offer.objections
    },
    positioning: {
      positioningStatement: blueprint.positioning.positioningStatement,
      differentiator: blueprint.positioning.differentiator,
      currentAlternatives: blueprint.positioning.currentAlternatives,
      notFor: blueprint.positioning.notFor
    },
    landingPageCopy: blueprint.landingPageCopy,
    launchSite: blueprint.launchSite
  };
}

function generatedByComponent(plan: GeneratedWebsitePlan): Map<WebsiteSectionSpec['component'], WebsiteSectionSpec> {
  const map = new Map<WebsiteSectionSpec['component'], WebsiteSectionSpec>();
  for (const candidate of plan.sections || []) {
    if (!websiteComponentIds().includes(candidate.component) || map.has(candidate.component)) continue;
    map.set(candidate.component, section(candidate.component, candidate));
  }
  return map;
}

function canonicalSection(
  component: WebsiteSectionSpec['component'],
  generated: WebsiteSectionSpec | undefined,
  blueprint: GhostTownLaunchBlueprint
): WebsiteSectionSpec {
  const launch = blueprint.launchSite;
  const page = blueprint.landingPageCopy;
  const offer = blueprint.offer;
  const positioning = blueprint.positioning;
  const base = generated || section(component, {});

  if (component === 'hero') return section(component, {
    ...base,
    sectionId: 'hero',
    eyebrow: base.eyebrow || page.targetCustomerCallout,
    heading: base.heading || page.headline || launch.offer.headline,
    body: base.body || page.subheadline || launch.offer.subheadline,
    items: [],
    primaryCtaLabel: launch.offer.callToAction,
    secondaryCtaLabel: launch.offer.secondaryCallToAction
  });
  if (component === 'problem') return section(component, {
    ...base,
    sectionId: 'problem',
    eyebrow: 'The problem',
    heading: base.heading || 'Why the current approach is not enough',
    body: base.body || launch.problem.summary || page.problemSection,
    items: launch.problem.painPoints.map(value => ({ title: value, body: '' })),
    primaryCtaLabel: '', secondaryCtaLabel: ''
  });
  if (component === 'solution') return section(component, {
    ...base,
    sectionId: 'solution',
    eyebrow: 'The offer',
    heading: base.heading || offer.offerName,
    body: base.body || launch.solution.summary || page.offerDescription,
    items: offer.deliverables.map(value => ({ title: value.name, body: value.description })),
    primaryCtaLabel: '', secondaryCtaLabel: ''
  });
  if (component === 'how_it_works') return section(component, {
    ...base,
    sectionId: 'how-it-works',
    eyebrow: 'How it works',
    heading: base.heading || 'A simple path to the first useful result',
    body: base.body || page.expectedTimeline,
    items: page.howItWorks.map(value => ({ title: value.step, body: value.description })),
    primaryCtaLabel: '', secondaryCtaLabel: ''
  });
  if (component === 'comparison') return section(component, {
    ...base,
    sectionId: 'comparison',
    eyebrow: 'Why this approach',
    heading: base.heading || 'Built around the validated wedge',
    body: positioning.differentiator,
    items: positioning.currentAlternatives.map(value => ({ title: value, body: 'Current alternative identified in the validated Launch Blueprint.' })),
    primaryCtaLabel: '', secondaryCtaLabel: ''
  });
  if (component === 'pricing') return section(component, {
    ...base,
    sectionId: 'pricing',
    eyebrow: 'Validation offer',
    heading: offer.initialTestPrice,
    body: offer.pricingRationale,
    items: [
      { title: 'What is included', body: offer.deliverables.map(value => value.name).join(' · ') },
      { title: 'Risk reversal', body: offer.riskReversal }
    ],
    primaryCtaLabel: launch.offer.callToAction,
    secondaryCtaLabel: ''
  });
  if (component === 'proof') return section(component, {
    ...base,
    sectionId: 'proof',
    eyebrow: 'Validation-stage proof',
    heading: 'What is proven — and what is not yet proven',
    body: 'This business is in validation. The site must not present placeholders, projections, or model output as customer proof.',
    items: [
      ...launch.proof.claimsAllowed.map(value => ({ title: 'Allowed claim', body: value })),
      ...launch.proof.proofPlaceholders.map(value => ({ title: 'Proof to earn', body: value }))
    ],
    primaryCtaLabel: '', secondaryCtaLabel: ''
  });
  if (component === 'faq') return section(component, {
    ...base,
    sectionId: 'faq',
    eyebrow: 'Questions',
    heading: base.heading || 'Before you decide',
    body: '',
    items: launch.faq.map(value => ({ title: value.question, body: value.answer })),
    primaryCtaLabel: '', secondaryCtaLabel: ''
  });
  if (component === 'lead_capture') return section(component, {
    ...base,
    sectionId: 'contact',
    eyebrow: 'Next step',
    heading: base.heading || launch.offer.callToAction,
    body: base.body || `Contact ${launch.site.businessName} to discuss the validation offer.`,
    items: [],
    primaryCtaLabel: launch.offer.callToAction,
    secondaryCtaLabel: launch.offer.secondaryCallToAction
  });
  return section('footer', {
    ...base,
    sectionId: 'footer',
    eyebrow: launch.site.businessName,
    heading: launch.site.businessName,
    body: `${launch.site.contactEmail} · Validation-stage business. Claims and proof remain subject to the approved Launch Blueprint.`,
    items: [
      { title: 'Privacy', body: launch.legal.privacyPolicy ? 'Privacy policy required.' : 'Privacy policy not enabled.' },
      { title: 'Terms', body: launch.legal.termsOfService ? 'Terms of service required.' : 'Terms of service not enabled.' },
      { title: 'Disclaimer', body: launch.legal.disclaimer ? 'Validation disclaimer required.' : 'Validation disclaimer not enabled.' }
    ],
    primaryCtaLabel: '', secondaryCtaLabel: ''
  });
}

function normalizeGeneratedPlan(plan: GeneratedWebsitePlan, blueprint: GhostTownLaunchBlueprint): CustomWebsiteSpec {
  const selected = generatedByComponent(plan);
  const components = COMPONENT_ORDER.filter(component => REQUIRED_COMPONENTS.has(component) || selected.has(component));
  const spec: CustomWebsiteSpec = {
    schemaVersion: 'custom-website-spec-v1',
    businessName: blueprint.launchSite.site.businessName,
    metadataTitle: text(plan.metadataTitle, blueprint.landingPageCopy.metadataTitle),
    metadataDescription: text(plan.metadataDescription, blueprint.landingPageCopy.metadataDescription),
    stylePreset: STYLE_PRESETS.includes(plan.stylePreset) ? plan.stylePreset : 'clean_saas',
    sections: components.map(component => canonicalSection(component, selected.get(component), blueprint))
  };
  assertWebsiteComponentContract(spec);
  return spec;
}

function promptForBlueprint(blueprint: GhostTownLaunchBlueprint): string {
  return [
    'Create a custom launch-ready website specification from the supplied validated GhostTown Launch Blueprint.',
    'This is NOT the $97 Blueprint generation task. The Blueprint is immutable source strategy for a separate website-manufacturing upsell.',
    `Use only these registered components: ${websiteComponentIds().join(', ')}.`,
    `Use only these style presets: ${STYLE_PRESETS.join(', ')}.`,
    'Do not generate HTML, CSS, JavaScript, framework code, testimonials, customer counts, guarantees, awards, market statistics, or new pricing.',
    'Do not invent proof. Proof remains validation-stage and is deterministically replaced from the approved Blueprint after generation.',
    'The model may choose optional components, adapt low-risk sales copy, and choose visual direction. Deterministic software owns final pricing, proof, CTA labels, legal disclosure, build, testing, deployment, and release.',
    'Return the requested JSON schema only.',
    'SOURCE BLUEPRINT CONTEXT:',
    JSON.stringify(sourceContext(blueprint))
  ].join('\n');
}

async function generateWebsitePlan(env: Env, blueprint: GhostTownLaunchBlueprint, repairContext?: string): Promise<{ spec: CustomWebsiteSpec; receipt: GenerativeAIReceipt }> {
  const prompt = repairContext
    ? `${promptForBlueprint(blueprint)}\n\nREPAIR CONTEXT:\n${repairContext}`
    : promptForBlueprint(blueprint);
  const { data, result } = await generateAIJson<GeneratedWebsitePlan>(env, {
    task: 'custom_website',
    prompt,
    systemInstruction: 'You create structured website specifications from validated business evidence. Never invent proof, pricing, or business facts. Never return executable code.',
    responseSchema: WEBSITE_SCHEMA,
    temperature: repairContext ? 0.15 : 0.35,
    maxOutputTokens: 6000,
    timeoutMs: 45_000
  });
  return { spec: normalizeGeneratedPlan(data, blueprint), receipt: result.receipt };
}

function blockingFindings(result: WebsiteBrowserTestResult): boolean {
  return result.findings.some(finding => finding.severity === 'blocker' || finding.severity === 'high');
}

function repairContext(spec: CustomWebsiteSpec, browser: WebsiteBrowserTestResult): string {
  return JSON.stringify({
    instruction: 'Repair only the website specification. Keep all source facts, proof restrictions, pricing, and registered-component constraints unchanged.',
    currentSpec: spec,
    browserFindings: browser.findings
  });
}

export async function manufactureCustomWebsite(
  env: Env,
  blueprint: GhostTownLaunchBlueprint,
  options: ManufactureWebsiteOptions = {}
): Promise<WebsiteCreationResult> {
  const failures = websiteCreationFailures(blueprint);
  if (failures.length) throw new Error(`Custom website source contract failed: ${failures.join(' ')}`);

  const first = await generateWebsitePlan(env, blueprint);
  let spec = first.spec;
  let build = await buildCustomWebsite(spec, options);
  let browserTest: WebsiteBrowserTestResult | undefined;
  let repairCount = 0;
  const maxRepairAttempts = Math.max(0, Math.min(3, options.maxRepairAttempts ?? 2));

  if (options.browserTester) {
    browserTest = await options.browserTester.test({ spec, build });
    while (!browserTest.passed && blockingFindings(browserTest) && repairCount < maxRepairAttempts) {
      const repaired = await generateWebsitePlan(env, blueprint, repairContext(spec, browserTest));
      spec = repaired.spec;
      build = await buildCustomWebsite(spec, options);
      repairCount += 1;
      browserTest = await options.browserTester.test({ spec, build });
    }
  }

  let deployment: WebsiteDeploymentReceipt | undefined;
  if (options.allowDeployment) {
    if (!options.deploymentAdapter) throw new Error('Website deployment was explicitly requested but no DeploymentAdapter was supplied.');
    if (!browserTest?.passed) throw new Error('Website deployment requires a passing browser-test result.');
    deployment = await options.deploymentAdapter.deploy({ spec, build, sourceBlueprintId: blueprint.blueprintId });
  }

  return {
    spec,
    build,
    browserTest,
    deployment,
    receipt: {
      schemaVersion: 'custom-website-creation-receipt-v1',
      sourceBlueprintId: blueprint.blueprintId,
      sourceOrderId: blueprint.orderId,
      generatedAt: new Date().toISOString(),
      websiteModel: first.receipt.model,
      generationResponseHash: first.receipt.responseHash,
      buildId: build.buildId,
      repairCount,
      browserTested: Boolean(browserTest),
      browserPassed: browserTest?.passed === true,
      deployed: Boolean(deployment),
      productionAutoDeploy: false
    }
  };
}
