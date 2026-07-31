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
        const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/plan`), { headers: authHeaders() });
        if (cancelled) return;
        if (response.ok) { setReady(true); setError(''); return; }
        if (response.status === 401) { setError('Please log in with the email used at checkout.'); return; }
        timer = window.setTimeout(check, 3000);
      } catch { if (!cancelled) timer = window.setTimeout(check, 3000); }
    };
    void check();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [orderId]);

  const downloadPdf = async () => {
    setDownloading('pdf'); setError('');
    try {
      const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/plan.pdf`), { headers: authHeaders() });
      if (!response.ok) throw new Error('Your plan is not ready yet');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `ghosttown-30-day-plan-${orderId}.pdf`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Download failed'); }
    finally { setDownloading(''); }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern sm:p-10">
        <p className="text-xs font-bold uppercase tracking-wider text-ghost-rust">{ready ? 'Payment verified' : 'Confirming payment'}</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-ghost-ink">{ready ? 'Your GhostTown Launch Blueprint Is Ready' : 'Building your GhostTown Launch Blueprint...'}</h1>
        {ready ? (
          <div className="mt-5 space-y-5 text-lg leading-8 text-gray-700">
            <p>Thank you for your purchase.</p>
            <p>We created your personalized 30-day plan using your business idea, GhostTown verdict, market evidence, offer strategy, and recommended validation steps.</p>
            <p>Your plan has been saved securely to your account.</p>
            <p>
              <button type="button" onClick={() => void downloadPdf()} disabled={Boolean(downloading)} className="font-bold text-ghost-forest underline decoration-2 underline-offset-4 hover:text-ghost-rust disabled:cursor-not-allowed disabled:no-underline">
                {downloading === 'pdf' ? 'Preparing Your GhostTown Launch Blueprint...' : 'Download Your GhostTown Launch Blueprint'}
              </button>
            </p>
            <p>You can also return to your dashboard at any time to download it again.</p>
          </div>
        ) : (
          <p className="mt-4 text-gray-700">The verified webhook is generating your buyer, offer, and 30-day evidence plan. This page updates automatically.</p>
        )}
        {!ready && <div className="mx-auto mt-7 h-10 w-10 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust" aria-label="Generating report" />}
        {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {ready && <button onClick={onDone} className="mt-7 font-bold text-ghost-forest underline decoration-2 underline-offset-4 hover:text-ghost-rust">Go to Your Dashboard</button>}
      </div>
    </main>
  );
}
