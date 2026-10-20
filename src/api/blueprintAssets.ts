import type { GhostTownLaunchBlueprint } from "../types/launchBlueprint";
import type {
  BlueprintDailyActionV21,
  GhostTownLaunchBlueprintV21,
} from "../types/launchBlueprintV21";
import { researchEvidenceRole } from "./researchEvidenceRole";
import { DEFAULT_GET_ME_LIVE_DISPLAY_PRICE } from "../lib/getMeLiveOffer";
import { BLUEPRINT_DOCUMENT_COPY, BLUEPRINT_GENERATOR_FOUNDER_COPY, type BlueprintDocumentCopy } from "../lib/blueprintFixedCopy";
import type { Locale } from "../lib/locale";

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
  "get-me-live-handoff.md",
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

function communityResearchMarkdown(
  blueprint: GhostTownLaunchBlueprintV21 | null,
  z: BlueprintDocumentCopy["zip"],
): string {
  const research = blueprint?.communityResearch;
  if (!research) return "";
  const c = z.community;
  const quotes = new Map(
    research.observations.map((item) => [item.observationId, item]),
  );
  const quoteLines = (ids: string[]) =>
    ids
      .map((id) => quotes.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => `> "${item.quote}"\n> ${item.community}: ${item.url}`)
      .join("\n\n");
  const problems = research.problems
    .map(
      (problem) =>
        `## ${problem.title}\n\n**${c.whyThisMatters}:** ${problem.whyItMatters}\n\n**${c.who}:** ${problem.who}\n\n**${c.when}:** ${problem.when}\n\n**${c.workaround}:** ${problem.currentWorkaround}\n\n${quoteLines(problem.observationIds)}${problem.contradictingObservationIds.length ? `\n\n**${c.against}**\n\n${quoteLines(problem.contradictingObservationIds)}` : ""}\n\n**${c.askNext}:** ${problem.whatToAskNext}\n\n**${c.changePlan}:** ${problem.whatWouldChangePlan}`,
    )
    .join("\n\n");
  const gaps = research.gaps.length
    ? `\n\n## ${c.gaps}\n\n${list(research.gaps.map((gap) => `${gap.community} (${gap.url}): ${gap.reason}`))}`
    : "";
  return `# ${c.title}\n\n${research.boundary}\n\n${problems || c.noQuote}${gaps}\n\n# ${c.helpfulPosts}\n\n`;
}

function asV21(
  blueprint: GhostTownLaunchBlueprint,
): GhostTownLaunchBlueprintV21 | null {
  return blueprint.blueprintVersion === "2.1" && "contractVersion" in blueprint
    ? (blueprint as GhostTownLaunchBlueprintV21)
    : null;
}

function executiveV21(blueprint: GhostTownLaunchBlueprintV21, copy: BlueprintDocumentCopy): string {
  const audit = blueprint.startingStateAudit;
  const launchCard = blueprint.launchCard48Hour;
  const z = copy.zip;
  const label = (value: keyof BlueprintDocumentCopy["truthLabel"]) => copy.truthLabel[value] ?? value;
  return `

## ${z.launchCard}

**${z.firstCustomer}:** ${launchCard.firstCustomer}

**${z.firstOffer}:** ${launchCard.firstOffer}

**${z.firstCommitmentRequest}:** ${launchCard.firstCommitmentRequest}

### ${z.firstThreeApproaches}
${launchCard.firstThreeApproaches
  .map(
    (approach, index) =>
      `${index + 1}. **${approach.name}** — ${approach.firstAction} (${approach.publicUrl})`,
  )
  .join("\n")}

### ${z.exactFirstMessage}

${launchCard.exactFirstMessage}

## ${z.startingState}

**${z.currentStage}:** ${audit.currentStage.statement} [${label(audit.currentStage.truthLabel)}]

**${z.existingOffer}:** ${audit.existingOffer.statement} [${label(audit.existingOffer.truthLabel)}]

**${z.existingLandingPage}:** ${audit.existingLandingPage.statement} [${label(audit.existingLandingPage.truthLabel)}]

**${z.previousOutreach}:** ${audit.previousOutreach.statement} [${label(audit.previousOutreach.truthLabel)}]

### ${z.criticalTests}
${audit.criticalTests
  .map(
    (test) =>
      `- **${test.assumption}:** ${test.evidenceRequired} ${z.failureConsequence} ${test.failureConsequence}`,
  )
  .join("\n")}

## ${z.contractReceipt}

- ${z.contractVersion}: ${blueprint.contractVersion}
- ${z.canonicalSha}: ${blueprint.generationReceipt.canonicalContract.gitBlobSha1}
- ${z.source}: ${blueprint.generationReceipt.canonicalContract.sourcePath}
- ${z.changeRecord}: ${blueprint.generationReceipt.canonicalContract.changeRecordPath}
- ${z.evidenceManifest}: ${blueprint.generationReceipt.canonicalContract.evidenceManifestPath}
`;
}

