import { useCallback, useEffect, useState } from "react";
import { PublicUserData } from "../types/auth";
import { apiUrl, authHeaders } from "../lib/api";
import type { EvaluationResult } from "../types/lit";
import LaunchBlueprintView from "./LaunchBlueprintView";
import CompetitorSeedStep from "./CompetitorSeedStep";

interface ResultSummary {
  resultId: string;
  ideaName: string;
  verdictHeadline: string;
  litScore: number;
  generatedAt: string;
}

interface PaidOrderSummary {
  orderId: string;
  ideaName: string;
  status:
    | "pending"
    | "checkout_created"
    | "paid"
    | "awaiting_seeds"
    | "researching"
    | "generating"
    | "ready"
    | "failed"
    | "refunded";
  createdAt: string;
  updatedAt: string;
  artifactType?:
    "legacy_report_v1" | "execution_plan_30day_v1" | "launch_blueprint_v2";
  offerName?: string;
  sourceVerdictId?: string;
  planVersion?: string;
}

interface Props {
  onLogout: () => void;
  onBuy: () => void;
  onStart: () => void;
  onOpenResult: (result: EvaluationResult) => void;
}

type DashboardLocale = "en" | "es";
type OrderGroup = "action" | "progress" | "ready" | "attention" | "unconfirmed";
type RecordLoadState = "loading" | "success" | "error";

