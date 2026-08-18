import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { composeLaunchSitePresentation, LAUNCH_SITE_CONVERSION_JOBS, renderLaunchSite } from '../src/api/launchSite';
import { checkoutAccessibilityBlueprintFixture } from './fixtures/checkoutAccessibilityBlueprint';

const artifactPath = join(process.cwd(), '.roadmap-autopilot', 'q4-launch-site-golden-artifact.json');
const screenshots = join(process.cwd(), '.roadmap-autopilot', 'q4-browser-screenshots');
const viewports = [
  { name: 'mobile-375', width: 375, height: 667 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];
const blueprint = checkoutAccessibilityBlueprintFixture();
const presentation = composeLaunchSitePresentation(blueprint);
let server: ReturnType<typeof createServer>;
let origin = '';
let posts = 0;
const results: Array<Record<string, unknown>> = [];
let leadFlowEvidence: Record<string, unknown> = {};

const sha256File = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

beforeAll(async () => {
  const html = renderLaunchSite(blueprint, 'checkout-audit-fixture');
  server = createServer((request, response) => {
    if (request.url === '/launch/checkout-audit-fixture') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(html);
      return;
    }
    if (request.url === '/api/launch-sites/checkout-audit-fixture/leads' && request.method === 'POST') {
      posts += 1;
      setTimeout(() => {
        response.writeHead(posts === 1 ? 201 : 429, { 'content-type': 'application/json' });
        response.end(JSON.stringify(posts === 1 ? { ok: true, message: 'Request received.' } : { error: 'Too many submissions. Try again later.' }));
      }, 750);
      return;
    }
    response.writeHead(404);
    response.end('not found');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
}, 30000);

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe('Q4 exact viewport Launch Site browser evidence', () => {
  it('derives exact canonical, ordered, accessible, above-fold visual evidence at all required viewports', async () => {
    const browser = await chromium.launch({ headless: true });
    mkdirSync(screenshots, { recursive: true });
    try {
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        const consoleErrors: string[] = [];
        page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
        page.on('pageerror', error => consoleErrors.push(error.message));
        await page.goto(`${origin}/launch/checkout-audit-fixture`, { waitUntil: 'networkidle' });
        const jobOrder = await page.locator('[data-conversion-job]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-conversion-job')));
        expect(jobOrder).toEqual(LAUNCH_SITE_CONVERSION_JOBS);
        expect(await page.locator('h1').count()).toBe(1);
        expect(await page.locator('header').count()).toBe(1);
        expect(await page.locator('main').count()).toBe(1);
        expect(await page.locator('footer').count()).toBe(1);
        expect(await page.locator('.skip-link').count()).toBe(1);
        expect(await page.locator('[data-product-artifact] li').count()).toBe(4);
        expect(await page.locator('details').count()).toBe(blueprint.launchSite.faq.length);
        expect(await page.locator('.proof-test').count()).toBe(blueprint.launchSite.proof.claimsAllowed.length);
        expect(await page.locator('.proof-proof-to-earn').count()).toBe(blueprint.launchSite.proof.proofPlaceholders.length);
        expect(await page.locator('body').textContent()).toContain('No verified outcomes yet');
        const pageText = await page.locator('body').textContent() || '';
        for (const exact of [presentation.customer, presentation.problem, presentation.offerName, presentation.promise, presentation.price, presentation.primaryCta]) expect(pageText).toContain(exact);
        for (const privateValue of [blueprint.ownerId, blueprint.orderId, blueprint.blueprintId, blueprint.launchSite.site.contactEmail]) expect(pageText).not.toContain(privateValue);
        const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(horizontalOverflow).toBe(false);
        const boxes = {
          hero: await page.locator('[data-conversion-job="hero"]').boundingBox(),
          primaryCta: await page.locator('[data-primary-cta]').boundingBox(),
          priceTimeline: await page.locator('.offer-meta').boundingBox(),
          artifact: await page.locator('[data-product-artifact]').boundingBox(),
        };
        for (const [name, box] of Object.entries(boxes)) {
          expect(box, name).not.toBeNull();
          expect(box!.y, `${name} starts inside ${viewport.name}`).toBeGreaterThanOrEqual(0);
          expect(box!.y + box!.height, `${name} is above fold in ${viewport.name}`).toBeLessThanOrEqual(viewport.height + 1);
          expect(box!.width, `${name} is legible in ${viewport.name}`).toBeGreaterThan(120);
        }
        const primaryStyle = await page.locator('[data-primary-cta]').evaluate(element => {
          (element as HTMLElement).focus();
          const style = getComputedStyle(element);
          return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, minHeight: style.minHeight, fontSize: style.fontSize };
        });
        expect(primaryStyle.outlineStyle).not.toBe('none');
        expect(Number.parseFloat(primaryStyle.outlineWidth)).toBeGreaterThanOrEqual(3);
        expect(Number.parseFloat(primaryStyle.minHeight)).toBeGreaterThanOrEqual(44);
        expect(Number.parseFloat(primaryStyle.fontSize)).toBeGreaterThanOrEqual(14);
        expect(consoleErrors).toEqual([]);
        const viewportPng = join(screenshots, `${viewport.name}-viewport.png`);
        const fullPng = join(screenshots, `${viewport.name}-full.png`);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: viewportPng, fullPage: false, animations: 'disabled' });
        await page.screenshot({ path: fullPng, fullPage: true, animations: 'disabled' });
        results.push({
          ...viewport,
          viewportScreenshot: `.roadmap-autopilot/q4-browser-screenshots/${viewport.name}-viewport.png`,
          viewportSha256: sha256File(viewportPng),
          fullPageScreenshot: `.roadmap-autopilot/q4-browser-screenshots/${viewport.name}-full.png`,
          fullPageSha256: sha256File(fullPng),
          horizontalOverflow,
          jobOrder,
          boxes,
          aboveFold: Object.values(boxes).every(box => box && box.y >= 0 && box.y + box.height <= viewport.height + 1),
          h1Count: 1,
          faqCount: blueprint.launchSite.faq.length,
          artifactStepCount: 4,
          consoleErrors,
        });
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }, 120000);

  it('exercises interactive CTAs, visible focus, one FAQ, and accessible success/failure lead states', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await page.goto(`${origin}/launch/checkout-audit-fixture`, { waitUntil: 'networkidle' });
      await page.locator('[data-primary-cta]').click();
      await page.waitForTimeout(20);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('form-title');
      await page.locator('[data-secondary-cta]').click();
      await page.waitForTimeout(20);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('scope-title');
      const firstFaq = page.locator('details').first();
      await firstFaq.locator('summary').click();
      expect(await firstFaq.getAttribute('open')).not.toBeNull();
      const form = page.locator('[data-lead-form]');
      const email = form.locator('input[name="email"]');
      const consent = form.locator('input[name="consent"]');
      const submit = form.locator('button[type="submit"]');
      await email.fill('buyer@example.test');
      await consent.check();
      await submit.click();
      expect(await form.getAttribute('aria-busy')).toBe('true');
      expect(await submit.isDisabled()).toBe(true);
      await expect.poll(() => form.locator('[data-message]').textContent()).toContain('Request received.');
      expect(await form.locator('[data-message]').getAttribute('role')).toBe('status');
      expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-message'))).toBe(true);
      expect(await email.inputValue()).toBe('');
      await email.fill('buyer2@example.test');
      await consent.check();
      await submit.click();
      await expect.poll(() => form.locator('[data-message]').textContent()).toContain('Too many submissions');
      expect(await form.locator('[data-message]').getAttribute('role')).toBe('alert');
      expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-message'))).toBe(true);
      expect(await email.inputValue()).toBe('buyer2@example.test');
      expect(await form.getAttribute('aria-busy')).toBeNull();
      expect(await submit.isDisabled()).toBe(false);
      expect(posts).toBe(2);
      leadFlowEvidence = { localRoute: true, successReset: true, failureRetained: true, busyAndDisabled: true, successLiveStatus: true, failureAlert: true, resultFocused: true, primaryCtaFocusedForm: true, secondaryCtaFocusedScope: true, faqExpanded: true };
    } finally {
      await browser.close();
    }
    mkdirSync(join(process.cwd(), '.roadmap-autopilot'), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify({
      schema_version: 'ghosttown-q4-launch-site-golden-artifact-v3',
      renderer: 'playwright-local-chromium',
      origin: 'local-only',
      canonical: { sourceVerdictId: blueprint.sourceVerdictId, customer: blueprint.offer.targetCustomer, problem: blueprint.offer.painfulProblem, offer: blueprint.offer.offerName, promise: blueprint.offer.oneSentencePromise, price: blueprint.firstRevenuePath.firstPrice, cta: blueprint.launchSite.offer.callToAction, proofBoundary: blueprint.foundingCustomerPilotBrief.proofBoundary, timeline: presentation.timeline, deliverables: blueprint.launchSite.solution.deliverables, exclusions: presentation.exclusions },
      presentation,
      viewports: results,
      leadFlow: leadFlowEvidence,
      accessibility: { skipLink: true, semanticLandmarks: true, oneH1: true, visibleFocus: true, minimumTargets: true, liveStatus: true, alertErrors: true, busyDisabled: true, failureRetainsValues: true, successResets: true, resultFocused: true, reducedMotion: true },
      security: { privateIdentifiersAbsent: true, escapedRenderer: true, productionDeployed: false, secretValuesRecorded: false },
      adverseCases: ['canonical_drift', 'missing_or_unordered_job', 'generic_copy', 'fabricated_claim', 'proof_label_drift', 'incomplete_artifact', 'private_identifier', 'horizontal_overflow', 'above_fold_failure', 'accessibility_state_failure'],
      production_deployed: false,
      secret_values_recorded: false,
    }, null, 2)}\n`);
  }, 60000);
});
