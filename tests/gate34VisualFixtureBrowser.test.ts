import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type Page, type Route } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const SHOT_DIR = join(STATE_DIR, 'gate34-ui-fixture-screenshots');
const ARTIFACT_PATH = join(STATE_DIR, 'gate34-ui-fixture-artifact.json');
const HTML_PATH = join(ROOT, 'gate34-visual-fixture.html');
const VIEWPORTS = [
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 }
];
const FIXTURE_SURFACES = [
  'free-verdict',
  'micro-commitments',
  'checkout',
  'seed-confirmation',
  'workflow-status',
  'media-network',
  'leads-table',
  'failure-state',
  'retry-state',
  'blueprint-48-hour-card',
  'blueprint-starting-state',
  'blueprint-first-revenue',
  'blueprint-fulfillment',
  'blueprint-evidence-ledger',
  'blueprint-checkpoint-forms'
] as const;

let vite: ViteDevServer;
let browser: Browser;
let origin = '';
const evidence: Array<Record<string, unknown>> = [];

const sha256File = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function orderFor(surface: string) {
  const status = surface === 'failure-state' || surface === 'retry-state' ? 'failed' : 'generating';
  return {
    orderId: 'fixture-order',
    ideaName: 'Checkout accessibility audit',
    status,
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
    artifactType: 'launch_blueprint_v2',
    offerName: 'GhostTown Launch Blueprint',
    sourceVerdictId: 'fixture-verdict',
    planVersion: '2.1'
  };
}

async function mockApi(page: Page, surface: string) {
  // Inspect every browser request by parsed pathname. Only true root API calls are mocked;
  // Vite source modules such as /src/api/*.ts explicitly continue to the dev server.
  await page.route('**/*', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) {
      await route.continue();
      return;
    }
    if (path.endsWith('/api/auth/verify')) {
      await json(route, { user: { email: 'fixture@example.test', testsUsed: 0, testsPurchased: 0, sharesGiven: 0, sharesReceived: 0, shareCredits: 0, createdAt: '2026-08-01T00:00:00.000Z', lastTestAt: null } });
      return;
    }
    if (path.endsWith('/api/results')) {
      await json(route, { results: [] });
      return;
    }
    if (path.endsWith('/api/paid-test/orders')) {
      await json(route, { orders: [orderFor(surface)] });
      return;
    }
    if (path.includes('/blueprint/seeds') && request.method() === 'GET') {
      await json(route, {
        ideaName: 'Checkout accessibility audit',
        status: 'awaiting_seeds',
        paid: true,
        targetCustomer: 'independent ecommerce stores',
        suggestions: [
          { suggestionId: 'seed-1', name: 'Accessibility Partner A', website: 'https://example.test/a', relationship: 'direct_competitor', reason: 'Serves the same buyer with a public audit offer.', confidence: 'high' },
          { suggestionId: 'seed-2', name: 'QA Platform B', website: 'https://example.test/b', relationship: 'adjacent_product', reason: 'Owns adjacent checkout-quality attention.', confidence: 'high' },
          { suggestionId: 'seed-3', name: 'Manual QA C', website: 'https://example.test/c', relationship: 'current_alternative', reason: 'Represents the buyer current alternative.', confidence: 'moderate' }
        ]
      });
      return;
    }
    if (path.endsWith('/launch-site/leads')) {
      await json(route, { leads: [{ lead_id: 'lead-fixture-1', email: 'buyer@example.test', name: 'Buyer Example', message: 'Interested in a pilot.', source_path: '/launch/fixture', created_at: '2026-08-19T00:00:00.000Z' }] });
      return;
    }
    if (path.endsWith('/launch-site')) {
      await json(route, { site: { status: 'published', publicSlug: 'fixture', publishedAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' }, publicUrl: 'https://ghosttown-acceptance.pages.dev/launch/fixture', publishFailures: [], canonicalBlueprintId: 'fixture-blueprint' });
      return;
    }
    if (path.endsWith('/blueprint/retry') && request.method() === 'POST') {
      await new Promise(resolve => setTimeout(resolve, 2500));
      await json(route, { ok: true }, 202);
      return;
    }
    await json(route, {});
  });
}

async function selectBlueprintTab(page: Page, viewportWidth: number, label: string, value: string) {
  if (viewportWidth < 768) {
    await page.locator('#blueprint-mobile-nav').selectOption(value);
  } else {
    await page.getByRole('button', { name: label, exact: true }).click();
  }
}

async function prepareSurface(page: Page, surface: string, viewportWidth: number) {
  if (surface === 'free-verdict') {
    await page.locator('[data-testid="verdict-decision-v2"]').waitFor();
    await page.getByText('Fastest test', { exact: true }).waitFor();
    return;
  }
  if (surface === 'micro-commitments') {
    await page.locator('[data-testid="verdict-decision-v2"]').waitFor();
    await page.getByText('Commitment', { exact: true }).first().waitFor();
    return;
  }
  if (surface === 'checkout') {
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: /Continue to Checkout/i }).waitFor();
    return;
  }
  if (surface === 'seed-confirmation') {
    await page.getByText('Choose the footprints GhostTown should reverse-engineer.').waitFor();
    await page.getByRole('button', { name: /Confirm seeds and build my network/i }).waitFor();
    return;
  }
  if (surface === 'workflow-status') {
    await page.getByText('Building', { exact: true }).waitFor();
    await page.getByText(/GhostTown is mapping podcasts/i).waitFor();
    return;
  }
  if (surface === 'media-network') {
    await page.getByText('Launch Blueprints and Media Networks').waitFor();
    await page.getByText(/podcasts, creators, publications/i).waitFor();
    return;
  }
  if (surface === 'leads-table') {
    await page.getByRole('heading', { name: 'Leads' }).waitFor();
    await page.getByText('buyer@example.test').waitFor();
    await page.getByRole('link', { name: 'Export CSV' }).waitFor();
    return;
  }
  if (surface === 'failure-state') {
    await page.getByText('failed', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Retry Blueprint' }).waitFor();
    return;
  }
  if (surface === 'retry-state') {
    await page.getByRole('button', { name: 'Retry Blueprint' }).click();
    await page.getByRole('button', { name: 'Checking…' }).waitFor();
    return;
  }
  if (surface === 'blueprint-48-hour-card') {
    await page.getByText('48-hour Launch Card', { exact: true }).waitFor();
    return;
  }
  if (surface === 'blueprint-starting-state') {
    await selectBlueprintTab(page, viewportWidth, 'Starting State', 'audit');
    await page.getByText('Five critical tests', { exact: true }).waitFor();
    return;
  }
  if (surface === 'blueprint-first-revenue') {
    await selectBlueprintTab(page, viewportWidth, 'First Revenue', 'revenue');
    await page.getByText('First ask', { exact: true }).waitFor();
    return;
  }
  if (surface === 'blueprint-fulfillment') {
    await selectBlueprintTab(page, viewportWidth, 'Fulfillment', 'fulfillment');
    await page.getByText('Delivery timeline', { exact: true }).waitFor();
    return;
  }
  if (surface === 'blueprint-evidence-ledger') {
    await selectBlueprintTab(page, viewportWidth, 'Evidence', 'evidence');
    await page.getByText('Qualified buyer interview', { exact: true }).waitFor();
    return;
  }
  if (surface === 'blueprint-checkpoint-forms') {
    await selectBlueprintTab(page, viewportWidth, 'Weekly Review', 'review');
    await page.locator('#checkpoint-7').waitFor();
    return;
  }
  throw new Error(`Unknown Gate 34 fixture surface: ${surface}`);
}

