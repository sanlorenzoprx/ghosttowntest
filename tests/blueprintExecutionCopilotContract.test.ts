import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(new URL('../src/api/worker.ts', import.meta.url), 'utf8');
const handler = readFileSync(new URL('../src/api/blueprintExecutionCopilot.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/api/executionAIService.ts', import.meta.url), 'utf8');
const router = readFileSync(new URL('../src/components/LaunchBlueprintRouter.tsx', import.meta.url), 'utf8');
const copilot = readFileSync(new URL('../src/components/LaunchBlueprintCopilotV21.tsx', import.meta.url), 'utf8');

 describe('Blueprint Execution Copilot contract', () => {
  it('exposes an authenticated owner-scoped paid Blueprint endpoint', () => {
    expect(worker).toContain('/blueprint\\/copilot');
    expect(worker).toContain('handleBlueprintExecutionCopilot');
    expect(handler).toContain('ownedLaunchBlueprintOrder');
    expect(handler).toContain('loadBlueprintProgress');
    expect(handler).toContain('loadBlueprintRecord');
  });

  it('assembles RAG context before model routing and never grants model mutation authority', () => {
    expect(handler).toContain('buildExecutionRagContext');
    expect(handler).toContain('routeExecutionCapability');
    expect(service).toContain('Recorded behavior outranks your opinion');
    expect(service).toContain('Do not claim a day is complete; deterministic software owns completion.');
    expect(service).toContain('formal branch controls which variables may change');
  });

  it('supports fast, strategy, critic and grounded-research capability paths using the existing first-party AI service', () => {
    expect(service).toContain("capability === 'fast_assistant'");
    expect(service).toContain("capability === 'grounded_research'");
    expect(service).toContain("return 'blueprint'");
    expect(service).toContain("googleSearch: capability === 'grounded_research'");
    expect(handler).toContain('runExecutionCritic');
  });

  it('attaches the Copilot to the active selected day and separates live experiment from Strategy Room', () => {
    expect(router).toContain('LaunchBlueprintCopilotV21');
    expect(router).toContain('setActiveDay(dayNumber)');
    expect(copilot).toContain('Current Experiment');
    expect(copilot).toContain('Strategy Room');
    expect(copilot).toContain('Ask GhostTown · Day');
    expect(copilot).toContain('AI advises. Evidence, completion and branch permissions remain deterministic.');
  });
});