function offerV21(blueprint: GhostTownLaunchBlueprintV21, z: BlueprintDocumentCopy["zip"], founder: Locale): string {
  const revenue = blueprint.firstRevenuePath;
  const fulfillment = blueprint.manualFulfillmentPlan;
  const brief = blueprint.foundingCustomerPilotBrief;
  const lane = blueprint.businessModelLane.lane;
  const laneLabel = BLUEPRINT_GENERATOR_FOUNDER_COPY[founder].laneLabel[lane] ?? lane.replace(/_/g, " ");
  return `

## ${z.laneHeading}

**${z.lane}:** ${laneLabel}

${blueprint.businessModelLane.rationale}

**${z.firstMeaningfulTest}:** ${blueprint.businessModelLane.firstMeaningfulTest}

**${z.earliestAsk}:** ${z.day(blueprint.businessModelLane.earliestCommercialAskDay)}

## ${z.revenueHeading}

- **${z.firstBuyer}:** ${revenue.firstBuyer}
- **${z.firstChannel}:** ${revenue.firstChannel}
- **${z.firstPrice}:** ${revenue.firstPrice}
- **${z.targetDay}:** ${revenue.targetDay}
- **${z.minimumAsks}:** ${revenue.minimumQualifiedAsks}
- **${z.successThreshold}:** ${revenue.successThreshold}

### ${z.firstAsk}

${revenue.firstAsk}

### ${z.requiredProof}
${list(revenue.requiredProof)}

### ${z.followUpSequence}
${list(revenue.followUpSequence)}

## ${z.fulfillmentHeading}

**${z.expectedDeliveryTime}:** ${fulfillment.expectedDeliveryTime}

**${z.capacityPerWeek}:** ${fulfillment.capacityPerWeek}

**${z.founderHours}:** ${fulfillment.estimatedFounderHours}

**${z.variableCost}:** ${fulfillment.estimatedVariableCost}

**${z.grossMargin}:** ${fulfillment.grossMarginGuardrail}

### ${z.qualityChecklist}
${list(fulfillment.qualityChecklist)}

### ${z.intentionallyManual}
${list(fulfillment.intentionallyManual)}

## ${z.pilotBrief}

**${z.problem}:** ${brief.problem}

**${z.scope}:** ${brief.scope}

**${z.timeline}:** ${brief.timeline}

**${z.price}:** ${brief.price}

**${z.proofBoundary}:** ${brief.proofBoundary}

**${z.nextStep}:** ${brief.nextStep}
`;
}

function checkpointV21(blueprint: GhostTownLaunchBlueprintV21, z: BlueprintDocumentCopy["zip"]): string {
  return `

## ${z.checkpointsHeading}

${blueprint.adaptiveCheckpoints
  .map(
    (checkpoint) => `### ${z.day(checkpoint.dayNumber)}: ${checkpoint.title}

**${z.questions}**
${list(checkpoint.questions)}

**${z.evidenceRequired}**
${list(checkpoint.evidenceRequired)}

**${z.branches}**
${checkpoint.branches
  .map((branch) => z.branchLine(branch.condition, branch.action))
  .join("\n")}`,
  )
  .join("\n\n")}
`;
}

function decisionV21(blueprint: GhostTownLaunchBlueprintV21, z: BlueprintDocumentCopy["zip"]): string {
  return `

## ${z.hierarchyHeading}

### ${z.strong}
${list(blueprint.evidenceHierarchy.strong)}

### ${z.moderate}
${list(blueprint.evidenceHierarchy.moderate)}

### ${z.early}
${list(blueprint.evidenceHierarchy.early)}

### ${z.weak}
${list(blueprint.evidenceHierarchy.weak)}

**${z.rankingRule}:** ${blueprint.evidenceHierarchy.rankingRule}
${checkpointV21(blueprint, z)}
`;
}

