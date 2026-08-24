import { describe, expect, it } from 'vitest';
import type { VertexAssetGeneration } from '../src/api/launchBlueprintVertexPipeline';
import { assertVertexDailyAssetCompleteness } from '../src/api/launchBlueprintVertexAssetGuard';

function dailyActions(): VertexAssetGeneration['dailyActions'] {
  return Array.from({ length: 30 }, (_, index) => ({
    dayNumber: index + 1,
    title: `Day ${index + 1}`,
    requiredActions: ['Complete the bounded action.'],
    preparedAssets: ['Prepared outreach or evidence asset.'],
    successMeasurement: 'Record one measurable result.',
    evidenceToRecord: ['Exact observed behavior.'],
    whyItMatters: 'This reduces one named uncertainty.',
    estimatedMinutes: 45
  }));
}

describe('Vertex Stage 3 daily asset guard', () => {
  it('accepts a complete 30-day generated asset set', () => {
    expect(() => assertVertexDailyAssetCompleteness({ dailyActions: dailyActions() } as VertexAssetGeneration)).not.toThrow();
  });

  it('rejects the live acceptance failure shape before Stage 3 can be recorded successful', () => {
    const days = dailyActions();
    days[16] = { ...days[16], preparedAssets: [] };
    expect(() => assertVertexDailyAssetCompleteness({ dailyActions: days } as VertexAssetGeneration))
      .toThrow('Vertex Blueprint Day 17 is missing prepared assets');
  });
});
