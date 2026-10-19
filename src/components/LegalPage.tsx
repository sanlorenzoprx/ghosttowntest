import { BUSINESS_POLICY, FREE_VERDICT_POLICY } from '../lib/businessPolicy';
import { ASSESSMENT_PACK_CREDITS, ASSESSMENT_PACK_DISPLAY_PRICE } from '../lib/assessmentPack';
import { SPRINT_OFFER_ACTIVE } from '../lib/postVerdictOffer';
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

// Phase 1 copy: what GhostTown actually offers while the Sprint is dormant.
const freeVerdictPageCopy: Record<LegalPageKind, { eyebrow: string; title: string; intro: string }> = {
  privacy: {
    eyebrow: 'Privacy policy',
    title: 'How GhostTown handles information',
    intro: 'This policy describes the information GhostTown uses to give you a free verdict, run your account, and keep the First 30 email list.'
  },
  terms: {
    eyebrow: 'Terms of service',
    title: 'Terms for using GhostTown Test',
    intro: 'These terms cover the free verdict, accounts, the optional verdict pack, the First 30 email list, acceptable use, and the limits of what GhostTown provides.'
  },
  refund: {
    eyebrow: 'Payments and refunds',
    title: 'What you pay for, and what happens if something goes wrong',
    intro: 'The GhostTown verdict is free. The only purchase available today is an optional pack of extra verdicts. First 30 is not on sale yet.'
  },
  disclaimer: {
    eyebrow: 'Disclaimer',
    title: 'What GhostTown does—and does not—promise',
    intro: 'GhostTown is an evidence-gathering and decision tool. It does not replace professional advice or guarantee a business outcome.'
  }
};

