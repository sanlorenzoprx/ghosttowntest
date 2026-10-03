import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  new URL('../.github/workflows/acceptance.yml', import.meta.url),
  'utf8',
);

describe('staged pre-live acceptance workflow', () => {
  it('keeps customer journey stages independent after the shared fixture is ready', () => {
    for (const stage of [
      'id: front_door',
      'id: sprint',
      'id: get_me_live',
      'id: owner_controls',
    ]) {
      expect(workflow).toContain(stage);
    }

    expect(workflow.match(/continue-on-error: true/g)?.length).toBeGreaterThanOrEqual(6);
    expect(workflow).toContain('timeout --foreground 6m node tests/e2e/front-door-acceptance.mjs');
    expect(workflow).toContain('timeout --foreground 15m node tests/e2e/30-day-sprint-acceptance.mjs');
    expect(workflow).toContain('timeout --foreground 10m node tests/e2e/get-me-live-acceptance.mjs');
    expect(workflow).toContain('timeout --foreground 6m node tests/e2e/get-me-live-owner-controls.mjs');
  });

  it('records every stage outcome before the final aggregate gate', () => {
    expect(workflow).toContain("frontDoor: process.env.FRONT_DOOR_OUTCOME || 'not_run'");
    expect(workflow).toContain("sprint30Day: process.env.SPRINT_OUTCOME || 'not_run'");
    expect(workflow).toContain("getMeLive: process.env.GET_ME_LIVE_OUTCOME || 'not_run'");
    expect(workflow).toContain("ownerControls: process.env.OWNER_CONTROLS_OUTCOME || 'not_run'");

    const uploadIndex = workflow.indexOf('- name: Upload acceptance execution evidence');
    const aggregateIndex = workflow.indexOf('- name: Aggregate pre-live acceptance result');
    expect(uploadIndex).toBeGreaterThan(-1);
    expect(aggregateIndex).toBeGreaterThan(uploadIndex);
    expect(workflow).toContain('Pre-live acceptance is BLOCKED.');
  });
});
