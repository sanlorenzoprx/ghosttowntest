import { BUSINESS_POLICY } from '../lib/businessPolicy';
import type { ReactNode } from 'react';

export type LegalPageKind = 'privacy' | 'terms' | 'refund' | 'disclaimer';

interface Props {
  kind: LegalPageKind;
}

type Locale = 'en' | 'es';

interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

const effectiveDate = 'July 29, 2026';

const documents: Record<LegalPageKind, { eyebrow: string; title: string; intro: string; purpose: string; sections: LegalSection[] }> = {
  privacy: {
    eyebrow: 'Privacy policy',
    title: 'How GhostTown handles information',
    intro: 'This policy describes the information used to provide GhostTown Test, authenticated delivery, support, and the personalized 30-day plan.',
    purpose: 'Public policy document',
    sections: [
      {
        id: 'information-we-use',
        title: 'Information we use',
        body: 'We use account email and authentication data to secure accounts and deliver purchased plans. We use submitted idea, verdict, intake, order, and download information to generate and display the requested product. Stripe processes payment information on its hosted checkout; GhostTown does not store full card numbers.'
      },
      {
        id: 'storage-and-providers',
        title: 'Storage and providers',
        body: 'GhostTown uses Cloudflare Workers and KV for application data and Stripe for hosted payment processing. Data is retained only as needed to provide the account, purchased artifact, fraud prevention, support, accounting, and legal obligations.'
      },
      {
        id: 'analytics-and-choices',
        title: 'Analytics and choices',
        body: 'We use limited first-party funnel events to understand whether the product works. We do not intentionally store card data, passwords in plain text, authentication tokens in analytics, or unnecessary personal content. Contact support to request help with an account or privacy question.'
      }
    ]
  },
  terms: {
    eyebrow: 'Terms of service',
    title: 'Terms for using GhostTown Test',
    intro: 'These terms describe the digital product, account responsibilities, acceptable use, delivery, and limitations that apply when you use GhostTown Test.',
    purpose: 'Public terms document',
    sections: [
      {
        id: 'the-digital-product',
        title: 'The digital product',
        body: 'After verified payment, GhostTown provides one personalized 30-day implementation plan based on the submitted verdict and intake. The plan includes a canonical JSON record and a readable PDF delivered to the authenticated account dashboard. The product is informational and evidence-oriented, not custom consulting.'
      },
      {
        id: 'accounts-and-acceptable-use',
        title: 'Accounts and acceptable use',
        body: "You are responsible for the accuracy of information you submit, protecting your login credentials, and using the product lawfully. Do not attempt to access another customer's account or artifact, abuse checkout, reverse engineer payment controls, or submit unlawful, infringing, or harmful content."
      },
      {
        id: 'limitations',
        title: 'Limitations',
        body: 'GhostTown does not guarantee customers, revenue, funding, demand, product-market fit, investment readiness, or any particular result. The plan contains verified, inferred, and test-labelled claims so that you can distinguish evidence from hypotheses.'
      }
    ]
  },
  refund: {
    eyebrow: 'Refund and fulfillment policy',
    title: 'Purchase, delivery, and conditional refund policy',
    intro: 'GhostTown sells a one-time digital product: the Personalized 30-Day Idea-to-Evidence Implementation Plan, delivered as an authenticated PDF and canonical JSON record.',
    purpose: 'Public refund and fulfillment document',
    sections: [
      {
        id: 'fulfillment',
        title: 'Fulfillment',
        body: 'Payment is confirmed only by a verified Stripe webhook. The plan is generated deterministically, quality-checked, and delivered to the authenticated dashboard. If payment succeeds but fulfillment fails, the order remains visible and support can retry delivery without charging a second time.'
      },
      {
        id: 'conditional-money-back-guarantee',
        title: 'Conditional 100% money-back guarantee',
        body: `${BUSINESS_POLICY.refundCondition} Submit the request to support with the order reference, account email, implementation evidence, and a description of the result observed. Requests are reviewed against this condition. If approved, the refund is 100% of the GhostTown plan purchase price.`
      },
      {
        id: 'delivery-or-payment-problems',
        title: 'Delivery or payment problems',
        body: 'If the plan is missing, inaccessible, duplicated, or materially corrupted, contact support promptly with the checkout email and order reference. Do not send passwords, API keys, Stripe secrets, or full payment details by email.'
      }
    ]
  },
  disclaimer: {
    eyebrow: 'Disclaimer',
    title: 'What GhostTown does - and does not - promise',
    intro: 'GhostTown is an evidence-gathering and planning tool. It does not replace professional advice or guarantee a business outcome.',
    purpose: 'Public disclaimer document',
    sections: [
      {
        id: 'no-professional-advice',
        title: 'No professional advice',
        body: 'GhostTown is not legal, financial, investment, tax, accounting, medical, mental-health, compliance, or other professional advice. Regulated or high-impact ideas require qualified professional review before implementation.'
      },
      {
        id: 'evidence-not-certainty',
        title: 'Evidence, not certainty',
        body: 'A verdict and 30-day plan are structured hypotheses and tests based on the supplied information. They do not include independent market research, customer quotes, citations, or verified sales evidence unless explicitly supplied and verified.'
      },
      {
        id: 'public-content-and-responsibility',
        title: 'Public content and responsibility',
        body: 'You are responsible for permissions, privacy, intellectual-property rights, and legal compliance for information, media, customer data, or claims that you submit or publish. Do not submit confidential information that GhostTown does not need to provide the product.'
      }
    ]
  }
};

