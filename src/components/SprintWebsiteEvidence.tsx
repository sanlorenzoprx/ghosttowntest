import { useCallback, useEffect, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';

interface WebsiteEvidence {
  available: boolean;
  separateProduct: boolean;
  getMeLiveOrderId?: string;
  status?: string;
  liveUrl?: string;
  activity?: {
    visits: number;
    leads: number;
    shares: number;
    sales: number;
    revenueCents: number;
  };
  recentFeedback?: Array<{
    createdAt: string;
    message: string;
    sourcePath: string;
  }>;
  capturedAt: string;
}

export default function SprintWebsiteEvidence({
  orderId,
  dayNumber,
  checkpointDay,
}: {
  orderId: string;
  dayNumber?: number;
  checkpointDay?: number;
}) {
  const [evidence, setEvidence] = useState<WebsiteEvidence | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const response = await fetch(
        apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/website-evidence`),
        { headers: authHeaders() },
      );
      const body = await response.json<{ websiteEvidence?: WebsiteEvidence; error?: string }>();
      if (!response.ok || !body.websiteEvidence) {
        throw new Error(body.error || 'Website evidence could not be loaded');
      }
      setEvidence(body.websiteEvidence);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [dayNumber, load]);

  if (state === 'loading' && !evidence) {
    return (
      <section aria-label="Website evidence from Get Me Live" className="rounded-2xl border border-black/10 bg-white p-6">
        <p className="text-sm font-bold text-gray-500">Checking for linked Get Me Live website evidence...</p>
      </section>
    );
  }

  if (state === 'error' && !evidence) {
    return (
      <section aria-label="Website evidence from Get Me Live" className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
        <p className="font-black">Website evidence is temporarily unavailable.</p>
        <p className="mt-2 text-sm text-gray-700">Your 30-Day Sprint still works normally. Get Me Live remains a separate product.</p>
        <button type="button" onClick={() => void load()} className="mt-4 rounded-lg border border-ghost-rust px-4 py-2 text-sm font-black text-ghost-rust">Try again</button>
      </section>
    );
  }

  if (!evidence?.available) return null;

  const activity = evidence.activity || { visits: 0, leads: 0, shares: 0, sales: 0, revenueCents: 0 };
  const feedback = evidence.recentFeedback || [];
  const context = checkpointDay
    ? `Use these live-site signals as one input in the Day ${checkpointDay} reassessment. Visits alone are not proof; customer responses and commitments carry more weight.`
    : dayNumber
      ? `Day ${dayNumber} can use these live-site signals as additional evidence. They do not replace the day's required customer evidence.`
      : 'Use these live-site signals as additional evidence. They do not replace the Sprint evidence rules.';

  return (
    <section aria-label="Website evidence from Get Me Live" className="rounded-2xl border border-sky-200 bg-sky-50/60 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-900">Website evidence - Get Me Live</p>
          <h3 className="mt-1 text-2xl font-black">What your live website is showing right now.</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">Get Me Live is a separate product. The Sprint works without it. When you own both, GhostTown can show website response here as an additional evidence source.</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg border border-sky-800 px-3 py-2 text-sm font-black text-sky-900">Refresh website evidence</button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Visits', activity.visits],
          ['Leads', activity.leads],
          ['Shares', activity.shares],
          ['Sales', activity.sales],
          ['Sales value', activity.revenueCents ? `$${(activity.revenueCents / 100).toFixed(2)}` : '--'],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-xl bg-white p-4 text-sm font-semibold text-gray-800">{context}</p>

      {feedback.length > 0 && (
        <div className="mt-5">
          <h4 className="font-black">Recent visitor feedback</h4>
          <div className="mt-3 grid gap-3">
            {feedback.map((item, index) => (
              <blockquote key={`${item.createdAt}-${index}`} className="rounded-xl bg-white p-4 text-sm">
                <p className="whitespace-pre-wrap text-gray-800">"{item.message}"</p>
                <footer className="mt-2 text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        {evidence.liveUrl && <a href={evidence.liveUrl} target="_blank" rel="noreferrer" className="font-black text-sky-900 underline">Open linked website</a>}
        <span className="text-gray-500">Checked {new Date(evidence.capturedAt).toLocaleString()}</span>
      </div>
    </section>
  );
}
