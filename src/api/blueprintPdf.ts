import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COLORS = {
  ink: [0.08, 0.10, 0.14] as const,
  rust: [0.63, 0.20, 0.06] as const,
  gold: [0.88, 0.62, 0.20] as const,
  paper: [0.98, 0.97, 0.94] as const,
  muted: [0.37, 0.40, 0.45] as const,
  line: [0.84, 0.82, 0.77] as const,
  white: [1, 1, 1] as const,
  green: [0.08, 0.43, 0.28] as const,
  red: [0.65, 0.14, 0.12] as const
};

type Color = readonly [number, number, number];
type FontName = 'F1' | 'F2' | 'F3';

interface Page {
  commands: string[];
  section: string;
  pageNumber: number;
  cover?: boolean;
}

function clean(value: string): string {
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

function escapePdf(value: string): string {
  return clean(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function rgb(color: Color): string {
  return `${color[0]} ${color[1]} ${color[2]}`;
}

function wrap(value: string, width: number, fontSize: number): string[] {
  const normalized = clean(value);
  if (!normalized) return [];
  const maxChars = Math.max(12, Math.floor(width / (fontSize * 0.52)));
  const paragraphs = normalized.split(/\n+/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      if (word.length > maxChars) {
        if (line) lines.push(line);
        for (let index = 0; index < word.length; index += maxChars) lines.push(word.slice(index, index + maxChars));
        line = '';
      } else if (`${line} ${word}`.trim().length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = `${line} ${word}`.trim();
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

class BlueprintPdfBuilder {
  private pages: Page[] = [];
  private current!: Page;
  private y = 0;

  constructor(private readonly blueprint: GhostTownLaunchBlueprint) {}

  private addPage(section: string, cover = false): void {
    const page: Page = { commands: [], section, pageNumber: this.pages.length + 1, cover };
    this.pages.push(page);
    this.current = page;
    this.y = PAGE_HEIGHT - MARGIN;
    if (!cover) this.drawChrome(section);
  }

  private drawChrome(section: string): void {
    this.rect(0, PAGE_HEIGHT - 34, PAGE_WIDTH, 34, COLORS.ink);
    this.text('GHOSTTOWN LAUNCH BLUEPRINT', MARGIN, PAGE_HEIGHT - 22, 8, 'F2', COLORS.white);
    this.text(section.toUpperCase(), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 22, 8, 'F2', COLORS.gold, 'right');
    this.line(MARGIN, 36, PAGE_WIDTH - MARGIN, 36, COLORS.line, 0.6);
    this.text(`Order ${this.blueprint.orderId}`, MARGIN, 23, 7.5, 'F1', COLORS.muted);
    this.text(`${this.current.pageNumber}`, PAGE_WIDTH - MARGIN, 23, 8, 'F2', COLORS.muted, 'right');
    this.y = PAGE_HEIGHT - 58;
  }

  private ensure(height: number, section?: string): void {
    if (this.y - height < 52) this.addPage(section || this.current.section);
  }

  private rect(x: number, y: number, width: number, height: number, color: Color, stroke?: Color): void {
    const command = [`q`, `${rgb(color)} rg`, `${x} ${y} ${width} ${height} re f`];
    if (stroke) command.push(`${rgb(stroke)} RG`, `${x} ${y} ${width} ${height} re S`);
    command.push('Q');
    this.current.commands.push(command.join('\n'));
  }

  private line(x1: number, y1: number, x2: number, y2: number, color: Color, width = 1): void {
    this.current.commands.push(`q\n${rgb(color)} RG\n${width} w\n${x1} ${y1} m\n${x2} ${y2} l\nS\nQ`);
  }

  private text(value: string, x: number, y: number, size: number, font: FontName, color: Color, align: 'left' | 'right' = 'left'): void {
    const safe = escapePdf(value);
    const estimatedWidth = safe.length * size * 0.49;
    const resolvedX = align === 'right' ? x - estimatedWidth : x;
    this.current.commands.push(`BT\n/${font} ${size} Tf\n${rgb(color)} rg\n1 0 0 1 ${resolvedX.toFixed(1)} ${y.toFixed(1)} Tm\n(${safe}) Tj\nET`);
  }

  private paragraph(value: string, options: { size?: number; font?: FontName; color?: Color; indent?: number; gap?: number; section?: string } = {}): void {
    const size = options.size ?? 9.5;
    const font = options.font ?? 'F1';
    const color = options.color ?? COLORS.ink;
    const indent = options.indent ?? 0;
    const lineHeight = size * 1.34;
    const lines = wrap(value, CONTENT_WIDTH - indent, size);
    this.ensure(lines.length * lineHeight + (options.gap ?? 6), options.section);
    for (const line of lines) {
      this.text(line, MARGIN + indent, this.y, size, font, color);
      this.y -= lineHeight;
    }
    this.y -= options.gap ?? 6;
  }

  private bullet(value: string, color: Color = COLORS.ink): void {
    const size = 9.2;
    const lines = wrap(value, CONTENT_WIDTH - 20, size);
    this.ensure(lines.length * 12.4 + 3);
    this.rect(MARGIN + 2, this.y + 2, 4, 4, COLORS.gold);
    lines.forEach((line, index) => {
      this.text(line, MARGIN + 16, this.y - index * 12.4, size, 'F1', color);
    });
    this.y -= lines.length * 12.4 + 4;
  }

  private labelValue(label: string, value: string): void {
    const labelWidth = 126;
    const size = 9.2;
    const lines = wrap(value, CONTENT_WIDTH - labelWidth - 12, size);
    const height = Math.max(18, lines.length * 12.2 + 4);
    this.ensure(height + 2);
    this.text(label.toUpperCase(), MARGIN, this.y, 7.5, 'F2', COLORS.rust);
    lines.forEach((line, index) => this.text(line, MARGIN + labelWidth, this.y - index * 12.2, size, 'F1', COLORS.ink));
    this.y -= height;
    this.line(MARGIN, this.y + 5, PAGE_WIDTH - MARGIN, this.y + 5, COLORS.line, 0.4);
  }

  private sectionTitle(title: string, kicker?: string): void {
    this.ensure(52, title);
    if (kicker) {
      this.text(kicker.toUpperCase(), MARGIN, this.y, 7.5, 'F2', COLORS.rust);
      this.y -= 17;
    }
    this.text(title, MARGIN, this.y, 20, 'F2', COLORS.ink);
    this.y -= 12;
    this.rect(MARGIN, this.y, 72, 3, COLORS.gold);
    this.y -= 20;
  }

  private card(title: string, rows: Array<{ label?: string; value: string }>, accent: Color = COLORS.rust): void {
    const prepared = rows.map(row => ({ ...row, lines: wrap(row.value, CONTENT_WIDTH - 34, 9) }));
    const total = 34 + prepared.reduce((sum, row) => sum + row.lines.length * 12 + (row.label ? 15 : 4), 0) + 12;
    if (total > 610) {
      this.card(title, prepared.slice(0, Math.ceil(prepared.length / 2)).map(({ label, value }) => ({ label, value })), accent);
      this.card(`${title} - continued`, prepared.slice(Math.ceil(prepared.length / 2)).map(({ label, value }) => ({ label, value })), accent);
      return;
    }
    this.ensure(total + 10, this.current.section);
    const top = this.y;
    this.rect(MARGIN, top - total, CONTENT_WIDTH, total, COLORS.paper, COLORS.line);
    this.rect(MARGIN, top - 30, 6, 30, accent);
    this.text(title, MARGIN + 18, top - 20, 12, 'F2', COLORS.ink);
    let cursor = top - 46;
    for (const row of prepared) {
      if (row.label) {
        this.text(row.label.toUpperCase(), MARGIN + 18, cursor, 7.2, 'F2', accent);
        cursor -= 13;
      }
      row.lines.forEach(line => {
        this.text(line, MARGIN + 18, cursor, 9, 'F1', COLORS.ink);
        cursor -= 12;
      });
      cursor -= 5;
    }
    this.y = top - total - 12;
  }

  private cover(): void {
    this.addPage('Cover', true);
    this.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, COLORS.ink);
    this.rect(0, 0, 18, PAGE_HEIGHT, COLORS.rust);
    this.text('GHOSTTOWN TEST', 64, 716, 10, 'F2', COLORS.gold);
    this.text('LAUNCH', 64, 630, 39, 'F2', COLORS.white);
    this.text('BLUEPRINT', 64, 584, 39, 'F2', COLORS.white);
    this.rect(64, 554, 124, 5, COLORS.gold);
    const titleLines = wrap(this.blueprint.executiveDecision.originalIdea, 460, 17);
    titleLines.slice(0, 5).forEach((line, index) => this.text(line, 64, 500 - index * 23, 17, 'F1', COLORS.white));
    this.text(this.blueprint.offer.offerName, 64, 350, 17, 'F2', COLORS.gold);
    const customerLines = wrap(`Prepared for: ${this.blueprint.offer.targetCustomer}`, 455, 11);
    customerLines.forEach((line, index) => this.text(line, 64, 320 - index * 15, 11, 'F1', COLORS.white));
    this.rect(64, 148, 484, 92, [0.13, 0.15, 0.20], COLORS.rust);
    this.text('30-DAY EXECUTION SYSTEM', 84, 211, 9, 'F2', COLORS.gold);
    this.text(`Research date: ${this.blueprint.generationReceipt.researchDate || 'not recorded'}`, 84, 187, 9, 'F1', COLORS.white);
    this.text(`${this.blueprint.customerAccessPack.channels.length} customer-access channels`, 84, 169, 9, 'F1', COLORS.white);
    this.text(`${this.blueprint.customerAccessPack.outreachScripts.length} scripts | 5 finished posts | complete launch copy`, 286, 169, 9, 'F1', COLORS.white);
    this.text(`Blueprint ${this.blueprint.blueprintVersion} | ${this.blueprint.createdAt.slice(0, 10)}`, 64, 58, 8, 'F1', COLORS.muted);
  }

  private contents(): void {
    this.addPage('Contents');
    this.sectionTitle('How this Blueprint works', 'Use the assets, record evidence, make a decision');
    this.paragraph('This is an execution system, not a workbook assignment. The offer, positioning, customer-access channels, posts, outreach scripts, landing-page copy, Launch Site configuration, weekly milestones, and daily actions are prepared from one canonical Blueprint record.');
    const items = [
      ['01', 'Executive Launch Decision'],
      ['02', 'Offer and Pricing Strategy'],
      ['03', 'Target Customer and Positioning'],
      ['04', 'Customer Access Pack'],
      ['05', 'Five Finished Helpful Posts'],
      ['06', 'Relationship-Specific Outreach Scripts'],
      ['07', 'Complete Landing-Page Copy'],
      ['08', 'Launch Site Starter Configuration'],
      ['09', 'Weekly Milestones and 30-Day Calendar'],
      ['10', 'Final Decision Rules and Sources']
    ];
    for (const [number, title] of items) {
      this.ensure(33);
      this.text(number, MARGIN, this.y, 12, 'F2', COLORS.rust);
      this.text(title, MARGIN + 45, this.y, 11, 'F2', COLORS.ink);
      this.line(MARGIN + 45, this.y - 8, PAGE_WIDTH - MARGIN, this.y - 8, COLORS.line, 0.5);
      this.y -= 31;
    }
    this.y -= 12;
    this.card('Evidence standard', [
      { label: 'Strong', value: 'Paid deposit, paid pilot, signed agreement, access to required data or time, or a decision-maker introduction.' },
      { label: 'Medium', value: 'Serious sales conversation, buying-process objection, proposal request, trial request, or scheduled next step.' },
      { label: 'Weak', value: 'Likes, compliments, generic waitlist signups, or friends saying they would use it.' }
    ], COLORS.gold);
  }

  private executive(): void {
    this.addPage('Executive Decision');
    this.sectionTitle('Executive Launch Decision', 'What to test before increasing risk');
    const decision = this.blueprint.executiveDecision;
    this.labelValue('Verdict', decision.verdict);
    this.labelValue('Strongest opportunity', decision.strongestOpportunity);
    this.labelValue('Biggest risk', decision.biggestRisk);
    this.labelValue('Initial customer', decision.recommendedInitialCustomer);
    this.labelValue('30-day objective', decision.validationObjective);
    this.labelValue('Risk boundary', `${decision.founderTimeRiskHours} founder hours and no more than $${decision.founderCashRiskMaximum} ${decision.currency}.`);
    this.sectionTitle('Continue evidence');
    decision.continueEvidence.forEach(item => this.bullet(item, COLORS.green));
    this.sectionTitle('Stop evidence');
    decision.stopEvidence.forEach(item => this.bullet(item, COLORS.red));
  }

  private offer(): void {
    this.addPage('Offer and Pricing');
    this.sectionTitle('Offer and Pricing Strategy', 'A finished offer to put in front of buyers');
    const offer = this.blueprint.offer;
    this.card(offer.offerName, [
      { label: 'Customer', value: offer.targetCustomer },
      { label: 'Painful problem', value: offer.painfulProblem },
      { label: 'Promise', value: offer.oneSentencePromise },
      { label: 'Delivery', value: offer.deliveryMethod },
      { label: 'First useful result', value: offer.timeToFirstUsefulResult },
      { label: 'Founding test price', value: offer.initialTestPrice },
      { label: 'Test range', value: `${offer.lowerTestBoundary} to ${offer.upperTestBoundary}` },
      { label: 'Pricing rationale', value: offer.pricingRationale },
      { label: 'Risk reversal', value: offer.riskReversal }
    ]);
    this.sectionTitle('Completed deliverables');
    offer.deliverables.forEach(deliverable => this.card(deliverable.name, [
      { value: deliverable.description },
      ...(deliverable.timeToValue ? [{ label: 'Time to value', value: deliverable.timeToValue }] : [])
    ], COLORS.gold));
    this.sectionTitle('Buyer responsibilities');
    offer.buyerResponsibilities.forEach(item => this.bullet(item));
    this.sectionTitle('Explicit exclusions');
    offer.exclusions.forEach(item => this.bullet(item));
    this.sectionTitle('Objections and responses');
    offer.objections.forEach(item => this.card(item.objection, [{ value: item.response }], COLORS.rust));
  }

  private positioning(): void {
    this.addPage('Positioning');
    this.sectionTitle('Target Customer and Positioning', 'The first customer, trigger, language, and alternative');
    const positioning = this.blueprint.positioning;
    this.labelValue('First target customer', positioning.firstTargetCustomer);
    this.labelValue('Positioning statement', positioning.positioningStatement);
    this.labelValue('Differentiator', positioning.differentiator);
    const groups: Array<[string, string[]]> = [
      ['Trigger events', positioning.triggerEvents],
      ['Current alternatives', positioning.currentAlternatives],
      ['Alternative weaknesses', positioning.alternativeWeaknesses],
      ['Buyer language', positioning.buyerLanguage],
      ['Action triggers', positioning.actionTriggers],
      ['Likely rejection reasons', positioning.rejectionReasons],
      ['Not for', positioning.notFor]
    ];
    groups.forEach(([title, items]) => {
      this.sectionTitle(title);
      items.forEach(item => this.bullet(item));
    });
  }

  private access(): void {
    this.addPage('Customer Access Pack');
    this.sectionTitle('Customer Access Pack', 'Current, sourced places to reach the first buyer');
    this.paragraph(this.blueprint.customerAccessPack.initialCustomerProfile, { font: 'F3', color: COLORS.muted });
    this.sectionTitle('Prioritized channels');
    this.blueprint.customerAccessPack.channels.forEach((channel, index) => this.card(`${index + 1}. ${channel.community}`, [
      { label: 'Platform', value: channel.platform },
      { label: 'Public source', value: channel.publicUrl },
      { label: 'Why it matters', value: channel.relevance },
      { label: 'Activity and confidence', value: `${channel.activity}; ${channel.confidence} confidence; researched ${channel.researchDate}` },
      { label: 'Rules', value: channel.participationRules },
      { label: 'Recommended approach', value: channel.recommendedApproach },
      { label: 'Helpful topic', value: channel.usefulTopic },
      { label: 'Risk', value: channel.risk },
      { label: 'First action', value: channel.firstAction }
    ], index < 5 ? COLORS.rust : COLORS.gold));
    if (this.blueprint.customerAccessPack.publicExpertsAndPartners.length) {
      this.sectionTitle('Public experts and complementary partners');
      this.blueprint.customerAccessPack.publicExpertsAndPartners.forEach(item => this.card(item.name, [
        { label: 'Role', value: item.role },
        { label: 'Public source', value: item.publicUrl },
        { label: 'Relevance', value: item.relevance }
      ], COLORS.gold));
    }
  }

  private posts(): void {
    this.addPage('Finished Posts');
    this.sectionTitle('Five Finished Helpful Posts', 'Publish as written, then adapt only to current community rules');
    this.blueprint.customerAccessPack.helpfulPosts.forEach((post, index) => this.card(`${index + 1}. ${post.title}`, [
      { label: 'Use in', value: `${post.intendedCommunity} (${post.platform})` },
      { label: 'Objective', value: post.objective },
      { label: 'Finished post', value: post.body },
      { label: 'Closing question', value: post.closingQuestion },
      ...(post.softCallToAction ? [{ label: 'Soft call to action', value: post.softCallToAction }] : []),
      { label: 'Signals to record', value: post.responseSignals.join('; ') },
      { label: 'Comment plan', value: post.commentResponsePlan }
    ], COLORS.gold));
  }

  private scripts(): void {
    this.addPage('Outreach Scripts');
    this.sectionTitle('Relationship-Specific Outreach Scripts', 'Use the script matching the real relationship');
    this.blueprint.customerAccessPack.outreachScripts.forEach((script, index) => this.card(`${index + 1}. ${script.title}`, [
      { label: 'Purpose', value: script.purpose },
      { label: 'Use when', value: script.useWhen },
      { label: 'Message', value: script.message }
    ], COLORS.rust));
  }

  private landingPage(): void {
    this.addPage('Landing Page Copy');
    this.sectionTitle('Complete Landing-Page Copy', 'Ready for the personalized Launch Site Starter');
    const copy = this.blueprint.landingPageCopy;
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Metadata title', value: copy.metadataTitle },
      { label: 'Metadata description', value: copy.metadataDescription },
      { label: 'Social description', value: copy.socialDescription },
      { label: 'Customer callout', value: copy.targetCustomerCallout },
      { label: 'Headline', value: copy.headline },
      { label: 'Subheadline', value: copy.subheadline },
      { label: 'Problem section', value: copy.problemSection },
      { label: 'Current alternative', value: copy.currentAlternativeSection },
      { label: 'Offer description', value: copy.offerDescription },
      { label: 'Timeline', value: copy.expectedTimeline },
      { label: 'Price', value: copy.pricePresentation },
      { label: 'Risk reversal', value: copy.riskReversal },
      { label: 'Primary CTA', value: copy.primaryCallToAction },
      { label: 'Secondary CTA', value: copy.secondaryCallToAction },
      { label: 'Thank-you page', value: copy.thankYouPageCopy },
      { label: 'Confirmation subject', value: copy.confirmationEmailSubject },
      { label: 'Confirmation email', value: copy.confirmationEmailBody }
    ];
    rows.forEach(row => this.card(row.label, [{ value: row.value }], COLORS.gold));
    this.sectionTitle('Deliverables shown on the page');
    copy.deliverables.forEach(item => this.bullet(item));
    this.sectionTitle('How it works');
    copy.howItWorks.forEach(item => this.card(item.step, [{ value: item.description }], COLORS.rust));
    this.sectionTitle('FAQ');
    copy.faq.forEach(item => this.card(item.question, [{ value: item.answer }], COLORS.rust));
    this.sectionTitle('Proof placeholders');
    copy.proofPlaceholders.forEach(item => this.bullet(item));
  }

  private site(): void {
    this.addPage('Launch Site Starter');
    this.sectionTitle('Launch Site Starter Configuration', 'The same canonical content rendered as a website');
    const site = this.blueprint.launchSite;
    this.card('Site identity', [
      { label: 'Business', value: site.site.businessName },
      { label: 'Contact', value: site.site.contactEmail },
      { label: 'Domain', value: site.site.primaryDomain || 'Connect a domain after the offer passes evidence gates.' },
      { label: 'Location', value: site.site.location || 'Not location-restricted.' }
    ]);
    this.card('Offer presentation', [
      { label: 'Headline', value: site.offer.headline },
      { label: 'Subheadline', value: site.offer.subheadline },
      { label: 'Outcome', value: site.offer.primaryOutcome },
      { label: 'Price', value: `${site.offer.price} - ${site.offer.priceExplanation}` },
      { label: 'Delivery', value: site.offer.deliveryMethod },
      { label: 'First value', value: site.offer.timeToFirstValue },
      { label: 'Primary CTA', value: site.offer.callToAction },
      { label: 'Secondary CTA', value: site.offer.secondaryCallToAction }
    ], COLORS.gold);
    this.card('Lead capture', [
      { label: 'Mode', value: site.leadCapture.mode },
      { label: 'Destination', value: site.leadCapture.destination },
      { label: 'Button', value: site.leadCapture.buttonLabel }
    ], COLORS.rust);
    this.card('Claims boundary', [
      { label: 'Status', value: site.proof.status },
      { label: 'Claims allowed', value: site.proof.claimsAllowed.join('; ') },
      { label: 'Proof to replace later', value: site.proof.proofPlaceholders.join('; ') }
    ], COLORS.gold);
  }

  private calendar(): void {
    this.addPage('30-Day Calendar');
    this.sectionTitle('Weekly Milestones', 'The roadmap and calendar use all prepared assets');
    this.blueprint.weeklyMilestones.forEach(week => this.card(`Week ${week.weekNumber}: ${week.objective}`, [
      { label: 'Priorities', value: week.priorities.join('; ') },
      { label: 'Milestone', value: week.milestone },
      { label: 'Success metrics', value: week.successMetrics.join('; ') }
    ], COLORS.gold));
    this.sectionTitle('Daily execution calendar');
    this.blueprint.dailyCalendar.forEach(day => this.card(`Day ${day.dayNumber}: ${day.title}`, [
      { label: 'Objective', value: day.primaryObjective },
      { label: 'Effort', value: day.estimatedEffort },
      { label: 'Exact actions', value: day.requiredActions.join('; ') },
      { label: 'Prepared assets', value: day.preparedAssets.join('; ') },
      { label: 'Deliverable', value: day.expectedDeliverable },
      { label: 'Success measurement', value: day.successMeasurement },
      { label: 'Evidence to record', value: day.evidenceToRecord.join('; ') }
    ], day.dayNumber === 1 || day.dayNumber % 7 === 0 ? COLORS.rust : COLORS.gold));
  }

  private decisionAndSources(): void {
    this.addPage('Decision and Sources');
    this.sectionTitle('Final Decision Rules', 'Continue, revise, pivot, or stop based on evidence');
    this.blueprint.finalDecision.criteria.forEach(item => this.card(item.decision.toUpperCase(), [
      { label: 'Condition', value: item.condition },
      { label: 'Next action', value: item.nextAction }
    ], item.decision === 'continue' ? COLORS.green : item.decision === 'stop' ? COLORS.red : COLORS.rust));
    this.sectionTitle('Public research sources');
    this.blueprint.sources.forEach((source, index) => this.card(`${index + 1}. ${source.title}`, [
      { label: 'Publisher', value: source.publisher || 'Public web source' },
      { label: 'URL', value: source.url },
      { label: 'Accessed', value: source.accessedAt },
      { label: 'Supports', value: source.supports.join('; ') }
    ], COLORS.gold));
    this.sectionTitle('Generation receipt');
    this.labelValue('Schema', this.blueprint.schemaVersion);
    this.labelValue('Generator', this.blueprint.generationReceipt.generatorVersion);
    this.labelValue('Research status', this.blueprint.generationReceipt.researchStatus);
    this.labelValue('Research date', this.blueprint.generationReceipt.researchDate || 'Not recorded');
    this.labelValue('Source count', String(this.blueprint.generationReceipt.sourceCount));
    this.labelValue('Quality gate', this.blueprint.qualityGate.passed ? 'PASSED' : `FAILED: ${this.blueprint.qualityGate.failures.join('; ')}`);
  }

  render(): Uint8Array {
    this.cover();
    this.contents();
    this.executive();
    this.offer();
    this.positioning();
    this.access();
    this.posts();
    this.scripts();
    this.landingPage();
    this.site();
    this.calendar();
    this.decisionAndSources();
    return encodePdf(this.pages);
  }
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
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${length} >>\nstream\n${stream}\nendstream`
    );
  });

  let pdf = '%PDF-1.4\n%GhostTown Launch Blueprint\n';
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

export function renderLaunchBlueprintPdf(blueprint: GhostTownLaunchBlueprint): Uint8Array {
  return new BlueprintPdfBuilder(blueprint).render();
}
