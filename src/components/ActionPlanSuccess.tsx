import { useEffect, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import CompetitorSeedStep from "./CompetitorSeedStep";

interface Props {
  orderId: string;
  onDone: () => void;
}
interface BlueprintStatusResponse {
  error?: string;
  status?: string;
}

type SuccessLocale = 'en' | 'es';
type FulfillmentView = 'verifying' | 'awaiting_seeds' | 'researching' | 'generating' | 'ready' | 'failed' | 'auth';

const successCopy = {
  en: {
    verifying: {
      label: 'Verifying order',
      title: 'Checking your paid order.',
      stage: 'GhostTown is confirming payment, order ownership, and Blueprint availability. Fulfillment is not complete yet.',
      meaning: 'Neutral check'
    },
    awaitingSeeds: {
      label: 'Customer input required',
      title: 'Payment verified. Confirm the research starting points.',
      stage: 'Choose exactly 2 or 3 competitors, alternatives, or adjacent products before research begins.',
      meaning: 'Awaiting seed confirmation'
    },
    researching: {
      label: 'Research in progress',
      title: 'Mapping the market neighborhood.',
      stage: 'GhostTown is researching public competitor, creator, publication, event, review, and partnership footprints. The Blueprint is not ready yet.',
      meaning: 'Researching'
    },
    generating: {
      label: 'Blueprint generation',
      title: 'Organizing verified research into the Blueprint.',
      stage: 'GhostTown is turning the research into the Launch Blueprint, PDF, and ready-state assets. Downloads are hidden until the backend confirms readiness.',
      meaning: 'Generating'
    },
    ready: {
      label: 'Ready',
      title: 'Your GhostTown Launch Blueprint is ready.',
      stage: 'The backend confirmed the ready state. You can download the supported artifacts or return to your account.',
      meaning: 'Ready'
    },
    failed: {
      label: 'Needs attention',
      title: 'Blueprint fulfillment needs attention.',
      stage: 'The current order did not complete successfully. No cause is assumed here; use the available recovery actions below.',
      meaning: 'Failed'
    },
    auth: {
      label: 'Login required',
      title: 'Log in with the checkout email.',
      stage: 'GhostTown needs the account associated with checkout before it can show this order.',
      meaning: 'Ownership check'
    },
    orderLabel: 'Order ID',
    spinner: 'Checking Blueprint status',
    returnDashboard: 'Return to Dashboard',
    openDashboard: 'Open executable Blueprint in Dashboard',
    pdf: 'Download readable PDF',
    zip: 'Download all finished assets',
    preparing: 'Preparing…',
    zipNote: 'The asset ZIP includes your machine-readable Blueprint JSON for backup, regeneration, and future automation.',
    downloadNotReady: 'Your Launch Blueprint is not ready yet',
    downloadFailed: 'Download failed',
    loginError: 'Please log in with the email used at checkout.',
    failedFallback: 'Blueprint generation needs attention. Return to the dashboard to retry the paid order.',
    paymentReceived: 'Payment received',
    afterSeeds: 'After confirmation, GhostTown queues the existing Launch Blueprint fulfillment flow.'
  },
  es: {
    verifying: {
      label: 'Verificando orden',
      title: 'Revisando tu orden pagada.',
      stage: 'GhostTown está confirmando pago, propiedad de la orden y disponibilidad del Blueprint. El fulfillment aún no está completo.',
      meaning: 'Revisión neutral'
    },
    awaitingSeeds: {
      label: 'Se requiere acción del cliente',
      title: 'Pago verificado. Confirma los puntos de partida de investigación.',
      stage: 'Elige exactamente 2 o 3 competidores, alternativas o productos adyacentes antes de que empiece la investigación.',
      meaning: 'Esperando confirmación de semillas'
    },
    researching: {
      label: 'Investigación en progreso',
      title: 'Mapeando el vecindario de mercado.',
      stage: 'GhostTown está investigando huellas públicas de competidores, creadores, publicaciones, eventos, reseñas y alianzas. El Blueprint aún no está listo.',
      meaning: 'Investigando'
    },
    generating: {
      label: 'Generación del Blueprint',
      title: 'Organizando investigación verificada en el Blueprint.',
      stage: 'GhostTown está convirtiendo la investigación en el Launch Blueprint, PDF y artefactos de estado listo. Las descargas permanecen ocultas hasta que el backend confirme que está listo.',
      meaning: 'Generando'
    },
    ready: {
      label: 'Listo',
      title: 'Tu GhostTown Launch Blueprint está listo.',
      stage: 'El backend confirmó el estado ready. Puedes descargar los artefactos compatibles o volver a tu cuenta.',
      meaning: 'Listo'
    },
    failed: {
      label: 'Necesita atención',
      title: 'El fulfillment del Blueprint necesita atención.',
      stage: 'La orden actual no se completó correctamente. No asumimos una causa aquí; usa las acciones de recuperación disponibles abajo.',
      meaning: 'Falló'
    },
    auth: {
      label: 'Inicio de sesión requerido',
      title: 'Inicia sesión con el correo del checkout.',
      stage: 'GhostTown necesita la cuenta asociada con checkout antes de mostrar esta orden.',
      meaning: 'Revisión de propiedad'
    },
    orderLabel: 'ID de orden',
    spinner: 'Revisando estado del Blueprint',
    returnDashboard: 'Volver al Dashboard',
    openDashboard: 'Abrir Blueprint ejecutable en el Dashboard',
    pdf: 'Descargar PDF legible',
    zip: 'Descargar todos los artefactos terminados',
    preparing: 'Preparando…',
    zipNote: 'El ZIP de artefactos incluye el JSON legible por máquina para respaldo, regeneración y automatización futura.',
    downloadNotReady: 'Tu Launch Blueprint aún no está listo',
    downloadFailed: 'La descarga falló',
    loginError: 'Inicia sesión con el correo usado en checkout.',
    failedFallback: 'La generación del Blueprint necesita atención. Vuelve al dashboard para reintentar la orden pagada.',
    paymentReceived: 'Pago recibido',
    afterSeeds: 'Después de confirmar, GhostTown pone en cola el flujo existente de fulfillment del Launch Blueprint.'
  }
};

function successLocale(): SuccessLocale {
  if (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es')) return 'es';
  return 'en';
}

function copyForStatus(locale: SuccessLocale, view: FulfillmentView) {
  const text = successCopy[locale];
  if (view === 'awaiting_seeds') return text.awaitingSeeds;
  return text[view];
}

export default function ActionPlanSuccess({ orderId, onDone }: Props) {
  const locale = successLocale();
  const text = successCopy[locale];
  const [ready, setReady] = useState(false);
  const [needsSeeds, setNeedsSeeds] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);
  const [view, setView] = useState<FulfillmentView>('verifying');
  const [stage, setStage] = useState(text.verifying.stage);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    setStage(copyForStatus(locale, view).stage);
  }, [locale, view]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const check = async () => {
      try {
        const response = await fetch(
          apiUrl(
            `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint`,
          ),
          { headers: authHeaders() },
        );
        let body: BlueprintStatusResponse = {};
        try {
          body = (await response.json()) as BlueprintStatusResponse;
        } catch {
          body = {};
        }
        if (cancelled) return;
        if (response.ok) {
          setReady(true);
          setNeedsSeeds(false);
          setView('ready');
          setStage(text.ready.stage);
          setError("");
          return;
        }
        if (response.status === 401) {
          setView('auth');
          setError(text.loginError);
          return;
        }
        if (body.status === "awaiting_seeds" || body.status === "paid") {
          setReady(false);
          setNeedsSeeds(true);
          setView('awaiting_seeds');
          setStage(text.awaitingSeeds.stage);
          setError("");
          return;
        }
        if (body.status === "researching") {
          setView('researching');
          setStage(text.researching.stage);
        } else if (body.status === "generating") {
          setView('generating');
          setStage(text.generating.stage);
        } else if (body.status === "failed") {
          setView('failed');
          setError(
            body.error ||
              text.failedFallback,
          );
          return;
        } else {
          setView('verifying');
          setStage(text.verifying.stage);
        }
        timer = window.setTimeout(check, 3000);
      } catch {
        if (!cancelled) timer = window.setTimeout(check, 3000);
      }
    };
    void check();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [locale, orderId, pollVersion, text]);

  const download = async (format: "pdf" | "zip") => {
    setDownloading(format);
    setError("");
    try {
      const path = format === "zip"
        ? `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint-assets.zip`
        : `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.pdf`;
      const response = await fetch(apiUrl(path), { headers: authHeaders() });
      if (!response.ok)
        throw new Error(text.downloadNotReady);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ghosttown-launch-blueprint-${orderId}${format === "zip" ? "-assets" : ""}.${format}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.downloadFailed);
    } finally {
      setDownloading("");
    }
  };

  if (needsSeeds) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-5 shadow-lantern sm:p-8 lg:p-10">
          <div className="mb-6 rounded-xl border border-ghost-gold/40 bg-white p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-ghost-rust">{text.paymentReceived}</p>
            <h1 className="mt-2 text-2xl font-black text-ghost-ink">{text.awaitingSeeds.title}</h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-700">{text.awaitingSeeds.stage}</p>
            <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-gray-600">{text.afterSeeds}</p>
          </div>
          <CompetitorSeedStep
            orderId={orderId}
            onStarted={() => {
              setNeedsSeeds(false);
              setReady(false);
              setView('researching');
              setStage(
                text.researching.stage,
              );
              setPollVersion((version) => version + 1);
            }}
            onBack={onDone}
          />
        </div>
      </main>
    );
  }

  const current = copyForStatus(locale, view);
  const isWorking = !ready && !error && (view === 'verifying' || view === 'researching' || view === 'generating');

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern sm:p-10">
        <p className="text-xs font-bold uppercase tracking-wider text-ghost-rust">
          {current.label}
        </p>
        <h1 className="mt-3 break-words font-display text-3xl font-bold text-ghost-ink sm:text-4xl">
          {current.title}
        </h1>
        <div className="mx-auto mt-5 max-w-xl rounded-xl border border-black/10 bg-white p-4" aria-live="polite">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-500">{current.meaning}</p>
          <p className="mt-2 break-words text-sm leading-6 text-gray-700">{stage}</p>
          <p className="mt-3 break-all text-xs text-gray-500">{text.orderLabel}: {orderId || '—'}</p>
        </div>
        {isWorking && (
          <div
            className="mx-auto mt-7 h-10 w-10 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust"
            aria-label={text.spinner}
          />
        )}
        {error && (
          <div className="mt-5 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <p>{error}</p>
          </div>
        )}
        {ready && (
          <>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void download("pdf")}
                disabled={Boolean(downloading)}
                className="min-h-11 rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 focus:ring-offset-2 disabled:opacity-50"
              >
                {downloading === "pdf" ? text.preparing : text.pdf}
              </button>
              <button
                type="button"
                onClick={() => void download("zip")}
                disabled={Boolean(downloading)}
                className="min-h-11 rounded-lg border border-ghost-rust px-5 py-3 font-bold text-ghost-rust focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 focus:ring-offset-2 disabled:opacity-50"
              >
                {downloading === "zip" ? text.preparing : text.zip}
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-gray-600">
              {text.zipNote}
            </p>
          </>
        )}
        <button
          type="button"
          onClick={onDone}
          className="mt-6 min-h-11 rounded px-4 py-2 text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {ready
            ? text.openDashboard
            : text.returnDashboard}
        </button>
      </div>
    </main>
  );
}
