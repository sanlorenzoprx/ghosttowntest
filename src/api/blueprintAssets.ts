import type { GhostTownLaunchBlueprint } from "../types/launchBlueprint";

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

export function buildBlueprintAssetFiles(
  blueprint: GhostTownLaunchBlueprint,
  pdf: Uint8Array,
): Array<{ name: string; data: Uint8Array }> {
  const root = "ghosttown-launch-blueprint/";
  const files: Record<(typeof BLUEPRINT_ASSET_FILENAMES)[number], Uint8Array> =
    {
      "README.md": encoded(
        `# GhostTown Launch Blueprint\n\nAll files in this package were derived from canonical Blueprint ${blueprint.blueprintId} (${blueprint.schemaVersion}). The public Launch Site uses this same record; edit the Blueprint generation inputs rather than creating a conflicting copy.\n`,
      ),
      "blueprint.json": encoded(JSON.stringify(blueprint, null, 2)),
      "launch-blueprint.pdf": pdf,
      "executive-summary.md": encoded(
        `# ${blueprint.offer.offerName}\n\n${blueprint.executiveDecision.verdict}\n\n**Initial customer:** ${blueprint.executiveDecision.recommendedInitialCustomer}\n\n**Strongest opportunity:** ${blueprint.executiveDecision.strongestOpportunity}\n\n**Biggest risk:** ${blueprint.executiveDecision.biggestRisk}\n\n**Validation objective:** ${blueprint.executiveDecision.validationObjective}\n`,
      ),
      "offer-and-pricing.md": encoded(
        `# ${blueprint.offer.offerName}\n\n${blueprint.offer.oneSentencePromise}\n\n**Test price:** ${blueprint.offer.initialTestPrice}\n\n${blueprint.offer.pricingRationale}\n\n## Deliverables\n${blueprint.offer.deliverables.map((item) => `- **${item.name}:** ${item.description}`).join("\n")}\n`,
      ),
      "positioning.md": encoded(
        `# Positioning\n\n${blueprint.positioning.positioningStatement}\n\n**Differentiator:** ${blueprint.positioning.differentiator}\n\n## Not for\n${blueprint.positioning.notFor.map((item) => `- ${item}`).join("\n")}\n`,
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
          .join("\n\n"),
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
        `# ${blueprint.landingPageCopy.headline}\n\n${blueprint.landingPageCopy.subheadline}\n\n## Problem\n${blueprint.landingPageCopy.problemSection}\n\n## Offer\n${blueprint.landingPageCopy.offerDescription}\n\n**Price:** ${blueprint.landingPageCopy.pricePresentation}\n\n**CTA:** ${blueprint.landingPageCopy.primaryCallToAction}\n`,
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
            "effort",
            "actions",
            "prepared_assets",
            "deliverable",
            "measurement",
            "evidence",
          ],
          ...blueprint.dailyCalendar.map((day) => [
            day.dayNumber,
            day.title,
            day.primaryObjective,
            day.estimatedEffort,
            day.requiredActions.join("; "),
            day.preparedAssets.join("; "),
            day.expectedDeliverable,
            day.successMeasurement,
            day.evidenceToRecord.join("; "),
          ]),
        ]),
      ),
      "weekly-milestones.md": encoded(
        blueprint.weeklyMilestones
          .map(
            (week) =>
              `## Week ${week.weekNumber}: ${week.objective}\n\n**Milestone:** ${week.milestone}\n\n${week.successMetrics.map((item) => `- ${item}`).join("\n")}`,
          )
          .join("\n\n"),
      ),
      "metrics-template.csv": encoded(
        csv([
          ["metric", "value", "evidence_to_record"],
          ["outreach_sent", 0, "Recipient, channel, date"],
          ["replies", 0, "Reply and source"],
          ["interviews", 0, "Buyer fit and notes"],
          ["qualified_conversations", 0, "Problem and urgency evidence"],
          ["commitments", 0, "Commitment type and date"],
          ["revenue_cents", 0, "Payment record"],
        ]),
      ),
      "decision-rules.md": encoded(
        blueprint.finalDecision.criteria
          .map(
            (rule) =>
              `## ${rule.decision.toUpperCase()}\n\n${rule.condition}\n\n**Next action:** ${rule.nextAction}`,
          )
          .join("\n\n"),
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