const dashboardCopy = {
  en: {
    dashboard: "Account workspace",
    signedIn: "Signed in",
    memberSince: "Member since",
    accountRecords: "Saved verdicts and paid orders owned by this account.",
    logout: "Log out",
    loadingTitle: "Loading your account workspace.",
    loadingBody: "GhostTown is checking your session, saved free verdicts, and paid-order records.",
    errorTitle: "Account workspace could not be loaded.",
    returnHome: "Return to home",
    retry: "Try again",
    noRecordsTitle: "No saved account records yet.",
    noRecordsBody: "Completed free assessments and paid orders will appear here after they are associated with this account.",
    paidOrders: "Paid orders",
    noPaidOrders: "No paid orders are associated with this account.",
    loadingPaidOrders: "Loading paid orders…",
    paidOrdersFailed: "Paid orders could not be loaded. Any previously loaded order data remains visible.",
    loadingResults: "Loading saved verdicts…",
    resultsFailed: "Saved verdicts could not be loaded. Any previously loaded verdict data remains visible.",
    nextAction: "Primary next action",
    startTitle: "Test another idea",
    startBody: "Run a free verdict when your account has an available assessment.",
    start: "Start new assessment",
    buyTitle: "Need more free verdicts?",
    buyBody: "Buy additional verdict credits through the existing checkout flow.",
    buy: "Buy 10 assessments — $14.97",
    available: "available",
    noAvailable: "No free assessments currently available.",
    account: "Account",
    orderId: "Order ID",
    sourceVerdict: "Source verdict",
    purchased: "Created",
    updated: "Updated",
    version: "Version",
    product: "Product",
    artifacts: "Available artifacts",
    unavailableArtifacts: "Artifacts are not available until the order is ready.",
    chooseSeeds: "Resume seed confirmation",
    openBlueprint: "Open Blueprint",
    retryBlueprint: "Retry Blueprint",
    retrying: "Retrying…",
    preparing: "Preparing…",
    pdf: "PDF",
    json: "JSON",
    zip: "ZIP",
    freeHistory: "Free verdict history",
    noFreeHistory: "Completed assessments saved to this account will appear here.",
    viewReport: "View report",
    opening: "Opening…",
    lit: "LIT",
    shareRewards: "Share rewards",
    shareLinks: "Share links",
    credits: "Credits",
    private: "Private to this account",
    orderGroups: {
      action: {
        title: "Orders requiring customer action",
        empty: "No paid orders currently need customer input."
      },
      progress: {
        title: "Orders in progress",
        empty: "No paid orders are currently researching or generating."
      },
      ready: {
        title: "Ready Launch Blueprints and artifacts",
        empty: "No paid artifacts are ready yet."
      },
      attention: {
        title: "Orders needing attention or refunded",
        empty: "No failed or refunded orders are present."
      },
      unconfirmed: {
        title: "Unconfirmed or incomplete checkout records",
        empty: "No unconfirmed paid checkouts are present."
      }
    },
    status: {
      pending: ["Payment not confirmed", "Checkout was started, but the dashboard cannot treat this as a paid order yet."],
      checkout_created: ["Checkout created", "Stripe checkout was created. Fulfillment has not started."],
      paid: ["Action required", "Payment is recorded; confirm exactly 2–3 competitor or adjacent-product seeds before research starts."],
      awaiting_seeds: ["Action required", "Confirm exactly 2–3 competitor or adjacent-product seeds before research starts."],
      researching: ["Researching", "GhostTown is researching public market-neighborhood footprints. Downloads are not available yet."],
      generating: ["Generating", "Research is being assembled into the Blueprint. Downloads are not available yet."],
      ready: ["Ready", "The order is ready; supported artifacts can be opened or downloaded."],
      failed: ["Failed", "The order needs attention. Retry is available for supported Launch Blueprint orders."],
      refunded: ["Refunded", "This order is recorded as refunded and is not an active fulfillment item."]
    },
    errors: {
      notLoggedIn: "Not logged in",
      loadUserFailed: "Failed to load user data",
      network: "Network error",
      assessmentOpenFailed: "Assessment could not be opened",
      artifactNotReady: "The purchased artifact is not ready yet",
      downloadFailed: "Download failed",
      retryFailed: "Blueprint retry failed"
    }
  },
  es: {
    dashboard: "Espacio de cuenta",
    signedIn: "Sesión iniciada",
    memberSince: "Miembro desde",
    accountRecords: "Veredictos guardados y órdenes pagadas pertenecientes a esta cuenta.",
    logout: "Cerrar sesión",
    loadingTitle: "Cargando tu espacio de cuenta.",
    loadingBody: "GhostTown está revisando tu sesión, veredictos gratuitos guardados y registros de órdenes pagadas.",
    errorTitle: "No se pudo cargar el espacio de cuenta.",
    returnHome: "Volver al inicio",
    retry: "Intentar de nuevo",
    noRecordsTitle: "Aún no hay registros guardados en la cuenta.",
    noRecordsBody: "Las evaluaciones gratuitas completadas y las órdenes pagadas aparecerán aquí cuando estén asociadas con esta cuenta.",
    paidOrders: "Órdenes pagadas",
    noPaidOrders: "No hay órdenes pagadas asociadas con esta cuenta.",
    loadingPaidOrders: "Cargando órdenes pagadas…",
    paidOrdersFailed: "No se pudieron cargar las órdenes pagadas. Cualquier dato cargado anteriormente sigue visible.",
    loadingResults: "Cargando veredictos guardados…",
    resultsFailed: "No se pudieron cargar los veredictos guardados. Cualquier dato cargado anteriormente sigue visible.",
    nextAction: "Acción principal",
    startTitle: "Probar otra idea",
    startBody: "Ejecuta un veredicto gratuito cuando tu cuenta tenga una evaluación disponible.",
    start: "Iniciar nueva evaluación",
    buyTitle: "¿Necesitas más veredictos gratuitos?",
    buyBody: "Compra créditos adicionales de veredictos mediante el checkout existente.",
    buy: "Comprar 10 evaluaciones — $14.97",
    available: "disponibles",
    noAvailable: "No hay evaluaciones gratuitas disponibles ahora.",
    account: "Cuenta",
    orderId: "ID de orden",
    sourceVerdict: "Veredicto fuente",
    purchased: "Creada",
    updated: "Actualizada",
    version: "Versión",
    product: "Producto",
    artifacts: "Artefactos disponibles",
    unavailableArtifacts: "Los artefactos no están disponibles hasta que la orden esté lista.",
    chooseSeeds: "Reanudar confirmación de semillas",
    openBlueprint: "Abrir Blueprint",
    retryBlueprint: "Reintentar Blueprint",
    retrying: "Reintentando…",
    preparing: "Preparando…",
    pdf: "PDF",
    json: "JSON",
    zip: "ZIP",
    freeHistory: "Historial de veredictos gratuitos",
    noFreeHistory: "Las evaluaciones completadas guardadas en esta cuenta aparecerán aquí.",
    viewReport: "Ver informe",
    opening: "Abriendo…",
    lit: "LIT",
    shareRewards: "Recompensas por compartir",
    shareLinks: "Enlaces compartidos",
    credits: "Créditos",
    private: "Privado para esta cuenta",
    orderGroups: {
      action: {
        title: "Órdenes que requieren acción del cliente",
        empty: "Ninguna orden pagada requiere acción ahora."
      },
      progress: {
        title: "Órdenes en progreso",
        empty: "Ninguna orden pagada está investigando o generando ahora."
      },
      ready: {
        title: "Launch Blueprints y artefactos listos",
        empty: "Aún no hay artefactos pagados listos."
      },
      attention: {
        title: "Órdenes que necesitan atención o fueron reembolsadas",
        empty: "No hay órdenes fallidas o reembolsadas."
      },
      unconfirmed: {
        title: "Registros de checkout no confirmados o incompletos",
        empty: "No hay checkouts pagados sin confirmar."
      }
    },
    status: {
      pending: ["Pago no confirmado", "Checkout se inició, pero el dashboard aún no puede tratar esto como una orden pagada."],
      checkout_created: ["Checkout creado", "Stripe checkout fue creado. Fulfillment no ha empezado."],
      paid: ["Acción requerida", "El pago está registrado; confirma exactamente 2–3 competidores o productos adyacentes antes de iniciar investigación."],
      awaiting_seeds: ["Acción requerida", "Confirma exactamente 2–3 competidores o productos adyacentes antes de iniciar investigación."],
      researching: ["Investigando", "GhostTown está investigando huellas públicas del vecindario de mercado. Las descargas aún no están disponibles."],
      generating: ["Generando", "La investigación se está organizando en el Blueprint. Las descargas aún no están disponibles."],
      ready: ["Listo", "La orden está lista; los artefactos compatibles se pueden abrir o descargar."],
      failed: ["Falló", "La orden necesita atención. El reintento está disponible para Launch Blueprints compatibles."],
      refunded: ["Reembolsada", "Esta orden está registrada como reembolsada y no es un fulfillment activo."]
    },
    errors: {
      notLoggedIn: "Sesión no iniciada",
      loadUserFailed: "No se pudieron cargar los datos del usuario",
      network: "Error de red",
      assessmentOpenFailed: "No se pudo abrir la evaluación",
      artifactNotReady: "El artefacto comprado aún no está listo",
      downloadFailed: "La descarga falló",
      retryFailed: "Falló el reintento del Blueprint"
    }
  }
};

