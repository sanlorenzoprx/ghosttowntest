import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const executionSource = readFileSync(new URL('../src/components/LaunchBlueprintExecutionHomeV21.tsx', import.meta.url), 'utf8');
const routerSource = readFileSync(new URL('../src/components/LaunchBlueprintRouter.tsx', import.meta.url), 'utf8');
const offerSource = readFileSync(new URL('../src/lib/ghosttownOffer.ts', import.meta.url), 'utf8');
const landingSource = readFileSync(new URL('../src/components/LandingCommercial.tsx', import.meta.url), 'utf8');
const amendmentSource = readFileSync(new URL('../docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_5_CHANGE_RECORD.md', import.meta.url), 'utf8');

describe('Blueprint v2.1.5 guided daily execution amendment', () => {
  it('routes the paid v2.1 customer through the 30-day execution home without removing the canonical workspace', () => {
    expect(routerSource).toContain('LaunchBlueprintExecutionHomeV21');
    expect(routerSource).toContain('return <LaunchBlueprintExecutionHomeV21');
    expect(routerSource).toContain('return <LaunchBlueprintViewV21');
  });

  it('makes the calendar the primary guided execution interface', () => {
    expect(executionSource).toContain("useState<ExecutionMode>('calendar')");
    expect(executionSource).toContain('Your primary execution interface');
    expect(executionSource).toContain('Every day is a doorway into the work.');
    expect(executionSource).toContain('Open the day. Use the prepared assets. Record what happened. Keep moving.');
    expect(executionSource).toContain('blueprint.dailyCalendar.find(day => !completed.has(day.dayNumber))');
    expect(executionSource).toContain("setSelectedDay(dayNumber)");
  });

  it('surfaces daily assets, evidence inputs, and decision context in the selected day', () => {
    expect(executionSource).toContain('Prepared for this day');
    expect(executionSource).toContain('Open the asset here. Do the work here.');
    expect(executionSource).toContain('Exact actions');
    expect(executionSource).toContain('Exact targets');
    expect(executionSource).toContain('Decision context');
    expect(executionSource).toContain('Failure threshold');
    expect(executionSource).toContain('Complete when:');
    expect(executionSource).toContain('Evidence to record');
    expect(executionSource).toContain('Execution note');
    expect(executionSource).toContain('If / then routing');
  });

  it('keeps checkpoint decisions and assets independently accessible', () => {
    expect(executionSource).toContain('evidence checkpoint');
    expect(executionSource).toContain('Questions to answer');
    expect(executionSource).toContain('Decision branches');
    expect(executionSource).toContain('Asset Library');
    expect(executionSource).toContain('Independent asset access');
    expect(executionSource).toContain('Export all assets');
    expect(executionSource).toContain('Download Blueprint PDF');
  });

  it('preserves commercial measurement for daily engagement and progression', () => {
    expect(executionSource).toContain("recordCommercialEvent('daily_packet_opened'");
    expect(executionSource).toContain("recordCommercialEvent('day_completed'");
    expect(executionSource).toContain('/blueprint/progress');
  });

  it('puts the guided calendar promise on the commercial landing page through the shared paid offer', () => {
    expect(offerSource).toContain('Your guided 30-day idea-to-evidence execution system');
    expect(offerSource).toContain('Guided 30-day execution calendar that opens each day’s exact actions, prepared assets, evidence prompts, and decision context');
    expect(offerSource).toContain('Prepared assets stay openable, editable, and exportable from your account');
    expect(landingSource).toContain('[...GHOSTTOWN_30_DAY_PLAN_V1.customerPromise]');
  });

  it('records the product decision without weakening the existing artifact or release gates', () => {
    expect(amendmentSource).toContain('The 30-Day Calendar is the primary execution interface for the paid GhostTown Launch Blueprint.');
    expect(amendmentSource).toContain('The PDF and asset bundle remain durable exports and recovery artifacts.');
    expect(amendmentSource).toContain('Gate 36 as an explicit human production-release decision');
    expect(amendmentSource).toContain('616c691e6b4c9cea93615963a07375d13ffba57f');
  });
});
