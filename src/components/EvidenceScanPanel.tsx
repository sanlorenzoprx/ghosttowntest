import type { EvidenceScanItem, GhostTownEvidenceScanV1 } from '../types/evidence';
import type { VerdictDecisionV3, VerdictEvidenceState } from '../verdict/verdictDecisionV3';

interface Props {
  scan: GhostTownEvidenceScanV1;
  decision: VerdictDecisionV3;
}

function itemMeta(item: EvidenceScanItem): string[] {
  const parts: string[] = [item.provider.replace(/_/g, ' ')];
  if (item.rating) {
    const scale = item.rating.maximum ? `/${item.rating.maximum}` : '';
    parts.push(`${item.rating.value}${scale} · ${item.rating.reviewCount} reviews`);
  }
  if (item.price) {
    const amount = item.price.displayed
      || [item.price.currency, item.price.current ?? item.price.maximum ?? item.price.regular]
        .filter(value => value !== undefined).join(' ');
    if (amount) parts.push(String(amount));
  }
  return parts;
}

function SignalList({ title, items, emptyText }: {
  title: string;
  items: EvidenceScanItem[];
  emptyText?: string;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-gray-950">{title}</h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-700">{items.length}</span>
      </div>
      {items.length ? (
        <ul className="mt-3 space-y-3 text-sm text-gray-700">
          {items.slice(0, 5).map(item => (
            <li key={item.evidenceId} className="border-l-2 border-ghost-gold pl-3">
              {item.publicUrl
                ? <a href={item.publicUrl} target="_blank" rel="noreferrer" className="font-bold text-blue-700 hover:underline">{item.label}</a>
                : <span className="font-bold">{item.label}</span>}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {itemMeta(item).map(meta => (
                  <span key={meta} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">{meta}</span>
                ))}
              </div>
              <p className="mt-1 text-xs leading-5 text-gray-600">{item.note}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-gray-500">{emptyText || 'No useful result surfaced in this bounded scan.'}</p>}
    </article>
  );
}
export default function EvidenceScanPanel({ scan, decision }: Props) {
  const layers = decision.evidenceLayers;
  return (
    <section data-testid="evidence-scan-v1" className="mb-8 overflow-hidden rounded-2xl border border-ghost-forest/25 bg-[#eef3ef] shadow-dust">
      <div className="border-b border-ghost-forest/15 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-forest">GhostTown Evidence Scan</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-ghost-ink">What the category already proves — and what your offer still has to prove.</h1>
          </div>
          <span className="rounded-full border border-ghost-forest/25 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-ghost-forest">{scan.status}</span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">
          Reviews and ratings can show that comparable customers actually consume and respond to solutions. Commercial review or transaction context can show that people pay in the category even when the exact price is unknown. Those facts are real evidence — but they are separate from whether your specific positioning and offer will win those buyers.
        </p>
      </div>

      <div className="border-b border-ghost-forest/15 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-forest">Market existence</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SignalList title="Competition" items={scan.competition} />
          <SignalList title="Search behavior" items={scan.demand} />
          <SignalList title="Where buyers gather" items={scan.access} />
          <SignalList title="Current alternatives" items={scan.currentAlternatives} />
        </div>
      </div>

      <div className="border-b border-ghost-forest/15 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-forest">External customer + commercial behavior</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SignalList
            title="Customer consumption"
            items={scan.customerConsumption ?? []}
            emptyText="No structured review/rating evidence surfaced in this bounded scan. That is an information gap, not proof that customers do not consume comparable solutions."
          />
          <SignalList
            title="Commercial consumption"
            items={scan.commercialConsumption ?? []}
            emptyText="No strong commercial-consumption metadata surfaced in this bounded scan. Missing exact price data is not treated as a negative signal."
          />
          <SignalList
            title="Pricing landscape"
            items={scan.pricingLandscape ?? []}
            emptyText="No structured price points surfaced. Price is optional evidence and does not block the verdict."
          />
          <SignalList
            title="Premium precedent"
            items={scan.premiumPrecedent ?? []}
            emptyText="No premium-priced outlier was established from this bounded sample. That does not mean premium positioning is unavailable."
          />
        </div>
        <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <strong>Pricing rule:</strong> observed prices describe the market. GhostTown does not automatically recommend the lowest, average, median, highest, or premium price. Premium-priced precedents are clues to inspect for differentiation, not instructions to copy a number.
        </p>
      </div>

      <div className="border-b border-ghost-forest/15 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-forest">Seven evidence layers</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <EvidenceLayer title="1 · Market existence" {...layers.marketExistence} />
          <EvidenceLayer title="2 · Customer consumption" {...layers.customerConsumption} />
          <EvidenceLayer title="3 · Commercial consumption" {...layers.commercialConsumption} />
          <EvidenceLayer title="4 · Pricing landscape" {...layers.pricingLandscape} />
          <EvidenceLayer title="5 · Premium precedent" {...layers.premiumPrecedent} />
          <EvidenceLayer title="6 · Direct offer response" {...layers.directOfferResponse} />
          <EvidenceLayer title="7 · Direct offer purchase" {...layers.directOfferPurchase} />
        </div>
      </div>

      <div className="space-y-3 bg-white p-6 sm:p-8">
        <Contrast label="Founder says" text={decision.evidenceContrast.founderSays} />
        <Contrast label="What outside behavior shows" text={decision.evidenceContrast.marketEvidenceSays} />
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

function EvidenceLayer({ title, statement, state, count }: {
  title: string;
  statement: string;
  state: VerdictEvidenceState;
  count: number;
}) {
  const value = state === 'observed' ? String(count) : state === 'not_collected' ? 'Not collected' : 'Not found';
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">{title}</p>
      <p className="mt-2 text-xl font-black text-gray-950">{value}</p>
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
