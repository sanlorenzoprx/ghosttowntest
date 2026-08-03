import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
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
type BlueprintLocale = "en" | "es";

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
}

const blueprintCopy = {
  en: {
    loading: "Opening your Launch Blueprint workspace.",
    loadingBody: "GhostTown is checking ownership and loading the ready Blueprint record.",
    errorTitle: "Launch Blueprint could not be opened.",
    back: "Dashboard",
    product: "GhostTown Launch Blueprint",
    ready: "Ready operating document",
    saved: "Saved",
    saving: "Saving…",
    daysComplete: "days complete",
    downloads: "Downloads",
    pdf: "PDF",
    pdfPurpose: "Human-readable Launch Blueprint",
    json: "JSON",
    jsonPurpose: "Structured Blueprint data",
    zip: "Asset ZIP",
    zipPurpose: "Packaged Blueprint and launch assets",
    unavailableUntilReady: "Downloads are only available for the authenticated ready order.",
    sections: {
      overview: "Overview",
      offer: "Offer",
      distribution: "Media Network",
      copy: "Launch Copy",
      site: "Launch Site",
      calendar: "30-Day Calendar",
      decision: "Decision"
    },
    executive: "Executive launch decision",
    currentEvidence: "Evidence and research receipt",
    immediateActions: "Immediate next actions",
    riskBoundary: "Risk boundary",
    firstCustomer: "First customer",
    verifiedTargets: "Verified channels",
    targetTypes: "Target types",
    sourceAttempts: "Source attempts",
    seedDomains: "Seed domains",
    offerTitle: "Ready-to-test offer",
    pricing: "Pricing hypothesis",
    deliverables: "Deliverables",
    buyerResponsibilities: "Buyer responsibilities",
    exclusions: "Exclusions",
    objections: "Objections and responses",
    networkTitle: "Where comparable businesses already earn attention",
    channelType: "Channel type",
    activity: "Activity",
    audienceOwner: "Audience owner",
    competitorEvidence: "Competitor evidence",
    matchingScript: "Matching script",
    publicAccess: "Public access path",
    preparedAsset: "Prepared asset",
    approach: "Recommended approach",
    firstAction: "First action",
    risk: "Risk",
    confidence: "Confidence",
    helpfulAssets: "Finished helpful assets",
    outreachScripts: "Relationship-specific outreach scripts",
    copyTitle: "Launch page copy",
    problem: "The problem",
    currentAlternative: "Current alternative",
    offerDescription: "Offer description",
    whatIsIncluded: "What is included",
    expectedTimeline: "Expected timeline",
    socialDescription: "Social description",
    secondaryCta: "Secondary call to action",
    thankYouPage: "Thank-you page",
    faq: "FAQ",
    proofPlaceholders: "Proof placeholders",
    metadata: "Metadata",
    howItWorks: "How it works",
    confirmationEmail: "Confirmation email",
    weeklyMilestones: "Weekly milestones",
    week: "Week",
    priorities: "Priorities",
    successMetrics: "Success metrics",
    calendarTitle: "30-day execution calendar",
    calendarBody: "Each day keeps the action, deliverable, measurement, and evidence note together.",
    exactActions: "Exact actions",
    preparedAssets: "Prepared assets",
    deliverable: "Deliverable",
    measurement: "Success measurement",
    evidenceNotes: "Evidence and notes",
    evidencePlaceholder: "Record exact replies, links, commitments, objections, screenshots, or other evidence.",
    scoreboard: "Evidence scoreboard",
    scoreboardBody: "Track behavior and commitments, not compliments.",
    finalDecision: "Final decision criteria",
    publicSources: "Public source appendix",
    openSource: "Open source",
    copied: "Copied",
    copyAction: "Copy",
    copyAsset: "Copy asset",
    useWhen: "Use when",
    next: "Next",
    revenue: "Revenue",
    preparing: "Preparing…",
    downloadFailed: "Download failed",
    copyFailed: "Copy failed",
    notAvailable: "is not available",
    openFailed: "Launch Blueprint could not be opened",
    progressSaveFailed: "Progress could not be saved",
    tablistLabel: "Launch Blueprint sections"
  },
  es: {
    loading: "Abriendo tu espacio de Launch Blueprint.",
    loadingBody: "GhostTown está revisando propiedad y cargando el registro listo del Blueprint.",
    errorTitle: "No se pudo abrir el Launch Blueprint.",
    back: "Dashboard",
    product: "GhostTown Launch Blueprint",
    ready: "Documento operativo listo",
    saved: "Guardado",
    saving: "Guardando…",
    daysComplete: "días completos",
    downloads: "Descargas",
    pdf: "PDF",
    pdfPurpose: "Launch Blueprint legible para personas",
    json: "JSON",
    jsonPurpose: "Datos estructurados del Blueprint",
    zip: "ZIP de activos",
    zipPurpose: "Blueprint y activos de lanzamiento empaquetados",
    unavailableUntilReady: "Las descargas solo están disponibles para la orden lista y autenticada.",
    sections: {
      overview: "Resumen",
      offer: "Oferta",
      distribution: "Red de medios",
      copy: "Copy de lanzamiento",
      site: "Launch Site",
      calendar: "Calendario 30 días",
      decision: "Decisión"
    },
    executive: "Decisión ejecutiva de lanzamiento",
    currentEvidence: "Evidencia y recibo de investigación",
    immediateActions: "Próximas acciones inmediatas",
    riskBoundary: "Límite de riesgo",
    firstCustomer: "Primer cliente",
    verifiedTargets: "Canales verificados",
    targetTypes: "Tipos de objetivo",
    sourceAttempts: "Fuentes intentadas",
    seedDomains: "Dominios semilla",
    offerTitle: "Oferta lista para probar",
    pricing: "Hipótesis de precio",
    deliverables: "Entregables",
    buyerResponsibilities: "Responsabilidades del comprador",
    exclusions: "Exclusiones",
    objections: "Objeciones y respuestas",
    networkTitle: "Dónde negocios comparables ya obtienen atención",
    channelType: "Tipo de canal",
    activity: "Actividad",
    audienceOwner: "Responsable de la audiencia",
    competitorEvidence: "Evidencia de competidores",
    matchingScript: "Script correspondiente",
    publicAccess: "Ruta de acceso público",
    preparedAsset: "Activo preparado",
    approach: "Enfoque recomendado",
    firstAction: "Primera acción",
    risk: "Riesgo",
    confidence: "Confianza",
    helpfulAssets: "Activos útiles terminados",
    outreachScripts: "Scripts de outreach por relación",
    copyTitle: "Copy de página de lanzamiento",
    problem: "El problema",
    currentAlternative: "Alternativa actual",
    offerDescription: "Descripción de la oferta",
    whatIsIncluded: "Qué incluye",
    expectedTimeline: "Plazo esperado",
    socialDescription: "Descripción social",
    secondaryCta: "Llamada a la acción secundaria",
    thankYouPage: "Página de agradecimiento",
    faq: "Preguntas frecuentes",
    proofPlaceholders: "Marcadores de prueba",
    metadata: "Metadatos",
    howItWorks: "Cómo funciona",
    confirmationEmail: "Correo de confirmación",
    weeklyMilestones: "Hitos semanales",
    week: "Semana",
    priorities: "Prioridades",
    successMetrics: "Métricas de éxito",
    calendarTitle: "Calendario de ejecución de 30 días",
    calendarBody: "Cada día mantiene junta la acción, entregable, medición y nota de evidencia.",
    exactActions: "Acciones exactas",
    preparedAssets: "Activos preparados",
    deliverable: "Entregable",
    measurement: "Medición de éxito",
    evidenceNotes: "Evidencia y notas",
    evidencePlaceholder: "Registra respuestas exactas, enlaces, compromisos, objeciones, capturas u otra evidencia.",
    scoreboard: "Marcador de evidencia",
    scoreboardBody: "Mide comportamiento y compromisos, no cumplidos.",
    finalDecision: "Criterios de decisión final",
    publicSources: "Apéndice de fuentes públicas",
    openSource: "Abrir fuente",
    copied: "Copiado",
    copyAction: "Copiar",
    copyAsset: "Copiar activo",
    useWhen: "Usar cuando",
    next: "Siguiente",
    revenue: "Ingresos",
    preparing: "Preparando…",
    downloadFailed: "La descarga falló",
    copyFailed: "No se pudo copiar",
    notAvailable: "no está disponible",
    openFailed: "No se pudo abrir el Launch Blueprint",
    progressSaveFailed: "No se pudo guardar el progreso",
    tablistLabel: "Secciones del Launch Blueprint"
  }
};

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