function dashboardLocale(): DashboardLocale {
  if (typeof document !== "undefined" && document.documentElement.lang.toLowerCase().startsWith("es")) return "es";
  return "en";
}

function customerError(caught: unknown, fallback: string, locale: DashboardLocale): string {
  if (locale === "es") return fallback;
  return caught instanceof Error && caught.message ? caught.message : fallback;
}

function orderGroup(status: PaidOrderSummary["status"]): OrderGroup {
  if (status === "paid" || status === "awaiting_seeds") return "action";
  if (status === "researching" || status === "generating") return "progress";
  if (status === "ready") return "ready";
  if (status === "failed" || status === "refunded") return "attention";
  return "unconfirmed";
}

function statusClasses(group: OrderGroup): string {
  if (group === "action") return "border-blue-200 bg-blue-50 text-blue-900";
  if (group === "progress") return "border-amber-200 bg-amber-50 text-amber-900";
  if (group === "ready") return "border-green-200 bg-green-50 text-green-900";
  if (group === "attention") return "border-red-200 bg-red-50 text-red-900";
  return "border-gray-200 bg-gray-50 text-gray-800";
}

function statusGlyph(group: OrderGroup): string {
  if (group === "action") return "!";
  if (group === "progress") return "…";
  if (group === "ready") return "✓";
  if (group === "attention") return "×";
  return "•";
}

