import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

const readText = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Gate 34 mobile workspace navigation correction', () => {
  it('uses the production mobile select below 768px and desktop tab buttons otherwise', async () => {
    const adapter = await readText('scripts/roadmap-gate34-visual-certification.mjs');
    expect(adapter).toContain('async function selectWorkspaceTab');
    expect(adapter).toContain('viewportWidth < 768');
    expect(adapter).toContain("page.locator('#blueprint-mobile-nav')");
    expect(adapter).toContain("mobile.selectOption(value)");
    expect(adapter).toContain("page.getByRole('button', { name: label, exact: true }).click()");
    expect(adapter).toContain("selectWorkspaceTab(page, viewport.width, 'Launch Site', 'site')");
  });

  it('keeps the corrected live run read-only while navigating the Launch Site panel', async () => {
    const adapter = await readText('scripts/roadmap-gate34-visual-certification.mjs');
    expect(adapter).toContain("acceptance_infrastructure_mutations: 'none'");
    expect(adapter).toContain("analytics_network_mutations: 'blocked_in_browser'");
    expect(adapter).toContain('FORBIDDEN_MUTATION_MARKERS');
    expect(adapter).not.toContain('wrangler deploy');
    expect(adapter).not.toContain("'pages', 'deploy'");
  });
});