function blueprintLocale(): BlueprintLocale {
  if (typeof document !== "undefined" && document.documentElement.lang.toLowerCase().startsWith("es")) return "es";
  return "en";
}

function customerError(caught: unknown, fallback: string, locale: BlueprintLocale): string {
  if (locale === "es") return fallback;
  return caught instanceof Error && caught.message ? caught.message : fallback;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function targetLabel(value?: DistributionTargetType): string {
  return value ? targetLabels[value] : "Distribution Target";
}

export default function LaunchBlueprintView({ orderId, onBack }: Props) {
  const locale = blueprintLocale();
  const text = blueprintCopy[locale];
  const [payload, setPayload] = useState<BlueprintPayload | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [downloading, setDownloading] = useState("");

  const sections: Array<{ id: Section; label: string }> = [
    { id: "overview", label: text.sections.overview },
    { id: "offer", label: text.sections.offer },
    { id: "distribution", label: text.sections.distribution },
    { id: "copy", label: text.sections.copy },
    { id: "site", label: text.sections.site },
    { id: "calendar", label: text.sections.calendar },
    { id: "decision", label: text.sections.decision },
  ];

  const focusTab = (id: Section) => {
    setSection(id);
    window.requestAnimationFrame(() => {
      document.getElementById(`blueprint-tab-${id}`)?.focus();
    });
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = sections.length - 1;
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") nextIndex = index === 0 ? last : index - 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = last;
    else return;
    event.preventDefault();
    focusTab(sections[nextIndex].id);
  };

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
          throw new Error(body.error || text.openFailed);
        return body;
      })
      .then(setPayload)
      .catch((caught) =>
        setError(customerError(caught, text.openFailed, locale)),
      )
      .finally(() => setLoading(false));
  }, [orderId, text.openFailed]);

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
        throw new Error(body.error || text.progressSaveFailed);
      setPayload((current) =>
        current ? { ...current, progress: body.progress! } : current,
      );
    } catch (caught) {
      setError(customerError(caught, text.progressSaveFailed, locale));
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
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1400);
    } catch (caught) {
      setError(customerError(caught, text.copyFailed, locale));
    }
  };

  const download = async (kind: "pdf" | "json" | "zip") => {
    setError("");
    setDownloading(kind);
    try {
      const path =
        kind === "zip"
          ? `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint-assets.zip`
          : `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.${kind}`;
      const response = await fetch(apiUrl(path), { headers: authHeaders() });
      if (!response.ok)
        throw new Error(`Blueprint ${kind.toUpperCase()} ${text.notAvailable}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ghosttown-launch-blueprint-${orderId}${kind === "zip" ? "-assets" : ""}.${kind}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(customerError(caught, text.downloadFailed, locale));
    } finally {
      setDownloading("");
    }
  };

  if (loading)
    return (
      <main className="mx-auto max-w-3xl px-4 py-14 text-center" aria-busy="true">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust" aria-hidden="true" />
        <h1 className="mt-6 text-2xl font-black text-ghost-ink">{text.loading}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{text.loadingBody}</p>
      </main>
    );
  if (error && !payload)
    return (
      <main className="mx-auto max-w-xl px-4 py-14 text-center">
        <section className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-2xl font-black text-red-900">{text.errorTitle}</h1>
          <p className="mt-3 break-words text-sm leading-6 text-red-700">{error}</p>
          <button type="button" onClick={onBack} className="mt-5 min-h-11 rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/40">
            ← {text.back}
          </button>
        </section>
      </main>
    );
  if (!payload) return null;

  const { blueprint, progress, research } = payload;
  const downloadItems: Array<{ kind: "pdf" | "json" | "zip"; label: string; purpose: string }> = [
    { kind: "pdf", label: text.pdf, purpose: text.pdfPurpose },
    { kind: "json", label: text.json, purpose: text.jsonPurpose },
    { kind: "zip", label: text.zip, purpose: text.zipPurpose },
  ];

  return (
    <div className="min-h-screen bg-[#f6f1e8] text-ghost-ink">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-ghost-ink text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={onBack}
              className="min-h-11 w-fit rounded-lg border border-white/20 px-3 py-2 text-sm font-bold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              ← {text.back}
            </button>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{text.product}</p>
              <h1 className="mt-1 break-words text-lg font-black sm:text-xl">{blueprint.offer.offerName}</h1>
              <p className="mt-1 break-all text-xs text-white/60">{orderId}</p>
            </div>
          </div>
          <div className="min-w-0 rounded-lg border border-white/15 bg-white/5 p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-gold">{text.downloads}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {downloadItems.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => void download(item.kind)}
                  disabled={Boolean(downloading)}
                  aria-label={`${item.label}: ${item.purpose}`}
                  className="min-h-11 rounded-lg border border-white/30 px-3 py-2 text-left text-sm font-black text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50"
                >
                  <span>{downloading === item.kind ? text.preparing : item.label}</span>
                  <span className="block text-[11px] font-normal leading-4 text-white/65">{item.purpose}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3" role="tablist" aria-label={text.tablistLabel}>
          {sections.map((item, index) => (
            <button
              key={item.id}
              id={`blueprint-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={section === item.id}
              aria-controls={`blueprint-panel-${item.id}`}
              tabIndex={section === item.id ? 0 : -1}
              onClick={() => setSection(item.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/40 ${section === item.id ? "bg-ghost-rust text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl p-4 py-7 sm:p-6">
        {error && (
          <p
            className="mb-5 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        {section === "overview" && (
          <div
            id="blueprint-panel-overview"
            role="tabpanel"
            aria-labelledby="blueprint-tab-overview"
            className="space-y-6"
          >
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,.65fr)]">
              <article className="min-w-0 rounded-2xl bg-ghost-ink p-6 text-white shadow-xl sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{text.executive}</p>
                <h2 className="mt-3 break-words text-3xl font-black leading-tight">{blueprint.executiveDecision.strongestOpportunity}</h2>
                <p className="mt-5 break-words text-white/80">{blueprint.executiveDecision.verdict}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <InfoBlock label={text.firstCustomer} value={blueprint.executiveDecision.recommendedInitialCustomer} dark />
                  <InfoBlock label={text.riskBoundary} value={`${blueprint.executiveDecision.founderTimeRiskHours} hours · $${blueprint.executiveDecision.founderCashRiskMaximum}`} dark />
                </div>
              </article>
              <article className="min-w-0 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-ghost-rust">{text.ready}</p>
                <h2 className="mt-2 text-xl font-black">{progress.completedDays.length}/30 {text.daysComplete}</h2>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                  <div className="h-full bg-ghost-rust" style={{ width: `${completionPercent}%` }} />
                </div>
                <p className="mt-2 text-xs text-gray-600">{completionPercent}%</p>
                <p className="mt-4 text-sm text-gray-700">{saving ? text.saving : `${text.saved} ${new Date(progress.updatedAt).toLocaleString()}`}</p>
                <dl className="mt-6 space-y-3 text-sm">
                  <Metric label={text.verifiedTargets} value={research.verifiedChannelCount} />
                  <Metric label={text.targetTypes} value={research.sourceTypeCount} />
                  <Metric label={text.sourceAttempts} value={research.attemptedSourceCount} />
                </dl>
              </article>
            </section>

            <section className="grid gap-5 lg:grid-cols-3">
              <article className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-5 lg:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">{text.currentEvidence}</p>
                <h2 className="mt-2 text-2xl font-black">{text.networkTitle}</h2>
                <p className="mt-3 break-words text-sm leading-6 text-gray-700">
                  {new Date(research.completedAt).toLocaleString()} · {research.provider} · {research.model}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(research.seedDomains || []).map((domain) => (
                    <span key={domain} className="break-all rounded-full border border-ghost-rust/25 bg-white px-3 py-1.5 text-xs font-bold text-ghost-rust">{text.seedDomains}: {domain}</span>
                  ))}
                </div>
                <button type="button" onClick={() => setSection("distribution")} className="mt-5 min-h-11 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/40">
                  {text.sections.distribution}
                </button>
              </article>
              <article className="rounded-xl border border-black/10 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">{text.immediateActions}</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                  {(blueprint.weeklyMilestones[0]?.priorities || [])
                    .slice(0, 3)
                    .map((action) => (
                      <li key={action} className="break-words">• {action}</li>
                    ))}
                </ul>
              </article>
            </section>

            <section aria-labelledby="weekly-milestones-heading">
              <h2 id="weekly-milestones-heading" className="text-2xl font-black">{text.weeklyMilestones}</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {blueprint.weeklyMilestones.map((week) => (
                  <article key={week.weekNumber} className="min-w-0 rounded-xl border border-black/10 bg-white p-5">
                    <p className="text-xs font-black uppercase text-ghost-rust">{text.week} {week.weekNumber}</p>
                    <h3 className="mt-2 break-words font-black">{week.objective}</h3>
                    <p className="mt-3 break-words text-sm text-gray-600">{week.milestone}</p>
                    <div className="mt-4 space-y-3">
                      <ListBlock title={text.priorities} items={week.priorities} />
                      <ListBlock title={text.successMetrics} items={week.successMetrics} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {section === "offer" && (
          <div
            id="blueprint-panel-offer"
            role="tabpanel"
            aria-labelledby="blueprint-tab-offer"
            className="space-y-6"
          >
            <section className="rounded-2xl bg-ghost-ink p-6 text-white sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{text.offerTitle}</p>
              <h2 className="mt-3 break-words text-3xl font-black">{blueprint.offer.offerName}</h2>
              <p className="mt-4 max-w-4xl break-words text-lg text-white/80">{blueprint.offer.oneSentencePromise}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-ghost-rust px-4 py-2 font-black">{blueprint.offer.initialTestPrice}</span>
                <span className="rounded-full border border-white/25 px-4 py-2">{blueprint.offer.timeToFirstUsefulResult}</span>
              </div>
            </section>
            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Card title={text.pricing}>{blueprint.offer.pricingRationale}</Card>
              <Card title={text.buyerResponsibilities}>
                <List items={blueprint.offer.buyerResponsibilities} />
              </Card>
              <Card title={text.exclusions}>
                <List items={blueprint.offer.exclusions} />
              </Card>
              <Card title={text.deliverables}>
                <div className="space-y-3">
                  {blueprint.offer.deliverables.map((item) => (
                    <article key={item.name} className="rounded-lg border border-black/10 p-4">
                      <h3 className="break-words font-black text-ghost-rust">{item.name}</h3>
                      <p className="mt-2 break-words text-sm leading-6 text-gray-700">{item.description}</p>
                      {item.timeToValue && <p className="mt-2 text-xs font-bold uppercase text-gray-500">{item.timeToValue}</p>}
                    </article>
                  ))}
                </div>
              </Card>
            </section>
            <section className="space-y-3">
              <h2 className="text-2xl font-black">{text.objections}</h2>
              {blueprint.offer.objections.map((item) => (
                <details key={item.objection} className="rounded-xl border border-black/10 bg-white p-5">
                  <summary className="cursor-pointer break-words font-black">{item.objection}</summary>
                  <p className="mt-3 break-words text-sm leading-6 text-gray-700">{item.response}</p>
                </details>
              ))}
            </section>
          </div>
        )}

        {section === "distribution" && (
          <div
            id="blueprint-panel-distribution"
            role="tabpanel"
            aria-labelledby="blueprint-tab-distribution"
            className="space-y-8"
          >
            <section className="rounded-2xl bg-ghost-ink p-6 text-white sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{text.sections.distribution}</p>
              <h2 className="mt-3 break-words text-3xl font-black">{text.networkTitle}</h2>
              <p className="mt-4 max-w-4xl break-words text-white/80">
                {new Date(research.completedAt).toLocaleString()} · {research.model}
              </p>
            </section>
            {groupedChannels.map(([type, channels]) => (
              <section key={type}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-rust">{text.channelType}</p>
                    <h2 className="text-2xl font-black">{targetLabel(type as DistributionTargetType)}</h2>
                  </div>
                  <p className="text-sm font-bold text-gray-600">{channels.length}</p>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {channels.map((channel) => (
                    <article key={channel.channelId} className="min-w-0 rounded-xl border border-black/10 bg-white p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase text-ghost-rust">{channel.platform}</p>
                          <h3 className="mt-1 break-words text-xl font-black">{channel.community}</h3>
                          <a href={channel.publicUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs font-bold text-blue-700">{channel.publicUrl}</a>
                        </div>
                        <span className="w-fit rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-black uppercase text-gray-600">{channel.confidence}</span>
                      </div>
                      <p className="mt-4 break-words text-sm leading-6 text-gray-700">{channel.relevance}</p>
                      <dl className="mt-4 grid gap-3 text-sm">
                        <Field label={text.activity} value={channel.activity} />
                        <Field label={text.audienceOwner} value={channel.audienceOwner || channel.community} />
                        <Field label={text.publicAccess} value={channel.accessPath || channel.participationRules} />
                        <Field label={text.preparedAsset} value={channel.preparedAsset || channel.usefulTopic} />
                        <Field label={text.approach} value={channel.recommendedApproach} />
                        {channel.outreachScriptId && <Field label={text.matchingScript} value={channel.outreachScriptId} />}
                        <Field label={text.firstAction} value={channel.firstAction} />
                        <Field label={text.risk} value={channel.risk} />
                      </dl>
                      {Boolean(channel.competitorEvidence?.length) && (
                        <div className="mt-4 rounded-lg bg-[#fff7f2] p-4">
                          <p className="text-xs font-black uppercase text-ghost-rust">{text.competitorEvidence}</p>
                          <List items={channel.competitorEvidence || []} />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
            <CopyAssets title={text.helpfulAssets} items={blueprint.customerAccessPack.helpfulPosts.map((post) => ({
              id: post.postId,
              title: post.title,
              meta: post.intendedCommunity,
              body: `${post.body}\n\n${post.closingQuestion}`,
              button: copied === post.postId ? text.copied : text.copyAsset,
              onCopy: () => void copyText(post.postId, `${post.title}\n\n${post.body}\n\n${post.closingQuestion}`)
            }))} />
            <CopyAssets title={text.outreachScripts} items={blueprint.customerAccessPack.outreachScripts.map((script) => ({
              id: script.scriptId,
              title: script.title,
              meta: `${text.useWhen}: ${script.useWhen}`,
              body: script.message,
              button: copied === script.scriptId ? text.copied : text.copyAction,
              onCopy: () => void copyText(script.scriptId, script.message)
            }))} />
          </div>
        )}

        {section === "copy" && (
          <div
            id="blueprint-panel-copy"
            role="tabpanel"
            aria-labelledby="blueprint-tab-copy"
            className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)]"
          >
            <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-7">
              <p className="text-xs font-black uppercase text-ghost-rust">{text.copyTitle}</p>
              <p className="mt-8 break-words text-sm font-black uppercase tracking-widest text-gray-500">{blueprint.landingPageCopy.targetCustomerCallout}</p>
              <h2 className="mt-3 break-words text-4xl font-black leading-tight">{blueprint.landingPageCopy.headline}</h2>
              <p className="mt-5 break-words text-xl text-gray-600">{blueprint.landingPageCopy.subheadline}</p>
              <div className="mt-8 rounded-xl bg-[#fff7f2] p-5">
                <h3 className="font-black">{text.problem}</h3>
                <p className="mt-2 break-words text-gray-700">{blueprint.landingPageCopy.problemSection}</p>
              </div>
              <div className="mt-6 rounded-xl border border-black/10 p-5">
                <h3 className="font-black">{text.currentAlternative}</h3>
                <p className="mt-2 break-words text-sm leading-6 text-gray-700">{blueprint.landingPageCopy.currentAlternativeSection}</p>
              </div>
              <div className="mt-6 rounded-xl border border-black/10 p-5">
                <h3 className="font-black">{text.offerDescription}</h3>
                <p className="mt-2 break-words text-sm leading-6 text-gray-700">{blueprint.landingPageCopy.offerDescription}</p>
              </div>
              <div className="mt-6">
                <h3 className="text-2xl font-black">{text.whatIsIncluded}</h3>
                <ul className="mt-4 space-y-3">
                  {blueprint.landingPageCopy.deliverables.map((item) => (
                    <li key={item} className="break-words rounded-lg border border-black/10 p-4 font-medium">✓ {item}</li>
                  ))}
                </ul>
              </div>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label={text.expectedTimeline} value={blueprint.landingPageCopy.expectedTimeline} />
                <Field label={text.socialDescription} value={blueprint.landingPageCopy.socialDescription} />
              </dl>
              <div className="mt-8 rounded-xl bg-ghost-ink p-6 text-white">
                <p className="break-words text-3xl font-black text-ghost-gold">{blueprint.landingPageCopy.pricePresentation}</p>
                <p className="mt-3 break-words text-white/75">{blueprint.landingPageCopy.riskReversal}</p>
                <p className="mt-5 inline-block rounded-lg bg-ghost-rust px-5 py-3 font-black">{blueprint.landingPageCopy.primaryCallToAction}</p>
                <p className="mt-3 break-words text-sm text-white/70">{text.secondaryCta}: {blueprint.landingPageCopy.secondaryCallToAction}</p>
              </div>
            </section>
            <div className="space-y-5">
              <Card title={text.metadata}>
                <p className="font-bold">{blueprint.landingPageCopy.metadataTitle}</p>
                <p className="mt-2 text-sm text-gray-600">{blueprint.landingPageCopy.metadataDescription}</p>
              </Card>
              <Card title={text.howItWorks}>
                <div className="space-y-4">
                  {blueprint.landingPageCopy.howItWorks.map((item) => (
                    <div key={item.step}>
                      <p className="break-words font-black text-ghost-rust">{item.step}</p>
                      <p className="break-words text-sm text-gray-600">{item.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title={text.faq}>
                <div className="space-y-4">
                  {blueprint.landingPageCopy.faq.map((item) => (
                    <div key={item.question}>
                      <p className="break-words font-black">{item.question}</p>
                      <p className="mt-2 break-words text-sm text-gray-600">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title={text.proofPlaceholders}>
                <List items={blueprint.landingPageCopy.proofPlaceholders} />
              </Card>
              <Card title={text.thankYouPage}>
                <p className="whitespace-pre-line break-words text-sm leading-6 text-gray-700">{blueprint.landingPageCopy.thankYouPageCopy}</p>
              </Card>
              <Card title={text.confirmationEmail}>
                <p className="break-words text-sm font-black">{blueprint.landingPageCopy.confirmationEmailSubject}</p>
                <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-gray-700">{blueprint.landingPageCopy.confirmationEmailBody}</p>
              </Card>
            </div>
          </div>
        )}

        {section === "calendar" && (
          <div
            id="blueprint-panel-calendar"
            role="tabpanel"
            aria-labelledby="blueprint-tab-calendar"
          >
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="break-words text-3xl font-black">{text.calendarTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">{text.calendarBody}</p>
              </div>
              <p className="font-black text-ghost-rust">{progress.completedDays.length}/30 {text.daysComplete}</p>
            </div>
            <div className="space-y-4">
              {blueprint.dailyCalendar.map((day) => {
                const complete = progress.completedDays.includes(day.dayNumber);
                const noteKey = `day-${day.dayNumber}`;
                return (
                  <article key={day.dayNumber} className={`rounded-xl border p-5 ${complete ? "border-green-300 bg-green-50" : "border-black/10 bg-white"}`}>
                    <div className="flex items-start gap-4">
                      <button type="button" onClick={() => toggleDay(day.dayNumber)} aria-pressed={complete} className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 font-black focus:outline-none focus:ring-2 focus:ring-ghost-rust/30 ${complete ? "border-green-600 bg-green-600 text-white" : "border-gray-300"}`}>
                        {complete ? "✓" : ""}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase text-ghost-rust">Day {day.dayNumber} · {day.estimatedEffort}</p>
                        <h3 className="mt-1 break-words text-xl font-black">{day.title}</h3>
                        <p className="mt-2 break-words text-gray-700">{day.primaryObjective}</p>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <ListBlock title={text.exactActions} items={day.requiredActions} />
                          <ListBlock title={text.preparedAssets} items={day.preparedAssets} />
                        </div>
                        <div className="mt-4 grid gap-3 rounded-lg bg-black/5 p-4 md:grid-cols-2">
                          <Field label={text.deliverable} value={day.expectedDeliverable} />
                          <Field label={text.measurement} value={day.successMeasurement} />
                        </div>
                        <label className="mt-4 block text-xs font-black uppercase text-gray-500">
                          {text.evidenceNotes}
                          <textarea
                            value={progress.evidenceNotes[noteKey] || ""}
                            onChange={(event) => setEvidenceNote(noteKey, event.target.value)}
                            onBlur={() => void saveProgress(progress)}
                            placeholder={text.evidencePlaceholder}
                            className="mt-2 min-h-24 w-full rounded-lg border border-gray-300 p-3 text-sm font-normal normal-case focus:outline-none focus:ring-2 focus:ring-ghost-rust/30"
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
          <div
            id="blueprint-panel-decision"
            role="tabpanel"
            aria-labelledby="blueprint-tab-decision"
            className="space-y-7"
          >
            <section>
              <h2 className="break-words text-3xl font-black">{text.scoreboard}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{text.scoreboardBody}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(["outreachSent", "replies", "interviews", "qualifiedConversations", "commitments"] as MetricKey[]).map((key) => (
                  <MetricInput key={key} label={key.replace(/([A-Z])/g, " $1")} value={progress.metrics[key]} onChange={(value) => setMetric(key, value)} />
                ))}
                <MetricInput label={text.revenue} value={Number((progress.metrics.revenueCents / 100).toFixed(2))} step="0.01" footer={money(progress.metrics.revenueCents)} onChange={(value) => setMetric("revenueCents", Math.round(value * 100))} />
              </div>
            </section>
            <section>
              <h2 className="break-words text-3xl font-black">{text.finalDecision}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {blueprint.finalDecision.criteria.map((item) => (
                  <button key={item.decision} type="button" onClick={() => void saveProgress({ ...progress, finalDecision: item.decision })} aria-pressed={progress.finalDecision === item.decision} className={`rounded-xl border p-5 text-left focus:outline-none focus:ring-2 focus:ring-ghost-rust/30 ${progress.finalDecision === item.decision ? "border-ghost-rust bg-[#fff0e7] ring-2 ring-ghost-rust" : "border-black/10 bg-white"}`}>
                    <p className="break-words text-lg font-black uppercase text-ghost-rust">{item.decision}</p>
                    <p className="mt-2 break-words text-sm text-gray-700">{item.condition}</p>
                    <p className="mt-3 break-words text-sm font-bold">{text.next}: {item.nextAction}</p>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black">{text.publicSources}</h2>
              <div className="mt-4 space-y-3">
                {blueprint.sources.map((source) => (
                  <article key={source.sourceId} className="rounded-xl border border-black/10 bg-white p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="break-words font-black">{source.title}</h3>
                        <p className="text-xs text-gray-500">{source.publisher} · {new Date(source.accessedAt).toLocaleDateString()}</p>
                      </div>
                      <a href={source.url} target="_blank" rel="noreferrer" className="break-all text-sm font-black text-ghost-rust">{text.openSource} ↗</a>
                    </div>
                    <List items={source.supports} />
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
        {section === "site" && (
          <div
            id="blueprint-panel-site"
            role="tabpanel"
            aria-labelledby="blueprint-tab-site"
          >
            <LaunchSitePanel orderId={orderId} />
          </div>
        )}
      </main>
    </div>
  );
}

function InfoBlock({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-xl bg-white/10 p-4" : "rounded-lg bg-white p-3"}>
      <p className={dark ? "text-xs font-bold uppercase text-ghost-gold" : "text-xs font-black uppercase text-gray-500"}>{label}</p>
      <p className={dark ? "mt-2 break-words font-bold" : "mt-1 break-words text-sm font-bold"}>{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="break-words">{label}</dt>
      <dd className="font-black">{value}</dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-black">{label}</dt>
      <dd className="break-words text-gray-600">{value}</dd>
    </div>
  );
}

function Card({ title, children, muted = false }: { title: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <section className={`rounded-xl border border-black/10 p-5 ${muted ? "mt-8 bg-[#fff7f2]" : "bg-white"}`}>
      <h2 className="break-words text-xl font-black">{title}</h2>
      <div className="mt-3 break-words text-sm leading-6 text-gray-700">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
      {items.map((item) => <li key={item} className="break-words">• {item}</li>)}
    </ul>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-gray-500">{title}</p>
      <List items={items} />
    </div>
  );
}

function CopyAssets({ title, items }: { title: string; items: Array<{ id: string; title: string; meta: string; body: string; button: string; onCopy: () => void }> }) {
  return (
    <section>
      <h2 className="break-words text-2xl font-black">{title}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="min-w-0 rounded-xl border border-black/10 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="break-words font-black">{item.title}</h3>
                <p className="mt-2 break-words text-xs font-bold uppercase text-gray-500">{item.meta}</p>
              </div>
              <button type="button" onClick={item.onCopy} className="min-h-11 rounded-lg border border-ghost-rust px-3 py-2 text-xs font-black text-ghost-rust focus:outline-none focus:ring-2 focus:ring-ghost-rust/30">
                {item.button}
              </button>
            </div>
            <p className="mt-4 whitespace-pre-line break-words text-sm leading-6 text-gray-700">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricInput({ label, value, onChange, step, footer }: { label: string; value: number; onChange: (value: number) => void; step?: string; footer?: string }) {
  return (
    <label className="rounded-xl border border-black/10 bg-white p-5">
      <span className="break-words text-xs font-black uppercase text-gray-500">{label}</span>
      <input type="number" min="0" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full min-w-0 text-3xl font-black outline-none focus:ring-2 focus:ring-ghost-rust/30" />
      {footer && <p className="mt-1 text-xs text-gray-500">{footer}</p>}
    </label>
  );
}