export function buildBlueprintAssetFiles(
  blueprint: GhostTownLaunchBlueprint,
  pdf: Uint8Array,
): Array<{ name: string; data: Uint8Array }> {
  const root = "ghosttown-launch-blueprint/";
  const v21 = asV21(blueprint);
  // Headings follow the founder's language; file names and CSV column keys stay fixed.
  const founder: Locale = v21?.languages?.founder ?? "en";
  const copy = BLUEPRINT_DOCUMENT_COPY[founder];
  const z = copy.zip;
  const files: Record<(typeof BLUEPRINT_ASSET_FILENAMES)[number], Uint8Array> =
    {
      "README.md": encoded(
        z.readme({ blueprintId: blueprint.blueprintId, schemaVersion: blueprint.schemaVersion, contractVersion: v21?.contractVersion, sha: v21?.generationReceipt.canonicalContract.gitBlobSha1 }),
      ),
      "blueprint.json": encoded(JSON.stringify(blueprint, null, 2)),
      "launch-blueprint.pdf": pdf,
      "executive-summary.md": encoded(
        `# ${blueprint.offer.offerName}\n\n${blueprint.executiveDecision.verdict}\n\n**${z.initialCustomer}:** ${blueprint.executiveDecision.recommendedInitialCustomer}\n\n**${z.strongestOpportunity}:** ${blueprint.executiveDecision.strongestOpportunity}\n\n**${z.biggestRisk}:** ${blueprint.executiveDecision.biggestRisk}\n\n**${z.validationObjective}:** ${blueprint.executiveDecision.validationObjective}${v21 ? executiveV21(v21, copy) : ""}\n`,
      ),
      "offer-and-pricing.md": encoded(
        `# ${blueprint.offer.offerName}\n\n${blueprint.offer.oneSentencePromise}\n\n**${z.testPrice}:** ${blueprint.offer.initialTestPrice}\n\n${blueprint.offer.pricingRationale}\n\n## ${z.deliverables}\n${blueprint.offer.deliverables.map((item) => `- **${item.name}:** ${item.description}`).join("\n")}${v21 ? offerV21(v21, z, founder) : ""}\n`,
      ),
      "positioning.md": encoded(
        `# ${z.positioning}\n\n${blueprint.positioning.positioningStatement}\n\n**${z.differentiator}:** ${blueprint.positioning.differentiator}\n\n## ${z.notFor}\n${blueprint.positioning.notFor.map((item) => `- ${item}`).join("\n")}${v21 ? `\n\n## ${z.excluded}\n${list(v21.businessModelLane.intentionallyDeferred)}` : ""}\n`,
      ),
      "media-and-distribution-network.csv": encoded(
        csv([
          [
            "channel_id",
            "type",
            "evidence_role",
            "role_boundary",
            "community",
            "platform",
            "public_url",
            "relevance",
            "evidence_date",
            "evidence_recency",
            "research_date",
            "current_activity_status",
            "current_activity_verified_at",
            "current_activity_evidence",
            "evidence_confidence",
            "first_action",
            "source_ids",
          ],
          ...blueprint.customerAccessPack.channels.map((channel) => [
            channel.channelId,
            channel.targetType || "",
            researchEvidenceRole(channel),
            channel.evidenceRoleReason || "",
            channel.community,
            channel.platform,
            channel.publicUrl,
            channel.relevance,
            channel.evidenceDate || "",
            channel.evidenceRecency || "unknown",
            channel.researchDate,
            channel.currentActivityStatus || "unverified",
            channel.currentActivityVerifiedAt || "",
            channel.currentActivityEvidence || z.currentActivityMissing,
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
              `## ${script.title}\n\n${script.message}\n\n**${z.purpose}:** ${script.purpose}\n\n**${z.useWhen}:** ${script.useWhen}`,
          )
          .join("\n\n") +
          (v21
            ? `\n\n# ${z.interviewGuide}\n\n${v21.customerInterviewGuide.opening}\n\n## ${z.lastOccurrence}\n${list(v21.customerInterviewGuide.lastOccurrenceQuestions)}\n\n## ${z.currentWorkaround}\n${list(v21.customerInterviewGuide.currentWorkaroundQuestions)}\n\n## ${z.buyingProcess}\n${list(v21.customerInterviewGuide.buyingProcessQuestions)}\n\n# ${z.offerGuide}\n\n${v21.offerConversationGuide.opening}\n\n${v21.offerConversationGuide.offerExplanation}\n\n**${z.commitmentRequest}:** ${v21.offerConversationGuide.commitmentRequest}\n\n**${z.followUpAgreement}:** ${v21.offerConversationGuide.followUpAgreement}`
            : ""),
      ),
      "helpful-posts.md": encoded(
        communityResearchMarkdown(v21, z) +
        blueprint.customerAccessPack.helpfulPosts
          .map(
            (post) =>
              `## ${post.title}\n\n${post.body}\n\n${post.closingQuestion}\n\n**${z.objective}:** ${post.objective}`,
          )
          .join("\n\n"),
      ),
      "landing-page-copy.md": encoded(
        `# ${blueprint.landingPageCopy.headline}\n\n${blueprint.landingPageCopy.subheadline}\n\n## ${z.landingProblem}\n${blueprint.landingPageCopy.problemSection}\n\n## ${z.landingOffer}\n${blueprint.landingPageCopy.offerDescription}\n\n**${z.landingPrice}:** ${blueprint.landingPageCopy.pricePresentation}\n\n**${z.cta}:** ${blueprint.landingPageCopy.primaryCallToAction}${v21 ? `\n\n## ${z.landingProofBoundary}\n${v21.foundingCustomerPilotBrief.proofBoundary}` : ""}\n`,
      ),
      "get-me-live-handoff.md": encoded(
        z.getMeLive({ price: DEFAULT_GET_ME_LIVE_DISPLAY_PRICE.replace(".00", ""), customer: blueprint.offer.targetCustomer, offer: blueprint.offer.offerName, promise: blueprint.offer.oneSentencePromise, firstCommitment: v21 ? v21.firstRevenuePath.firstAsk : blueprint.offer.oneSentencePromise }),
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
            "packet_action_ids",
            "asset_ids",
            "failure_threshold",
            "completion_definition",
            "asset_lineage",
            "finished_asset_content",
          ],
          ...blueprint.dailyCalendar.map((day) => {
            const dayV21 = day as Partial<BlueprintDailyActionV21>;
            const packet = dayV21.executionPacket;
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
                .map((branch) => z.ifThen(branch.condition, branch.action))
                .join("; "),
              packet?.actions.map(action => action.actionId).join("; ") || "",
              packet?.assets.map(asset => asset.assetId).join("; ") || "",
              packet?.failureThreshold || "",
              packet?.completionDefinition || "",
              packet?.assets.map(asset => `${asset.lineage.blueprintId}:${asset.lineage.sourceVerdictId}`).join("; ") || "",
              packet?.assets.map(asset => asset.finishedContent).join("\n\n---\n\n") || "",
            ];
          }),
        ]),
      ),
      "weekly-milestones.md": encoded(
        blueprint.weeklyMilestones
          .map(
            (week) =>
              `## ${z.week(week.weekNumber, week.objective)}\n\n**${z.milestone}:** ${week.milestone}\n\n${week.successMetrics.map((item) => `- ${item}`).join("\n")}`,
          )
          .join("\n\n") + (v21 ? checkpointV21(v21, z) : ""),
      ),
      "metrics-template.csv": encoded(
        csv([
          ["metric", "value", "evidence_to_record", "evidence_strength"],
          ...["outreach_sent", "replies", "interviews", "qualified_conversations", "commitments", "revenue_cents", "founder_hours", "variable_cost_cents"]
            .map((metric, index) => [metric, 0, z.metricsEvidence[index], z.metricsStrength[index]]),
        ]),
      ),
      "decision-rules.md": encoded(
        blueprint.finalDecision.criteria
          .map(
            (rule) =>
              `## ${copy.decision(rule.decision)}\n\n${rule.condition}\n\n**${z.nextAction}:** ${rule.nextAction}`,
          )
          .join("\n\n") + (v21 ? decisionV21(v21, z) : ""),
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
