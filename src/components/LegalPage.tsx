import type { ReactNode } from 'react';
import { LEGAL_POLICY } from '../lib/businessPolicy';
import { legalPage, type LegalBlock, type LegalLocale, type LegalPageKind } from '../lib/legalPages';

export type { LegalPageKind };

interface Props {
  kind: LegalPageKind;
  locale?: LegalLocale;
}

const UI = {
  en: {
    updated: `Last updated ${LEGAL_POLICY.lastUpdated}`,
    onThisPage: 'On this page',
    questions: 'Questions? Email',
    noSecrets: 'Never send passwords or full card numbers by email.',
    otherPolicies: 'Other policies',
    about: 'About GhostTown',
    translation: '',
    pages: { terms: 'Terms of service', privacy: 'Privacy policy', refund: 'Refunds and cancellation', disclaimer: 'Disclaimer' }
  },
  es: {
    updated: `Última actualización: ${LEGAL_POLICY.lastUpdatedEs}`,
    onThisPage: 'En esta página',
    questions: '¿Preguntas? Escribe a',
    noSecrets: 'Nunca envíes contraseñas ni números completos de tarjeta por email.',
    otherPolicies: 'Otras políticas',
    about: 'Sobre GhostTown',
    translation: 'Esta es una traducción de la versión en inglés. Si hay alguna diferencia entre las dos, prevalece la versión en inglés.',
    pages: { terms: 'Términos de servicio', privacy: 'Política de privacidad', refund: 'Reembolsos y cancelación', disclaimer: 'Aviso legal' }
  }
} as const;

const HREFS: Record<LegalPageKind, string> = { terms: '/terms', privacy: '/privacy', refund: '/refunds', disclaimer: '/disclaimer' };

export default function LegalPage({ kind, locale = 'en' }: Props) {
  const page = legalPage(kind, locale);
  const ui = UI[locale];
  return (
    <section className="bg-ghost-paper px-4 py-12 sm:py-16">
      <article lang={locale} className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-ghost-rust">{page.eyebrow}</p>
        <h1 className="mt-3 font-slab text-4xl font-bold leading-tight tracking-tight text-ghost-ink sm:text-5xl">{page.title}</h1>
        <p className="mt-3 text-sm text-gray-500">{ui.updated}</p>
        {ui.translation && <p data-testid="legal-translation-note" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{ui.translation}</p>}
        <p className="mt-6 text-lg leading-relaxed text-gray-700">{inline(page.summary)}</p>

        <nav aria-label={ui.onThisPage} className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">{ui.onThisPage}</p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {page.sections.map(section => (
              <li key={section.id}><a className="text-blue-700 hover:underline" href={`#${section.id}`}>{section.title}</a></li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10 text-[15px] leading-7 text-gray-700">
          {page.sections.map(section => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-xl font-bold text-gray-950">{section.title}</h2>
              <div className="mt-3 space-y-3">{section.blocks.map((block, index) => <Block key={index} block={block} />)}</div>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-600">
          <p>
            {ui.questions} <a className="font-bold text-blue-700 underline" href={`mailto:${LEGAL_POLICY.supportEmail}`}>{LEGAL_POLICY.supportEmail}</a>. {ui.noSecrets}
          </p>
          <nav aria-label={ui.otherPolicies} className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {(Object.keys(HREFS) as LegalPageKind[]).filter(other => other !== kind).map(other => (
              <a key={other} className="font-bold text-blue-700 hover:underline" href={HREFS[other]}>{ui.pages[other]}</a>
            ))}
            <a className="font-bold text-blue-700 hover:underline" href="/about">{ui.about}</a>
          </nav>
        </footer>
      </article>
    </section>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === 'p') return <p>{inline(block.text)}</p>;
  if (block.kind === 'list') {
    return <ul className="list-disc space-y-2 pl-5">{block.items.map(item => <li key={item}>{inline(item)}</li>)}</ul>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead className="bg-gray-50 text-gray-900">
          <tr>{block.head.map(cell => <th key={cell} scope="col" className="px-4 py-2.5 font-bold">{cell}</th>)}</tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-gray-200 align-top">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-2.5">{inline(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Renders **bold** and [label](href) inside policy text.
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<strong key={match.index} className="font-bold text-gray-950">{match[1]}</strong>);
    else parts.push(<a key={match.index} className="font-bold text-blue-700 underline" href={match[3]}>{match[2]}</a>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
