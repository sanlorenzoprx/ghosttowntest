import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import type { ReactElement } from 'react';
import { GHOSTTOWN_FIRST_30_OPEN_COPY, GHOSTTOWN_FIRST_30_V1 } from '../src/lib/ghosttownOffer';

// With the site built for First 30 on sale, no screen may still say that it
// "opens soon" or that nothing is for sale (docs/BUILD_QUEUE.md, Q10).
vi.mock('../src/lib/postVerdictOffer', () => ({
  ACTIVE_POST_VERDICT_OFFER: 'first30',
  SPRINT_OFFER_ACTIVE: false,
  FIRST30_OFFER_ACTIVE: true
}));

const { default: LandingCommercial } = await import('../src/components/LandingCommercial');
const { default: AboutPage } = await import('../src/components/AboutPage');

const render = (element: ReactElement) => renderToStaticMarkup(element)
  .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const noop = () => undefined;
const landing = (locale: 'en' | 'es') => render(
  <LandingCommercial onStart={noop} onSelectExample={noop} hasDraft={false} onResume={noop} isLoggedIn={false} hasUsedFreeVerdict={false} onLoginClick={noop} locale={locale} />
);

describe('First 30 on sale', () => {
  it('the landing page says First 30 is open, shows the price and sends the visitor to a free verdict', () => {
    const en = landing('en');
    expect(en).toContain('First 30 is open.');
    expect(en).toContain(GHOSTTOWN_FIRST_30_V1.displayPrice);
    expect(en).toContain('Get my free verdict first');
    for (const item of GHOSTTOWN_FIRST_30_V1.includes) expect(en).toContain(item);
    expect(en).toContain(GHOSTTOWN_FIRST_30_V1.refundRule);
    expect(en).not.toContain('opens soon');
    expect(en).not.toContain('not on sale yet');
    expect(en).not.toContain('Join the list');

    const es = landing('es');
    expect(es).toContain('First 30 ya abrió.');
    expect(es).toContain(GHOSTTOWN_FIRST_30_V1.displayPrice);
    expect(es).toContain('Hacer primero mi veredicto gratis');
    for (const item of GHOSTTOWN_FIRST_30_V1.includesEs) expect(es).toContain(item);
    expect(es).not.toContain('abre pronto');
    expect(es).not.toContain('Todavía no está a la venta');
    expect(es).not.toContain('First 30 is open');
  });

  it('the About page drops "opens soon" in both languages', () => {
    const en = render(<AboutPage locale="en" />);
    expect(en).toContain(`${GHOSTTOWN_FIRST_30_V1.name} — ${GHOSTTOWN_FIRST_30_V1.displayPrice}, paid once.`);
    expect(en).not.toContain('opens soon');
    const es = render(<AboutPage locale="es" />);
    expect(es).toContain('un solo pago');
    expect(es).not.toContain('abre pronto');
  });

  it('the agent handoff uses the shared open copy when First 30 is on sale', () => {
    const handoff = readFileSync(new URL('../src/components/AgentHandoff.tsx', import.meta.url), 'utf8');
    expect(handoff).toContain('FIRST30_OFFER_ACTIVE ?');
    expect(handoff).toContain('GHOSTTOWN_FIRST_30_OPEN_COPY[locale].handoffBody');
    expect(GHOSTTOWN_FIRST_30_OPEN_COPY.en.handoffBody).toContain(GHOSTTOWN_FIRST_30_V1.displayPrice);
    expect(GHOSTTOWN_FIRST_30_OPEN_COPY.es.handoffBody).toContain(GHOSTTOWN_FIRST_30_V1.displayPrice);
    expect(GHOSTTOWN_FIRST_30_OPEN_COPY.en.handoffBody).not.toMatch(/nothing is for sale/i);
  });

  it('never promises income', () => {
    for (const copy of Object.values(GHOSTTOWN_FIRST_30_OPEN_COPY)) {
      const text = Object.values(copy).flat().join(' ');
      expect(text).not.toMatch(/guarantee|garantiz|you will earn|vas a ganar/i);
    }
  });
});
