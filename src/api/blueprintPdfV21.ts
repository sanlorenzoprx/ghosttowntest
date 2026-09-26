import type { GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';
import { composeBlueprintDocumentModel, validateBlueprintDocumentAgainstCanonical, type BlueprintDocumentModel } from './blueprintDocumentModel';
import { renderBlueprintDocumentHtml, renderWithBrowserPdfOrFallback, type BrowserPdfRenderer } from './blueprintDocumentHtml';
import { directCustomerAccessChannels, researchEvidenceRole, RESEARCH_EVIDENCE_ROLE_LABELS } from './researchEvidenceRole';

const WIDTH = 612;
const HEIGHT = 792;
const MARGIN = 46;
const BODY_WIDTH = WIDTH - MARGIN * 2;
const COLORS = {
  ink: [0.08, 0.1, 0.14] as const,
  rust: [0.63, 0.2, 0.06] as const,
  gold: [0.88, 0.62, 0.2] as const,
  paper: [0.98, 0.97, 0.94] as const,
  muted: [0.37, 0.4, 0.45] as const,
  line: [0.84, 0.82, 0.77] as const,
  white: [1, 1, 1] as const,
  green: [0.08, 0.43, 0.28] as const,
  red: [0.65, 0.14, 0.12] as const
};

type Color = readonly [number, number, number];
type Font = 'F1' | 'F2' | 'F3';

interface Page {
  commands: string[];
  section: string;
  number: number;
}

function normalize(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '-')
    .replace(/[^\x20-\x7e\n]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function escape(value: string): string {
  return normalize(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function rgb(color: Color): string {
  return `${color[0]} ${color[1]} ${color[2]}`;
}

function wrap(value: string, width: number, size: number): string[] {
  const max = Math.max(12, Math.floor(width / (size * 0.52)));
  const output: string[] = [];
  for (const paragraph of normalize(value).split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      if (word.length > max) {
        if (line) output.push(line);
        for (let index = 0; index < word.length; index += max) {
          output.push(word.slice(index, index + max));
        }
        line = '';
      } else if (line && `${line} ${word}`.length > max) {
        output.push(line);
        line = word;
      } else {
        line = `${line} ${word}`.trim();
      }
    }
    if (line) output.push(line);
  }
  return output;
}

export class V21PdfBuilder {
  private pages: Page[] = [];
  private current!: Page;
  private y = 0;

  constructor(private readonly blueprint: GhostTownLaunchBlueprintV21) {}

  private page(section: string, cover = false): void {
    this.current = { commands: [], section, number: this.pages.length + 1 };
    this.pages.push(this.current);
    this.y = HEIGHT - MARGIN;
    if (!cover) this.chrome(section);
  }

  private chrome(section: string): void {
    this.rect(0, HEIGHT - 34, WIDTH, 34, COLORS.ink);
    this.text('GHOSTTOWN LAUNCH BLUEPRINT', MARGIN, HEIGHT - 22, 8, 'F2', COLORS.white);
    this.text(section.toUpperCase(), WIDTH - MARGIN, HEIGHT - 22, 8, 'F2', COLORS.gold, 'right');
    this.line(MARGIN, 36, WIDTH - MARGIN, 36, COLORS.line, 0.6);
    this.text(`Contract ${this.blueprint.contractVersion} | Order ${this.blueprint.orderId}`, MARGIN, 23, 7.2, 'F1', COLORS.muted);
    this.text(String(this.current.number), WIDTH - MARGIN, 23, 8, 'F2', COLORS.muted, 'right');
    this.y = HEIGHT - 58;
  }

  private ensure(height: number): void {
    if (this.y - height < 52) this.page(this.current.section);
  }

  private rect(x: number, y: number, width: number, height: number, fill: Color, stroke?: Color): void {
    const commands = ['q', `${rgb(fill)} rg`, `${x} ${y} ${width} ${height} re f`];
    if (stroke) commands.push(`${rgb(stroke)} RG`, `${x} ${y} ${width} ${height} re S`);
    commands.push('Q');
    this.current.commands.push(commands.join('\n'));
  }

  private line(x1: number, y1: number, x2: number, y2: number, color: Color, width = 1): void {
    this.current.commands.push(`q\n${rgb(color)} RG\n${width} w\n${x1} ${y1} m\n${x2} ${y2} l\nS\nQ`);
  }

  private text(value: string, x: number, y: number, size: number, font: Font, color: Color, align: 'left' | 'right' = 'left'): void {
    const safe = escape(value);
    const estimated = safe.length * size * 0.49;
    const resolvedX = align === 'right' ? x - estimated : x;
    this.current.commands.push(`BT\n/${font} ${size} Tf\n${rgb(color)} rg\n1 0 0 1 ${resolvedX.toFixed(1)} ${y.toFixed(1)} Tm\n(${safe}) Tj\nET`);
  }

  private paragraph(value: string, size = 9.5, color: Color = COLORS.ink, font: Font = 'F1'): void {
    const lines = wrap(value, BODY_WIDTH, size);
    const lineHeight = size * 1.34;
    this.ensure(lines.length * lineHeight + 8);
    for (const line of lines) {
      this.text(line, MARGIN, this.y, size, font, color);
      this.y -= lineHeight;
    }
    this.y -= 7;
  }

  private title(title: string, kicker?: string): void {
    this.ensure(56);
    if (kicker) {
      this.text(kicker.toUpperCase(), MARGIN, this.y, 7.5, 'F2', COLORS.rust);
      this.y -= 17;
    }
    this.text(title, MARGIN, this.y, 20, 'F2', COLORS.ink);
    this.y -= 12;
    this.rect(MARGIN, this.y, 76, 3, COLORS.gold);
    this.y -= 20;
  }

  private bullet(value: string, color: Color = COLORS.ink): void {
    const lines = wrap(value, BODY_WIDTH - 20, 9.1);
    this.ensure(lines.length * 12.2 + 6);
    this.rect(MARGIN + 2, this.y + 2, 4, 4, COLORS.gold);
    lines.forEach((line, index) => this.text(line, MARGIN + 16, this.y - index * 12.2, 9.1, 'F1', color));
    this.y -= lines.length * 12.2 + 5;
  }

  private card(title: string, rows: Array<{ label?: string; value: string }>, accent: Color = COLORS.rust): void {
    const prepared = rows.map(row => ({ ...row, lines: wrap(row.value, BODY_WIDTH - 36, 8.9) }));
    const height = 34 + prepared.reduce((sum, row) => sum + row.lines.length * 11.8 + (row.label ? 14 : 4), 0) + 12;
    if (height > 610 && rows.length > 1) {
      const midpoint = Math.ceil(rows.length / 2);
      this.card(title, rows.slice(0, midpoint), accent);
      this.card(`${title} - continued`, rows.slice(midpoint), accent);
      return;
    }
    this.ensure(height + 10);
    const top = this.y;
    this.rect(MARGIN, top - height, BODY_WIDTH, height, COLORS.paper, COLORS.line);
    this.rect(MARGIN, top - 30, 6, 30, accent);
    this.text(title, MARGIN + 18, top - 20, 12, 'F2', COLORS.ink);
    let cursor = top - 46;
    for (const row of prepared) {
      if (row.label) {
        this.text(row.label.toUpperCase(), MARGIN + 18, cursor, 7.2, 'F2', accent);
        cursor -= 13;
      }
      for (const line of row.lines) {
        this.text(line, MARGIN + 18, cursor, 8.9, 'F1', COLORS.ink);
        cursor -= 11.8;
      }
      cursor -= 5;
    }
    this.y = top - height - 12;
  }

  private cover(): void {
    this.page('Cover', true);
    this.rect(0, 0, WIDTH, HEIGHT, COLORS.ink);
    this.rect(0, 0, 18, HEIGHT, COLORS.rust);
    this.text('GHOSTTOWN TEST', 64, 716, 10, 'F2', COLORS.gold);
    this.text('LAUNCH', 64, 632, 39, 'F2', COLORS.white);
    this.text('BLUEPRINT', 64, 586, 39, 'F2', COLORS.white);
    this.text('CANONICAL V2.1', 64, 548, 13, 'F2', COLORS.gold);
    this.rect(64, 532, 150, 4, COLORS.gold);
    wrap(this.blueprint.executiveDecision.originalIdea, 460, 16)
      .slice(0, 5)
      .forEach((line, index) => this.text(line, 64, 492 - index * 22, 16, 'F1', COLORS.white));
    this.text(this.blueprint.offer.offerName, 64, 350, 16, 'F2', COLORS.gold);
    wrap(`Prepared for ${this.blueprint.offer.targetCustomer}`, 455, 10.5)
      .forEach((line, index) => this.text(line, 64, 320 - index * 15, 10.5, 'F1', COLORS.white));
    this.rect(64, 145, 484, 96, [0.13, 0.15, 0.2], COLORS.rust);
    this.text('EVIDENCE-LED CUSTOMER ACQUISITION SYSTEM', 84, 214, 8.5, 'F2', COLORS.gold);
    this.text(`48-hour launch card | ${directCustomerAccessChannels(this.blueprint.customerAccessPack.channels).length} direct customer-access targets | ${this.blueprint.customerAccessPack.channels.length} researched targets`, 84, 190, 8.2, 'F1', COLORS.white);
    this.text(`First commercial ask: Day ${this.blueprint.firstRevenuePath.targetDay} | ${this.blueprint.firstRevenuePath.firstPrice}`, 84, 172, 9, 'F1', COLORS.white);
    this.text(`Canonical hash ${this.blueprint.generationReceipt.canonicalContract.gitBlobSha1}`, 64, 58, 7.5, 'F1', COLORS.muted);
  }

  private contents(): void {
    this.page('Contents');
    this.title('How to use this Blueprint', 'Decisions first, assets second, evidence always');
    this.paragraph('This PDF is the readable strategic and execution reference. The account dashboard is the operating surface, and the finished-assets ZIP contains the full reusable files and research tables. Every surface is generated from the same canonical record.');
    [
      '01 - Executive launch decision and 48-hour card',
      '02 - Starting-state and evidence audit',
      '03 - First customer, offer, and first-revenue path',
      '04 - Manual fulfillment and economics',
      '05 - Research roles and direct customer access',
      '06 - Prepared content, interview, and sales assets',
      '07 - Launch Site and 30-day execution calendar',
      '08 - Adaptive checkpoints and evidence hierarchy',
      '09 - Continue, revise, pivot, pause, or stop decision',
      '10 - Sources and canonical generation receipt'
    ].forEach(item => this.bullet(item));
    this.card('Operating rule', [
      { value: 'Do not increase activity merely because a task was completed. Record the resulting behavior, compare its evidence strength, and use the checkpoint branches before changing customer, channel, offer, price, or fulfillment.' }
    ], COLORS.gold);
  }

  private launchDecision(): void {
    this.page('Executive Decision');
    this.title('Executive Launch Decision', 'What to test before increasing risk');
    const decision = this.blueprint.executiveDecision;
    this.card('Decision', [
      { label: 'Verdict', value: decision.verdict },
      { label: 'Strongest opportunity', value: decision.strongestOpportunity },
      { label: 'Largest unresolved risk', value: decision.biggestRisk },
      { label: 'First customer', value: decision.recommendedInitialCustomer },
      { label: '30-day objective', value: decision.validationObjective },
      { label: 'Risk boundary', value: `${decision.founderTimeRiskHours} founder hours and no more than $${decision.founderCashRiskMaximum} ${decision.currency}.` }
    ]);
    const card = this.blueprint.launchCard48Hour;
    this.title('48-Hour Launch Card');
    this.card('Act before polishing', [
      { label: 'First customer', value: card.firstCustomer },
      { label: 'First offer', value: card.firstOffer },
      { label: 'First commitment', value: card.firstCommitmentRequest },
      { label: 'Launch Site preview', value: card.launchSitePreviewReady ? 'Ready from the canonical Blueprint.' : 'Blocked by incomplete canonical Launch Site data.' }
    ], COLORS.gold);
    this.title('First three approaches');
    card.firstThreeApproaches.forEach((approach, index) => this.card(`${index + 1}. ${approach.name}`, [
      { label: 'Public URL', value: approach.publicUrl },
      { label: 'First action', value: approach.firstAction }
    ], COLORS.gold));
    this.title('Exact first message');
    this.card('Use the relationship-appropriate version', [{ value: card.exactFirstMessage }]);
  }

  private startingState(): void {
    this.page('Starting-State Audit');
    this.title('Starting-State and Evidence Audit', 'Do not send the founder through another blind month');
    const audit = this.blueprint.startingStateAudit;
    [
      ['Current stage', audit.currentStage],
      ['Existing offer', audit.existingOffer],
      ['Existing landing page', audit.existingLandingPage],
      ['Previous outreach', audit.previousOutreach],
      ['Customers, audience, or partners', audit.existingCustomersAudienceOrPartners],
      ['Manual fulfillment readiness', audit.manualFulfillmentReadiness]
    ].forEach(([label, item]) => {
      const entry = item as typeof audit.currentStage;
      this.card(String(label), [
        { label: entry.truthLabel, value: entry.statement },
        { label: 'Source type', value: entry.source }
      ], entry.truthLabel === 'Verified' ? COLORS.green : entry.truthLabel === 'Inferred' ? COLORS.gold : COLORS.rust);
    });
    this.title('Founder constraints still requiring confirmation');
    Object.entries(audit.founderConstraints).forEach(([key, item]) => this.card(key.replace(/([A-Z])/g, ' $1'), [
      { label: item.truthLabel, value: item.statement }
    ], item.source === 'missing_input' ? COLORS.rust : COLORS.gold));
    this.title('No more than five critical tests');
    audit.criticalTests.forEach((test, index) => this.card(`${index + 1}. ${test.assumption}`, [
      { label: 'Evidence required', value: test.evidenceRequired },
      { label: 'If it fails', value: test.failureConsequence }
    ], COLORS.rust));
  }

  private revenue(): void {
    this.page('First Revenue');
    this.title('Business-Model Execution Lane', 'One lane, one first meaningful test');
    const lane = this.blueprint.businessModelLane;
    this.card(lane.lane.replace(/_/g, ' '), [
      { label: 'Rationale', value: lane.rationale },
      { label: 'First meaningful test', value: lane.firstMeaningfulTest },
      { label: 'Earliest commercial ask', value: `Day ${lane.earliestCommercialAskDay}` },
      { label: 'Intentionally deferred', value: lane.intentionallyDeferred.join('; ') }
    ], COLORS.gold);
    const revenue = this.blueprint.firstRevenuePath;
    this.title('First-Revenue Path', 'Who, what, price, channel, proof, and ask');
    this.card('Commercial transaction hypothesis', [
      { label: 'First buyer', value: revenue.firstBuyer },
      { label: 'First offer format', value: revenue.firstOfferFormat },
      { label: 'First channel', value: revenue.firstChannel },
      { label: 'First price', value: revenue.firstPrice },
      { label: 'Target day', value: `Day ${revenue.targetDay}` },
      { label: 'Minimum qualified asks', value: String(revenue.minimumQualifiedAsks) },
      { label: 'Commitment method', value: revenue.commitmentMethod },
      { label: 'Success threshold', value: revenue.successThreshold }
    ]);
    this.title('First ask');
    this.card('Prepared commercial message', [{ value: revenue.firstAsk }]);
    this.title('Required proof before asking');
    revenue.requiredProof.forEach(item => this.bullet(item));
    this.title('Follow-up sequence');
    revenue.followUpSequence.forEach(item => this.bullet(item));
  }

  private offerAndFulfillment(): void {
    this.page('Offer and Fulfillment');
    this.title('Offer and Pricing Strategy', 'A bounded offer that can be delivered');
    const offer = this.blueprint.offer;
    this.card(offer.offerName, [
      { label: 'Target customer', value: offer.targetCustomer },
      { label: 'Painful problem', value: offer.painfulProblem },
      { label: 'Promise', value: offer.oneSentencePromise },
      { label: 'Delivery', value: offer.deliveryMethod },
      { label: 'First useful result', value: offer.timeToFirstUsefulResult },
      { label: 'Test price', value: offer.initialTestPrice },
      { label: 'Test range', value: `${offer.lowerTestBoundary} to ${offer.upperTestBoundary}` },
      { label: 'Pricing rationale', value: offer.pricingRationale },
      { label: 'Risk reversal', value: offer.riskReversal }
    ]);
    this.title('Finished deliverables');
    offer.deliverables.forEach(item => this.card(item.name, [{ value: item.description }], COLORS.gold));
    const plan = this.blueprint.manualFulfillmentPlan;
    this.title('Manual Fulfillment and Economics');
    this.card('Delivery guardrails', [
      { label: 'Expected delivery time', value: plan.expectedDeliveryTime },
      { label: 'Capacity per week', value: String(plan.capacityPerWeek) },
      { label: 'Founder hours', value: plan.estimatedFounderHours },
      { label: 'Variable cost', value: plan.estimatedVariableCost },
      { label: 'Gross-margin guardrail', value: plan.grossMarginGuardrail },
      { label: 'Successful delivery', value: plan.successfulDeliveryDefinition }
    ], COLORS.rust);
    this.title('Quality checklist');
    plan.qualityChecklist.forEach(item => this.bullet(item));
    this.title('Intentionally manual during validation');
    plan.intentionallyManual.forEach(item => this.bullet(item));
    const brief = this.blueprint.foundingCustomerPilotBrief;
    this.title('Founding Customer Pilot Brief');
    this.card('Commercial one-page brief', [
      { label: 'Problem', value: brief.problem },
      { label: 'Scope', value: brief.scope },
      { label: 'Timeline', value: brief.timeline },
      { label: 'Price', value: brief.price },
      { label: 'Proof boundary', value: brief.proofBoundary },
      { label: 'Next step', value: brief.nextStep }
    ], COLORS.gold);
  }

  private customerAndAccess(): void {
    this.page('Customer and Access');
    this.title('First-Customer Definition and Positioning');
    const positioning = this.blueprint.positioning;
    this.card('Initial customer', [
      { label: 'Profile', value: this.blueprint.customerAccessPack.initialCustomerProfile },
      { label: 'Positioning', value: positioning.positioningStatement },
      { label: 'Differentiator', value: positioning.differentiator },
      { label: 'Trigger events', value: positioning.triggerEvents.join('; ') },
      { label: 'Current alternatives', value: positioning.currentAlternatives.join('; ') },
      { label: 'Not for', value: positioning.notFor.join('; ') }
    ]);

    const roleOrder = ['customer_access', 'market_evidence', 'media_pr', 'partnership'] as const;
    const descriptions = {
      customer_access: 'Use these for direct customer conversations and first-revenue work.',
      market_evidence: 'Use these to understand competitors, alternatives, reviews, and category behavior. Do not treat them as sales channels.',
      media_pr: 'Use these for interviews, reviews, awareness, guest content, and PR. Do not treat them as direct buyer access.',
      partnership: 'Use these for referrals, associations, and complementary relationships. Do not treat them as direct buyer access without separate proof.'
    };
    for (const role of roleOrder) {
      const channels = this.blueprint.customerAccessPack.channels.filter(channel => researchEvidenceRole(channel) === role);
      this.title(RESEARCH_EVIDENCE_ROLE_LABELS[role], descriptions[role]);
      if (!channels.length) {
        this.card('No verified targets in this role', [{ value: role === 'customer_access'
          ? 'GhostTown must find direct customer access before this Sprint can release.'
          : 'No source-backed target was retained for this supporting research role.' }], COLORS.rust);
        continue;
      }
      channels.forEach((channel, index) => this.card(`${index + 1}. ${channel.community}`, [
        { label: 'Evidence role', value: RESEARCH_EVIDENCE_ROLE_LABELS[role] },
        { label: 'Type and platform', value: `${channel.targetType || 'distribution target'} via ${channel.platform}` },
        { label: 'Public URL', value: channel.publicUrl },
        { label: 'Why it matters', value: channel.relevance },
        { label: 'Role boundary', value: channel.evidenceRoleReason || descriptions[role] },
        { label: 'Access or participation path', value: channel.accessPath || channel.recommendedApproach },
        { label: 'Prepared asset', value: channel.preparedAsset || channel.usefulTopic },
        { label: 'First action', value: channel.firstAction },
        { label: 'Confidence and research date', value: `${channel.confidence}; ${channel.researchDate}` }
      ], role === 'customer_access' ? COLORS.green : role === 'partnership' ? COLORS.rust : COLORS.gold));
    }
  }

  private preparedAssets(): void {
    this.page('Prepared Assets');
    this.title('Prepared Customer Interview Guide', 'Recent behavior, not hypothetical interest');
    const interview = this.blueprint.customerInterviewGuide;
    this.paragraph(interview.opening, 9.5, COLORS.muted, 'F3');
    [
      ['Problem history', interview.problemHistoryQuestions],
      ['Last occurrence', interview.lastOccurrenceQuestions],
      ['Current workaround', interview.currentWorkaroundQuestions],
      ['Cost and consequence', interview.costAndConsequenceQuestions],
      ['Buying process', interview.buyingProcessQuestions],
      ['Existing spending', interview.existingSpendingQuestions],
      ['Switching friction', interview.switchingFrictionQuestions],
      ['Closing and referral', interview.closingAndReferralQuestions]
    ].forEach(([title, questions]) => this.card(String(title), [{ value: (questions as string[]).join('; ') }], COLORS.gold));
    this.title('Prepared Offer Conversation Guide');
    const guide = this.blueprint.offerConversationGuide;
    this.card('Commercial conversation', [
      { label: 'Opening', value: guide.opening },
      { label: 'Problem confirmation', value: guide.problemConfirmation.join('; ') },
      { label: 'Offer explanation', value: guide.offerExplanation },
      { label: 'Price presentation', value: guide.pricePresentation },
      { label: 'Objection capture', value: guide.objectionCapture.join('; ') },
      { label: 'Commitment request', value: guide.commitmentRequest },
      { label: 'Follow-up agreement', value: guide.followUpAgreement }
    ], COLORS.rust);
    this.title('Finished Helpful Posts');
    this.blueprint.customerAccessPack.helpfulPosts.forEach((post, index) => this.card(`${index + 1}. ${post.title}`, [
      { label: 'Channel', value: `${post.intendedCommunity} via ${post.platform}` },
      { label: 'Finished post', value: post.body },
      { label: 'Closing question', value: post.closingQuestion },
      { label: 'Signals to record', value: post.responseSignals.join('; ') }
    ], COLORS.gold));
  }

  private launchSite(): void {
    this.page('Launch Site');
    this.title('Launch Site and Campaign Kit', 'One canonical offer across every surface');
    const site = this.blueprint.launchSite;
    this.card('Public offer presentation', [
      { label: 'Business', value: site.site.businessName },
      { label: 'Contact', value: site.site.contactEmail },
      { label: 'Headline', value: site.offer.headline },
      { label: 'Subheadline', value: site.offer.subheadline },
      { label: 'Price', value: `${site.offer.price} - ${site.offer.priceExplanation}` },
      { label: 'Delivery', value: site.offer.deliveryMethod },
      { label: 'Primary CTA', value: site.offer.callToAction },
      { label: 'Secondary CTA', value: site.offer.secondaryCallToAction }
    ]);
    this.card('Proof and lead boundaries', [
      { label: 'Proof status', value: site.proof.status },
      { label: 'Claims allowed', value: site.proof.claimsAllowed.join('; ') || 'No outcome claims are approved until legitimate customer evidence exists.' },
      { label: 'Proof placeholders', value: site.proof.proofPlaceholders.join('; ') },
      { label: 'Lead mode', value: site.leadCapture.mode },
      { label: 'Lead destination', value: site.leadCapture.destination },
      { label: 'Validation disclaimer', value: this.blueprint.foundingCustomerPilotBrief.proofBoundary }
    ], COLORS.rust);
    this.title('Landing-Page Copy');
    const copy = this.blueprint.landingPageCopy;
    [
      ['Headline', copy.headline],
      ['Subheadline', copy.subheadline],
      ['Problem', copy.problemSection],
      ['Current alternative', copy.currentAlternativeSection],
      ['Offer', copy.offerDescription],
      ['Price', copy.pricePresentation],
      ['Primary CTA', copy.primaryCallToAction],
      ['Thank-you page', copy.thankYouPageCopy],
      ['Confirmation email', copy.confirmationEmailBody]
    ].forEach(([title, value]) => this.card(title, [{ value }], COLORS.gold));
  }

  private calendar(): void {
    this.page('30-Day Calendar');
    this.title('Adaptive 30-Day Calendar', 'Every action produces evidence or changes course');
    this.blueprint.weeklyMilestones.forEach(week => this.card(`Week ${week.weekNumber}: ${week.objective}`, [
      { label: 'Priorities', value: week.priorities.join('; ') },
      { label: 'Milestone', value: week.milestone },
      { label: 'Success metrics', value: week.successMetrics.join('; ') }
    ], COLORS.rust));
    this.title('Daily execution');
    this.blueprint.dailyCalendar.forEach(day => this.card(`Day ${day.dayNumber}: ${day.title}`, [
      { label: 'Objective', value: day.primaryObjective },
      { label: 'Why it matters', value: day.whyItMatters },
      { label: 'Time', value: `${day.estimatedMinutes} minutes; ${day.estimatedEffort} effort` },
      { label: 'Exact actions', value: day.requiredActions.join('; ') },
      { label: 'Prepared assets', value: day.preparedAssets.join('; ') },
      { label: 'Deliverable', value: day.expectedDeliverable },
      { label: 'Success measure', value: day.successMeasurement },
      { label: 'Evidence to record', value: day.evidenceToRecord.join('; ') },
      { label: 'If-then branches', value: day.ifThenBranches.map(branch => `IF ${branch.condition} THEN ${branch.action}`).join('; ') }
      , ...(day.executionPacket ? [
        { label: 'Failure threshold', value: day.executionPacket.failureThreshold },
        { label: 'Complete when', value: day.executionPacket.completionDefinition },
        { label: 'Finished asset', value: day.executionPacket.assets.map(asset => `${asset.title}: ${asset.finishedContent}`).join('\n') },
        { label: 'Asset lineage', value: day.executionPacket.assets.map(asset => `${asset.assetId} ← ${asset.lineage.sourceVerdictId}`).join('; ') }
      ] : [])
    ], day.dayNumber % 7 === 0 || day.dayNumber === 30 ? COLORS.rust : COLORS.gold));
  }

  private evidenceAndDecision(): void {
    this.page('Evidence and Decision');
    this.title('Behavioral Evidence Hierarchy', 'Observed commitment outranks stated interest');
    const hierarchy = this.blueprint.evidenceHierarchy;
    this.card('Strong evidence', [{ value: hierarchy.strong.join('; ') }], COLORS.green);
    this.card('Moderate evidence', [{ value: hierarchy.moderate.join('; ') }], COLORS.gold);
    this.card('Early evidence', [{ value: hierarchy.early.join('; ') }], COLORS.rust);
    this.card('Weak evidence', [{ value: hierarchy.weak.join('; ') }], COLORS.red);
    this.paragraph(hierarchy.rankingRule, 9.5, COLORS.muted, 'F3');
    this.title('Adaptive Checkpoint Reviews');
    this.blueprint.adaptiveCheckpoints.forEach(checkpoint => this.card(`Day ${checkpoint.dayNumber}: ${checkpoint.title}`, [
      { label: 'Questions', value: checkpoint.questions.join('; ') },
      { label: 'Evidence required', value: checkpoint.evidenceRequired.join('; ') },
      { label: 'Branches', value: checkpoint.branches.map(branch => `IF ${branch.condition} THEN ${branch.action}`).join('; ') }
    ], COLORS.rust));
    this.title('Final Decision Rules');
    this.blueprint.finalDecision.criteria.forEach(rule => this.card(rule.decision.toUpperCase(), [
      { label: 'Condition', value: rule.condition },
      { label: 'Next action', value: rule.nextAction }
    ], rule.decision === 'continue' ? COLORS.green : rule.decision === 'stop' ? COLORS.red : COLORS.rust));
  }

  private sourcesAndReceipt(): void {
    this.page('Sources and Receipt');
    this.title('Public Sources', 'Current research and traceable support');
    this.blueprint.sources.forEach((source, index) => this.card(`${index + 1}. ${source.title}`, [
      { label: 'Publisher', value: source.publisher || 'Public source' },
      { label: 'URL', value: source.url },
      { label: 'Accessed', value: source.accessedAt },
      { label: 'Supports', value: source.supports.join('; ') }
    ], COLORS.gold));
    this.title('Canonical Generation Receipt');
    const receipt = this.blueprint.generationReceipt;
    this.card('Artifact identity and source authority', [
      { label: 'Blueprint schema', value: this.blueprint.schemaVersion },
      { label: 'Blueprint contract', value: this.blueprint.contractVersion },
      { label: 'Generator', value: receipt.generatorVersion },
      { label: 'Generated', value: receipt.generatedAt },
      { label: 'Research status', value: receipt.researchStatus },
      { label: 'Research date', value: receipt.researchDate || 'Not recorded' },
      { label: 'Source count', value: String(receipt.sourceCount) },
      { label: 'Canonical source', value: receipt.canonicalContract.sourcePath },
      { label: 'Canonical Git blob SHA-1', value: receipt.canonicalContract.gitBlobSha1 },
      { label: 'Change record', value: receipt.canonicalContract.changeRecordPath },
      { label: 'Evidence manifest', value: receipt.canonicalContract.evidenceManifestPath },
      { label: 'Quality gate', value: this.blueprint.qualityGate.passed ? 'PASSED' : `FAILED: ${this.blueprint.qualityGate.failures.join('; ')}` }
    ], COLORS.rust);
    this.card('Amendment rule', [
      { value: 'The canonical Blueprint is authoritative. Every Factory slice must revalidate its exact hash. Amendments require a versioned source update, an explicit change record, and a regenerated evidence chain. No amendment may weaken, remove, substitute, or materially alter the approved customer outcome without an explicit product decision.' }
    ], COLORS.gold);
  }

  render(): Uint8Array {
    this.cover();
    this.contents();
    this.launchDecision();
    this.startingState();
    this.revenue();
    this.offerAndFulfillment();
    this.customerAndAccess();
    this.preparedAssets();
    this.launchSite();
    this.calendar();
    this.evidenceAndDecision();
    this.sourcesAndReceipt();
    return encodePdf(this.pages);
  }
}

/** Customer-facing deterministic renderer with hierarchy, callouts, access
 * cards, page chrome, and no operational identifiers on the cover. */
export function renderBlueprintDocumentModelPdf(model: BlueprintDocumentModel): Uint8Array {
  const pages: Page[] = [];
  let current: Page;
  let y = HEIGHT - 64;
  const command = (value: string) => current.commands.push(value);
  const rect = (x: number, bottom: number, width: number, height: number, fill: Color, stroke?: Color) => {
    command(`q\n${rgb(fill)} rg\n${x} ${bottom} ${width} ${height} re f${stroke ? `\n${rgb(stroke)} RG\n0.8 w\n${x} ${bottom} ${width} ${height} re S` : ''}\nQ`);
  };
  const text = (value: string, x: number, baseline: number, size: number, font: Font = 'F1', color: Color = COLORS.ink) => {
    command(`BT\n/${font} ${size} Tf\n${rgb(color)} rg\n1 0 0 1 ${x.toFixed(1)} ${baseline.toFixed(1)} Tm\n(${escape(value)}) Tj\nET`);
  };
  const page = (section: string, cover = false) => {
    current = { commands: [], section, number: pages.length + 1 };
    pages.push(current);
    if (cover) { y = HEIGHT - 64; return; }
    rect(0, HEIGHT - 38, WIDTH, 38, COLORS.ink);
    text('GHOSTTOWN LAUNCH BLUEPRINT', MARGIN, HEIGHT - 25, 8, 'F2', COLORS.white);
    const shortSection = normalize(section).slice(0, 52);
    text(shortSection.toUpperCase(), WIDTH - MARGIN - shortSection.length * 4.1, HEIGHT - 25, 7.3, 'F2', COLORS.gold);
    command(`q\n${rgb(COLORS.line)} RG\n0.6 w\n${MARGIN} 38 m\n${WIDTH - MARGIN} 38 l\nS\nQ`);
    text(`Contract ${model.sourceBlueprint.contractVersion}`, MARGIN, 24, 7.2, 'F1', COLORS.muted);
    text(`PAGE ${pages.length}`, WIDTH - MARGIN - 34, 24, 7.2, 'F2', COLORS.muted);
    y = HEIGHT - 64;
  };
  const ensure = (height: number) => { if (y - height < 54) page(`${current.section} / continued`); };
  const heading = (value: string, kicker?: string) => {
    ensure(60);
    if (kicker) { text(kicker.toUpperCase(), MARGIN, y, 7.4, 'F2', COLORS.rust); y -= 17; }
    const lines = wrap(value, BODY_WIDTH, 18);
    lines.forEach(line => { text(line, MARGIN, y, 18, 'F2'); y -= 22; });
    rect(MARGIN, y + 6, 82, 3, COLORS.gold);
    y -= 14;
  };
  const card = (title: string, body: string, accent: Color = COLORS.rust) => {
    const lines = wrap(body, BODY_WIDTH - 34, 8.8);
    const height = 40 + lines.length * 11.5;
    if (height > 620) {
      const chunkSize = 45;
      for (let index = 0; index < lines.length; index += chunkSize) card(index ? `${title} / continued` : title, lines.slice(index, index + chunkSize).join(' '), accent);
      return;
    }
    ensure(height + 10);
    rect(MARGIN, y - height, BODY_WIDTH, height, COLORS.paper, COLORS.line);
    rect(MARGIN, y - height, 6, height, accent);
    text(title.toUpperCase(), MARGIN + 18, y - 21, 8, 'F2', accent);
    lines.forEach((line, index) => text(line, MARGIN + 18, y - 40 - index * 11.5, 8.8));
    y -= height + 10;
  };
  const bullets = (title: string, values: string[], accent: Color = COLORS.gold) => card(title, values.map(value => `- ${value}`).join('\n'), accent);

  page('Cover', true);
  rect(0, 0, WIDTH, HEIGHT, COLORS.ink);
  rect(0, 0, 14, HEIGHT, COLORS.rust);
  rect(MARGIN, HEIGHT - 114, 96, 4, COLORS.gold);
  text('GHOSTTOWN', MARGIN, HEIGHT - 82, 11, 'F2', COLORS.gold);
  text('LAUNCH BLUEPRINT', MARGIN, HEIGHT - 101, 11, 'F2', COLORS.white);
  text('CANONICAL V2.1', WIDTH - MARGIN - 92, HEIGHT - 101, 9, 'F2', COLORS.gold);
  let coverY = HEIGHT - 190;
  wrap(model.presentation.title, BODY_WIDTH - 24, 29).forEach(line => { text(line, MARGIN, coverY, 29, 'F2', COLORS.white); coverY -= 36; });
  coverY -= 10;
  text(`FOR ${normalize(model.presentation.customer).toUpperCase()}`, MARGIN, coverY, 9, 'F2', COLORS.gold);
  coverY -= 30;
  wrap(model.presentation.subtitle, BODY_WIDTH - 24, 13).forEach(line => { text(line, MARGIN, coverY, 13, 'F1', COLORS.white); coverY -= 18; });
  rect(MARGIN, 88, BODY_WIDTH, 54, COLORS.rust);
  text('OPEN BLUEPRINT  /  DOWNLOAD PDF', MARGIN + 20, 111, 11, 'F2', COLORS.white);
  text('A 30-day evidence-led plan built for action.', MARGIN + 20, 96, 8.4, 'F1', COLORS.white);

  for (const section of model.prioritySections) {
    page(section.title);
    heading(section.title, 'Priority decision');
    card('Decision', section.decision, COLORS.rust);
    card('Why', section.why, COLORS.gold);
    bullets('Evidence', section.evidence.map(item => `[${item.truthLabel}] ${item.statement}`));
    section.readyToUseAssets.forEach((item, index) => card(index ? item.title : `Ready-to-use assets / ${item.title}`, `${item.finishedContent}\n\nUSE IT: ${item.usageInstructions}`, COLORS.gold));
    card('Measurement', `SUCCESS: ${section.measurement.successThreshold}\nFAILURE: ${section.measurement.failureThreshold}\nCOMPLETE WHEN: ${section.measurement.completionDefinition}\nCAPTURE: ${section.measurement.evidenceToCapture.join('; ')}`, COLORS.green);
    if (section.accessGroups) {
      heading('Research Roles', 'Customer access / Market evidence / Media-PR / Partnerships');
      section.accessGroups.forEach(group => bullets(group.title, group.targets.map(target => `${target.name} [${target.evidenceRole}] (${target.targetType}) | ${target.publicUrl} | ${target.researchDate}, ${target.confidence} confidence | ACCESS: ${target.accessPath} | RESOURCE: ${target.matchedAssetOrScript.title} | RISK: ${target.risk} | FIRST ACTION: ${target.firstAction}`), group.groupId === 'customer_access' ? COLORS.green : group.groupId === 'partnership' ? COLORS.rust : COLORS.gold));
    }
    bullets('Adaptation Rule', section.adaptationRule.map(rule => `IF ${rule.condition} THEN ${rule.action} [${rule.route}]. Capture: ${rule.evidenceRequired.join('; ')}`), COLORS.rust);
  }
  for (const section of model.supportingSections) {
    page(section.title);
    heading(section.title, 'Supporting detail');
    if (section.sectionId === 'evidence_checkpoints') {
      card('Behavioral Evidence Hierarchy', 'Rank observed behavior above stated interest when deciding what to do next.', COLORS.gold);
      card('Adaptive Checkpoint Reviews', 'Adaptive Checkpoint Reviews use the recorded evidence at each checkpoint and follow the declared branch.', COLORS.rust);
    }
    section.content.forEach((item, index) => card(`${section.title} / ${index + 1}`, item, index % 2 ? COLORS.gold : COLORS.rust));
  }
  return encodePdf(pages);
}

function encodePdf(pages: Page[]): Uint8Array {
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${6 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>'
  ];
  pages.forEach((page, index) => {
    const pageId = 6 + index * 2;
    const contentId = pageId + 1;
    const stream = page.commands.join('\n');
    const length = new TextEncoder().encode(stream).byteLength;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${WIDTH} ${HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${length} >>\nstream\n${stream}\nendstream`
    );
  });

  let pdf = '%PDF-1.4\n%GhostTown Launch Blueprint v2.1\n';
  const offsets: number[] = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(new TextEncoder().encode(pdf).byteLength);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = new TextEncoder().encode(pdf).byteLength;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function renderLaunchBlueprintPdfV21(blueprint: GhostTownLaunchBlueprintV21): Uint8Array {
  // Compose and validate the premium-document projection before using the
  // established deterministic PDF fallback. This keeps the existing R2/hash
  // pipeline byte-compatible while making the document model the fail-closed
  // presentation contract.
  const model = composeBlueprintDocumentModel(blueprint);
  const failures = validateBlueprintDocumentAgainstCanonical(model, blueprint);
  if (failures.length) throw new Error(`Blueprint document model failed: ${failures.join(', ')}`);
  renderBlueprintDocumentHtml(model);
  return renderBlueprintDocumentModelPdf(model);
}

export async function renderLaunchBlueprintPdfV21WithBrowser(
  blueprint: GhostTownLaunchBlueprintV21,
  renderer?: BrowserPdfRenderer
): Promise<{ bytes: Uint8Array; html: string; model: BlueprintDocumentModel; mode: 'browser' | 'deterministic_fallback' }> {
  const model = composeBlueprintDocumentModel(blueprint);
  const failures = validateBlueprintDocumentAgainstCanonical(model, blueprint);
  if (failures.length) throw new Error(`Blueprint document model failed: ${failures.join(', ')}`);
  const html = renderBlueprintDocumentHtml(model);
  const result = await renderWithBrowserPdfOrFallback(html, () => renderBlueprintDocumentModelPdf(model), renderer);
  return { ...result, html, model };
}
