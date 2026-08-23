import { useState } from 'react';
import type { IdeaIntake } from '../types/lit';
import type { PaidTestIntake } from '../types/paidTest';
import type { PrePurchaseResearchSignals } from '../types/researchSignals';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import { commercialAttributionForCheckout } from '../lib/commercialAttribution';

interface Props {
  idea: IdeaIntake;
  verdictId: string;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (intake: PaidTestIntake) => void;
  /** Kept temporarily for call-site compatibility. Research now starts after purchase. */
  researchSignals?: PrePurchaseResearchSignals | null;
}

export default function ActionPlanModal({ idea, verdictId, loading, error, onClose, onSubmit }: Props) {
  const [targetBuyer, setTargetBuyer] = useState(idea.targetUser);
  const [problem, setProblem] = useState(idea.painfulProblem);
  const [currentWorkaround, setCurrentWorkaround] = useState(idea.currentAlternative);
  const [offerHypothesis, setOfferHypothesis] = useState('');
  // This is the founder's own price hypothesis, not the price of GhostTown's Blueprint.
  const [expectedPrice, setExpectedPrice] = useState('');
  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;
  const ctaPrice = displayPrice.replace(/\.00$/, '');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!targetBuyer.trim() || !problem.trim() || !currentWorkaround.trim()) return;
    onSubmit({
      verdictId,
      targetBuyer: targetBuyer.trim(),
      problem: problem.trim(),
      currentWorkaround: currentWorkaround.trim(),
      offerHypothesis: offerHypothesis.trim(),
      expectedPrice: expectedPrice.trim() || undefined,
      attribution: commercialAttributionForCheckout(verdictId)
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="action-plan-title">
      <div className="flex min-h-full items-center justify-center">
        <form onSubmit={submit} className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ghost-rust">{displayPrice} one-time purchase</p>
              <h2 id="action-plan-title" className="mt-1 text-2xl font-bold text-gray-950">You tested your idea. Now let’s help you make it real.</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                For {displayPrice}, GhostTown builds your 30-day plan and helps you work through it one day at a time.
              </p>
            </div>
            <button type="button" onClick={onClose} disabled={loading} className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100" aria-label="Close Launch Blueprint form">Close</button>
          </div>

          <section className="mt-6 rounded-xl border border-ghost-rust/20 bg-[#fff7f2] p-5">
            <h3 className="font-black text-ghost-ink">Your plan will not sit in a folder.</h3>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              The PDF shows the whole 30-day plan. Your Interactive Blueprint shows what to do today. We remind you what comes next. Tell GhostTown what happened, and we help you decide the next move.
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-gray-800 sm:grid-cols-2">
              {GHOSTTOWN_30_DAY_PLAN_V1.customerPromise.map(item => <li key={item} className="flex gap-2"><span className="font-black text-ghost-rust">✓</span><span>{item}</span></li>)}
            </ul>
            <p className="mt-4 rounded-lg bg-white p-3 text-sm font-bold text-ghost-ink">The PDF is the full map. Your Interactive Blueprint helps you take the next step.</p>
            <p className="mt-3 rounded-lg bg-white p-3 text-sm font-bold text-ghost-ink">{GHOSTTOWN_30_DAY_PLAN_V1.launchSiteInvariant}</p>
          </section>

          <section className="mt-6 rounded-xl border border-ghost-forest/20 bg-[#eef3ef] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-forest">We do the research</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">You do not need to hunt for competitors, podcasts, communities, or examples before you pay. GhostTown does that work and starts you with useful examples after purchase.</p>
          </section>

          <div className="mt-6 space-y-5">
            <Field label="Who do you want to help first?" value={targetBuyer} onChange={setTargetBuyer} placeholder="Example: local salon owners" />
            <Field label="What problem do they have?" value={problem} onChange={setProblem} placeholder="Describe the problem in your own words" multiline />
            <Field label="What do they do now?" value={currentWorkaround} onChange={setCurrentWorkaround} placeholder="What do they use or do instead?" multiline />

            <details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <summary className="cursor-pointer font-bold text-gray-800">Optional: I already know what I want to sell</summary>
              <p className="mt-2 text-sm text-gray-600">Skip this if you are not sure yet. GhostTown can help you work it out.</p>
              <div className="mt-4 space-y-5">
                <Field label="What do you want to sell?" value={offerHypothesis} onChange={setOfferHypothesis} placeholder="Example: a 48-hour website checkup" multiline required={false} />
                <Field label="What price are you thinking about?" value={expectedPrice} onChange={setExpectedPrice} placeholder="Example: $250" required={false} />
              </div>
            </details>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading || !targetBuyer.trim() || !problem.trim() || !currentWorkaround.trim()} className="rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white hover:bg-[#96360d] disabled:opacity-50">
              {loading ? 'Opening secure checkout...' : `Build My 30-Day Interactive Blueprint — ${ctaPrice}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false, required = true }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  required?: boolean;
}) {
  const isRequired = required !== false;
  const className = 'mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';
  return (
    <label className="block text-sm font-bold text-gray-800">
      {label}
      {multiline ? (
        <textarea required={isRequired} rows={3} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={className} />
      ) : (
        <input required={isRequired} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={className} />
      )}
    </label>
  );
}
