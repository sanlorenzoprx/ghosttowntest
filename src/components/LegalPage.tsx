import { BUSINESS_POLICY } from '../lib/businessPolicy';
import type { ReactNode } from 'react';

export type LegalPageKind = 'privacy' | 'terms' | 'refund' | 'disclaimer';

interface Props {
  kind: LegalPageKind;
}

const pageCopy: Record<LegalPageKind, { eyebrow: string; title: string; intro: string }> = {
  privacy: {
    eyebrow: 'Privacy policy',
    title: 'How GhostTown handles information',
    intro: 'This policy describes the information used to provide GhostTown Test, authenticated delivery, support, and the personalized 30-day plan.'
  },
  terms: {
    eyebrow: 'Terms of service',
    title: 'Terms for using GhostTown Test',
    intro: 'These terms describe the digital product, account responsibilities, acceptable use, delivery, and limitations that apply when you use GhostTown Test.'
  },
  refund: {
    eyebrow: 'Refund and fulfillment policy',
    title: 'Purchase, delivery, and conditional refund policy',
    intro: 'GhostTown sells a one-time digital product: the Personalized 30-Day Idea-to-Evidence Implementation Plan, delivered as an authenticated Blueprint and PDF.'
  },
  disclaimer: {
    eyebrow: 'Disclaimer',
    title: 'What GhostTown does—and does not—promise',
    intro: 'GhostTown is an evidence-gathering and planning tool. It does not replace professional advice or guarantee a business outcome.'
  }
};

