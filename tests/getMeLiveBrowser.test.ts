import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { renderCustomWebsiteStaticHtml } from '../src/api/websiteBuildRunner';
import type { CustomWebsiteSpec, WebsiteSectionSpec } from '../src/types/customWebsite';

const section = (component: WebsiteSectionSpec['component'], heading: string, body: string, items: WebsiteSectionSpec['items'] = []): WebsiteSectionSpec => ({
  sectionId: component === 'lead_capture' ? 'contact' : component,
  component,
  eyebrow: component.replace(/_/g, ' '),
  heading,
  body,
  items,
  primaryCtaLabel: component === 'hero' || component === 'lead_capture' ? 'Start my pilot' : '',
  secondaryCtaLabel: component === 'hero' ? 'See the offer' : ''
});

const spec: CustomWebsiteSpec = {
  schemaVersion: 'custom-website-spec-v1',
  templateId: 'ghosttown_conversion',
  businessName: 'Proof Path',
  metadataTitle: 'Proof Path customer test',
  metadataDescription: 'A validation-stage customer offer.',
  stylePreset: 'clean_saas',
  sections: [
    section('hero', 'Know whether buyers care before you overbuild.', 'A focused pilot built from your Evidence Sprint.'),
    section('problem', 'The problem', 'Teams keep guessing instead of measuring real customer action.'),
    section('solution', 'The pilot', 'A narrow, customer-ready offer with a clear next step.', [{ title: 'Fast start', body: 'Use the tested offer now.' }]),
    section('pricing', 'Pilot price: $49', 'One fixed test price. No guarantee of sales.'),
    section('proof', 'Proof boundary', 'No verified customer outcome is claimed before evidence exists.'),
    section('faq', 'Questions', 'What buyers need to know.', [{ title: 'What happens next?', body: 'We follow up about the pilot.' }]),
    section('lead_capture', 'Interested?', 'Tell us where to follow up.'),
    section('footer', 'Proof Path', 'Validation-stage customer test.')
  ]
};

const windowsChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const launchBrowser = () => process.env.PHASE25_CDP_URL
  ? chromium.connectOverCDP(process.env.PHASE25_CDP_URL)
  : chromium.launch({
      headless: true,
      ...(process.platform === 'win32' && existsSync(windowsChrome) ? { executablePath: windowsChrome } : {})
    });

const viewports = [
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 }
];

let server: ReturnType<typeof createServer>;
let origin = '';
let leadPosts = 0;
let buyGets = 0;
let browser: Browser;
beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    if (request.url?.split('?')[0] === '/lead') {
      const html = renderCustomWebsiteStaticHtml(spec, {
        primaryActionUrl: '#contact', secondaryActionUrl: '#solution',
        leadActionUrl: `${origin}/api/get-me-live/sites/gml-browser/leads`,
        canonicalUrl: `${origin}/lead`, socialImageUrl: `${origin}/og.svg`,
        attributionUrl: `${origin}/get-me-live`, showFriendShare: true
      });
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(html); return;
    }
    if (request.url === '/buy') {
      const html = renderCustomWebsiteStaticHtml(spec, {
        primaryActionUrl: `${origin}/api/get-me-live/sites/gml-browser/buy`,
        secondaryActionUrl: '#solution', leadActionUrl: `${origin}/api/get-me-live/sites/gml-browser/leads`
      });
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(html); return;
    }
    if (request.url === '/api/get-me-live/sites/gml-browser/leads' && request.method === 'POST') {
      leadPosts += 1;
      request.resume();
      response.writeHead(201, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><title>Lead received</title><h1>Lead received</h1>'); return;
    }
    if (request.url === '/api/get-me-live/sites/gml-browser/buy' && request.method === 'GET') {
      buyGets += 1;
      response.writeHead(303, { location: '/checkout-created' });
      response.end(); return;
    }
    if (request.url === '/checkout-created') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><title>Checkout created</title><h1>Checkout created</h1>'); return;
    }
    response.writeHead(404); response.end('not found');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  browser = await launchBrowser();
}, 30000);

afterAll(async () => {
  if (browser) await browser.close();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe('Get Me Live published browser acceptance', () => {
  it('renders the exact customer page cleanly at all required viewports', async () => {
    for (const viewport of viewports) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        const errors: string[] = [];
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('pageerror', error => errors.push(error.message));
        const navigation = await page.goto(`${origin}/lead`, { waitUntil: 'load' });
        expect(navigation?.status(), viewport.name).toBe(200);
        expect(await page.locator('h1').textContent()).toContain('Know whether buyers care');
        expect(await page.locator('[data-component]').count()).toBe(8);
        expect(await page.locator('form.lead-form').count()).toBe(1);
        expect(await page.locator('input[name="consent"]').count()).toBe(1);
        expect(await page.locator('details').count()).toBe(1);
        expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(`${origin}/og.svg`);
        expect(await page.getByText('Built with GhostTown').count()).toBe(1);
        expect(await page.locator('#friend-share').isHidden()).toBe(true);
        expect(await page.locator('body').textContent()).toContain('No verified customer outcome is claimed');
        expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), viewport.name).toBe(false);
        expect(errors, viewport.name).toEqual([]);
      await page.close();
    }
  }, 120000);

  it('submits a consented lead and follows the public Buy CTA with the expected HTTP method', async () => {
    const leadPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await leadPage.goto(`${origin}/lead`, { waitUntil: 'load' });
      const form = leadPage.locator('form.lead-form');
      await form.locator('input[name="name"]').fill('Acceptance Buyer');
      await form.locator('input[name="email"]').fill('buyer@example.test');
      await form.locator('textarea[name="message"]').fill('I want the pilot.');
      await form.locator('input[name="consent"]').check();
      await Promise.all([leadPage.waitForNavigation(), form.locator('button[type="submit"]').click()]);
      expect(await leadPage.locator('h1').textContent()).toBe('Lead received');
      expect(leadPosts).toBe(1);
      await leadPage.close();

      const buyPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await buyPage.goto(`${origin}/buy`, { waitUntil: 'load' });
      const primary = buyPage.locator('section[data-component="hero"] a.button.primary');
      await Promise.all([buyPage.waitForURL(`${origin}/checkout-created`), primary.click()]);
      expect(await buyPage.locator('h1').textContent()).toBe('Checkout created');
      expect(buyGets).toBe(1);
    await buyPage.close();
  }, 60000);

  it('offers friend sharing only after a lead succeeds', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${origin}/lead?lead=received`, { waitUntil: 'load' });
    expect(await page.locator('#friend-share').isVisible()).toBe(true);
    expect(await page.locator('#friend-share').textContent()).toContain('Know someone who might like this?');
    await page.close();
  });
});
