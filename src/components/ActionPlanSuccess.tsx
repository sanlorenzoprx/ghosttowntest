import { useEffect, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';

interface Props { orderId: string; onDone: () => void; }

export default function ActionPlanSuccess({ orderId, onDone }: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const check = async () => {
      try {
        const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/report`), { headers: authHeaders() });
        if (cancelled) return;
        if (response.ok) { setReady(true); setError(''); return; }
        if (response.status === 401) { setError('Please log in with the email used at checkout.'); return; }
        timer = window.setTimeout(check, 3000);
      } catch { if (!cancelled) timer = window.setTimeout(check, 3000); }
    };
    void check();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [orderId]);

  const download = async (format: 'json' | 'pdf') => {
    setDownloading(format); setError('');
    try {
      const suffix = format === 'pdf' ? '/report.pdf' : '/report';
      const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}${suffix}`), { headers: authHeaders() });
      if (!response.ok) throw new Error('Your report is not ready yet');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `lit-validation-plan-${orderId}.${format}`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Download failed'); }
    finally { setDownloading(''); }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern sm:p-10">
        <p className="text-xs font-bold uppercase tracking-wider text-ghost-rust">Payment received</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-ghost-ink">{ready ? 'Your Validation Action Plan is ready.' : 'Building your Validation Action Plan…'}</h1>
        <p className="mt-4 text-gray-700">{ready ? 'Download the printable plan or its structured source.' : 'The larger AI model is creating your buyer, offer, and seven-day validation plan. This page updates automatically.'}</p>
        {!ready && <div className="mx-auto mt-7 h-10 w-10 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust" aria-label="Generating report" />}
        {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {ready && <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button onClick={() => void download('pdf')} disabled={Boolean(downloading)} className="rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white disabled:opacity-50">{downloading === 'pdf' ? 'Preparing…' : 'Download PDF'}</button>
          <button onClick={() => void download('json')} disabled={Boolean(downloading)} className="rounded-lg border border-ghost-rust px-5 py-3 font-bold text-ghost-rust disabled:opacity-50">{downloading === 'json' ? 'Preparing…' : 'Download JSON'}</button>
        </div>}
        <button onClick={onDone} className="mt-6 text-sm font-bold text-blue-700 hover:underline">Return to dashboard</button>
      </div>
    </main>
  );
}
