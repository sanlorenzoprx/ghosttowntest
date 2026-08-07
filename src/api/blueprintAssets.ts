import type { GhostTownLaunchBlueprint } from "../types/launchBlueprint";
import type {
  BlueprintDailyActionV21,
  GhostTownLaunchBlueprintV21,
} from "../types/launchBlueprintV21";

export const BLUEPRINT_ASSET_FILENAMES = [
  "README.md",
  "blueprint.json",
  "launch-blueprint.pdf",
  "executive-summary.md",
  "offer-and-pricing.md",
  "positioning.md",
  "media-and-distribution-network.csv",
  "outreach-scripts.md",
  "helpful-posts.md",
  "landing-page-copy.md",
  "launch-site-config.json",
  "thirty-day-calendar.csv",
  "weekly-milestones.md",
  "metrics-template.csv",
  "decision-rules.md",
  "sources.csv",
] as const;

const encoder = new TextEncoder();
const encoded = (value: string) => encoder.encode(value);
const csvCell = (value: unknown) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;
const csv = (rows: unknown[][]) =>
  rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

function asV21(
  blueprint: GhostTownLaunchBlueprint,
): GhostTownLaunchBlueprintV21 | null {
  return blueprint.blueprintVersion === "2.1" && "contractVersion" in blueprint
    ? (blueprint as GhostTownLaunchBlueprintV21)
    : null;
}

function executiveV21(blueprint: GhostTownLaunchBlueprintV21): string {
  const audit = blueprint.startingStateAudit;
  const launchCard = blueprint.launchCard48Hour;
  return `

## 48-Hour Launch Card

**First customer:** ${launchCard.firstCustomer}

**First offer:** ${launchCard.firstOffer}

**First commitment request:** ${launchCard.firstCommitmentRequest}

### First three approaches
${launchCard.firstThreeApproaches
  .map(
    (approach, index) =>
      `${index + 1}. **${approach.name}** — ${approach.firstAction} (${approach.publicUrl})`,
  )
  .join("\n")}

### Exact first message

${launchCard.exactFirstMessage}

## Starting-State and Evidence Audit

**Current stage:** ${audit.currentStage.statement} [${audit.currentStage.truthLabel}]

**Existing offer:** ${audit.existingOffer.statement} [${audit.existingOffer.truthLabel}]

**Existing landing page:** ${audit.existingLandingPage.statement} [${audit.existingLandingPage.truthLabel}]

**Previous outreach:** ${audit.previousOutreach.statement} [${audit.previousOutreach.truthLabel}]

### Critical tests
${audit.criticalTests
  .map(
    (test) =>
      `- **${test.assumption}:** ${test.evidenceRequired} Failure consequence: ${test.failureConsequence}`,
  )
  .join("\n")}

## Canonical contract receipt

- Contract version: ${blueprint.contractVersion}
- Canonical Git blob SHA-1: ${blueprint.generationReceipt.canonicalContract.gitBlobSha1}
- Source: ${blueprint.generationReceipt.canonicalContract.sourcePath}
- Change record: ${blueprint.generationReceipt.canonicalContract.changeRecordPath}
- Evidence manifest: ${blueprint.generationReceipt.canonicalContract.evidenceManifestPath}
`;
}

