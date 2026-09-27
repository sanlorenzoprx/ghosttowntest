import { describe, expect, it } from 'vitest';
import { synchronizeDailyExecutionPackets } from '../src/api/launchBlueprintDailyExecution';
import { checkoutAccessibilityBlueprintFixture, checkoutAccessibilityVerdict } from './fixtures/checkoutAccessibilityBlueprint';

describe('product-specific daily execution synchronization', () => {
  it('preserves Vertex-authored daily strategy while adding deterministic packet structure', () => {
    const base = checkoutAccessibilityBlueprintFixture();
    const vertexDraft = {
      ...base,
      dailyCalendar: base.dailyCalendar.map(day => ({
        ...day,
        title: `Vertex Day ${day.dayNumber}: checkout-specific strategy`,
        primaryObjective: `Vertex objective ${day.dayNumber}: validate checkout buyer behavior`,
        requiredActions: [`Vertex action ${day.dayNumber}: perform the checkout-specific evidence task`],
        preparedAssets: [`Vertex prepared asset ${day.dayNumber}`],
        successMeasurement: `Vertex success ${day.dayNumber}: one observable checkout signal`,
        evidenceToRecord: [`Vertex evidence ${day.dayNumber}: exact buyer response`],
        whyItMatters: `Vertex why ${day.dayNumber}: this resolves a checkout-specific uncertainty`,
        estimatedMinutes: 31 + day.dayNumber
      }))
    };
    const synchronized = synchronizeDailyExecutionPackets(vertexDraft, checkoutAccessibilityVerdict, true);

    for (const day of synchronized.dailyCalendar) {
      expect(day.title).toBe(`Vertex Day ${day.dayNumber}: checkout-specific strategy`);
      expect(day.primaryObjective).toContain(`Vertex objective ${day.dayNumber}`);
      expect(day.requiredActions).toEqual([`Vertex action ${day.dayNumber}: perform the checkout-specific evidence task`]);
      expect(day.preparedAssets).toEqual([`Vertex prepared asset ${day.dayNumber}`]);
      expect(day.successMeasurement).toContain(`Vertex success ${day.dayNumber}`);
      expect(day.evidenceToRecord).toEqual([`Vertex evidence ${day.dayNumber}: exact buyer response`]);
      expect(day.whyItMatters).toContain(`Vertex why ${day.dayNumber}`);
      expect(day.estimatedMinutes).toBe(31 + day.dayNumber);
      expect(day.executionPacket?.title).toBe(day.title);
      expect(day.executionPacket?.objective).toBe(day.primaryObjective);
      expect(day.executionPacket?.actions.map(action => action.instruction)).toEqual(day.requiredActions);
    }
  });

  it('routes outreach days through verified current Customer Access channels', () => {
    const output = checkoutAccessibilityBlueprintFixture();
    for (const dayNumber of [1, 4, 10, 11, 16, 17, 18, 19, 26, 27]) {
      const packet = output.dailyCalendar[dayNumber - 1].executionPacket!;
      const channels = packet.targets.filter(target => target.kind === 'verified_channel');
      expect(channels.length, `Day ${dayNumber} must declare a verified channel target`).toBeGreaterThanOrEqual(1);
      expect(channels.every(target => Boolean(target.channelId) && target.publicUrl?.startsWith('https://'))).toBe(true);
      expect(packet.assets[0].targetChannel).toBeTruthy();
    }
  });

  it('keeps Get Me Live / Launch Site implementation out of the $97 daily plan', () => {
    const output = checkoutAccessibilityBlueprintFixture();
    const day12 = JSON.stringify(output.dailyCalendar[11]);
    expect(day12).toContain('Offer Evidence Consistency Checklist');
    expect(day12).not.toMatch(/Launch Site Activation|Open the existing validation-stage Launch Site|validation-site URL|source-code review/i);
    expect(output.dailyCalendar[11].executionPacket?.targets.some(target => target.kind === 'launch_site')).toBe(false);
  });

  it('uses consumer-safe discovery wording for a physical-product lane', () => {
    const base = checkoutAccessibilityBlueprintFixture();
    const consumer = synchronizeDailyExecutionPackets({
      ...base,
      businessModelLane: { ...base.businessModelLane, lane: 'physical_product' },
      offer: {
        ...base.offer,
        targetCustomer: 'Families choosing a game for mixed ages',
        painfulProblem: 'Families buy games that do not fit the people playing'
      }
    });
    const discovery = consumer.dailyCalendar[3].executionPacket?.assets[0].finishedContent || '';
    expect(discovery).toContain('what did you use instead');
    expect(discovery).not.toMatch(/your team|team uses/i);
  });
});
