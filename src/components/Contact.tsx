interface Props {
  onStart: () => void;
}

export default function Contact({ onStart }: Props) {
  return (
    <section className="bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50 px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-ghost-rust">Contact Ghost Town Test</p>
        <h1 className="mt-4 max-w-3xl font-slab text-4xl font-bold leading-[1.08] tracking-tight text-ghost-ink sm:text-5xl lg:text-6xl">
          Need help deciding if an idea is worth building?
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-700">
          Send the short version. We can help with paid report access, checkout issues, partnership questions, or a bug that blocks your verdict.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-gray-950">Support</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Checkout, account, report access, or a verdict that did not save.
            </p>
            <a className="mt-4 inline-block font-bold text-blue-700 hover:text-blue-900" href="mailto:support@lit-ghosttown.app">
              support@lit-ghosttown.app
            </a>
          </article>

          <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-gray-950">Partnerships</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Startup communities, agencies, creators, and tools that want sharper idea validation.
            </p>
            <a className="mt-4 inline-block font-bold text-blue-700 hover:text-blue-900" href="mailto:hello@lit-ghosttown.app">
              hello@lit-ghosttown.app
            </a>
          </article>

          <article className="rounded-lg border border-ghost-rust/30 bg-ghost-rust p-6 text-white shadow-lantern">
            <h2 className="font-bold">Fastest answer</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Run one free verdict first. It gives support the exact context if you need help after.
            </p>
            <button
              type="button"
              onClick={onStart}
              className="mt-4 w-full rounded bg-white px-4 py-3 font-bold text-ghost-rust transition hover:bg-ghost-paper"
            >
              Run Free Verdict
            </button>
          </article>
        </div>

        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-bold text-blue-950">Paid report help</h2>
          <p className="mt-2 text-sm leading-relaxed text-blue-900">
            If you bought a paid Ghost Town report, include the email used at checkout and the idea name. Do not send API keys, Stripe secrets, passwords, or private customer data.
          </p>
        </div>
      </div>
    </section>
  );
}
