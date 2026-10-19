import { describe, expect, it } from 'vitest';
import { postalAddressLine, renderFirst30OpensEmail } from '../src/lib/first30Email';
import { LEGAL_POLICY } from '../src/lib/businessPolicy';

const unsubscribeUrl = 'https://api.ghosttownverdict.com/api/first30/unsubscribe?id=abc&t=def';
const first30Url = 'https://ghosttownverdict.com';

describe('First 30 list email', () => {
  for (const locale of ['en', 'es'] as const) {
    it(`carries every CAN-SPAM element (${locale})`, () => {
      const email = renderFirst30OpensEmail({ locale, unsubscribeUrl, first30Url });
      for (const body of [email.html, email.text]) {
        expect(body).toContain('BO QUEBRADA ONDA');
        expect(body).toContain('SAN LORENZO PR 00754');
        expect(body).toContain(LEGAL_POLICY.operator);
        expect(body).toContain(LEGAL_POLICY.website);
        expect(body).toContain(unsubscribeUrl.replace(/&/g, body === email.html ? '&amp;' : '&'));
      }
      expect(email.headers['List-Unsubscribe']).toBe(`<${unsubscribeUrl}>, <mailto:${LEGAL_POLICY.supportEmail}?subject=unsubscribe>`);
      expect(email.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
      expect(email.subject).toMatch(/First 30/);
      expect(email.html).toContain('$297');
      expect(email.html).not.toMatch(/\bguarantee|\bearn(ings)?\b|\bincome\b/i);
    });
  }

  it('shows an unsubscribe button in the HTML footer', () => {
    const email = renderFirst30OpensEmail({ locale: 'en', unsubscribeUrl, first30Url });
    expect(email.html).toMatch(/<a href="[^"]*first30\/unsubscribe[^"]*"[^>]*>Unsubscribe<\/a>/);
  });

  it('escapes links it puts into HTML', () => {
    const email = renderFirst30OpensEmail({ locale: 'en', unsubscribeUrl: 'https://x.test/?a="><script>', first30Url });
    expect(email.html).not.toContain('<script>');
  });

  it('formats the postal address on one line', () => {
    expect(postalAddressLine()).toBe('Zayas House LLC · BO QUEBRADA ONDA, CARR 181R 913 KM10, SAN LORENZO PR 00754');
  });
});