function offerV21(blueprint: GhostTownLaunchBlueprintV21): string {
  const revenue = blueprint.firstRevenuePath;
  const fulfillment = blueprint.manualFulfillmentPlan;
  const brief = blueprint.foundingCustomerPilotBrief;
  return `

## Business-Model Execution Lane

**Lane:** ${blueprint.businessModelLane.lane.replace(/_/g, " ")}

${blueprint.businessModelLane.rationale}

**First meaningful test:** ${blueprint.businessModelLane.firstMeaningfulTest}

**Earliest commercial ask:** Day ${blueprint.businessModelLane.earliestCommercialAskDay}

## First-Revenue Path

- **First buyer:** ${revenue.firstBuyer}
- **First channel:** ${revenue.firstChannel}
- **First price:** ${revenue.firstPrice}
- **Target day:** ${revenue.targetDay}
- **Minimum qualified asks:** ${revenue.minimumQualifiedAsks}
- **Success threshold:** ${revenue.successThreshold}

### First ask

${revenue.firstAsk}

### Required proof
${list(revenue.requiredProof)}

### Follow-up sequence
${list(revenue.followUpSequence)}

## Manual Fulfillment and Economics

**Expected delivery time:** ${fulfillment.expectedDeliveryTime}

**Capacity per week:** ${fulfillment.capacityPerWeek}

**Founder-hours guardrail:** ${fulfillment.estimatedFounderHours}

**Variable cost:** ${fulfillment.estimatedVariableCost}

**Gross-margin guardrail:** ${fulfillment.grossMarginGuardrail}

### Quality checklist
${list(fulfillment.qualityChecklist)}

### Intentionally manual during validation
${list(fulfillment.intentionallyManual)}

## Founding Customer Pilot Brief

**Problem:** ${brief.problem}

**Scope:** ${brief.scope}

**Timeline:** ${brief.timeline}

**Price:** ${brief.price}

**Proof boundary:** ${brief.proofBoundary}

**Next step:** ${brief.nextStep}
`;
}

function checkpointV21(blueprint: GhostTownLaunchBlueprintV21): string {
  return `

## Adaptive Evidence Checkpoints

${blueprint.adaptiveCheckpoints
  .map(
    (checkpoint) => `### Day ${checkpoint.dayNumber}: ${checkpoint.title}

**Questions**
${list(checkpoint.questions)}

**Evidence required**
${list(checkpoint.evidenceRequired)}

**Branches**
${checkpoint.branches
  .map((branch) => `- If ${branch.condition} Then ${branch.action}`)
  .join("\n")}`,
  )
  .join("\n\n")}
`;
}

function decisionV21(blueprint: GhostTownLaunchBlueprintV21): string {
  return `

## Behavioral Evidence Hierarchy

### Strong evidence
${list(blueprint.evidenceHierarchy.strong)}

### Moderate evidence
${list(blueprint.evidenceHierarchy.moderate)}

### Early evidence
${list(blueprint.evidenceHierarchy.early)}

### Weak evidence
${list(blueprint.evidenceHierarchy.weak)}

**Ranking rule:** ${blueprint.evidenceHierarchy.rankingRule}
${checkpointV21(blueprint)}
`;
}

