import type { GhostTownEvidenceScanV1 } from '../types/evidence';
import type { VerdictDecisionV3 } from '../verdict/verdictDecisionV3';

interface Props {
  scan: GhostTownEvidenceScanV1;
  decision: VerdictDecisionV3;
}

function SignalList({ title, items }: {
  title: string;
  items: GhostTownEvidenceScanV1['competition'];
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-gray-950">{title}</h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-700">{items.length}</span>
      </div>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          {items.slice(0, 5).map(item => (
            <li key={item.evidenceId} className="border-l-2 border-ghost-gold pl-3">
              {item.publicUrl ? <a href={item.publicUrl} target="_blank" rel="noreferrer" className="font-bold text-blue-700 hover:underline">{item.label}</a> : <span className="font-bold">{item.label}</span>}
              <span className="ml-2 text-xs uppercase tracking-wide text-gray-500">{item.provider.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-gray-500">We did not find a useful result in this quick check.</p>}
    </article>
  );
}
export default function EvidenceScanPanel({ scan, decision }: Props) {
  return (
    <section data-testid="evidence-scan-v1" className="mb-8 overflow-hidden rounded-2xl border border-ghost-forest/25 bg-[#eef3ef] shadow-dust">
      <div className="border-b border-ghost-forest/15 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-forest">GhostTown Evidence Scan</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-ghost-ink">What we found before your verdict.</h1>
          </div>
          <span className="rounded-full border border-ghost-forest/25 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-ghost-forest">{scan.status}</span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700">This quick check looks for signs that the market is real and places where you may reach buyers. It does not prove people will buy.</p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <SignalList title="Competition" items={scan.competition} />
        <SignalList title="Search signs" items={scan.demand} />
        <SignalList title="Where buyers may be" items={scan.access} />
        <SignalList title="What people use now" items={scan.currentAlternatives} />
      </div>
      <div className="grid gap-3 border-t border-ghost-forest/15 p-6 sm:grid-cols-3 sm:p-8">
        <EvidenceTier title="Market evidence" statement={decision.evidenceTiers.market.statement} state={decision.evidenceTiers.market.state} count={decision.evidenceTiers.market.count} />
        <EvidenceTier title="Customer evidence" statement={decision.evidenceTiers.customer.statement} state={decision.evidenceTiers.customer.state} count={decision.evidenceTiers.customer.count} />
        <EvidenceTier title="Buying evidence" statement={decision.evidenceTiers.commercial.statement} state={decision.evidenceTiers.commercial.state} count={decision.evidenceTiers.commercial.count} />
      </div>

      <div className="space-y-3 border-t border-ghost-forest/15 bg-white p-6 sm:p-8">
        <Contrast label="Founder says" text={decision.evidenceContrast.founderSays} />
        <Contrast label="What the market shows" text={decision.evidenceContrast.marketEvidenceSays} />
        <Contrast label="GhostTown concludes" text={decision.evidenceContrast.ghostTownConcludes} emphasis />
        {scan.uncertainty.length > 0 && (
          <details className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <summary className="cursor-pointer font-black text-amber-900">What we still do not know</summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
              {scan.uncertainty.map(item => <li key={item}>{item}</li>)}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
function EvidenceTier({ title, statement, state, count }: {
  title: string;
  statement: string;
  state: 'observed' | 'not_observed';
  count: number;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">{title}</p>
      <p className="mt-2 text-2xl font-black text-gray-950">{state === 'observed' ? count : '—'}</p>
      <p className="mt-2 text-sm leading-6 text-gray-700">{statement}</p>
    </article>
  );
}

function Contrast({ label, text, emphasis = false }: { label: string; text: string; emphasis?: boolean }) {
  return (
    <article className={`rounded-xl border p-4 ${emphasis ? 'border-ghost-rust/30 bg-[#fff7f2]' : 'border-gray-200 bg-gray-50'}`}>
      <p className={`text-xs font-black uppercase tracking-[0.12em] ${emphasis ? 'text-ghost-rust' : 'text-gray-600'}`}>{label}</p>
      <p className={`mt-2 leading-7 ${emphasis ? 'font-bold text-ghost-ink' : 'text-gray-800'}`}>{text}</p>
    </article>
  );
}