beforeAll(async () => {
  mkdirSync(SHOT_DIR, { recursive: true });
  writeFileSync(HTML_PATH, '<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module" src="/tests/fixtures/gate34VisualFixtureApp.tsx"></script></body></html>');
  vite = await createServer({ root: ROOT, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await vite.listen();
  const address = vite.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  origin = `http://127.0.0.1:${port}`;
  browser = await chromium.launch({ headless: true });
}, 30000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
  try { unlinkSync(HTML_PATH); } catch {}
});

describe('Gate 34 canonical deterministic UI visual fixtures', () => {
  it('renders real production components at every required viewport without horizontal overflow', async () => {
    for (const viewport of VIEWPORTS) {
      for (const surface of FIXTURE_SURFACES) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        const runtimeErrors: string[] = [];
        page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
        page.on('console', message => {
          if (message.type() === 'error') runtimeErrors.push(`console.error: ${message.text()}`));
        });
        await mockApi(page, surface);
        const routeSurface = surface === 'free-verdict' ? 'verdict' : surface;
        const response = await page.goto(`${origin}/gate34-visual-fixture.html?surface=${encodeURIComponent(routeSurface)}`, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);
        try {
          await prepareSurface(page, surface, viewport.width);
        } catch (error) {
          const fixtureError = await page.locator('#root').getAttribute('data-fixture-error').catch(() => null);
          const bodyText = String(await page.locator('body').textContent().catch(() => '')).slice(0, 1800);
          const original = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          throw new Error(`Gate 34 fixture ${surface} ${viewport.name} failed. ${original}. fixture_error=${fixtureError || 'none'} runtime_errors=${JSON.stringify(runtimeErrors)} body=${JSON.stringify(bodyText)}`);
        }
        const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(horizontalOverflow, `${surface} ${viewport.name}`).toBe(false);
        const screenshotPath = join(SHOT_DIR, `${surface}-${viewport.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false, animations: 'disabled' });
        evidence.push({
          surface,
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          screenshot: `.roadmap-autopilot/gate34-ui-fixture-screenshots/${surface}-${viewport.name}.png`,
          screenshot_sha256: sha256File(screenshotPath),
          horizontal_overflow: false,
          environment: 'DETERMINISTIC_UI_FIXTURE',
          production_component: true
        });
        await page.close();
      }
    }
    expect(evidence).toHaveLength(FIXTURE_SURFACES.length * VIEWPORTS.length);
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(ARTIFACT_PATH, `${JSON.stringify({
      schema_version: 'roadmap-gate34-ui-fixture-artifact-v1',
      generated_at: new Date().toISOString(),
      renderer: 'vite+playwright+real-production-react-components',
      viewports: VIEWPORTS,
      surfaces: FIXTURE_SURFACES,
      evidence,
      all_no_horizontal_overflow: evidence.every(item => item.horizontal_overflow === false),
      production_deployed: false,
      acceptance_mutated: false,
      secret_values_recorded: false
    }, null, 2)}\n`, 'utf8');
  }, 240000);
});
