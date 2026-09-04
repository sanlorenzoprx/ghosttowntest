import { useEffect, useMemo, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import { captureCommercialAttribution } from '../lib/commercialAttribution';
import type { EvaluationResult } from '../types/lit';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE } from '../lib/ghosttownOffer';

interface ResolveResponse {
  handoff_id: string;
  verdict_id: string;
  public_verdict: {
    verdict_id: string;
    verdict: string;
    summary: string;
    key_assumptions: string[];
    primary_risks: string[];
    fastest_test: string;
    next_actions: string[];
  };
  attribution: {
    source: string;
    platform: string;
    campaign: string;
    publication_id: string;
    source_verdict_id: string;
  };
  expires_at: string;
}

interface Props {
  handoffToken: string;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onClaimed: (result: EvaluationResult) => void;
  onHome: () => void;
}

export default function AgentHandoff({ handoffToken, isLoggedIn, onLoginClick, onClaimed, onHome }: Props) {
  const [data, setData] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;

  useEffect(() => {
    let active = true;
    void fetch(apiUrl(`/api/v1/agent-handoffs/${handoffToken}/resolve`), { method: 'POST' })
      .then(async response => {
        if (!response.ok) throw new Error('This agent handoff is unavailable or has expired.');
        return response.json<ResolveResponse>();
      })
      .then(value => {
        if (!active) return;
        setData(value);
        const params = new URLSearchParams();
        params.set('source', value.attribution.source);
        params.set('platform', value.attribution.platform);
        params.set('campaign', value.attribution.campaign);
        params.set('publication_id', value.attribution.publication_id);
        params.set('source_verdict_id', value.attribution.source_verdict_id);
        captureCommercialAttribution(`?${params.toString()}`);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to open this handoff.');
      });
    return () => { active = false; };
  }, [handoffToken]);

  const verdictLabel = useMemo(() => data?.public_verdict.verdict.replace(/_/g, ' '), [data]);

  async function claim(): Promise<void> {
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }
    setClaiming(true);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/v1/agent-handoffs/${handoffToken}/claim`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() }
      });
      const body = await response.json<{ result?: EvaluationResult; error?: string }>();
      if (!response.ok || !body.result) throw new Error(body.error || 'Unable to save this verdict to your account.');
      onClaimed(body.result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save this verdict to your account.');
    } finally {
      setClaiming(false);
    }
  }

  if (error && !data) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-4xl font-semibold text-ghost-ink">Shared verdict unavailable</h1>
        <p className="mt-4 text-gray-700">{error}</p>
        <button type="button" onClick={onHome} className="mt-8 rounded-lg bg-ghost-forest px-6 py-3 font-black text-white">Test an idea in GhostTown</button>
      </section>
    );
  }

  if (!data) {
    return <section className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-700">Opening your GhostTown verdict…</section>;
  }

  const verdict = data.public_verdict;
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-rust">GhostTown verdict</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-ghost-ink">{verdictLabel}</h1>
        <p className="mt-4 text-lg leading-8 text-gray-700">{verdict.summary}</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-black text-ghost-ink">Largest assumptions</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              {verdict.key_assumptions.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-black text-ghost-ink">Primary risks</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              {verdict.primary_risks.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-ghost-sand p-5">
          <h2 className="text-lg font-black text-ghost-ink">Fastest useful test</h2>
          <p className="mt-2 text-gray-800">{verdict.fastest_test}</p>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-black text-ghost-ink">Next actions</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-gray-700">
            {verdict.next_actions.map(item => <li key={item}>{item}</li>)}
          </ol>
        </div>

        {error && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="text-2xl font-black text-ghost-ink">Want help with the next 30 days?</h2>
          <p className="mt-2 text-gray-700">The 30-day plan turns this verdict into daily steps, messages, research, and a launch website. The current price is {displayPrice}. Save the verdict to your account before checkout. Only you can choose to buy it.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={claiming} onClick={() => void claim()} className="rounded-lg bg-ghost-rust px-6 py-3 font-black text-white disabled:opacity-60">
              {claiming ? 'Saving…' : isLoggedIn ? 'Save verdict and see the 30-day plan' : 'Log in to save this verdict'}
            </button>
            <button type="button" onClick={onHome} className="rounded-lg border border-ghost-forest px-6 py-3 font-black text-ghost-forest">Run GhostTown directly</button>
          </div>
        </div>
      </div>
    </section>
  );
}