const interfaceCopy = {
  en: {
    effective: 'Effective date',
    contents: 'Contents',
    businessIdentity: 'Business identity',
    business: 'Business',
    jurisdiction: 'Jurisdiction',
    support: 'Support',
    product: 'Product',
    price: 'Price',
    priceNote: 'one-time purchase; no subscription',
    authoritative: 'Authoritative policy text',
    questions: 'Questions or need help?',
    supportBody: 'Customer support can help with account access, checkout, plan delivery, refunds, privacy requests, or questions about this page. Please include your account email and order reference when relevant, and never send passwords, API keys, or full payment details.',
    emailSupport: 'Email customer support',
    openSupport: 'Open support page',
    related: 'Related policies',
    return: 'Return to product',
    languageNote: 'Interface labels may appear in Spanish. The authoritative policy text on this page remains English.',
    updatedPrefix: 'Last updated'
  },
  es: {
    effective: 'Fecha efectiva',
    contents: 'Contenido',
    businessIdentity: 'Identidad del negocio',
    business: 'Negocio',
    jurisdiction: 'Jurisdiccion',
    support: 'Soporte',
    product: 'Producto',
    price: 'Precio',
    priceNote: 'compra unica; sin suscripcion',
    authoritative: 'Texto autorizado de la politica',
    questions: 'Preguntas o necesitas ayuda?',
    supportBody: 'Soporte puede ayudar con acceso a cuenta, checkout, entrega del plan, reembolsos, solicitudes de privacidad o preguntas sobre esta pagina. Incluye el email de tu cuenta y referencia de orden cuando aplique, y nunca envies passwords, API keys ni detalles completos de pago.',
    emailSupport: 'Enviar email a soporte',
    openSupport: 'Abrir pagina de soporte',
    related: 'Politicas relacionadas',
    return: 'Volver al producto',
    languageNote: 'Las etiquetas de interfaz pueden aparecer en espanol. El texto autorizado de la politica en esta pagina permanece en ingles.',
    updatedPrefix: 'Ultima actualizacion'
  }
} as const;

const relatedLinks: Array<{ kind: LegalPageKind; href: string; label: string }> = [
  { kind: 'privacy', href: '/privacy', label: 'Privacy' },
  { kind: 'terms', href: '/terms', label: 'Terms' },
  { kind: 'refund', href: '/refunds', label: 'Refunds and fulfillment' },
  { kind: 'disclaimer', href: '/disclaimer', label: 'Disclaimer' }
];

