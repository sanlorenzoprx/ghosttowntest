import { LEGAL_POLICY } from '../lib/businessPolicy';
import { GHOSTTOWN_FIRST_30_V1, GHOSTTOWN_YEAR_SQUARED_V1 } from '../lib/ghosttownOffer';

export default function AboutPage() {
  const first30 = GHOSTTOWN_FIRST_30_V1;
  const year = GHOSTTOWN_YEAR_SQUARED_V1;
  return (
    <section className="bg-ghost-paper px-4 py-12 sm:py-16">
      <article className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-ghost-rust">About</p>
        <h1 className="mt-3 font-slab text-4xl font-bold leading-tight tracking-tight text-ghost-ink sm:text-5xl">About GhostTown</h1>
        <p className="mt-6 text-lg leading-relaxed text-gray-700">
          GhostTown helps you find out whether a business idea is worth building before you spend months on it, and then helps you test it with real customers.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-950">What we offer</h2>
          <ul className="mt-3 space-y-3 text-[15px] leading-7 text-gray-700">
            <li><strong className="text-gray-950">Free verdict.</strong> Answer a few questions about your idea and get a clear verdict and the fastest test to run next.</li>
            <li><strong className="text-gray-950">{first30.name} — {first30.displayPrice}, opens soon.</strong> {first30.durationDays} days of guided help, a customer-acquisition website for your business, and the materials to reach your first customers.</li>
            <li><strong className="text-gray-950">{year.name}.</strong> Offered during {first30.name}: a year with GhostTown's AI operating partner, with your {first30.name} payment credited toward it.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-950">Who runs GhostTown</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-[15px] text-gray-700 sm:grid-cols-[10rem_1fr]">
            <dt className="font-bold text-gray-900">Company</dt><dd>{LEGAL_POLICY.operator}</dd>
            <dt className="font-bold text-gray-900">Based in</dt><dd>{LEGAL_POLICY.jurisdiction}</dd>
            <dt className="font-bold text-gray-900">Website</dt><dd>{LEGAL_POLICY.website}</dd>
            <dt className="font-bold text-gray-900">Email</dt><dd><a className="font-bold text-blue-700 underline" href={`mailto:${LEGAL_POLICY.supportEmail}`}>{LEGAL_POLICY.supportEmail}</a></dd>
          </dl>
        </section>

        <nav aria-label="Policies" className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-200 pt-6 text-sm">
          <a className="font-bold text-blue-700 hover:underline" href="/terms">Terms of service</a>
          <a className="font-bold text-blue-700 hover:underline" href="/privacy">Privacy policy</a>
          <a className="font-bold text-blue-700 hover:underline" href="/refunds">Refunds and cancellation</a>
          <a className="font-bold text-blue-700 hover:underline" href="/disclaimer">Disclaimer</a>
        </nav>
      </article>
    </section>
  );
}
