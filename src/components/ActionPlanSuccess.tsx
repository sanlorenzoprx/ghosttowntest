import { useEffect, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import CompetitorSeedStep from "./CompetitorSeedStep";
import GetMeLiveUpsell from "./GetMeLiveUpsell";
import First30WebsiteIncluded from "./First30WebsiteIncluded";
import { isFirst30OrderId } from "../lib/first30Order";
import SprintShareMoment from "./SprintShareMoment";
import StrategicUncertaintySprintPanel from "./StrategicUncertaintySprintPanel";
import type { Locale } from "../lib/locale";

const COPY: Record<Locale, Record<"confirming"
  | "readyStage"
  | "loginNeeded"
  | "confirmSeeds"
  | "strategyGap"
  | "mapping"
  | "generating"
  | "needsAttention"
  | "notReady"
  | "downloadFailed"
  | "checkingAgain"
  | "mappingShort"
  | "readyTitle"
  | "buildingTitle"
  | "spinner"
  | "preparing"
  | "openDashboard"
  | "returnDashboard"
  | "paymentReceived", string>> = {
  en: {
    confirming: "Confirming payment and opening your paid research intake...",
    readyStage: "Your evidence-led Launch Blueprint and professional PDF are ready.",
    loginNeeded: "Please log in with the email used at checkout.",
    confirmSeeds: "Payment received. Confirm the competitor footprints GhostTown should research.",
    strategyGap: "GhostTown found a strategy gap. Answer a few questions before the 30-Day Sprint is built.",
    mapping: "Mapping competitor backlinks, podcasts, creators, publications, events, and partners...",
    generating: "Generating your offer, media pitches, outreach assets, Launch Site, calendar, PDF, and asset bundle...",
    needsAttention: "Blueprint generation needs attention. Return to the dashboard to retry the paid order.",
    notReady: "Your Launch Blueprint is not ready yet",
    downloadFailed: "Download failed",
    checkingAgain: "Thanks. GhostTown is checking the business chain again before building your 30 days.",
    mappingShort: "Mapping competitor media and distribution footprints...",
    readyTitle: "Your GhostTown Launch Blueprint is ready.",
    buildingTitle: "Building your Media & Distribution Network...",
    spinner: "Generating Blueprint",
    preparing: "Preparing...",
    openDashboard: "Open executable Blueprint in Dashboard",
    returnDashboard: "Return to Dashboard",
    paymentReceived: "Payment received"
  },
  es: {
    confirming: "Confirmando tu pago y abriendo las preguntas de tu investigación pagada...",
    readyStage: "Tu Launch Blueprint basado en pruebas y tu PDF profesional están listos.",
    loginNeeded: "Entra con el correo que usaste al pagar.",
    confirmSeeds: "Recibimos tu pago. Confirma los competidores que GhostTown debe investigar.",
    strategyGap: "GhostTown encontró un hueco en la estrategia. Contesta unas preguntas antes de que armemos tu Sprint de 30 días.",
    mapping: "Buscando dónde aparecen tus competidores: enlaces, podcasts, creadores, publicaciones, eventos y aliados...",
    generating: "Creando tu oferta, tus mensajes para medios, tus mensajes de contacto, tu Launch Site, tu calendario, tu PDF y tus archivos...",
    needsAttention: "Algo falló al crear tu Blueprint. Vuelve a tu panel para intentarlo otra vez con tu orden pagada.",
    notReady: "Tu Launch Blueprint todavía no está listo",
    downloadFailed: "La descarga falló",
    checkingAgain: "Gracias. GhostTown está revisando otra vez cómo encaja tu negocio antes de armar tus 30 días.",
    mappingShort: "Buscando en qué medios y canales aparecen tus competidores...",
    readyTitle: "Tu Launch Blueprint de GhostTown está listo.",
    buildingTitle: "Armando tu red de medios y distribución...",
    spinner: "Creando el Blueprint",
    preparing: "Preparando...",
    openDashboard: "Abrir tu Blueprint en el panel",
    returnDashboard: "Volver al panel",
    paymentReceived: "Pago recibido"
  }
};

interface Props {
  orderId: string;
  onDone: () => void;
  locale?: Locale;
}
interface BlueprintStatusResponse {
  error?: string;
  status?: string;
}

export default function ActionPlanSuccess({ orderId, onDone, locale = "en" }: Props) {
  const t = COPY[locale];
  const [ready, setReady] = useState(false);
  const [needsSeeds, setNeedsSeeds] = useState(false);
  const [needsUncertainty, setNeedsUncertainty] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);
  const [stage, setStage] = useState(t.confirming);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

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
          setStage(
            t.readyStage,
          );
          setError("");
          return;
        }
        if (response.status === 401) {
          setError(t.loginNeeded);
          return;
        }
        if (body.status === "awaiting_seeds" || body.status === "paid") {
          setNeedsSeeds(true);
          setStage(
            t.confirmSeeds,
          );
          setError("");
          return;
        }
        if (body.status === "uncertainty") {
          setNeedsUncertainty(true);
          setStage(t.strategyGap);
          setError("");
          return;
        }
        if (body.status === "researching")
          setStage(
            t.mapping,
          );
        else if (body.status === "generating")
          setStage(
            t.generating,
          );
        else if (body.status === "failed") {
          setError(
            body.error ||
              t.needsAttention,
          );
          return;
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
  }, [orderId, pollVersion, t]);

  const download = async () => {
    setDownloading("pdf");
    setError("");
    try {
      const path = `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.pdf`;
      const response = await fetch(apiUrl(path), { headers: authHeaders() });
      if (!response.ok)
        throw new Error(t.notReady);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ghosttown-launch-blueprint-${orderId}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.downloadFailed);
    } finally {
      setDownloading("");
    }
  };

  if (needsUncertainty) {
    return <StrategicUncertaintySprintPanel
      orderId={orderId}
      onBack={onDone}
      locale={locale}
      onSubmitted={() => {
        setNeedsUncertainty(false);
        setStage(t.checkingAgain);
        setPollVersion(version => version + 1);
      }}
    />;
  }

  if (needsSeeds) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern sm:p-10">
          <p className="mb-6 text-center text-xs font-bold uppercase tracking-wider text-ghost-rust">
            {t.paymentReceived}
          </p>
          <CompetitorSeedStep
            orderId={orderId}
            onStarted={() => {
              setNeedsSeeds(false);
              setStage(
                t.mappingShort,
              );
              setPollVersion((version) => version + 1);
            }}
            onBack={onDone}
            locale={locale}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern sm:p-10">
        <p className="text-xs font-bold uppercase tracking-wider text-ghost-rust">
          {t.paymentReceived}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-ghost-ink">
          {ready
            ? t.readyTitle
            : t.buildingTitle}
        </h1>
        <p className="mt-4 text-gray-700">{stage}</p>
        {!ready && !error && (
          <div
            className="mx-auto mt-7 h-10 w-10 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust"
            aria-label={t.spinner}
          />
        )}
        {error && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {ready && (
          <>
            <SprintShareMoment sourceSprintOrderId={orderId} locale={locale} />
            {isFirst30OrderId(orderId) ? <First30WebsiteIncluded locale={locale} /> : <GetMeLiveUpsell sourceSprintOrderId={orderId} />}
            <div className="mt-7 grid gap-3">
              <button
                onClick={() => void download()}
                disabled={Boolean(downloading)}
                className="rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                {downloading === "pdf" ? t.preparing : "PDF"}
              </button>
            </div>
          </>
        )}
        <button
          onClick={onDone}
          className="mt-6 text-sm font-bold text-blue-700 hover:underline"
        >
          {ready
            ? t.openDashboard
            : t.returnDashboard}
        </button>
      </div>
    </main>
  );
}
