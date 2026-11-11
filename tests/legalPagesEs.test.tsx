import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LegalPage from '../src/components/LegalPage';
import AboutPage from '../src/components/AboutPage';
import { LEGAL_PAGES, legalPage, type LegalPageKind } from '../src/lib/legalPages';
import { LEGAL_PAGES_ES } from '../src/lib/legalPagesEs';

const KINDS: LegalPageKind[] = ['terms', 'privacy', 'refund', 'disclaimer'];
const render = (kind: LegalPageKind, locale: 'en' | 'es') => renderToStaticMarkup(<LegalPage kind={kind} locale={locale} />);
const dollars = (value: unknown) => [...new Set(JSON.stringify(value).match(/\$[\d,]+(\.\d+)?/g) ?? [])].sort();

describe('Spanish policy pages', () => {
  it('mirror the English structure section by section', () => {
    for (const kind of KINDS) {
      const en = LEGAL_PAGES[kind];
      const es = LEGAL_PAGES_ES[kind];
      expect(es.sections.map(section => section.id), kind).toEqual(en.sections.map(section => section.id));
      en.sections.forEach((section, index) => {
        const other = es.sections[index];
        expect(other.blocks.map(block => block.kind), `${kind}#${section.id}`).toEqual(section.blocks.map(block => block.kind));
        section.blocks.forEach((block, blockIndex) => {
          const match = other.blocks[blockIndex];
          if (block.kind === 'list' && match.kind === 'list') expect(match.items.length, `${kind}#${section.id}`).toBe(block.items.length);
          if (block.kind === 'table' && match.kind === 'table') expect(match.rows.length, `${kind}#${section.id}`).toBe(block.rows.length);
        });
      });
    }
  });

  it('show the same dollar amounts as English', () => {
    for (const kind of KINDS) expect(dollars(LEGAL_PAGES_ES[kind]), kind).toEqual(dollars(LEGAL_PAGES[kind]));
    const refund = render('refund', 'es');
    expect(refund).toContain('nos quedamos con $1,100 y te reembolsamos $1,100');
    expect(refund).toContain('En el plan de pagos debes $1,350: ya pagaste $702, así que cobramos $648 más');
  });

  it('carry the required disclosures in Spanish', () => {
    const privacy = JSON.stringify(LEGAL_PAGES_ES.privacy);
    for (const required of [
      'Ley de Privacidad del Consumidor de California',
      'No rastrear',
      'Control Global de Privacidad',
      'Menores de edad',
      'No vendemos información personal',
      'enlace para cancelar la suscripción y nuestra dirección postal',
      '10 días laborables'
    ]) expect(privacy, required).toContain(required);
    const terms = JSON.stringify(LEGAL_PAGES_ES.terms);
    expect(terms).toContain('agencia de cobro');
    expect(terms).toContain('agencias de crédito de consumidores o de negocios');
    expect(terms).toContain('no una oportunidad de negocio');
    expect(JSON.stringify(LEGAL_PAGES_ES.disclaimer)).toContain('no promete ingresos');
  });

  it('label the page as a translation, in Spanish, with Spanish page chrome', () => {
    for (const kind of KINDS) {
      const es = render(kind, 'es');
      expect(es, kind).toContain('lang="es"');
      expect(es, kind).toContain('Última actualización: 19 de octubre de 2026');
      expect(es, kind).toContain('En esta página');
      expect(es, kind).toContain('prevalece la versión en inglés');
      expect(es, kind).not.toContain('$97');
      expect(render(kind, 'en'), kind).not.toContain('legal-translation-note');
    }
  });

  it('defaults to English and switches with the locale', () => {
    expect(legalPage('terms')).toBe(LEGAL_PAGES.terms);
    expect(legalPage('terms', 'es')).toBe(LEGAL_PAGES_ES.terms);
  });

  it('has a Spanish About page', () => {
    const html = renderToStaticMarkup(<AboutPage locale="es" />);
    expect(html).toContain('Sobre GhostTown');
    expect(html).toContain('Estado Libre Asociado de Puerto Rico, EE. UU.');
    expect(html).toContain('support@ghosttownverdict.app');
  });
});
