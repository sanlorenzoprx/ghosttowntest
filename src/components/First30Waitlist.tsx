import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiUrl } from '../lib/api';
import { GHOSTTOWN_FIRST_30_WAITLIST_V1 } from '../lib/ghosttownOffer';

interface Props {
  source: 'verdict' | 'landing';
  verdictId?: string;
  locale?: 'en' | 'es';
}

type Status = 'idle' | 'sending' | 'joined';

export default function First30Waitlist({ source, verdictId, locale = 'en' }: Props) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const es = locale === 'es';
  const offer = es ? GHOSTTOWN_FIRST_30_WAITLIST_V1.es : GHOSTTOWN_FIRST_30_WAITLIST_V1;
  const failed = es ? 'No pudimos añadirte a la lista. Inténtalo otra vez.' : 'We could not add you to the list. Please try again.';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent) { setError(es ? 'Marca la casilla para que podamos escribirte cuando First 30 abra.' : 'Please tick the box so we can email you when First 30 opens.'); return; }
    setStatus('sending');
    setError('');
    try {
      const response = await fetch(apiUrl('/api/first30/waitlist'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: true, source, verdictId, locale })
      });
      const body: { error?: string } = await response.json<{ error?: string }>().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || failed);
      setStatus('joined');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : failed);
      setStatus('idle');
    }
  };

  return (
    <section id="first-30" data-testid="first-30-waitlist" className="mb-8 rounded-sm border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ghost-rust">{es ? 'Lo que viene' : 'What comes next'}</p>
      <h2 className="mt-2 font-display text-3xl font-bold text-ghost-ink">{offer.headline}</h2>
      <p className="mt-3 text-sm leading-6 text-gray-700">{offer.summary}</p>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
        {offer.promise.map(item => <li key={item} className="rounded-lg border border-ghost-rust/15 bg-white p-3">{item}</li>)}
      </ul>

      {status === 'joined' ? (
        <p role="status" data-testid="first-30-joined" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          {es ? 'Ya estás en la lista. Te escribiremos cuando First 30 abra.' : 'You are on the list. We will email you when First 30 opens.'}
        </p>
      ) : (
        <form className="mt-5 space-y-3" onSubmit={event => void submit(event)} noValidate>
          <label className="block text-sm font-bold text-gray-900" htmlFor={`first-30-email-${source}`}>{es ? 'Email' : 'Email address'}</label>
          <input
            id={`first-30-email-${source}`}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            className="min-h-12 w-full rounded-sm border border-gray-300 bg-white px-4 py-3 text-base text-gray-950 focus:border-ghost-rust focus:outline-none focus:ring-4 focus:ring-ghost-rust/20"
            placeholder="you@example.com"
          />
          <label className="flex items-start gap-3 text-sm leading-6 text-gray-700">
            <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-4 w-4" />
            <span>{offer.consentText}</span>
          </label>
          {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={status === 'sending'} className="min-h-14 w-full rounded-sm bg-ghost-rust px-5 py-4 font-bold text-white shadow-lantern hover:bg-[#96360d] disabled:opacity-50">
            {status === 'sending' ? (es ? 'Uniéndote...' : 'Joining...') : (es ? 'Unirme a la lista de First 30' : 'Join the First 30 list')}
          </button>
        </form>
      )}
      <p className="mt-4 text-xs leading-5 text-gray-600">{offer.truthBoundary} {es ? 'Lee la' : 'See the'} <a className="underline" href="/privacy">{es ? 'política de privacidad' : 'privacy policy'}</a>.</p>
    </section>
  );
}
