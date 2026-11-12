import type { Locale } from "../lib/locale";
import { useCallback as useCopyCallback } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import type {
  DistributionTargetType,
  GhostTownLaunchBlueprint,
} from "../types/launchBlueprint";
import LaunchSitePanel from "./LaunchSitePanel";

type Section =
  | "overview"
  | "offer"
  | "distribution"
  | "copy"
  | "site"
  | "calendar"
  | "decision";
type MetricKey =
  | "outreachSent"
  | "replies"
  | "interviews"
  | "qualifiedConversations"
  | "commitments"
  | "revenueCents";

interface BlueprintProgress {
  completedDays: number[];
  evidenceNotes: Record<string, string>;
  metrics: Record<MetricKey, number>;
  finalDecision?: "continue" | "revise" | "pivot" | "stop";
  updatedAt: string;
}

interface BlueprintPayload {
  blueprint: GhostTownLaunchBlueprint;
  progress: BlueprintProgress;
  research: {
    provider: string;
    model: string;
    completedAt: string;
    webSearchQueries: string[];
    attemptedSourceCount: number;
    successfulSourceCount: number;
    sourceTypeCount: number;
    verifiedChannelCount: number;
    rejectedUrlCount: number;
    failedSourceCount: number;
    seedDomains?: string[];
    targetTypeCounts?: Record<string, number>;
  };
}

interface Props {
  orderId: string;
  onBack: () => void;
  locale?: Locale;
}

const sections: Array<{ id: Section; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "offer", label: "Offer" },
  { id: "distribution", label: "Media Network" },
  { id: "copy", label: "Launch Copy" },
  { id: "site", label: "Launch Site" },
  { id: "calendar", label: "30-Day Calendar" },
  { id: "decision", label: "Decision" },
];

const targetLabels: Record<DistributionTargetType, string> = {
  podcast: "Podcasts",
  youtube_creator: "YouTube Creators",
  newsletter_or_publication: "Newsletters & Publications",
  event: "Events",
  association: "Associations",
  review_site: "Review Sites",
  complementary_partner: "Complementary Partners",
  community: "Communities",
};

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function targetLabel(value?: DistributionTargetType): string {
  return value ? targetLabels[value] : "Distribution Target";
}


