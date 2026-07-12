import { useState } from 'react';
import type { IdeaIntake } from '../types/lit';
import type { PaidTestIntake } from '../types/paidTest';

interface Props {
  idea: IdeaIntake;
  verdictId: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (intake: PaidTestIntake) => void;
}

export default function ActionPlanModal({ idea, verdictId, loading, onClose, onSubmit }: Props) {
  const [targetBuyer, setTargetBuyer] = useState(idea.targetUser);
  const [problem, setProblem] = useState(idea.painfulProblem);
  const [currentWorkaround, setCurrentWorkaround] = useState(idea.currentAlternative);
  const [expectedPrice, setExpectedPrice] = useState('$29');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!targetBuyer.trim() || !problem.trim() || !currentWorkaround.trim()) return;
    onSubmit({
      verdictId,
      targetBuyer: targetBuyer.trim(),
      problem: problem.trim(),
      currentWorkaround: currentWorkaround.trim(),
      expectedPrice: expectedPrice.trim() || '$29'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="action-plan-title">
      <div className="flex min-h-full items-center justify-center">
        <form onSubmit={submit} className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ghost-rust">$29 Validation Action Plan</p>
              <h2 id="action-plan-title" className="mt-1 text-2xl font-bold text-gray-950">Tell us what you want to validate</h2>
              <p className="mt-2 text-sm text-gray-600">Your answers guide the deeper AI-generated buyer, offer, and seven-day testing plan.</p>
            </div>
            <button type="button" onClick={onClose} disabled={loading} className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100" aria-label="Close action plan form">Close</button>
          </div>

          <div className="mt-6 space-y-5">
            <Field label="One buyer segment" value={targetBuyer} onChange={setTargetBuyer} placeholder="Example: independent web-design agencies" />
            <Field label="Urgent problem they will pay to solve" value={problem} onChange={setProblem} placeholder="Describe the costly or frustrating problem" multiline />
            <Field label="What they use or do today" value={currentWorkaround} onChange={setCurrentWorkaround} placeholder="Current tool, service, spreadsheet, or manual workaround" multiline />
            <Field label="Price you want to test" value={expectedPrice} onChange={setExpectedPrice} placeholder="$29" />
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading || !targetBuyer.trim() || !problem.trim() || !currentWorkaround.trim()} className="rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white hover:bg-[#96360d] disabled:opacity-50">
              {loading ? 'Opening secure checkout…' : 'Continue to Checkout — $29'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const className = "mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
  return (
    <label className="block text-sm font-bold text-gray-800">
      {label}
      {multiline ? (
        <textarea required rows={3} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={className} />
      ) : (
        <input required value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={className} />
      )}
    </label>
  );
}
