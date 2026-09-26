import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const calendarAmendment = readFileSync(new URL('../docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_5_CALENDAR_PRIMARY_EXECUTION_AMENDMENT.md', import.meta.url), 'utf8');
const executionAmendment = readFileSync(new URL('../docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_6_EXECUTION_INTELLIGENCE_AMENDMENT.md', import.meta.url), 'utf8');
const executionChangeRecord = readFileSync(new URL('../docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_6_CHANGE_RECORD.md', import.meta.url), 'utf8');
const chain = JSON.parse(readFileSync(new URL('../docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json', import.meta.url), 'utf8')) as Record<string, any>;
const verifier = readFileSync(new URL('../scripts/verify-blueprint-source.mjs', import.meta.url), 'utf8');

describe('Blueprint v2.1.6 Execution Intelligence governance', () => {
  it('preserves Calendar-Primary execution as the predecessor product decision', () => {
    expect(calendarAmendment).toContain('The 30-Day Calendar is the primary execution interface for the paid GhostTown Launch Blueprint.');
    expect(calendarAmendment).toContain('complete day only when the execution contract is satisfied');
    expect(calendarAmendment).toContain('Weakening approved outcomes remains prohibited.');
  });

  it('codifies the integrated Execution Intelligence customer outcome and deterministic authority', () => {
    expect(executionAmendment).toContain('GhostTown knows what kind of business I am testing');
    expect(executionAmendment).toContain('Formal checkpoint branch routing');
    expect(executionAmendment).toContain('Current Experiment');
    expect(executionAmendment).toContain('Strategy Room');
    expect(executionAmendment).toContain('AI is advisory. Deterministic software remains authoritative');
    expect(executionChangeRecord).toContain('Gate 36 remains the explicit human release decision');
  });

  it('preserves the hash-verified v2.1.6 decision as the evidence chain advances through later approved amendments', () => {
    expect(chain.canonical.gitBlobSha1).toBe('616c691e6b4c9cea93615963a07375d13ffba57f');
    expect(chain.chainTip).toEqual({
      changeId: 'GT-BP-2026-09-26-V2.1.10',
      previousChangeId: 'GT-BP-2026-09-26-V2.1.9',
      version: '2.1.10'
    });
    expect(chain.calendarAmendment.version).toBe('2.1.5');
    expect(chain.executionIntelligenceAmendment.version).toBe('2.1.6');
    expect(chain.executionIntelligenceAmendment.changeId).toBe('GT-BP-2026-08-18-V2.1.6');
    expect(verifier).toContain("manifest?.chainTip?.changeId !== 'GT-BP-2026-09-26-V2.1.10'");
    expect(verifier).toContain('v2.1.5 Calendar-Primary Execution amendment');
    expect(verifier).toContain('v2.1.6 Execution Intelligence amendment');
    expect(verifier).toContain('v2.1.9 Evidence Recency and Current-Activity Integrity amendment');
    expect(verifier).toContain('v2.1.10 Customer Copy Integrity amendment');
  });
});