export default function LegalPage({ kind }: Props) {
  const copy = pageCopy[kind];
  return (
    <section className="bg-ghost-paper px-4 py-16">
      <article className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-ghost-rust">{copy.eyebrow}</p>
        <h1 className="mt-4 font-slab text-4xl font-bold leading-tight tracking-tight text-ghost-ink sm:text-5xl">{copy.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-gray-700">{copy.intro}</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-gray-700">
          <section>
            <h2 className="text-xl font-bold text-gray-950">Business identity</h2>
            <dl className="mt-3 grid gap-2 sm:grid-cols-[12rem_1fr]">
              <dt className="font-bold text-gray-900">Business</dt><dd>{BUSINESS_POLICY.businessName}</dd>
              <dt className="font-bold text-gray-900">Jurisdiction</dt><dd>{BUSINESS_POLICY.jurisdiction}</dd>
              <dt className="font-bold text-gray-900">Support</dt><dd><a className="font-bold text-blue-700 underline" href={`mailto:${BUSINESS_POLICY.supportEmail}`}>{BUSINESS_POLICY.supportEmail}</a></dd>
              <dt className="font-bold text-gray-900">Product</dt><dd>{BUSINESS_POLICY.productName}</dd>
              <dt className="font-bold text-gray-900">Price</dt><dd>{BUSINESS_POLICY.productPrice} one-time purchase; no subscription</dd>
            </dl>
          </section>

          {kind === 'privacy' && <PrivacySections />}
          {kind === 'terms' && <TermsSections />}
          {kind === 'refund' && <RefundSections />}
          {kind === 'disclaimer' && <DisclaimerSections />}
        </div>

        <aside className="mt-10 rounded-lg border border-blue-200 bg-blue-50 p-6" aria-label="Customer support">
          <h2 className="text-xl font-bold text-blue-950">Questions or need help?</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            Customer support can help with account access, checkout, plan delivery, refunds, privacy requests, or questions about this page. Please include your account email and order reference when relevant, and never send passwords, API keys, or full payment details.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a
              className="rounded bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800"
              href={`mailto:${BUSINESS_POLICY.supportEmail}?subject=GhostTown%20customer%20support`}
            >
              Email customer support
            </a>
            <a className="font-bold text-blue-800 underline" href="/contact">
              Open support page
            </a>
          </div>
        </aside>

        <p className="mt-10 border-t border-gray-200 pt-5 text-xs leading-6 text-gray-500">
          Last updated July 29, 2026. This page is a public business policy summary and should be reviewed by qualified counsel for the applicable facts and jurisdiction before launch.
        </p>
      </article>
    </section>
  );
}

function PrivacySections() {
  return <>
    <PolicySection title="Information we use">
      We use account email and authentication data to secure accounts and deliver purchased plans. We use submitted idea, verdict, intake, order, and download information to generate and display the requested product. Stripe processes payment information on its hosted checkout; GhostTown does not store full card numbers.
    </PolicySection>
    <PolicySection title="Storage and providers">
      GhostTown uses Cloudflare Workers and KV for application data and Stripe for hosted payment processing. Data is retained only as needed to provide the account, purchased artifact, fraud prevention, support, accounting, and legal obligations.
    </PolicySection>
    <PolicySection title="Analytics and choices">
      We use limited first-party funnel events to understand whether the product works. We do not intentionally store card data, passwords in plain text, authentication tokens in analytics, or unnecessary personal content. Contact support to request help with an account or privacy question.
    </PolicySection>
  </>;
}

function TermsSections() {
  return <>
    <PolicySection title="The digital product">
      After verified payment, GhostTown provides one personalized 30-day implementation plan based on the submitted verdict and intake. The plan is available as an executable account Blueprint and a readable PDF. The product is informational and evidence-oriented, not custom consulting.
    </PolicySection>
    <PolicySection title="Accounts and acceptable use">
      You are responsible for the accuracy of information you submit, protecting your login credentials, and using the product lawfully. Do not attempt to access another customer’s account or artifact, abuse checkout, reverse engineer payment controls, or submit unlawful, infringing, or harmful content.
    </PolicySection>
    <PolicySection title="Limitations">
      GhostTown does not guarantee customers, revenue, funding, demand, product-market fit, investment readiness, or any particular result. The plan contains verified, inferred, and test-labelled claims so that you can distinguish evidence from hypotheses.
    </PolicySection>
  </>;
}

function RefundSections() {
  return <>
    <PolicySection title="Fulfillment">
      Payment is confirmed only by a verified Stripe webhook. The plan is generated deterministically, quality-checked, and delivered to the authenticated dashboard. If payment succeeds but fulfillment fails, the order remains visible and support can retry delivery without charging a second time.
    </PolicySection>
    <PolicySection title="Conditional 100% money-back guarantee">
      {BUSINESS_POLICY.refundCondition} Submit the request to support with the order reference, account email, implementation evidence, and a description of the result observed. Requests are reviewed against this condition. If approved, the refund is 100% of the GhostTown plan purchase price.
    </PolicySection>
    <PolicySection title="Delivery or payment problems">
      If the plan is missing, inaccessible, duplicated, or materially corrupted, contact support promptly with the checkout email and order reference. Do not send passwords, API keys, Stripe secrets, or full payment details by email.
    </PolicySection>
  </>;
}

function DisclaimerSections() {
  return <>
    <PolicySection title="No professional advice">
      GhostTown is not legal, financial, investment, tax, accounting, medical, mental-health, compliance, or other professional advice. Regulated or high-impact ideas require qualified professional review before implementation.
    </PolicySection>
    <PolicySection title="Evidence, not certainty">
      A verdict and 30-day plan are structured hypotheses and tests based on the supplied information. They do not include independent market research, customer quotes, citations, or verified sales evidence unless explicitly supplied and verified.
    </PolicySection>
    <PolicySection title="Public content and responsibility">
      You are responsible for permissions, privacy, intellectual-property rights, and legal compliance for information, media, customer data, or claims that you submit or publish. Do not submit confidential information that GhostTown does not need to provide the product.
    </PolicySection>
  </>;
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return <section>
    <h2 className="text-xl font-bold text-gray-950">{title}</h2>
    <p className="mt-3">{children}</p>
  </section>;
}
