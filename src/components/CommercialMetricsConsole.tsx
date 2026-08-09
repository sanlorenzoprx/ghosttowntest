import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../lib/api';
import { loadAuthToken } from '../lib/storage';

type WindowDays = 7 | 30 | 90 | 180;

interface CommercialMetrics {
  generatedAt: string;
  window: { days: number; startsAt: string; endsAt: string };
  funnel: {
    landing_viewed: number;
    verdict_started: number;
    verdict_completed: number;
    paid_plan_viewed: number;
    checkout_started: number;
    download_clicked: number;
    purchase_completed: number;
  };
  conversion: {
    landing_to_verdict_start: number | null;
    verdict_start_to_complete: number | null;
    verdict_complete_to_checkout: number | null;
    checkout_to_verified_purchase: number | null;
    landing_to_verified_purchase: number | null;
  };
  verifiedPurchases: {
    count: number;
    revenueMinorUnitsByCurrency: Record<string, number>;
    authority: string;
  };
  topSources: Array<{ source: string; eventCount: number }>;
  note: string;
}

function percent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function revenueLines(revenue: Record<string, number>): string[] {
  const entries = Object.entries(revenue).sort(([left], [right]) => left.localeCompare(right));
  if (!entries.length) return ['$0 verified'];
  return entries.map(([currency, minorUnits]) => `${currency.toUpperCase()} ${(minorUnits / 100).toFixed(2)}`);
}

export default function CommercialMetricsConsole({ onBack }: { onBack: () => void }) {
  const [days, setDays] = useState<WindowDays>(30);
  const [metrics, setMetrics] = useState<CommercialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const revenue = useMemo(() => revenueLines(metrics?.verifiedPurchases.revenueMinorUnitsByCurrency || {}), [metrics]);

  async function loadMetrics(selectedDays = days) {
    setLoading(true);
    setError('');
    try {
      const token = loadAuthToken();
      if (!token) throw new Error('Owner login required');
      const response = await fetch(apiUrl(`/api/internal/commercial-metrics?days=${selectedDays}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json<CommercialMetrics & { error?: string }>();
      if (!response.ok) throw new Error(data.error || 'Could not load commercial metrics');
      setMetrics(data);
    } catch (loadError) {
      setMetrics(null);
      setError(loadError instanceof Error ? loadError.message : 'Could not load commercial metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMetrics(days);
  }, [days]);

  const cards = metrics ? [
    ['Visitors', metrics.funnel.landing_viewed],
    ['Tests started', metrics.funnel.verdict_started],
    ['Verdicts completed', metrics.funnel.verdict_completed],
    ['Checkout started', metrics.funnel.checkout_started],
    ['Paid Blueprints / purchases', metrics.funnel.purchase_completed],
    ['Verified revenue', revenue.join(' · ')],
    ['Visitor → purchase', percent(metrics.conversion.landing_to_verified_purchase)]
  ] : [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-ghost-rust">Commercial proof</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ghost-ink">GhostTown money dashboard</h1>
          <p className="mt-2 max-w-2xl text-gray-700">One view for the only funnel that matters right now: attention → test → verdict → checkout → Stripe-verified purchase.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90, 180].map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value as WindowDays)}
              className={`rounded-lg border px-3 py-2 text-sm font-bold ${days === value ? 'border-ghost-rust bg-ghost-rust text-white' : 'border-gray-300 bg-white text-gray-700'}`}
            >
              {value}d
            </button>
          ))}
          <button type="button" onClick={() => void loadMetrics(days)} className="rounded-lg border border-ghost-forest px-3 py-2 text-sm font-bold text-ghost-forest">Refresh</button>
          <button type="button" onClick={onBack} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700">Back</button>
        </div>
      </div>

      {loading && <p className="mt-10 text-gray-600">Loading commercial evidence…</p>}
      {error && <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{error}</div>}

      {metrics && !loading && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(([label, value]) => (
              <article key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">{label}</p>
                <p className="mt-3 text-3xl font-black text-ghost-ink">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-ghost-ink">Conversion chain</h2>
              <dl className="mt-5 space-y-4">
                <Metric label="Visitor → test started" value={percent(metrics.conversion.landing_to_verdict_start)} />
                <Metric label="Test started → verdict" value={percent(metrics.conversion.verdict_start_to_complete)} />
                <Metric label="Verdict → checkout" value={percent(metrics.conversion.verdict_complete_to_checkout)} />
                <Metric label="Checkout → verified purchase" value={percent(metrics.conversion.checkout_to_verified_purchase)} />
              </dl>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-ghost-ink">Traffic evidence</h2>
              {metrics.topSources.length ? (
                <ol className="mt-5 space-y-3">
                  {metrics.topSources.map(source => (
                    <li key={source.source} className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                      <span className="font-semibold text-gray-800">{source.source}</span>
                      <span className="font-black text-ghost-ink">{source.eventCount}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="mt-5 text-gray-600">No attributed traffic in this window yet.</p>}
            </article>
          </div>

          <p className="mt-6 text-sm text-gray-500">{metrics.note} Generated {new Date(metrics.generatedAt).toLocaleString()}.</p>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
      <dt className="font-semibold text-gray-700">{label}</dt>
      <dd className="text-xl font-black text-ghost-ink">{value}</dd>
    </div>
  );
}