function currentLocale(): Locale {
  if (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es')) return 'es';
  return 'en';
}

export default function LegalPage({ kind }: Props) {
  const doc = documents[kind];
  const text = interfaceCopy[currentLocale()];

  return (
    <section className="bg-ghost-paper px-4 py-10 sm:py-16">
      <article className="mx-auto max-w-6xl" aria-labelledby="legal-page-title">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <header className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-ghost-rust">{doc.eyebrow}</p>
              <h1 id="legal-page-title" className="mt-4 max-w-[12ch] break-words font-slab text-4xl font-bold leading-tight tracking-tight text-ghost-ink sm:max-w-3xl sm:text-5xl">
                {doc.title}
              </h1>
              <p className="mt-5 max-w-[20rem] break-words text-lg leading-relaxed text-gray-700 sm:max-w-3xl">{doc.intro}</p>
              <dl className="mt-6 flex flex-wrap gap-3 text-sm">
                <div className="min-w-0 max-w-full rounded-lg border border-gray-200 bg-[#fbfaf7] px-4 py-2">
                  <dt className="sr-only">{text.effective}</dt>
                  <dd className="break-words"><span className="font-black text-gray-950">{text.effective}:</span> {effectiveDate}</dd>
                </div>
                <div className="min-w-0 max-w-full rounded-lg border border-gray-200 bg-[#fbfaf7] px-4 py-2">
                  <dt className="sr-only">Purpose</dt>
                  <dd className="break-words">{doc.purpose}</dd>
                </div>
              </dl>
            </header>

            <aside className="min-w-0 rounded-lg border border-gray-200 bg-[#fbfaf7] p-5" aria-labelledby="legal-contents-title">
              <h2 id="legal-contents-title" className="text-sm font-black uppercase tracking-[0.16em] text-gray-700">{text.contents}</h2>
              <nav className="mt-4" aria-label={text.contents}>
                <ol className="space-y-2 text-sm font-bold">
                  <li><a className="break-words text-ghost-rust underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ghost-rust/30" href="#business-identity">{text.businessIdentity}</a></li>
                  {doc.sections.map(section => (
                    <li key={section.id}>
                      <a className="break-words text-ghost-rust underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ghost-rust/30" href={`#${section.id}`}>{section.title}</a>
                    </li>
                  ))}
                  <li><a className="break-words text-ghost-rust underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ghost-rust/30" href="#legal-support">{text.support}</a></li>
                </ol>
              </nav>
            </aside>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <section id="business-identity" className="scroll-mt-24 rounded-lg border border-gray-200 bg-[#fbfaf7] p-6" aria-labelledby="business-identity-title">
              <h2 id="business-identity-title" className="text-xl font-black text-gray-950">{text.businessIdentity}</h2>
              <dl className="mt-5 grid gap-3 text-sm leading-6 text-gray-700">
                <div>
                  <dt className="font-black text-gray-950">{text.business}</dt>
                  <dd className="break-words">{BUSINESS_POLICY.businessName}</dd>
                </div>
                <div>
                  <dt className="font-black text-gray-950">{text.jurisdiction}</dt>
                  <dd className="break-words">{BUSINESS_POLICY.jurisdiction}</dd>
                </div>
                <div>
                  <dt className="font-black text-gray-950">{text.support}</dt>
                  <dd>
                    <a className="break-all font-black text-ghost-rust underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ghost-rust/30" href={`mailto:${BUSINESS_POLICY.supportEmail}`}>
                      {BUSINESS_POLICY.supportEmail}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-black text-gray-950">{text.product}</dt>
                  <dd className="break-words">{BUSINESS_POLICY.productName}</dd>
                </div>
                <div>
                  <dt className="font-black text-gray-950">{text.price}</dt>
                  <dd>{BUSINESS_POLICY.productPrice} {text.priceNote}</dd>
                </div>
              </dl>
            </section>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">{text.authoritative}</p>
              <div className="mt-4 space-y-8 text-base leading-8 text-gray-700">
                {doc.sections.map(section => (
                  <PolicySection key={section.id} id={section.id} title={section.title}>
                    {section.body}
                  </PolicySection>
                ))}
              </div>
            </div>
          </div>

          <aside id="legal-support" className="mt-10 scroll-mt-24 rounded-lg border border-ghost-rust/25 bg-[#fff7f2] p-6" aria-labelledby="legal-support-title">
            <h2 id="legal-support-title" className="text-xl font-black text-gray-950">{text.questions}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-700">{text.supportBody}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                className="inline-flex min-h-11 items-center justify-center rounded bg-ghost-rust px-4 py-2 font-black text-white hover:bg-[#7f3929] focus:outline-none focus:ring-2 focus:ring-ghost-rust/35"
                href={`mailto:${BUSINESS_POLICY.supportEmail}?subject=GhostTown%20customer%20support`}
              >
                {text.emailSupport}
              </a>
              <a className="inline-flex min-h-11 items-center justify-center rounded border border-ghost-rust px-4 py-2 font-black text-ghost-rust hover:bg-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/30" href="/contact">
                {text.openSupport}
              </a>
              <a className="inline-flex min-h-11 items-center justify-center rounded border border-gray-300 px-4 py-2 font-black text-gray-800 hover:border-ghost-rust focus:outline-none focus:ring-2 focus:ring-ghost-rust/30" href="/">
                {text.return}
              </a>
            </div>
          </aside>

          <nav className="mt-8 border-t border-gray-200 pt-6" aria-label={text.related}>
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-600">{text.related}</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {relatedLinks.map(link => (
                <a
                  key={link.kind}
                  className={`rounded-full border px-4 py-2 text-sm font-black focus:outline-none focus:ring-2 focus:ring-ghost-rust/30 ${link.kind === kind ? 'border-ghost-rust bg-[#fff7f2] text-ghost-rust' : 'border-gray-200 bg-white text-gray-700 hover:border-ghost-rust hover:text-ghost-rust'}`}
                  href={link.href}
                  aria-current={link.kind === kind ? 'page' : undefined}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>

          <p className="mt-8 text-sm leading-6 text-gray-600">{text.languageNote}</p>
          <p className="mt-4 border-t border-gray-200 pt-5 text-xs leading-6 text-gray-500">
            {text.updatedPrefix} {effectiveDate}. This page is a public business policy summary and should be reviewed by qualified counsel for the applicable facts and jurisdiction before launch.
          </p>
        </div>
      </article>
    </section>
  );
}

function PolicySection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-gray-200 pt-7 first:border-t-0 first:pt-0" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-2xl font-black leading-tight text-gray-950">{title}</h2>
      <p className="mt-4 max-w-3xl break-words text-gray-700 [overflow-wrap:anywhere]">{children}</p>
    </section>
  );
}
