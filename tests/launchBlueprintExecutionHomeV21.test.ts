import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const executionSource = readFileSync(new URL('../src/components/LaunchBlueprintExecutionHomeV21.tsx', import.meta.url), 'utf8');
const progressApiSource = readFileSync(new URL('../src/api/blueprintApiMeasurement.ts', import.meta.url), 'utf8');
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
    expect(executionSource).toContain('setSelectedDay(dayNumber)');
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
    expect(executionSource).toContain('Review required');
    expect(executionSource).toContain('Evidence route from Day');
    expect(executionSource).toContain('Asset Library');
    expect(executionSource).toContain('Independent asset access');
    expect(executionSource).toContain('Export all assets');
    expect(executionSource).toContain('Download Blueprint PDF');
  });

  it('fails closed on completion without required evidence or checkpoint review', () => {
    expect(executionSource).toContain('dayCompletionReadiness');
    expect(executionSource).toContain('Before Day {activeDay.dayNumber} can be completed:');
    expect(executionSource).toContain("disabled={!completed.has(activeDay.dayNumber) && !activeCompletion.ready}");
    expect(progressApiSource).toContain('completionTransitionFailures');
    expect(progressApiSource).toContain('Execution day completion requirements are not satisfied');
    expect(progressApiSource).toContain('status: 409');
  });

  it('preserves unsynced calendar work and refreshes progress after the structured workspace', () => {
    expect(executionSource).toContain('ghosttown-blueprint-progress-pending:');
    expect(executionSource).toContain('Unsynced execution changes were restored on this device');
    expect(executionSource).toContain('returnFromWorkspace');
    expect(executionSource).toContain("method: 'POST'");
    expect(executionSource).toContain("headers: authHeaders()");
    expect(executionSource).toContain('Latest execution progress could not be loaded');
  });

  it('reads a separately purchased Get Me Live website as optional daily evidence', () => {
    expect(executionSource).toContain("import SprintWebsiteEvidence from './SprintWebsiteEvidence'");
    expect(executionSource).toContain('dayNumber={activeDay.dayNumber}');
    expect(executionSource).toContain('checkpointDay={activeCheckpoint?.dayNumber}');
  });

  it('starts blob downloads before revoking their object URLs', () => {
    expect(executionSource).toContain('document.body.appendChild(anchor)');
    expect(executionSource).toContain('anchor.remove()');
    expect(executionSource).toContain('window.setTimeout(() => URL.revokeObjectURL(href), 1000)');
    expect(executionSource).not.toContain('anchor.click();\n  URL.revokeObjectURL(href);');
  });

  it('preserves commercial measurement without emitting completion before persistence succeeds', () => {
    expect(executionSource).toContain("recordCommercialEvent('daily_packet_opened'");
    expect(executionSource).toContain("recordCommercialEvent('day_completed'");
    expect(executionSource).toContain('const saved = await persist(nextProgress, { dayNumber, completed: !wasComplete })');
    expect(executionSource).toContain('if (saved && !wasComplete)');
    expect(executionSource).toContain('/blueprint/progress');
  });

  it('puts the plain-language interactive promise on the commercial landing page through the shared paid offer', () => {
    expect(offerSource).toContain('Your 30-day plan, one clear next step at a time');
    expect(offerSource).toContain('Open GhostTown each day and see what to do next');
    expect(offerSource).toContain('Get reminders for your next step, follow-up, or weekly check-in');
    expect(offerSource).toContain('Tell GhostTown what happened and get help deciding what to do next');
    expect(offerSource).toContain('Start with up to three useful examples GhostTown finds for your market');
    expect(offerSource).toContain('Keep your plan, work, and files together in your account');
    expect(landingSource).toContain('[...GHOSTTOWN_30_DAY_PLAN_V1.customerPromise]');
  });

  it('records the product decision without weakening the existing artifact or release gates', () => {
    expect(amendmentSource).toContain('The 30-Day Calendar is the primary execution interface for the paid GhostTown Launch Blueprint.');
    expect(amendmentSource).toContain('The PDF and asset bundle remain durable exports and recovery artifacts.');
    expect(amendmentSource).toContain('Gate 36 as an explicit human production-release decision');
    expect(amendmentSource).toContain('616c691e6b4c9cea93615963a07375d13ffba57f');
  });
});