export default function UserDashboard({
  onLogout,
  onBuy,
  onStart,
  onOpenResult,
}: Props) {
  const locale = dashboardLocale();
  const text = dashboardCopy[locale];
  const [user, setUser] = useState<PublicUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [resultsLoadState, setResultsLoadState] = useState<RecordLoadState>("loading");
  const [openingResultId, setOpeningResultId] = useState("");
  const [paidPlans, setPaidPlans] = useState<PaidOrderSummary[]>([]);
  const [paidPlansLoadState, setPaidPlansLoadState] = useState<RecordLoadState>("loading");
  const [downloadingPlan, setDownloadingPlan] = useState("");
  const [planError, setPlanError] = useState("");
  const [openBlueprintOrderId, setOpenBlueprintOrderId] = useState("");
  const [seedOrderId, setSeedOrderId] = useState("");
  const [retryingOrderId, setRetryingOrderId] = useState("");

  const loadPaidPlans = useCallback(() => {
    setPaidPlansLoadState("loading");
    return fetch(apiUrl("/api/paid-test/orders"), { headers: authHeaders() })
      .then((response) =>
        response.ok
          ? response.json<{ orders?: PaidOrderSummary[] }>()
          : Promise.reject(),
      )
      .then((data) => {
        setPaidPlans(data.orders ?? []);
        setPaidPlansLoadState("success");
      })
      .catch(() => setPaidPlansLoadState("error"));
  }, []);

  const loadResults = useCallback(() => {
    setResultsLoadState("loading");
    return fetch(apiUrl("/api/results"), { headers: authHeaders() })
      .then((response) =>
        response.ok
          ? response.json<{ results?: ResultSummary[] }>()
          : Promise.reject(),
      )
      .then((data) => {
        setResults(data.results ?? []);
        setResultsLoadState("success");
      })
      .catch(() => setResultsLoadState("error"));
  }, []);

  const loadDashboard = useCallback(() => {
    const token = localStorage.getItem("lit_user_token_v1");
    setLoading(true);
    setError("");
    setPlanError("");
    if (!token) {
      setError(text.errors.notLoggedIn);
      setLoading(false);
      return;
    }
    fetch(apiUrl("/api/auth/verify"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json<{ user?: PublicUserData }>())
      .then((data) =>
        data.user ? setUser(data.user) : setError(text.errors.loadUserFailed),
      )
      .catch(() => setError(text.errors.network))
      .finally(() => setLoading(false));
    void loadResults();
    void loadPaidPlans();
  }, [loadPaidPlans, loadResults, text.errors.loadUserFailed, text.errors.network, text.errors.notLoggedIn]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const openResult = async (resultId: string) => {
    setOpeningResultId(resultId);
    setError("");
    try {
      const response = await fetch(
        apiUrl(`/api/results/${encodeURIComponent(resultId)}`),
        { headers: authHeaders() },
      );
      const data = await response.json<{
        result?: EvaluationResult;
        error?: string;
      }>();
      if (!response.ok || !data.result)
        throw new Error(data.error || text.errors.assessmentOpenFailed);
      onOpenResult(data.result);
    } catch (caught) {
      setError(customerError(caught, text.errors.assessmentOpenFailed, locale));
    } finally {
      setOpeningResultId("");
    }
  };

  const artifactBase = (
    plan: PaidOrderSummary,
  ): "report" | "plan" | "blueprint" => {
    if (plan.artifactType === "launch_blueprint_v2") return "blueprint";
    return plan.artifactType === "legacy_report_v1" ? "report" : "plan";
  };

  const downloadPlan = async (
    plan: PaidOrderSummary,
    format: "pdf" | "json" | "zip",
  ) => {
    const downloadId = `${plan.orderId}:${format}`;
    setDownloadingPlan(downloadId);
    setPlanError("");
    try {
      const base = artifactBase(plan);
      const path =
        base === "blueprint" && format === "zip"
          ? `/api/paid-test/orders/${encodeURIComponent(plan.orderId)}/blueprint-assets.zip`
          : base === "blueprint"
          ? `/api/paid-test/orders/${encodeURIComponent(plan.orderId)}/blueprint.${format}`
          : `/api/paid-test/orders/${encodeURIComponent(plan.orderId)}/${base}${format === "pdf" ? ".pdf" : ""}`;
      const response = await fetch(apiUrl(path), { headers: authHeaders() });
      if (!response.ok)
        throw new Error(text.errors.artifactNotReady);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ghosttown-${base}-${plan.orderId}${format === "zip" ? "-assets" : ""}.${format}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setPlanError(customerError(caught, text.errors.downloadFailed, locale));
    } finally {
      setDownloadingPlan("");
    }
  };

  const retryBlueprint = async (orderId: string) => {
    setRetryingOrderId(orderId);
    setPlanError("");
    try {
      const response = await fetch(
        apiUrl(
          `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/retry`,
        ),
        { method: "POST", headers: authHeaders() },
      );
      const body = await response.json<{ error?: string }>();
      if (!response.ok) throw new Error(body.error || text.errors.retryFailed);
      await loadPaidPlans();
    } catch (caught) {
      setPlanError(customerError(caught, text.errors.retryFailed, locale));
    } finally {
      setRetryingOrderId("");
    }
  };

  if (seedOrderId) {
    return (
      <div className="mx-auto max-w-5xl p-4 py-8">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              setSeedOrderId("");
              void loadPaidPlans();
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-ghost-rust/30"
          >
            ← {text.dashboard}
          </button>
        </div>
        <div className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern sm:p-10">
          <CompetitorSeedStep
            orderId={seedOrderId}
            onBack={() => {
              setSeedOrderId("");
              void loadPaidPlans();
            }}
            onStarted={() => {
              setSeedOrderId("");
              void loadPaidPlans();
            }}
          />
        </div>
      </div>
    );
  }
  if (openBlueprintOrderId)
    return (
      <LaunchBlueprintView
        orderId={openBlueprintOrderId}
        onBack={() => {
          setOpenBlueprintOrderId("");
          void loadPaidPlans();
        }}
      />
    );

  if (loading)
    return (
      <main className="mx-auto max-w-2xl px-4 py-14 text-center" aria-busy="true">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ghost-rust/15 border-b-ghost-rust" aria-hidden="true" />
        <h1 className="mt-6 text-2xl font-black text-ghost-ink">{text.loadingTitle}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{text.loadingBody}</p>
      </main>
    );
  if (error || !user)
    return (
      <main className="mx-auto max-w-2xl px-4 py-14 text-center">
        <section className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-2xl font-black text-red-900">{text.errorTitle}</h1>
          <p className="mt-3 break-words text-sm leading-6 text-red-800">{error || text.errors.notLoggedIn}</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={loadDashboard} className="rounded-lg border border-red-300 bg-white px-5 py-3 font-bold text-red-800 focus:outline-none focus:ring-2 focus:ring-red-300">
              {text.retry}
            </button>
            <button type="button" onClick={onLogout} className="rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/40">
              {text.returnHome}
            </button>
          </div>
        </section>
      </main>
    );

  const availableTests = Math.max(
    0,
    1 -
      user.testsUsed +
      user.testsPurchased +
      Math.min(user.shareCredits || 0, 1),
  );
  const needsToPurchase = availableTests <= 0;
  const hasRecords = results.length > 0 || paidPlans.length > 0;
  const recordsLoaded = resultsLoadState === "success" && paidPlansLoadState === "success";
  const grouped = {
    action: paidPlans.filter((plan) => orderGroup(plan.status) === "action"),
    progress: paidPlans.filter((plan) => orderGroup(plan.status) === "progress"),
    ready: paidPlans.filter((plan) => orderGroup(plan.status) === "ready"),
    attention: paidPlans.filter((plan) => orderGroup(plan.status) === "attention"),
    unconfirmed: paidPlans.filter((plan) => orderGroup(plan.status) === "unconfirmed"),
  } satisfies Record<OrderGroup, PaidOrderSummary[]>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-2xl border border-black/10 bg-[#f7f2ea] p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">{text.signedIn}</p>
            <h1 className="mt-2 break-words font-display text-3xl font-bold text-ghost-ink sm:text-4xl">{text.dashboard}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700">{text.accountRecords}</p>
            <p className="mt-3 break-all text-sm font-bold text-ghost-ink">{user.email}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <button type="button" onClick={onStart} className="min-h-11 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 focus:ring-offset-2">
              {text.start}
            </button>
            <button type="button" onClick={onLogout} className="min-h-11 rounded-lg border border-red-200 px-5 py-3 font-bold text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300">
              {text.logout}
            </button>
          </div>
        </div>
      </header>

      <section className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <article className="rounded-xl bg-ghost-ink p-6 text-white shadow-lantern">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-gold">{text.nextAction}</p>
          <h2 className="mt-2 text-2xl font-black">{grouped.action.length ? text.orderGroups.action.title : needsToPurchase ? text.buyTitle : text.startTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">
            {grouped.action.length
              ? dashboardCopy[locale].status[grouped.action[0].status][1]
              : needsToPurchase
                ? text.buyBody
                : text.startBody}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {grouped.action[0]?.artifactType === "launch_blueprint_v2" ? (
              <button type="button" onClick={() => setSeedOrderId(grouped.action[0].orderId)} className="min-h-11 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white">
                {text.chooseSeeds}
              </button>
            ) : (
              <button type="button" onClick={onStart} className="min-h-11 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white">
                {text.start}
              </button>
            )}
            {needsToPurchase && (
              <button type="button" onClick={onBuy} className="min-h-11 rounded-lg border border-white/30 px-5 py-3 font-black text-white">
                {text.buy}
              </button>
            )}
          </div>
        </article>
        <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-black/10 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{text.account}</p>
            <p className="mt-2 break-all font-bold text-ghost-ink">{user.email}</p>
            <p className="mt-2 text-sm text-gray-600">{text.memberSince} {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <div className={`rounded-xl border p-5 ${needsToPurchase ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">{text.available}</p>
            <p className={`mt-2 text-5xl font-black ${needsToPurchase ? "text-red-700" : "text-green-800"}`}>{availableTests}</p>
            <p className="mt-2 text-sm text-gray-700">{needsToPurchase ? text.noAvailable : `${availableTests} ${text.available}`}</p>
          </div>
        </aside>
      </section>

      {recordsLoaded && !hasRecords && (
        <section className="mb-8 rounded-xl border border-ghost-forest/20 bg-[#eef3ef] p-6">
          <h2 className="text-2xl font-black text-ghost-ink">{text.noRecordsTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700">{text.noRecordsBody}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onStart} className="min-h-11 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white">{text.start}</button>
            {needsToPurchase && <button type="button" onClick={onBuy} className="min-h-11 rounded-lg border border-ghost-rust px-5 py-3 font-black text-ghost-rust">{text.buy}</button>}
          </div>
        </section>
      )}

      {planError && (
        <p className="mb-6 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {planError}
        </p>
      )}

      <div className="space-y-8">
        {paidPlansLoadState === "loading" && (
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm sm:p-6" aria-busy="true">
            <h2 className="text-2xl font-black text-ghost-ink">{text.paidOrders}</h2>
            <p className="mt-3 text-sm text-gray-600">{text.loadingPaidOrders}</p>
          </section>
        )}

        {paidPlansLoadState === "error" && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-5 sm:p-6" role="alert">
            <h2 className="text-xl font-black text-red-900">{text.paidOrders}</h2>
            <p className="mt-2 text-sm leading-6 text-red-800">{text.paidOrdersFailed}</p>
            <button type="button" onClick={() => void loadPaidPlans()} className="mt-4 min-h-11 rounded-lg border border-red-300 bg-white px-4 py-2 font-bold text-red-800 focus:outline-none focus:ring-2 focus:ring-red-300">
              {text.retry}
            </button>
          </section>
        )}

        {paidPlansLoadState === "success" && paidPlans.length === 0 && (
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-black text-ghost-ink">{text.paidOrders}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{text.noPaidOrders}</p>
          </section>
        )}

        {(["action", "progress", "ready", "attention", "unconfirmed"] as OrderGroup[]).map((group) => (
          grouped[group].length > 0 && (
            <section key={group} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm sm:p-6" aria-labelledby={`orders-${group}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-ghost-rust">{text.product}</p>
                  <h2 id={`orders-${group}`} className="text-2xl font-black text-ghost-ink">{text.orderGroups[group].title}</h2>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{text.private}</p>
              </div>
              <div className="mt-5 grid gap-4">
                {grouped[group].map((plan) => (
                  <OrderCard
                    key={plan.orderId}
                    plan={plan}
                    text={text}
                    locale={locale}
                    downloadingPlan={downloadingPlan}
                    retryingOrderId={retryingOrderId}
                    onSeed={() => setSeedOrderId(plan.orderId)}
                    onOpen={() => setOpenBlueprintOrderId(plan.orderId)}
                    onRetry={() => void retryBlueprint(plan.orderId)}
                    onDownload={(format) => void downloadPlan(plan, format)}
                  />
                ))}
              </div>
            </section>
          )
        ))}

        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="free-results">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-ghost-rust">{dashboardCopy[locale].lit}</p>
              <h2 id="free-results" className="text-2xl font-black text-ghost-ink">{text.freeHistory}</h2>
            </div>
            <button type="button" onClick={onStart} className="min-h-11 rounded-lg border border-ghost-rust px-4 py-2 text-sm font-black text-ghost-rust focus:outline-none focus:ring-2 focus:ring-ghost-rust/30">
              {text.start}
            </button>
          </div>
          {resultsLoadState === "loading" && (
            <p className="mt-4 text-sm leading-6 text-gray-600" aria-live="polite">{text.loadingResults}</p>
          )}
          {resultsLoadState === "error" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
              <p className="text-sm leading-6 text-red-800">{text.resultsFailed}</p>
              <button type="button" onClick={() => void loadResults()} className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 py-2 font-bold text-red-800 focus:outline-none focus:ring-2 focus:ring-red-300">
                {text.retry}
              </button>
            </div>
          )}
          {resultsLoadState === "success" && results.length === 0 && (
            <p className="mt-4 text-sm leading-6 text-gray-600">{text.noFreeHistory}</p>
          )}
          {results.length > 0 && (
            <div className="mt-5 grid gap-3">
              {results.map((item) => (
                <article
                  key={item.resultId}
                  className="flex min-w-0 flex-col gap-3 rounded-lg border border-gray-200 bg-[#fbfaf7] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="break-words font-black text-ghost-ink">{item.ideaName}</h3>
                    <p className="mt-1 break-words text-sm text-gray-600">{item.verdictHeadline}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {text.lit} {item.litScore}/5 · {new Date(item.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openResult(item.resultId)}
                    disabled={Boolean(openingResultId)}
                    className="min-h-11 rounded-lg border border-ghost-rust px-4 py-2 font-bold text-ghost-rust focus:outline-none focus:ring-2 focus:ring-ghost-rust/30 disabled:opacity-50"
                  >
                    {openingResultId === item.resultId ? text.opening : text.viewReport}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
          <h2 className="font-black text-blue-950">{text.shareRewards}</h2>
          <div className="mt-4 grid max-w-md grid-cols-2 gap-4 text-center text-sm">
            <div className="rounded-lg bg-white p-4">
              <span className="text-blue-700">{text.shareLinks}</span>
              <div className="text-2xl font-black text-blue-950">{user.sharesGiven}</div>
            </div>
            <div className="rounded-lg bg-white p-4">
              <span className="text-blue-700">{text.credits}</span>
              <div className="text-2xl font-black text-blue-950">{Math.min(user.shareCredits || 0, 1)}/1</div>
            </div>
          </div>
        </section>

        {needsToPurchase && (
          <section className="rounded-xl bg-ghost-ink p-6 text-center text-white sm:p-8">
            <h2 className="text-2xl font-black">{text.buyTitle}</h2>
            <p className="mx-auto mb-6 mt-2 max-w-xl text-sm leading-6 text-white/75">{text.buyBody}</p>
            <button
              type="button"
              onClick={onBuy}
              className="min-h-11 rounded bg-white px-6 py-3 font-black text-ghost-rust focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              {text.buy}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function OrderCard({
  plan,
  text,
  locale,
  downloadingPlan,
  retryingOrderId,
  onSeed,
  onOpen,
  onRetry,
  onDownload,
}: {
  plan: PaidOrderSummary;
  text: typeof dashboardCopy.en;
  locale: DashboardLocale;
  downloadingPlan: string;
  retryingOrderId: string;
  onSeed: () => void;
  onOpen: () => void;
  onRetry: () => void;
  onDownload: (format: "pdf" | "json" | "zip") => void;
}) {
  const group = orderGroup(plan.status);
  const isBlueprint = plan.artifactType === "launch_blueprint_v2";
  const downloadsDisabled = Boolean(downloadingPlan);
  const [label, meaning] = text.status[plan.status];
  const offerName = plan.offerName || (isBlueprint ? "GhostTown Launch Blueprint" : "30-Day Implementation Plan");
  return (
    <article className="min-w-0 rounded-xl border border-gray-200 bg-[#fbfaf7] p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-7 items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${statusClasses(group)}`}>
              <span aria-hidden="true">{statusGlyph(group)}</span>
              <span>{label}</span>
            </span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-600">{offerName}</span>
          </div>
          <h3 className="mt-3 break-words text-xl font-black text-ghost-ink">{plan.ideaName}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">{meaning}</p>
          <dl className="mt-4 grid gap-2 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0 rounded-lg bg-white p-3">
              <dt className="font-black uppercase tracking-wide">{text.orderId}</dt>
              <dd className="mt-1 break-all font-mono">{plan.orderId}</dd>
            </div>
            <div className="rounded-lg bg-white p-3">
              <dt className="font-black uppercase tracking-wide">{text.purchased}</dt>
              <dd className="mt-1">{plan.createdAt ? new Date(plan.createdAt).toLocaleDateString(locale === "es" ? "es-PR" : "en-US") : "—"}</dd>
            </div>
            <div className="rounded-lg bg-white p-3">
              <dt className="font-black uppercase tracking-wide">{text.updated}</dt>
              <dd className="mt-1">{plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString(locale === "es" ? "es-PR" : "en-US") : "—"}</dd>
            </div>
            {plan.sourceVerdictId && (
              <div className="min-w-0 rounded-lg bg-white p-3">
                <dt className="font-black uppercase tracking-wide">{text.sourceVerdict}</dt>
                <dd className="mt-1 break-all font-mono">{plan.sourceVerdictId}</dd>
              </div>
            )}
            {plan.planVersion && (
              <div className="rounded-lg bg-white p-3">
                <dt className="font-black uppercase tracking-wide">{text.version}</dt>
                <dd className="mt-1">{plan.planVersion}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="flex min-w-0 flex-col gap-2 xl:min-w-64">
          {(plan.status === "paid" || plan.status === "awaiting_seeds") && isBlueprint && (
            <button type="button" onClick={onSeed} className="min-h-11 rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/40">
              {text.chooseSeeds}
            </button>
          )}
          {isBlueprint && plan.status === "ready" && (
            <button type="button" onClick={onOpen} className="min-h-11 rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/40">
              {text.openBlueprint}
            </button>
          )}
          {plan.status === "ready" ? (
            <div className="rounded-lg border border-green-200 bg-white p-3">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-green-900">{text.artifacts}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <DownloadButton label={text.pdf} busy={downloadingPlan === `${plan.orderId}:pdf`} busyLabel={text.preparing} disabled={downloadsDisabled} onClick={() => onDownload("pdf")} />
                <DownloadButton label={text.json} busy={downloadingPlan === `${plan.orderId}:json`} busyLabel={text.preparing} disabled={downloadsDisabled} onClick={() => onDownload("json")} />
                {isBlueprint && <DownloadButton label={text.zip} busy={downloadingPlan === `${plan.orderId}:zip`} busyLabel={text.preparing} disabled={downloadsDisabled} onClick={() => onDownload("zip")} />}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-600">{text.unavailableArtifacts}</p>
          )}
          {plan.status === "failed" && isBlueprint && (
            <button type="button" onClick={onRetry} disabled={Boolean(retryingOrderId)} className="min-h-11 rounded-lg border border-ghost-rust bg-white px-4 py-2 text-sm font-black text-ghost-rust focus:outline-none focus:ring-2 focus:ring-ghost-rust/30 disabled:opacity-50">
              {retryingOrderId === plan.orderId ? text.retrying : text.retryBlueprint}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function DownloadButton({ label, busy, busyLabel, disabled, onClick }: { label: string; busy: boolean; busyLabel: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} download`}
      className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-ghost-rust/30 disabled:opacity-50"
    >
      {busy ? busyLabel : label}
    </button>
  );
}
