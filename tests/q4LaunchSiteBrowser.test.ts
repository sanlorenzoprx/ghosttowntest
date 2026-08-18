import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { renderLaunchSite } from '../src/api/launchSite';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const artifactPath = join(process.cwd(), '.roadmap-autopilot', 'q4-launch-site-golden-artifact.json');
const screenshots = join(process.cwd(), '.roadmap-autopilot', 'q4-browser-screenshots');
const viewports = [
  { name: 'mobile-375', width: 375, height: 667 }, { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 }, { name: 'desktop-1366', width: 1366, height: 768 }, { name: 'desktop-1440', width: 1440, height: 900 }
];
let server: ReturnType<typeof createServer>;
let origin = '';
let posts = 0;
const results: Array<Record<string, unknown>> = [];

beforeAll(async () => {
  const page = renderLaunchSite(launchBlueprintFixture(), 'browser-fixture');
  server = createServer((request, response) => {
    if (request.url === '/launch/browser-fixture') { response.writeHead(200, { 'content-type': 'text/html' }); response.end(page); return; }
    if (request.url === '/api/launch-sites/browser-fixture/leads' && request.method === 'POST') {
      posts += 1;
      response.writeHead(posts === 1 ? 201 : 429, { 'content-type': 'application/json' });
      response.end(JSON.stringify(posts === 1 ? { ok: true, message: 'Request received.' } : { error: 'Too many submissions. Try again later.' })); return;
    }
    response.writeHead(404); response.end('not found');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
}, 30000);

afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });

describe('Q4 exact viewport Launch Site browser evidence', () => {
  it('renders the controlled conversion page at every required viewport and records deterministic hashes', async () => {
    const browser = await chromium.launch({ headless: true });
    mkdirSync(screenshots, { recursive: true });
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.goto(`${origin}/launch/browser-fixture`, { waitUntil: 'networkidle' });
      expect(await page.locator('[data-conversion-job="hero"]').count()).toBe(1);
      expect(await page.locator('[data-conversion-job]').count()).toBe(13);
      expect(await page.locator('input[name="email"]').isVisible()).toBe(true);
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(horizontalOverflow).toBe(false);
      const hero = await page.locator('[data-conversion-job="hero"]').boundingBox();
      expect(hero?.width).toBeGreaterThan(200);
      const png = join(screenshots, `${viewport.name}.png`);
      await page.screenshot({ path: png, fullPage: true, animations: 'disabled' });
      const bytes = await page.screenshot({ fullPage: true, animations: 'disabled' });
      results.push({ ...viewport, screenshot: `.roadmap-autopilot/q4-browser-screenshots/${viewport.name}.png`, sha256: createHash('sha256').update(bytes).digest('hex'), jobs: await page.locator('[data-conversion-job]').count(), horizontalOverflow });
      await page.close();
    }
    await browser.close();
  }, 120000);

  it('exercises CTA focus, FAQ expansion, and success and failure form states against the local route', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${origin}/launch/browser-fixture`, { waitUntil: 'networkidle' });
    await page.locator('button[type="submit"]').focus();
    expect(await page.evaluate(() => document.activeElement?.getAttribute('type'))).toBe('submit');
    await page.locator('details summary').first().click();
    expect(await page.locator('details').first().getAttribute('open')).not.toBeNull();
    await page.locator('input[name="email"]').fill('buyer@example.test');
    await page.locator('input[name="consent"]').check();
    await page.locator('button[type="submit"]').click();
    expect(await page.locator('[data-message]').textContent()).toContain('Request received.');
    await page.locator('input[name="email"]').fill('buyer2@example.test');
    await page.locator('input[name="consent"]').check();
    await page.locator('button[type="submit"]').click();
    expect(await page.locator('[data-message]').textContent()).toContain('Too many submissions');
    expect(posts).toBe(2);
    await browser.close();
    mkdirSync(join(process.cwd(), '.roadmap-autopilot'), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify({ schema_version: 'ghosttown-q4-launch-site-golden-artifact-v2', renderer: 'playwright-local-chromium', origin: 'local-only', viewports: results, conversion_jobs: 13, local_lead_success_and_failure: true, production_deployed: false, secret_values_recorded: false }, null, 2)}\n`);
  }, 60000);
});
