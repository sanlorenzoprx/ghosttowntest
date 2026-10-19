import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LegalPage from '../src/components/LegalPage';
import AboutPage from '../src/components/AboutPage';
import { LEGAL_PAGES, type LegalPageKind } from '../src/lib/legalPages';
import { GHOSTTOWN_FIRST_30_V1, GHOSTTOWN_YEAR_SQUARED_V1 } from '../src/lib/ghosttownOffer';

const render = (kind: LegalPageKind) => renderToStaticMarkup(<LegalPage kind={kind} />);
const text = (kind: LegalPageKind) => JSON.stringify(LEGAL_PAGES[kind]);

describe('public policy pages', () => {
  it('describe the current offer, not the retired $97 Sprint', () => {
    for (const kind of ['terms', 'privacy', 'refund', 'disclaimer'] as const) {
      const html = render(kind);
      expect(html, kind).not.toContain('$97');
      expect(html, kind).not.toContain('Personalized 30-Day');
      expect(html, kind).not.toContain('Money-Back');
      expect(html, kind).not.toContain('Business identity');
      expect(html, kind).toContain('Last updated');
    }
    const terms = render('terms');
    expect(terms).toContain('First 30 — $297 USD, paid once.');
    expect(terms).toContain('customer-acquisition website');
    expect(terms).toContain('$2,997');
    expect(terms).toContain('$2,497');
    expect(terms).toContain('$999');
  });

  it('apply the First 30 credit the way the offer file decides', () => {
    const year = GHOSTTOWN_YEAR_SQUARED_V1;
    expect(year.prepayUsd - year.first30CreditUsd).toBe(2200);
    expect(year.installments.eachUsd - year.first30CreditUsd).toBe(702);
    expect(GHOSTTOWN_FIRST_30_V1.priceUsd).toBe(year.first30CreditUsd);
    const terms = render('terms');
    expect(terms).toContain('$2,200 more at once');
    expect(terms).toContain('$702, $999 and $999');
  });

  it('publish the decided refund schedule', () => {
    const refund = render('refund');
    expect(refund).toContain('Until your website build starts');
    expect(refund).toContain('Days 1–7 after your first year payment');
    expect(refund).toContain('Days 8–21');
    expect(refund).toContain('After day 21');
    // Tuition style: half of the plan price after the First 30 credit.
    expect(refund).toContain('we keep $1,100 and refund $1,100');
    expect(refund).toContain('On the payment plan you owe $1,350: you have paid $702, so we charge $648 more and cancel the remaining payments');
    expect(refund).toContain('the remaining payments stay due');
    expect(refund).toContain('5–10 business days');
  });

  it('cover the privacy disclosures the rules ask for', () => {
    const privacy = text('privacy');
    for (const required of [
      'What we collect and why',
      'Who helps us process it',
      'How long we keep it',
      'Your choices and rights',
      'California Consumer Privacy Act',
      'Do Not Track',
      'Global Privacy Control',
      'Children',
      'Changes to this policy',
      'We do not sell personal information',
      'unsubscribe link and our mailing address',
      '10 business days'
    ]) expect(privacy, required).toContain(required);
    for (const provider of ['Cloudflare', 'Vertex AI', 'Stripe', 'DataForSEO', 'Podcast Index']) {
      expect(privacy, provider).toContain(provider);
    }
  });

  it('warn before collections or credit reporting', () => {
    const terms = render('terms');
    expect(terms).toContain('collection agency');
    expect(terms).toContain('consumer or business credit bureaus');
    expect(terms).toContain('We will email you before we take either step.');
  });

  it('never promise income or results', () => {
    expect(text('disclaimer')).toContain('does not promise income');
    expect(text('terms')).toContain('not a business opportunity');
    for (const kind of ['terms', 'privacy', 'refund', 'disclaimer'] as const) {
      expect(text(kind), kind).not.toMatch(/guarantee(d)? (results|income|success)|money-back/i);
    }
  });

  it('link every section from the page contents', () => {
    for (const kind of ['terms', 'privacy', 'refund', 'disclaimer'] as const) {
      const html = render(kind);
      for (const section of LEGAL_PAGES[kind].sections) {
        expect(html, `${kind}#${section.id}`).toContain(`href="#${section.id}"`);
        expect(html, `${kind}#${section.id}`).toContain(`id="${section.id}"`);
      }
    }
  });

  it('keeps the business identity on the About page', () => {
    const html = renderToStaticMarkup(<AboutPage />);
    expect(html).toContain('Zayas House LLC');
    expect(html).toContain('Commonwealth of Puerto Rico, USA');
    expect(html).toContain('support@ghosttownverdict.com');
  });
});