export function buildBlueprintAssetFiles(
  blueprint: GhostTownLaunchBlueprint,
  pdf: Uint8Array,
): Array<{ name: string; data: Uint8Array }> {
  const root = "ghosttown-launch-blueprint/";
  const v21 = asV21(blueprint);
  const files: Record<(typeof BLUEPRINT_ASSET_FILENAMES)[number], Uint8Array> =
    {
      "README.md": encoded(
        `# GhostTown Launch Blueprint\n\nAll files in this package were derived from canonical Blueprint ${blueprint.blueprintId} (${blueprint.schemaVersion}${v21 ? `, contract ${v21.contractVersion}` : ""}). The public Launch Site uses this same record; edit the Blueprint generation inputs rather than creating a conflicting copy.${v21 ? `\n\nCanonical source hash: ${v21.generationReceipt.canonicalContract.gitBlobSha1}. Every Factory slice must verify this exact hash before execution.` : ""}\n`,
      ),
      "blueprint.json": encoded(JSON.stringify(blueprint, null, 2)),
      "launch-blueprint.pdf": pdf,
      "executive-summary.md": encoded(
        `# ${blueprint.offer.offerName}\n\n${blueprint.executiveDecision.verdict}\n\n**Initial customer:** ${blueprint.executiveDecision.recommendedInitialCustomer}\n\n**Strongest opportunity:** ${blueprint.executiveDecision.strongestOpportunity}\n\n**Biggest risk:** ${blueprint.executiveDecision.biggestRisk}\n\n**Validation objective:** ${blueprint.executiveDecision.validationObjective}${v21 ? executiveV21(v21) : ""}\n`,
      ),
      "offer-and-pricing.md": encoded(
        `# ${blueprint.offer.offerName}\n\n${blueprint.offer.oneSentencePromise}\n\n**Test price:** ${blueprint.offer.initialTestPrice}\n\n${blueprint.offer.pricingRationale}\n\n## Deliverables\n${blueprint.offer.deliverables.map((item) => `- **${item.name}:** ${item.description}`).join("\n")}${v21 ? offerV21(v21) : ""}\n`,
      ),
      "positioning.md": encoded(
        `# Positioning\n\n${blueprint.positioning.positioningStatement}\n\n**Differentiator:** ${blueprint.positioning.differentiator}\n\n## Not for\n${blueprint.positioning.notFor.map((item) => `- ${item}`).join("\n")}${v21 ? `\n\n## Excluded from the first 30 days\n${list(v21.businessModelLane.intentionallyDeferred)}` : ""}\n`,
      ),
      "media-and-distribution-network.csv": encoded(
        csv([
          [
            "channel_id",
            "type",
            "community",
            "platform",
            "public_url",
            "relevance",
            "confidence",
            "first_action",
            "source_ids",
          ],
          ...blueprint.customerAccessPack.channels.map((channel) => [
            channel.channelId,
            channel.targetType || "",
            channel.community,
            channel.platform,
            channel.publicUrl,
            channel.relevance,
            channel.confidence,
            channel.firstAction,
            channel.sourceIds.join(";"),
          ]),
        ]),
      ),
      "outreach-scripts.md": encoded(
        blueprint.customerAccessPack.outreachScripts
          .map(
            (script) =>
              `## ${script.title}\n\n${script.message}\n\n**Purpose:** ${script.purpose}\n\n**Use when:** ${script.useWhen}`,
          )
          .join("\n\n") +
          (v21
            ? `\n\n# Customer Interview Guide\n\n${v21.customerInterviewGuide.opening}\n\n## Last occurrence\n${list(v21.customerInterviewGuide.lastOccurrenceQuestions)}\n\n## Current workaround\n${list(v21.customerInterviewGuide.currentWorkaroundQuestions)}\n\n## Buying process\n${list(v21.customerInterviewGuide.buyingProcessQuestions)}\n\n# Offer Conversation Guide\n\n${v21.offerConversationGuide.opening}\n\n${v21.offerConversationGuide.offerExplanation}\n\n**Commitment request:** ${v21.offerConversationGuide.commitmentRequest}\n\n**Follow-up agreement:** ${v21.offerConversationGuide.followUpAgreement}`
            : ""),
      ),
      "helpful-posts.md": encoded(
        blueprint.customerAccessPack.helpfulPosts
          .map(
            (post) =>
              `## ${post.title}\n\n${post.body}\n\n${post.closingQuestion}\n\n**Objective:** ${post.objective}`,
          )
          .join("\n\n"),
      ),
      "landing-page-copy.md": encoded(
        `# ${blueprint.landingPageCopy.headline}\n\n${blueprint.landingPageCopy.subheadline}\n\n## Problem\n${blueprint.landingPageCopy.problemSection}\n\n## Offer\n${blueprint.landingPageCopy.offerDescription}\n\n**Price:** ${blueprint.landingPageCopy.pricePresentation}\n\n**CTA:** ${blueprint.landingPageCopy.primaryCallToAction}${v21 ? `\n\n## Validation-stage proof boundary\n${v21.foundingCustomerPilotBrief.proofBoundary}` : ""}\n`,
      ),
      "launch-site-config.json": encoded(
        JSON.stringify(blueprint.launchSite, null, 2),
      ),
      "thirty-day-calendar.csv": encoded(
        csv([
          [
            "day",
            "title",
            "objective",
            "why_it_matters",
            "effort",
            "estimated_minutes",
            "actions",
            "prepared_assets",
            "deliverable",
            "measurement",
            "evidence",
            "if_then_branches",
          ],
          ...blueprint.dailyCalendar.map((day) => {
            const dayV21 = day as Partial<BlueprintDailyActionV21>;
            return [
              day.dayNumber,
              day.title,
              day.primaryObjective,
              dayV21.whyItMatters || day.primaryObjective,
              day.estimatedEffort,
              dayV21.estimatedMinutes || "",
              day.requiredActions.join("; "),
              day.preparedAssets.join("; "),
              day.expectedDeliverable,
              day.successMeasurement,
              day.evidenceToRecord.join("; "),
              (dayV21.ifThenBranches || [])
                .map((branch) => `IF ${branch.condition} THEN ${branch.action}`)
                .join("; "),
            ];
          }),
        ]),
      ),
      "weekly-milestones.md": encoded(
        blueprint.weeklyMilestones
          .map(
            (week) =>
              `## Week ${week.weekNumber}: ${week.objective}\n\n**Milestone:** ${week.milestone}\n\n${week.successMetrics.map((item) => `- ${item}`).join("\n")}`,
          )
          .join("\n\n") + (v21 ? checkpointV21(v21) : ""),
      ),
      "metrics-template.csv": encoded(
        csv([
          ["metric", "value", "evidence_to_record", "evidence_strength"],
          ["outreach_sent", 0, "Recipient, channel, date", "activity only"],
          ["replies", 0, "Reply and source", "early"],
          ["interviews", 0, "Buyer fit and notes", "early"],
          ["qualified_conversations", 0, "Problem and urgency evidence", "moderate"],
          ["commitments", 0, "Commitment type and date", "strong or moderate"],
          ["revenue_cents", 0, "Payment record", "strong"],
          ["founder_hours", 0, "Time log by fulfillment step", "fulfillment evidence"],
          ["variable_cost_cents", 0, "Direct-cost receipt", "fulfillment evidence"],
        ]),
      ),
      "decision-rules.md": encoded(
        blueprint.finalDecision.criteria
          .map(
            (rule) =>
              `## ${rule.decision.toUpperCase()}\n\n${rule.condition}\n\n**Next action:** ${rule.nextAction}`,
          )
          .join("\n\n") + (v21 ? decisionV21(v21) : ""),
      ),
      "sources.csv": encoded(
        csv([
          ["source_id", "title", "url", "publisher", "accessed_at", "supports"],
          ...blueprint.sources.map((source) => [
            source.sourceId,
            source.title,
            source.url,
            source.publisher || "",
            source.accessedAt,
            source.supports.join("; "),
          ]),
        ]),
      ),
    };
  return BLUEPRINT_ASSET_FILENAMES.map((name) => ({
    name: `${root}${name}`,
    data: files[name],
  }));
}

export function buildBlueprintAssetZip(
  blueprint: GhostTownLaunchBlueprint,
  pdf: Uint8Array,
): Uint8Array {
  return createZip(buildBlueprintAssetFiles(blueprint, pdf));
}

function createZip(
  files: Array<{ name: string; data: Uint8Array }>,
): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x800, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    chunks.push(local, file.data);
    const entry = new Uint8Array(46 + name.length);
    const entryView = new DataView(entry.buffer);
    entryView.setUint32(0, 0x02014b50, true);
    entryView.setUint16(4, 20, true);
    entryView.setUint16(6, 20, true);
    entryView.setUint16(8, 0x800, true);
    entryView.setUint32(16, crc, true);
    entryView.setUint32(20, file.data.length, true);
    entryView.setUint32(24, file.data.length, true);
    entryView.setUint16(28, name.length, true);
    entryView.setUint32(42, offset, true);
    entry.set(name, 46);
    central.push(entry);
    offset += local.length + file.data.length;
  }
  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return join([...chunks, ...central, end]);
}

function join(items: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    items.reduce((sum, item) => sum + item.length, 0),
  );
  let offset = 0;
  for (const item of items) {
    output.set(item, offset);
    offset += item.length;
  }
  return output;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}