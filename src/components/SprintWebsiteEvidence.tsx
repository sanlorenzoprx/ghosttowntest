import { useCallback, useEffect, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import type { Locale } from '../lib/locale';

const COPY: Record<Locale, {
  loadFailed: string;
  sectionLabel: string;
  checking: string;
  unavailable: string;
  unavailableBody: string;
  tryAgain: string;
  checkpointContext: (day: number) => string;
  dayContext: (day: number) => string;
  generalContext: string;
  kicker: string;
  heading: string;
  intro: string;
  refresh: string;
  visits: string;
  leads: string;
  shares: string;
  sales: string;
  salesValue: string;
  feedback: string;
  openSite: string;
  checked: string;
  formatDate: (value: string) => string;
}> = {
  en: {
    loadFailed: 'Website evidence could not be loaded',
    sectionLabel: 'Website evidence from Get Me Live',
    checking: 'Checking for linked Get Me Live website evidence...',
    unavailable: 'Website evidence is temporarily unavailable.',
    unavailableBody: 'Your 30-Day Sprint still works normally. Get Me Live remains a separate product.',
    tryAgain: 'Try again',
    checkpointContext: day => `Use these live-site signals as one input in the Day ${day} reassessment. Visits alone are not proof; customer responses and commitments carry more weight.`,
    dayContext: day => `Day ${day} can use these live-site signals as additional evidence. They do not replace the day's required customer evidence.`,
    generalContext: 'Use these live-site signals as additional evidence. They do not replace the Sprint evidence rules.',
    kicker: 'Website evidence - Get Me Live',
    heading: 'What your live website is showing right now.',
    intro: 'Get Me Live is a separate product. The Sprint works without it. When you own both, GhostTown can show website response here as an additional evidence source.',
    refresh: 'Refresh website evidence',
    visits: 'Visits',
    leads: 'Leads',
    shares: 'Shares',
    sales: 'Sales',
    salesValue: 'Sales value',
    feedback: 'Recent visitor feedback',
    openSite: 'Open linked website',
    checked: 'Checked',
    formatDate: value => new Date(value).toLocaleString()
  },
  es: {
    loadFailed: 'No pudimos cargar lo que muestra tu página web',
    sectionLabel: 'Lo que muestra tu página web de Get Me Live',
    checking: 'Buscando datos de tu página web de Get Me Live...',
    unavailable: 'Los datos de tu página web no están disponibles ahora mismo.',
    unavailableBody: 'Tu Sprint de 30 días sigue funcionando normal. Get Me Live es un producto aparte.',
    tryAgain: 'Intentar otra vez',
    checkpointContext: day => `Usa estas señales de tu página como una pieza más en la revisión del Día ${day}. Las visitas solas no prueban nada; lo que te dicen los clientes y lo que se comprometen a hacer pesa más.`,
    dayContext: day => `En el Día ${day} puedes usar estas señales de tu página como prueba extra. No reemplazan la prueba con clientes que pide el día.`,
    generalContext: 'Usa estas señales de tu página como prueba extra. No reemplazan las reglas de prueba del Sprint.',
    kicker: 'Tu página web - Get Me Live',
    heading: 'Lo que tu página web está mostrando ahora mismo.',
    intro: 'Get Me Live es un producto aparte. El Sprint funciona sin él. Si tienes los dos, GhostTown te enseña aquí cómo responde la gente a tu página, como una prueba más.',
    refresh: 'Actualizar datos de la página',
    visits: 'Visitas',
    leads: 'Contactos',
    shares: 'Compartidos',
    sales: 'Ventas',
    salesValue: 'Valor de ventas',
    feedback: 'Comentarios recientes de visitantes',
    openSite: 'Abrir tu página web',
    checked: 'Revisado',
    formatDate: value => new Date(value).toLocaleString('es-PR')
  }
};

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
  locale = 'en',
}: {
  orderId: string;
  dayNumber?: number;
  checkpointDay?: number;
  locale?: Locale;
}) {
  const copy = COPY[locale];
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
        throw new Error(body.error || copy.loadFailed);
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
      <section aria-label={copy.sectionLabel} className="rounded-2xl border border-black/10 bg-white p-6">
        <p className="text-sm font-bold text-gray-500">{copy.checking}</p>
      </section>
    );
  }

  if (state === 'error' && !evidence) {
    return (
      <section aria-label={copy.sectionLabel} className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
        <p className="font-black">{copy.unavailable}</p>
        <p className="mt-2 text-sm text-gray-700">{copy.unavailableBody}</p>
        <button type="button" onClick={() => void load()} className="mt-4 rounded-lg border border-ghost-rust px-4 py-2 text-sm font-black text-ghost-rust">{copy.tryAgain}</button>
      </section>
    );
  }

  if (!evidence?.available) return null;

  const activity = evidence.activity || { visits: 0, leads: 0, shares: 0, sales: 0, revenueCents: 0 };
  const feedback = evidence.recentFeedback || [];
  const context = checkpointDay
    ? copy.checkpointContext(checkpointDay)
    : dayNumber
      ? copy.dayContext(dayNumber)
      : copy.generalContext;

  return (
    <section aria-label={copy.sectionLabel} className="rounded-2xl border border-sky-200 bg-sky-50/60 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-900">{copy.kicker}</p>
          <h3 className="mt-1 text-2xl font-black">{copy.heading}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">{copy.intro}</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg border border-sky-800 px-3 py-2 text-sm font-black text-sky-900">{copy.refresh}</button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          [copy.visits, activity.visits],
          [copy.leads, activity.leads],
          [copy.shares, activity.shares],
          [copy.sales, activity.sales],
          [copy.salesValue, activity.revenueCents ? `$${(activity.revenueCents / 100).toFixed(2)}` : '--'],
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
          <h4 className="font-black">{copy.feedback}</h4>
          <div className="mt-3 grid gap-3">
            {feedback.map((item, index) => (
              <blockquote key={`${item.createdAt}-${index}`} className="rounded-xl bg-white p-4 text-sm">
                <p className="whitespace-pre-wrap text-gray-800">"{item.message}"</p>
                <footer className="mt-2 text-xs text-gray-500">{copy.formatDate(item.createdAt)}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        {evidence.liveUrl && <a href={evidence.liveUrl} target="_blank" rel="noreferrer" className="font-black text-sky-900 underline">{copy.openSite}</a>}
        <span className="text-gray-500">{copy.checked} {copy.formatDate(evidence.capturedAt)}</span>
      </div>
    </section>
  );
}