type CopyKey = "Launch Blueprint could not be opened" | "Progress could not be saved" | "Blueprint PDF is not available" | "Download failed" | "Opening your Launch Blueprint..." | "Return to Dashboard" | "← Dashboard" | "GhostTown Launch Blueprint" | "/30 days complete" | "Saving..." | "PDF" | "Executive launch decision" | "First customer" | "Risk boundary" | "hours · $" | "Execution progress" | "Distribution targets" | "Target types" | "Finished posts" | "Outreach scripts" | "Media & Distribution Network" | "Proven attention paths reverse-engineered from comparable brands." | "GhostTown mapped competitor backlinks, podcasts, YouTube creators, publications, events, associations, review sites, and complementary partners. Each target includes a public access path, prepared asset, recommended pitch, and evidence trail." | "Open the network" | "Week" | "Ready-to-test offer" | "First value:" | "Time to value:" | "Where comparable businesses already earn attention." | "Research completed" | "using" | ". The paid network is independent of the owner-only Google research console." | "Seed:" | "verified targets" | "confidence" | "Open source ↗" | "Why this target is proven" | "Audience owner" | "Public access path" | "Prepared asset" | "Recommended approach" | "Matching script" | "Use the closest relationship-specific script." | "First action" | "Risk" | "Five finished helpful assets" | "Copied" | "Copy asset" | "Relationship-specific outreach scripts" | "Copy" | "Launch page preview" | "The problem" | "What is included" | "Metadata" | "How it works" | "Confirmation email" | "30-Day execution calendar" | "Each day includes exact actions, prepared assets, a deliverable, a measurement, and evidence to record." | "/30 complete" | "Day" | "Exact actions" | "Prepared assets" | "Deliverable" | "Success measurement" | "Evidence and notes" | "Record exact replies, links, commitments, objections, screenshots, or other evidence." | "Evidence scoreboard" | "Track behavior and commitments, not compliments." | "Revenue" | "Final decision" | "Next:" | "Public source appendix" | "· accessed" | "Overview" | "Offer" | "Media Network" | "Launch Copy" | "Launch Site" | "30-Day Calendar" | "Decision" | "Distribution Target" | "Saved" | "outreach Sent" | "replies" | "interviews" | "qualified Conversations" | "commitments" | "continue" | "revise" | "pivot" | "stop" | "Podcasts" | "YouTube Creators" | "Newsletters & Publications" | "Events" | "Associations" | "Review Sites" | "Complementary Partners" | "Communities";
const COPY: Record<Locale, Record<CopyKey, string>> = { en: {
  "Launch Blueprint could not be opened": "Launch Blueprint could not be opened",
  "Progress could not be saved": "Progress could not be saved",
  "Blueprint PDF is not available": "Blueprint PDF is not available",
  "Download failed": "Download failed",
  "Opening your Launch Blueprint...": "Opening your Launch Blueprint...",
  "Return to Dashboard": "Return to Dashboard",
  "← Dashboard": "← Dashboard",
  "GhostTown Launch Blueprint": "GhostTown Launch Blueprint",
  "/30 days complete": "/30 days complete",
  "Saving...": "Saving...",
  "PDF": "PDF",
  "Executive launch decision": "Executive launch decision",
  "First customer": "First customer",
  "Risk boundary": "Risk boundary",
  "hours · $": "hours · $",
  "Execution progress": "Execution progress",
  "Distribution targets": "Distribution targets",
  "Target types": "Target types",
  "Finished posts": "Finished posts",
  "Outreach scripts": "Outreach scripts",
  "Media & Distribution Network": "Media & Distribution Network",
  "Proven attention paths reverse-engineered from comparable brands.": "Proven attention paths reverse-engineered from comparable brands.",
  "GhostTown mapped competitor backlinks, podcasts, YouTube creators, publications, events, associations, review sites, and complementary partners. Each target includes a public access path, prepared asset, recommended pitch, and evidence trail.": "GhostTown mapped competitor backlinks, podcasts, YouTube creators, publications, events, associations, review sites, and complementary partners. Each target includes a public access path, prepared asset, recommended pitch, and evidence trail.",
  "Open the network": "Open the network",
  "Week": "Week",
  "Ready-to-test offer": "Ready-to-test offer",
  "First value:": "First value:",
  "Time to value:": "Time to value:",
  "Where comparable businesses already earn attention.": "Where comparable businesses already earn attention.",
  "Research completed": "Research completed",
  "using": "using",
  ". The paid network is independent of the owner-only Google research console.": ". The paid network is independent of the owner-only Google research console.",
  "Seed:": "Seed:",
  "verified targets": "verified targets",
  "confidence": "confidence",
  "Open source ↗": "Open source ↗",
  "Why this target is proven": "Why this target is proven",
  "Audience owner": "Audience owner",
  "Public access path": "Public access path",
  "Prepared asset": "Prepared asset",
  "Recommended approach": "Recommended approach",
  "Matching script": "Matching script",
  "Use the closest relationship-specific script.": "Use the closest relationship-specific script.",
  "First action": "First action",
  "Risk": "Risk",
  "Five finished helpful assets": "Five finished helpful assets",
  "Copied": "Copied",
  "Copy asset": "Copy asset",
  "Relationship-specific outreach scripts": "Relationship-specific outreach scripts",
  "Copy": "Copy",
  "Launch page preview": "Launch page preview",
  "The problem": "The problem",
  "What is included": "What is included",
  "Metadata": "Metadata",
  "How it works": "How it works",
  "Confirmation email": "Confirmation email",
  "30-Day execution calendar": "30-Day execution calendar",
  "Each day includes exact actions, prepared assets, a deliverable, a measurement, and evidence to record.": "Each day includes exact actions, prepared assets, a deliverable, a measurement, and evidence to record.",
  "/30 complete": "/30 complete",
  "Day": "Day",
  "Exact actions": "Exact actions",
  "Prepared assets": "Prepared assets",
  "Deliverable": "Deliverable",
  "Success measurement": "Success measurement",
  "Evidence and notes": "Evidence and notes",
  "Record exact replies, links, commitments, objections, screenshots, or other evidence.": "Record exact replies, links, commitments, objections, screenshots, or other evidence.",
  "Evidence scoreboard": "Evidence scoreboard",
  "Track behavior and commitments, not compliments.": "Track behavior and commitments, not compliments.",
  "Revenue": "Revenue",
  "Final decision": "Final decision",
  "Next:": "Next:",
  "Public source appendix": "Public source appendix",
  "· accessed": "· accessed",
  "Overview": "Overview",
  "Offer": "Offer",
  "Media Network": "Media Network",
  "Launch Copy": "Launch Copy",
  "Launch Site": "Launch Site",
  "30-Day Calendar": "30-Day Calendar",
  "Decision": "Decision",
  "Distribution Target": "Distribution Target",
  "Saved": "Saved",
  "outreach Sent": "outreach Sent",
  "replies": "replies",
  "interviews": "interviews",
  "qualified Conversations": "qualified Conversations",
  "commitments": "commitments",
  "continue": "continue",
  "revise": "revise",
  "pivot": "pivot",
  "stop": "stop",
  "Podcasts": "Podcasts",
  "YouTube Creators": "YouTube Creators",
  "Newsletters & Publications": "Newsletters & Publications",
  "Events": "Events",
  "Associations": "Associations",
  "Review Sites": "Review Sites",
  "Complementary Partners": "Complementary Partners",
  "Communities": "Communities"
}, es: {
  "Launch Blueprint could not be opened": "No pudimos abrir tu Blueprint de lanzamiento",
  "Progress could not be saved": "No pudimos guardar tu progreso",
  "Blueprint PDF is not available": "El PDF del Blueprint no está disponible",
  "Download failed": "La descarga falló",
  "Opening your Launch Blueprint...": "Abriendo tu Blueprint de lanzamiento...",
  "Return to Dashboard": "Volver al panel",
  "← Dashboard": "← Panel",
  "GhostTown Launch Blueprint": "GhostTown Launch Blueprint",
  "/30 days complete": "/30 días completados",
  "Saving...": "Guardando...",
  "PDF": "PDF",
  "Executive launch decision": "Decisión sobre el lanzamiento",
  "First customer": "Primer cliente",
  "Risk boundary": "Límite de riesgo",
  "hours · $": "horas · $",
  "Execution progress": "Progreso de ejecución",
  "Distribution targets": "Contactos de difusión",
  "Target types": "Tipos de contacto",
  "Finished posts": "Publicaciones terminadas",
  "Outreach scripts": "Mensajes de contacto",
  "Media & Distribution Network": "Red de medios y difusión",
  "Proven attention paths reverse-engineered from comparable brands.": "Canales de difusión investigados a partir de marcas comparables.",
  "GhostTown mapped competitor backlinks, podcasts, YouTube creators, publications, events, associations, review sites, and complementary partners. Each target includes a public access path, prepared asset, recommended pitch, and evidence trail.": "GhostTown investigó enlaces de competidores, pódcasts, creadores de YouTube, publicaciones, eventos, asociaciones, sitios de reseñas y socios complementarios. Cada contacto incluye una forma pública de llegar, material preparado, un mensaje recomendado y fuentes.",
  "Open the network": "Abrir la red",
  "Week": "Semana",
  "Ready-to-test offer": "Oferta lista para probar",
  "First value:": "Primer valor:",
  "Time to value:": "Tiempo hasta recibir valor:",
  "Where comparable businesses already earn attention.": "Dónde los negocios comparables ya consiguen atención.",
  "Research completed": "Investigación completada",
  "using": "con",
  ". The paid network is independent of the owner-only Google research console.": ". La red pagada es independiente de la consola de investigación de Google del administrador.",
  "Seed:": "Referencia:",
  "verified targets": "contactos verificados",
  "confidence": "confianza",
  "Open source ↗": "Abrir fuente ↗",
  "Why this target is proven": "Por qué este contacto tiene respaldo",
  "Audience owner": "Responsable de la audiencia",
  "Public access path": "Forma pública de contacto",
  "Prepared asset": "Material preparado",
  "Recommended approach": "Enfoque recomendado",
  "Matching script": "Mensaje correspondiente",
  "Use the closest relationship-specific script.": "Usa el mensaje que mejor corresponda a esa relación.",
  "First action": "Primera acción",
  "Risk": "Riesgo",
  "Five finished helpful assets": "Cinco materiales útiles terminados",
  "Copied": "Copiado",
  "Copy asset": "Copiar material",
  "Relationship-specific outreach scripts": "Mensajes adaptados a cada relación",
  "Copy": "Copiar",
  "Launch page preview": "Vista previa de la página de lanzamiento",
  "The problem": "El problema",
  "What is included": "Lo que incluye",
  "Metadata": "Datos de la página",
  "How it works": "Cómo funciona",
  "Confirmation email": "Correo de confirmación",
  "30-Day execution calendar": "Calendario de ejecución de 30 días",
  "Each day includes exact actions, prepared assets, a deliverable, a measurement, and evidence to record.": "Cada día incluye acciones concretas, materiales preparados, un resultado a entregar, una medida y evidencia que registrar.",
  "/30 complete": "/30 completados",
  "Day": "Día",
  "Exact actions": "Acciones concretas",
  "Prepared assets": "Materiales preparados",
  "Deliverable": "Resultado a entregar",
  "Success measurement": "Cómo medir el resultado",
  "Evidence and notes": "Evidencia y notas",
  "Record exact replies, links, commitments, objections, screenshots, or other evidence.": "Anota respuestas exactas, enlaces, compromisos, dudas, capturas de pantalla u otra evidencia.",
  "Evidence scoreboard": "Registro de evidencia",
  "Track behavior and commitments, not compliments.": "Registra acciones y compromisos, no elogios.",
  "Revenue": "Ingresos",
  "Final decision": "Decisión final",
  "Next:": "Próximo paso:",
  "Public source appendix": "Anexo de fuentes públicas",
  "· accessed": "· consultado",
  "Overview": "Resumen",
  "Offer": "Oferta",
  "Media Network": "Red de medios",
  "Launch Copy": "Textos de lanzamiento",
  "Launch Site": "Sitio de lanzamiento",
  "30-Day Calendar": "Calendario de 30 días",
  "Decision": "Decisión",
  "Distribution Target": "Contacto de difusión",
  "Saved": "Guardado",
  "outreach Sent": "contactos enviados",
  "replies": "respuestas",
  "interviews": "entrevistas",
  "qualified Conversations": "conversaciones con posibles clientes",
  "commitments": "compromisos",
  "continue": "continuar",
  "revise": "revisar",
  "pivot": "cambiar de enfoque",
  "stop": "detenerse",
  "Podcasts": "Pódcasts",
  "YouTube Creators": "Creadores de YouTube",
  "Newsletters & Publications": "Boletines y publicaciones",
  "Events": "Eventos",
  "Associations": "Asociaciones",
  "Review Sites": "Sitios de reseñas",
  "Complementary Partners": "Socios complementarios",
  "Communities": "Comunidades"
} };

