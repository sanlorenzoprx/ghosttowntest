import type { VertexAssetGeneration } from './launchBlueprintVertexPipeline';

function nonEmptyText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function nonEmptyTextArray(values: unknown): values is string[] {
  return Array.isArray(values) && values.length > 0 && values.every(nonEmptyText);
}

/**
 * Stage 3 may only be recorded as successful when every generated day carries
 * the customer-usable fields that the canonical Blueprint release gate requires.
 * The deterministic draft still owns deliverables and branch rules; Vertex is
 * responsible for returning usable action wording, prepared assets,
 * measurements, evidence instructions, rationale, and bounded effort.
 */
export function assertVertexDailyAssetCompleteness(data: VertexAssetGeneration): void {
  for (const day of data.dailyActions) {
    if (!nonEmptyText(day.title)) {
      throw new Error(`Vertex Blueprint Day ${day.dayNumber} is missing a title`);
    }
    if (!nonEmptyTextArray(day.requiredActions)) {
      throw new Error(`Vertex Blueprint Day ${day.dayNumber} is missing required actions`);
    }
    if (!nonEmptyTextArray(day.preparedAssets)) {
      throw new Error(`Vertex Blueprint Day ${day.dayNumber} is missing prepared assets`);
    }
    if (!nonEmptyText(day.successMeasurement)) {
      throw new Error(`Vertex Blueprint Day ${day.dayNumber} is missing a success measurement`);
    }
    if (!nonEmptyTextArray(day.evidenceToRecord)) {
      throw new Error(`Vertex Blueprint Day ${day.dayNumber} is missing evidence to record`);
    }
    if (!nonEmptyText(day.whyItMatters)) {
      throw new Error(`Vertex Blueprint Day ${day.dayNumber} is missing why it matters`);
    }
    if (!Number.isFinite(day.estimatedMinutes) || day.estimatedMinutes < 10 || day.estimatedMinutes > 240) {
      throw new Error(`Vertex Blueprint Day ${day.dayNumber} estimated minutes must be between 10 and 240`);
    }
  }
}