export default function LegalPage({ kind }: Props) {
  const copy = SPRINT_OFFER_ACTIVE ? pageCopy[kind] : freeVerdictPageCopy[kind];
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
              <dt className="font-bold text-gray-900">Product</dt><dd>{SPRINT_OFFER_ACTIVE ? BUSINESS_POLICY.productName : FREE_VERDICT_POLICY.productName}</dd>
              <dt className="font-bold text-gray-900">Price</dt><dd>{SPRINT_OFFER_ACTIVE ? `${BUSINESS_POLICY.productPrice} one-time purchase; no subscription` : FREE_VERDICT_POLICY.productPrice}</dd>
            </dl>
          </section>

          {SPRINT_OFFER_ACTIVE ? <>
            {kind === 'privacy' && <PrivacySections />}
            {kind === 'terms' && <TermsSections />}
            {kind === 'refund' && <RefundSections />}
            {kind === 'disclaimer' && <DisclaimerSections />}
          </> : <>
            {kind === 'privacy' && <FreeVerdictPrivacySections />}
            {kind === 'terms' && <FreeVerdictTermsSections />}
            {kind === 'refund' && <FreeVerdictRefundSections />}
            {kind === 'disclaimer' && <FreeVerdictDisclaimerSections />}
          </>}
        </div>

        <aside className="mt-10 rounded-lg border border-blue-200 bg-blue-50 p-6" aria-label="Customer support">
          <h2 className="text-xl font-bold text-blue-950">Questions or need help?</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            Customer support can help with account access, checkout, {SPRINT_OFFER_ACTIVE ? 'plan delivery' : 'the First 30 email list'}, refunds, privacy requests, or questions about this page. Please include your account email and order reference when relevant, and never send passwords, API keys, or full payment details.
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
          Last updated {SPRINT_OFFER_ACTIVE ? 'July 29, 2026' : FREE_VERDICT_POLICY.lastUpdated}. This page is a public business policy summary and should be reviewed by qualified counsel for the applicable facts and jurisdiction before launch.
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

function FreeVerdictPrivacySections() {
  return <>
    <PolicySection title="Information we use">
      To give you a verdict we use the idea, answers, and locale you submit. If you create an account we use your email address and login data to secure it and save your verdicts. If you join the First 30 email list we keep your email address, the language you used, where you signed up, the verdict you signed up from, and the consent you gave. If you buy the optional verdict pack, Stripe processes the payment on its hosted checkout; GhostTown does not store card numbers.
    </PolicySection>
    <PolicySection title="Public content">
      Before a verdict runs, you confirm that your submitted idea, your GhostTown report, and the video generated from it are public content that may be reused and distributed by Shorts Factory. Email addresses and phone numbers are removed from that public copy, but do not submit private, confidential, or identifying information.
    </PolicySection>
    <PolicySection title="Providers that process your idea">
      GhostTown runs on Cloudflare (Workers, KV, D1, and R2). To build a verdict, parts of your idea are sent to Google Vertex AI through Cloudflare AI Gateway, and short search phrases based on your idea may be sent to DataForSEO, the YouTube Data API, and Podcast Index to look for public market signals. Stripe processes payments for the verdict pack.
    </PolicySection>
    <PolicySection title="The First 30 email list">
      We use your list email only to tell you about First 30, including when it opens. We do not sell the list or share it for other companies' marketing. Ask support at any time to be removed, and we will delete your entry.
    </PolicySection>
    <PolicySection title="Retention, security, and analytics">
      Verdict records are kept for up to 90 days, the public video copy of a report for up to one year, and verdicts saved to an account stay there until you ask us to remove them. We keep limited records of the connection a request came from, in hashed form, to apply fair-use limits. We use limited first-party funnel events to understand whether the product works, and we do not put passwords, login tokens, or card data in analytics. Contact support for access, correction, or deletion requests.
    </PolicySection>
  </>;
}

function FreeVerdictTermsSections() {
  return <>
    <PolicySection title="The free verdict">
      GhostTown gives you a verdict on a business idea: the decision it suggests, the biggest unknown, the fastest test, and the evidence it found. You get one free verdict without an account. Registered members can share a completed result to unlock one bonus verdict.
    </PolicySection>
    <PolicySection title="Fair use">
      To keep the free verdict available for everyone, GhostTown limits how many verdicts can be requested per hour from one connection and from one account. If you reach a limit, wait and try again. Do not automate requests, get around these limits, or use the service to build a competing dataset.
    </PolicySection>
    <PolicySection title="Optional verdict pack">
      {`You can buy ${ASSESSMENT_PACK_CREDITS} more verdicts for ${ASSESSMENT_PACK_DISPLAY_PRICE}, as a one-time purchase with no subscription. Credits are added to your account after Stripe confirms the payment.`}
    </PolicySection>
    <PolicySection title="The First 30 email list">
      Joining the First 30 list is free and does not buy anything or reserve a price. First 30 will have its own terms and refund policy, which will be published before it goes on sale.
    </PolicySection>
    <PolicySection title="Accounts and acceptable use">
      You are responsible for the accuracy of what you submit, protecting your login, and using GhostTown lawfully. Do not attempt to access another customer's account or results, abuse checkout, or submit unlawful, infringing, or harmful content.
    </PolicySection>
    <PolicySection title="Limitations">
      GhostTown does not guarantee customers, revenue, funding, demand, product-market fit, or any particular result. A verdict is a structured judgment about what to test next, labelled so you can tell evidence from assumptions.
    </PolicySection>
  </>;
}

function FreeVerdictRefundSections() {
  return <>
    <PolicySection title="The free verdict">
      The verdict is free and needs no card, so there is nothing to refund.
    </PolicySection>
    <PolicySection title="Optional verdict pack">
      {`Payment for the ${ASSESSMENT_PACK_CREDITS}-verdict pack is confirmed only by a verified Stripe webhook, and the credits are added to your account automatically. If you are charged but the credits do not appear, or you are charged twice, contact support with your checkout email and receipt and we will add the missing credits or refund the duplicate charge.`}
    </PolicySection>
    <PolicySection title="First 30">
      First 30 is not on sale yet. Its price and refund terms will be published here before anyone can buy it.
    </PolicySection>
    <PolicySection title="Delivery or payment problems">
      Contact support promptly with your account email and receipt. Do not send passwords, API keys, or full payment details by email.
    </PolicySection>
  </>;
}

function FreeVerdictDisclaimerSections() {
  return <>
    <PolicySection title="No professional advice">
      GhostTown is not legal, financial, investment, tax, accounting, medical, mental-health, compliance, or other professional advice. Regulated or high-impact ideas require qualified professional review before implementation.
    </PolicySection>
    <PolicySection title="Evidence, not certainty">
      A verdict combines your answers, an AI assessment, and public signals found by a short automated scan of search, video, and podcast sources. Those signals show that a market or conversation exists; they are not customer interviews, verified sales, or proof that your offer will sell. When the scan or the AI is unavailable, GhostTown falls back to a scored assessment of your answers.
    </PolicySection>
    <PolicySection title="Public content and responsibility">
      You are responsible for permissions, privacy, intellectual-property rights, and legal compliance for anything you submit. Your idea, report, and generated video are public content, so do not submit confidential information.
    </PolicySection>
  </>;
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return <section>
    <h2 className="text-xl font-bold text-gray-950">{title}</h2>
    <p className="mt-3">{children}</p>
  </section>;
}
