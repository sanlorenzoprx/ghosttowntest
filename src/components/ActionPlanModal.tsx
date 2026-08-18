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
  researchSignals?: PrePurchaseResearchSignals | null;
}

export default function ActionPlanModal({ idea, verdictId, loading, error, onClose, onSubmit, researchSignals }: Props) {
  const [targetBuyer, setTargetBuyer] = useState(idea.targetUser);
  const [problem, setProblem] = useState(idea.painfulProblem);
  const [currentWorkaround, setCurrentWorkaround] = useState(idea.currentAlternative);
  const [offerHypothesis, setOfferHypothesis] = useState('');
  // This is the founder's own price hypothesis, not the price of GhostTown's Blueprint.
  const [expectedPrice, setExpectedPrice] = useState('');
  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;

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
      researchSignals: researchSignals ? {
        ...researchSignals,
        targetCustomer: targetBuyer.trim(),
        updatedAt: new Date().toISOString()
      } : undefined,
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
              <h2 id="action-plan-title" className="mt-1 text-2xl font-bold text-gray-950">Personalize your {GHOSTTOWN_30_DAY_PLAN_V1.name}</h2>
              <p className="mt-2 text-sm text-gray-600">{GHOSTTOWN_30_DAY_PLAN_V1.subtitle}. Confirm the buyer, problem, current alternative, offer, and price hypothesis that will drive one canonical Blueprint.</p>
            </div>
            <button type="button" onClick={onClose} disabled={loading} className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100" aria-label="Close Launch Blueprint form">Close</button>
          </div>

          <section className="mt-6 rounded-xl border border-ghost-rust/20 bg-[#fff7f2] p-5">
            <h3 className="font-black text-ghost-ink">Your Blueprint includes</h3>
            <ul className="mt-3 grid gap-2 text-sm text-gray-800 sm:grid-cols-2">
              {GHOSTTOWN_30_DAY_PLAN_V1.customerPromise.map(item => <li key={item} className="flex gap-2"><span className="font-black text-ghost-rust">✓</span><span>{item}</span></li>)}
            </ul>
            <p className="mt-4 rounded-lg bg-white p-3 text-sm font-bold text-ghost-ink">{GHOSTTOWN_30_DAY_PLAN_V1.launchSiteInvariant}</p>
          </section>

          <div className="mt-6 space-y-5">
            {researchSignals && <section className="rounded-xl border border-ghost-forest/20 bg-[#eef3ef] p-4" aria-label="Research map carried into checkout">
              <h3 className="font-black text-ghost-forest">Your research map is already attached</h3>
              <p className="mt-1 text-sm text-gray-700">These optional clues will carry into paid confirmation and research. GhostTown will verify them before treating them as evidence.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">{(['commercial', 'audience', 'ecosystem'] as const).map(type => <div key={type} className="rounded-lg border border-black/10 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wide text-gray-500">{type}</p><p className="mt-1 text-sm font-bold text-gray-800">{researchSignals[type]?.value || 'Skipped'}</p></div>)}</div>
            </section>}
            <Field label="One buyer segment" value={targetBuyer} onChange={setTargetBuyer} placeholder="Example: independent web-design agencies" />
            <Field label="Urgent problem they will pay to solve" value={problem} onChange={setProblem} placeholder="Describe the costly or frustrating problem" multiline />
            <Field label="What they use or do today" value={currentWorkaround} onChange={setCurrentWorkaround} placeholder="Current tool, service, spreadsheet, or manual workaround" multiline />
            <Field label="Offer you want to test" value={offerHypothesis} onChange={setOfferHypothesis} placeholder="Example: a manual QA audit delivered in 48 hours" multiline required={false} />
            <Field label="Price you want to test" value={expectedPrice} onChange={setExpectedPrice} placeholder="Example: $250 pilot" required={false} />
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading || !targetBuyer.trim() || !problem.trim() || !currentWorkaround.trim()} className="rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white hover:bg-[#96360d] disabled:opacity-50">
              {loading ? 'Opening secure checkout...' : `Continue to Checkout - ${displayPrice}`}
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