export default function LaunchBlueprintView({ orderId, onBack, locale = "en" }: Props) {
  const t = useCopyCallback((key: CopyKey) => COPY[locale][key], [locale]);
  const [payload, setPayload] = useState<BlueprintPayload | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(
      apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint`),
      { headers: authHeaders() },
    )
      .then(async (response) => {
        const body = await response.json<
          BlueprintPayload & { error?: string }
        >();
        if (!response.ok || !body.blueprint)
          throw new Error(body.error || t("Launch Blueprint could not be opened"));
        return body;
      })
      .then(setPayload)
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : t("Launch Blueprint could not be opened"),
        ),
      )
      .finally(() => setLoading(false));
  }, [orderId, t]);

  const completionPercent = useMemo(() => {
    if (!payload) return 0;
    return Math.round((payload.progress.completedDays.length / 30) * 100);
  }, [payload]);

  const groupedChannels = useMemo(() => {
    const groups = new Map<
      string,
      GhostTownLaunchBlueprint["customerAccessPack"]["channels"]
    >();
    for (const channel of payload?.blueprint.customerAccessPack.channels ||
      []) {
      const key = channel.targetType || "community";
      const group = groups.get(key) || [];
      group.push(channel);
      groups.set(key, group);
    }
    return [...groups.entries()];
  }, [payload]);

  const saveProgress = async (progress: BlueprintProgress) => {
    if (!payload) return;
    setPayload({ ...payload, progress });
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        apiUrl(
          `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/progress`,
        ),
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(progress),
        },
      );
      const body = await response.json<{
        progress?: BlueprintProgress;
        error?: string;
      }>();
      if (!response.ok || !body.progress)
        throw new Error(body.error || t("Progress could not be saved"));
      setPayload((current) =>
        current ? { ...current, progress: body.progress! } : current,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("Progress could not be saved"),
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayNumber: number) => {
    if (!payload) return;
    const completed = new Set(payload.progress.completedDays);
    if (completed.has(dayNumber)) completed.delete(dayNumber);
    else completed.add(dayNumber);
    void saveProgress({
      ...payload.progress,
      completedDays: [...completed].sort((a, b) => a - b),
    });
  };

  const setEvidenceNote = (key: string, value: string) => {
    if (!payload) return;
    setPayload({
      ...payload,
      progress: {
        ...payload.progress,
        evidenceNotes: { ...payload.progress.evidenceNotes, [key]: value },
      },
    });
  };

  const setMetric = (key: MetricKey, value: number) => {
    if (!payload) return;
    void saveProgress({
      ...payload.progress,
      metrics: {
        ...payload.progress.metrics,
        [key]: Math.max(0, Math.floor(value || 0)),
      },
    });
  };

  const copyText = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(""), 1400);
  };

  const download = async () => {
    setError("");
    try {
      const path = `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.pdf`;
      const response = await fetch(apiUrl(path), { headers: authHeaders() });
      if (!response.ok)
        throw new Error(t("Blueprint PDF is not available"));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ghosttown-launch-blueprint-${orderId}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("Download failed"));
    }
  };

  if (loading)
    return (
      <div className="mx-auto max-w-6xl p-8 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust" />
        <p className="mt-4 text-gray-600">{t("Opening your Launch Blueprint...")}</p>
      </div>
    );
  if (error && !payload)
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </p>
        <button onClick={onBack} className="mt-5 font-bold text-ghost-rust">
          
          {t("Return to Dashboard")}
        </button>
      </div>
    );
  if (!payload) return null;

  const { blueprint, progress, research } = payload;

  return (
    <div className="min-h-screen bg-[#f6f1e8] text-ghost-ink">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-ghost-pine text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold hover:bg-white/10"
            >
              
              {t("← Dashboard")}
            </button>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">
                
                {t("GhostTown Launch Blueprint")}
              </p>
              <h1 className="text-lg font-black sm:text-xl">
                {blueprint.offer.offerName}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 text-right text-xs text-white/70">
              <div>{progress.completedDays.length}{t("/30 days complete")}</div>
              <div>
                {saving
                  ? t("Saving...")
                  : `${t("Saved")} ${new Date(progress.updatedAt).toLocaleString(locale === "es" ? "es-PR" : "en-US")}`}
              </div>
            </div>
            <button
              onClick={() => void download()}
              className="rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white"
            >
              
              {t("PDF")}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3">
          {sections.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold ${section === item.id ? "bg-ghost-rust text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
            >
              {t(item.label as CopyKey)}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl p-4 py-7 sm:p-6">
        {error && (
          <p
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        {section === "overview" && (
          <div className="space-y-6">
            <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
              <article className="rounded-2xl bg-ghost-pine p-7 text-white shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">
                  
                  {t("Executive launch decision")}
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight">
                  {blueprint.executiveDecision.strongestOpportunity}
                </h2>
                <p className="mt-5 text-white/80">
                  {blueprint.executiveDecision.verdict}
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs font-bold uppercase text-ghost-gold">
                      
                      {t("First customer")}
                    </p>
                    <p className="mt-2 font-bold">
                      {blueprint.executiveDecision.recommendedInitialCustomer}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs font-bold uppercase text-ghost-gold">
                      
                      {t("Risk boundary")}
                    </p>
                    <p className="mt-2 font-bold">
                      {blueprint.executiveDecision.founderTimeRiskHours}  {t("hours · $")}{blueprint.executiveDecision.founderCashRiskMaximum}
                    </p>
                  </div>
                </div>
              </article>
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black">{t("Execution progress")}</h2>
                  <span className="text-3xl font-black text-ghost-rust">
                    {completionPercent}%
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-ghost-rust"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt>{t("Distribution targets")}</dt>
                    <dd className="font-black">
                      {research.verifiedChannelCount}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t("Target types")}</dt>
                    <dd className="font-black">{research.sourceTypeCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t("Finished posts")}</dt>
                    <dd className="font-black">5</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t("Outreach scripts")}</dt>
                    <dd className="font-black">
                      {blueprint.customerAccessPack.outreachScripts.length}
                    </dd>
                  </div>
                </dl>
              </article>
            </section>
            <section className="rounded-2xl border border-ghost-rust/30 bg-[#fff7f2] p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">
                
                {t("Media & Distribution Network")}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                
                {t("Proven attention paths reverse-engineered from comparable brands.")}
              </h2>
              <p className="mt-3 text-gray-700">
                
                {t("GhostTown mapped competitor backlinks, podcasts, YouTube creators, publications, events, associations, review sites, and complementary partners. Each target includes a public access path, prepared asset, recommended pitch, and evidence trail.")}
              </p>
              <button
                onClick={() => setSection("distribution")}
                className="mt-5 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white"
              >
                
                {t("Open the network")}
              </button>
            </section>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {blueprint.weeklyMilestones.map((week) => (
                <article
                  key={week.weekNumber}
                  className="rounded-xl border border-black/10 bg-white p-5"
                >
                  <p className="text-xs font-black uppercase text-ghost-rust">
                    
                    {t("Week")} {week.weekNumber}
                  </p>
                  <h3 className="mt-2 font-black">{week.objective}</h3>
                  <p className="mt-3 text-sm text-gray-600">{week.milestone}</p>
                </article>
              ))}
            </section>
          </div>
        )}

        {section === "offer" && (
          <div className="space-y-6">
            <section className="rounded-2xl bg-ghost-pine p-7 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">
                
                {t("Ready-to-test offer")}
              </p>
              <h2 className="mt-3 text-3xl font-black">
                {blueprint.offer.offerName}
              </h2>
              <p className="mt-4 max-w-4xl text-lg text-white/80">
                {blueprint.offer.oneSentencePromise}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-ghost-rust px-4 py-2 font-black">
                  {blueprint.offer.initialTestPrice}
                </span>
                <span className="rounded-full border border-white/25 px-4 py-2">
                  
                  {t("First value:")} {blueprint.offer.timeToFirstUsefulResult}
                </span>
              </div>
            </section>
            <section className="grid gap-4 md:grid-cols-2">
              {blueprint.offer.deliverables.map((item) => (
                <article
                  key={item.name}
                  className="rounded-xl border border-black/10 bg-white p-5"
                >
                  <h3 className="font-black text-ghost-rust">{item.name}</h3>
                  <p className="mt-2 text-sm text-gray-700">
                    {item.description}
                  </p>
                  {item.timeToValue && (
                    <p className="mt-3 text-xs font-bold uppercase text-gray-500">
                      
                      {t("Time to value:")} {item.timeToValue}
                    </p>
                  )}
                </article>
              ))}
            </section>
            <section className="space-y-3">
              {blueprint.offer.objections.map((item) => (
                <details
                  key={item.objection}
                  className="rounded-xl border border-black/10 bg-white p-5"
                >
                  <summary className="cursor-pointer font-black">
                    {item.objection}
                  </summary>
                  <p className="mt-3 text-sm text-gray-700">{item.response}</p>
                </details>
              ))}
            </section>
          </div>
        )}

        {section === "distribution" && (
          <div className="space-y-8">
            <section className="rounded-2xl bg-ghost-pine p-7 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">
                
                {t("Media & Distribution Network")}
              </p>
              <h2 className="mt-3 text-3xl font-black">
                
                {t("Where comparable businesses already earn attention.")}
              </h2>
              <p className="mt-4 max-w-4xl text-white/80">
                
                {t("Research completed")}{" "}
                {new Date(research.completedAt).toLocaleString(locale === "es" ? "es-PR" : "en-US")}  {t("using")}{" "}
                {research.model}{t(". The paid network is independent of the owner-only Google research console.")}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(research.seedDomains || []).map((domain) => (
                  <span
                    key={domain}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold"
                  >
                    
                    {t("Seed:")} {domain}
                  </span>
                ))}
              </div>
            </section>
            {groupedChannels.map(([type, channels]) => (
              <section key={type}>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-ghost-rust">
                      {channels.length}  {t("verified targets")}
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {t(targetLabel(type as DistributionTargetType) as CopyKey)}
                    </h2>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {channels.map((channel, index) => (
                    <article
                      key={channel.channelId}
                      className="rounded-xl border border-black/10 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase text-ghost-rust">
                            #{index + 1} · {t(targetLabel(channel.targetType) as CopyKey)}
                          </p>
                          <h3 className="mt-1 text-xl font-black">
                            {channel.community}
                          </h3>
                          <p className="mt-1 text-xs font-bold text-gray-500">
                            {channel.platform} · {channel.activity} ·{" "}
                            {channel.confidence}  {t("confidence")}
                          </p>
                        </div>
                        <a
                          href={channel.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-ghost-rust px-3 py-2 text-xs font-black text-ghost-rust"
                        >
                          
                          {t("Open source ↗")}
                        </a>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-gray-700">
                        {channel.relevance}
                      </p>
                      {Boolean(channel.competitorEvidence?.length) && (
                        <div className="mt-4 rounded-lg bg-[#fff7f2] p-4">
                          <p className="text-xs font-black uppercase text-ghost-rust">
                            
                            {t("Why this target is proven")}
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-gray-700">
                            {channel.competitorEvidence?.map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <dl className="mt-4 space-y-3 text-sm">
                        <div>
                          <dt className="font-black">{t("Audience owner")}</dt>
                          <dd className="text-gray-600">
                            {channel.audienceOwner || channel.community}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">{t("Public access path")}</dt>
                          <dd className="text-gray-600">
                            {channel.accessPath || channel.participationRules}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">{t("Prepared asset")}</dt>
                          <dd className="text-gray-600">
                            {channel.preparedAsset || channel.usefulTopic}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">{t("Recommended approach")}</dt>
                          <dd className="text-gray-600">
                            {channel.recommendedApproach}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">{t("Matching script")}</dt>
                          <dd className="text-gray-600">
                            {channel.outreachScriptId ||
                              t("Use the closest relationship-specific script.")}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">{t("First action")}</dt>
                          <dd className="text-gray-600">
                            {channel.firstAction}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black">{t("Risk")}</dt>
                          <dd className="text-gray-600">{channel.risk}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            <section>
              <h2 className="text-2xl font-black">
                
                {t("Five finished helpful assets")}
              </h2>
              <div className="mt-4 space-y-4">
                {blueprint.customerAccessPack.helpfulPosts.map((post) => (
                  <article
                    key={post.postId}
                    className="rounded-xl border border-black/10 bg-white p-6"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase text-ghost-rust">
                          {post.intendedCommunity}
                        </p>
                        <h3 className="mt-1 text-xl font-black">
                          {post.title}
                        </h3>
                      </div>
                      <button
                        onClick={() =>
                          void copyText(
                            post.postId,
                            `${post.title}\n\n${post.body}\n\n${post.closingQuestion}`,
                          )
                        }
                        className="h-fit rounded-lg border border-ghost-rust px-3 py-2 text-xs font-black text-ghost-rust"
                      >
                        {copied === post.postId ? t("Copied") : t("Copy asset")}
                      </button>
                    </div>
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-700">
                      {post.body}
                    </p>
                    <p className="mt-4 font-bold">{post.closingQuestion}</p>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black">
                
                {t("Relationship-specific outreach scripts")}
              </h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {blueprint.customerAccessPack.outreachScripts.map((script) => (
                  <article
                    key={script.scriptId}
                    className="rounded-xl border border-black/10 bg-white p-5"
                  >
                    <div className="flex justify-between gap-3">
                      <h3 className="font-black">{script.title}</h3>
                      <button
                        onClick={() =>
                          void copyText(script.scriptId, script.message)
                        }
                        className="text-xs font-black text-ghost-rust"
                      >
                        {copied === script.scriptId ? t("Copied") : t("Copy")}
                      </button>
                    </div>
                    <p className="mt-2 text-xs font-bold uppercase text-gray-500">
                      {script.useWhen}
                    </p>
                    <p className="mt-4 text-sm leading-6 text-gray-700">
                      {script.message}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {section === "copy" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
            <section className="rounded-2xl border border-black/10 bg-white p-7 shadow-sm">
              <p className="text-xs font-black uppercase text-ghost-rust">
                
                {t("Launch page preview")}
              </p>
              <p className="mt-8 text-sm font-black uppercase tracking-widest text-gray-500">
                {blueprint.landingPageCopy.targetCustomerCallout}
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight">
                {blueprint.landingPageCopy.headline}
              </h2>
              <p className="mt-5 text-xl text-gray-600">
                {blueprint.landingPageCopy.subheadline}
              </p>
              <div className="mt-8 rounded-xl bg-[#fff7f2] p-5">
                <h3 className="font-black">{t("The problem")}</h3>
                <p className="mt-2 text-gray-700">
                  {blueprint.landingPageCopy.problemSection}
                </p>
              </div>
              <div className="mt-6">
                <h3 className="text-2xl font-black">{t("What is included")}</h3>
                <ul className="mt-4 space-y-3">
                  {blueprint.landingPageCopy.deliverables.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-black/10 p-4 font-medium"
                    >
                      ✓ {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 rounded-xl bg-ghost-pine p-6 text-white">
                <p className="text-3xl font-black text-ghost-gold">
                  {blueprint.landingPageCopy.pricePresentation}
                </p>
                <p className="mt-3 text-white/75">
                  {blueprint.landingPageCopy.riskReversal}
                </p>
                <button className="mt-5 rounded-lg bg-ghost-rust px-5 py-3 font-black">
                  {blueprint.landingPageCopy.primaryCallToAction}
                </button>
              </div>
            </section>
            <div className="space-y-5">
              <section className="rounded-xl border border-black/10 bg-white p-6">
                <h3 className="text-xl font-black">{t("Metadata")}</h3>
                <p className="mt-3 font-bold">
                  {blueprint.landingPageCopy.metadataTitle}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  {blueprint.landingPageCopy.metadataDescription}
                </p>
              </section>
              <section className="rounded-xl border border-black/10 bg-white p-6">
                <h3 className="text-xl font-black">{t("How it works")}</h3>
                <div className="mt-4 space-y-4">
                  {blueprint.landingPageCopy.howItWorks.map((item) => (
                    <div key={item.step}>
                      <p className="font-black text-ghost-rust">{item.step}</p>
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border border-black/10 bg-white p-6">
                <h3 className="text-xl font-black">{t("Confirmation email")}</h3>
                <p className="mt-3 text-sm font-black">
                  {blueprint.landingPageCopy.confirmationEmailSubject}
                </p>
                <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
                  {blueprint.landingPageCopy.confirmationEmailBody}
                </p>
              </section>
            </div>
          </div>
        )}

        {section === "calendar" && (
          <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black">
                  
                  {t("30-Day execution calendar")}
                </h2>
                <p className="mt-2 text-gray-600">
                  
                  {t("Each day includes exact actions, prepared assets, a deliverable, a measurement, and evidence to record.")}
                </p>
              </div>
              <p className="font-black text-ghost-rust">
                {progress.completedDays.length}{t("/30 complete")}
              </p>
            </div>
            <div className="space-y-4">
              {blueprint.dailyCalendar.map((day) => {
                const complete = progress.completedDays.includes(day.dayNumber);
                const noteKey = `day-${day.dayNumber}`;
                return (
                  <article
                    key={day.dayNumber}
                    className={`rounded-xl border p-5 ${complete ? "border-green-300 bg-green-50" : "border-black/10 bg-white"}`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleDay(day.dayNumber)}
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 font-black ${complete ? "border-green-600 bg-green-600 text-white" : "border-gray-300"}`}
                      >
                        {complete ? "✓" : ""}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase text-ghost-rust">
                          
                          {t("Day")} {day.dayNumber} · {day.estimatedEffort}
                        </p>
                        <h3 className="mt-1 text-xl font-black">{day.title}</h3>
                        <p className="mt-2 text-gray-700">
                          {day.primaryObjective}
                        </p>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div>
                            <p className="text-xs font-black uppercase text-gray-500">
                              
                              {t("Exact actions")}
                            </p>
                            <ul className="mt-2 space-y-2 text-sm">
                              {day.requiredActions.map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-gray-500">
                              
                              {t("Prepared assets")}
                            </p>
                            <ul className="mt-2 space-y-2 text-sm">
                              {day.preparedAssets.map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 rounded-lg bg-black/5 p-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-black uppercase text-gray-500">
                              
                              {t("Deliverable")}
                            </p>
                            <p className="mt-1 text-sm">
                              {day.expectedDeliverable}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-gray-500">
                              
                              {t("Success measurement")}
                            </p>
                            <p className="mt-1 text-sm">
                              {day.successMeasurement}
                            </p>
                          </div>
                        </div>
                        <label className="mt-4 block text-xs font-black uppercase text-gray-500">
                          
                          {t("Evidence and notes")}
                          <textarea
                            value={progress.evidenceNotes[noteKey] || ""}
                            onChange={(event) =>
                              setEvidenceNote(noteKey, event.target.value)
                            }
                            onBlur={() => void saveProgress(progress)}
                            placeholder={t("Record exact replies, links, commitments, objections, screenshots, or other evidence.")}
                            className="mt-2 min-h-24 w-full rounded-lg border border-gray-300 p-3 text-sm font-normal normal-case"
                          />
                        </label>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {section === "decision" && (
          <div className="space-y-7">
            <section>
              <h2 className="text-3xl font-black">{t("Evidence scoreboard")}</h2>
              <p className="mt-2 text-gray-600">
                
                {t("Track behavior and commitments, not compliments.")}
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    "outreachSent",
                    "replies",
                    "interviews",
                    "qualifiedConversations",
                    "commitments",
                  ] as MetricKey[]
                ).map((key) => (
                  <label
                    key={key}
                    className="rounded-xl border border-black/10 bg-white p-5"
                  >
                    <span className="text-xs font-black uppercase text-gray-500">
                      {t(key.replace(/([A-Z])/g, " $1") as CopyKey)}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={progress.metrics[key]}
                      onChange={(event) =>
                        setMetric(key, Number(event.target.value))
                      }
                      className="mt-2 w-full text-3xl font-black outline-none"
                    />
                  </label>
                ))}
                <label className="rounded-xl border border-black/10 bg-white p-5">
                  <span className="text-xs font-black uppercase text-gray-500">
                    
                    {t("Revenue")}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(progress.metrics.revenueCents / 100).toFixed(2)}
                    onChange={(event) =>
                      setMetric(
                        "revenueCents",
                        Math.round(Number(event.target.value) * 100),
                      )
                    }
                    className="mt-2 w-full text-3xl font-black outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {money(progress.metrics.revenueCents)}
                  </p>
                </label>
              </div>
            </section>
            <section>
              <h2 className="text-3xl font-black">{t("Final decision")}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {blueprint.finalDecision.criteria.map((item) => (
                  <button
                    key={t(item.decision)}
                    onClick={() =>
                      void saveProgress({
                        ...progress,
                        finalDecision: item.decision,
                      })
                    }
                    className={`rounded-xl border p-5 text-left ${progress.finalDecision === item.decision ? "border-ghost-rust bg-[#fff0e7] ring-2 ring-ghost-rust" : "border-black/10 bg-white"}`}
                  >
                    <p className="text-lg font-black uppercase text-ghost-rust">
                      {item.decision}
                    </p>
                    <p className="mt-2 text-sm text-gray-700">
                      {item.condition}
                    </p>
                    <p className="mt-3 text-sm font-bold">
                      
                      {t("Next:")} {item.nextAction}
                    </p>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black">{t("Public source appendix")}</h2>
              <div className="mt-4 space-y-3">
                {blueprint.sources.map((source) => (
                  <article
                    key={source.sourceId}
                    className="rounded-xl border border-black/10 bg-white p-5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-black">{source.title}</h3>
                        <p className="text-xs text-gray-500">
                          {source.publisher}  {t("· accessed")}{" "}
                          {new Date(source.accessedAt).toLocaleDateString(locale === "es" ? "es-PR" : "en-US")}
                        </p>
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-black text-ghost-rust"
                      >
                        
                        {t("Open source ↗")}
                      </a>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-gray-600">
                      {source.supports.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
        {section === 'site' && <LaunchSitePanel locale={locale} orderId={orderId} />}
      </main>
    </div>
  );
}
