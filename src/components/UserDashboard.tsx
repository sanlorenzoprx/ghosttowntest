import { useEffect, useState } from "react";
import { PublicUserData } from "../types/auth";
import { apiUrl, authHeaders } from "../lib/api";
import type { EvaluationResult } from "../types/lit";
import LaunchBlueprintRouter from "./LaunchBlueprintRouter";
import CompetitorSeedStep from "./CompetitorSeedStep";
import GetMeLiveUpsell from "./GetMeLiveUpsell";
import First30WebsiteIncluded from "./First30WebsiteIncluded";
import { isFirst30OrderId } from "../lib/first30Order";
import StrategicUncertaintySprintPanel from "./StrategicUncertaintySprintPanel";
import type { Locale } from "../lib/locale";

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
    | "uncertainty"
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
  fulfillmentError?: string;
  uncertaintySprint?: {
    version: "1.0";
    status: "open" | "answered";
    durationDays: 2 | 3;
    objective: string;
    chainSummary: string;
    blockers: Array<{ code: string; link: string; question: string; requiredEvidence: string }>;
    days: Array<{ day: 1 | 2 | 3; title: string; actions: string[]; completion: string }>;
    unlockRule: string;
    answeredAt?: string;
  };
}

interface GetMeLiveSummary {
  orderId: string; sourceSprintOrderId: string; status: string; businessName?: string;
  publicUrl?: string; customDomain?: string; leadCount: number;
  salesCount?: number; salesValueCents?: number; visitCount?: number; shareCount?: number; recentActivity?: string;
  emailStatus: 'ready' | 'pending' | 'not_started'; paymentStatus: 'ready' | 'pending' | 'not_requested';
  cloudflareConnected: boolean; createdAt: string; updatedAt: string;
}


type PlanStatus = PaidOrderSummary["status"];

const COPY: Record<Locale, {
  notLoggedIn: string;
  loadUserFailed: string;
  networkError: string;
  openFailed: string;
  notReady: string;
  downloadFailed: string;
  fileLabel: { blueprint: string; report: string; plan: string };
  retryFailed: string;
  loading: string;
  returnHome: string;
  title: string;
  resume: string;
  logOut: string;
  heroKicker: string;
  heroHeading: string;
  available: (n: number) => string;
  startAnother: string;
  account: string;
  memberSince: (date: string) => string;
  verdictsAvailable: string;
  previous: string;
  noResults: string;
  opening: string;
  viewReport: string;
  purchasedKicker: string;
  purchasedHeading: string;
  privateNote: string;
  noPurchases: string;
  badgeAction: string;
  badgeAnswers: string;
  badgeBuilding: string;
  status: (status: PlanStatus) => string;
  blueprintName: string;
  planName: string;
  purchased: (date: string) => string;
  version: (v: string) => string;
  seedsNote: string;
  workingNote: string;
  uncertaintyNote: string;
  chooseSeeds: string;
  answerQuestions: string;
  openBlueprint: string;
  preparing: string;
  pdf: string;
  checking: string;
  retry: string;
  checkRetry: string;
  liveHeading: string;
  savedNote: string;
  noLive: string;
  yourBusiness: string;
  live: string;
  inProgress: string;
  interested: string;
  pageReady: string;
  keepChoosing: string;
  makeChanges: string;
  keepGoing: string;
  myBusiness: string;
  sharePage: string;
  peopleInterested: string;
  sales: string;
  salesValue: string;
  shareRewards: string;
  shareLinks: string;
  credits: string;
  formatDate: (value: string) => string;
}> = {
  en: {
    notLoggedIn: "Not logged in",
    loadUserFailed: "Failed to load user data",
    networkError: "Network error",
    openFailed: "Assessment could not be opened",
    notReady: "The purchased artifact is not ready yet",
    downloadFailed: "Download failed",
    fileLabel: { blueprint: "Blueprint", report: "Report", plan: "Plan" },
    retryFailed: "Blueprint retry failed",
    loading: "Loading dashboard...",
    returnHome: "Return to home",
    title: "Your Dashboard",
    resume: "Resume Saved Verdict",
    logOut: "Log Out",
    heroKicker: "Test before you build",
    heroHeading: "Ready to test another idea?",
    available: n => `${n} verdict${n === 1 ? "" : "s"} available.`,
    startAnother: "Start Another Verdict",
    account: "Account",
    memberSince: date => `Member since ${date}`,
    verdictsAvailable: "Verdicts Available",
    previous: "Previous Assessments",
    noResults: "Your completed assessments will appear here.",
    opening: "Opening…",
    viewReport: "View Report",
    purchasedKicker: "Purchased products",
    purchasedHeading: "Launch Blueprints and Media Networks",
    privateNote: "Private and saved to this account",
    noPurchases: "Purchased products will appear here.",
    badgeAction: "Action required",
    badgeAnswers: "Needs answers",
    badgeBuilding: "Building",
    status: status => status,
    blueprintName: "GhostTown Launch Blueprint",
    planName: "30-Day Implementation Plan",
    purchased: date => `Purchased ${date}`,
    version: v => ` · Version ${v}`,
    seedsNote: "Confirm 2–3 competitor or adjacent-product seeds to start the Media & Distribution Network.",
    workingNote: "GhostTown is mapping podcasts, creators, publications, events, reviewers, associations, and partners.",
    uncertaintyNote: "GhostTown stopped before building 30 days because the business chain needs a few concrete answers first.",
    chooseSeeds: "Choose research seeds",
    answerQuestions: "Answer questions",
    openBlueprint: "Open Blueprint",
    preparing: "Preparing…",
    pdf: "PDF",
    checking: "Checking…",
    retry: "Retry Blueprint",
    checkRetry: "Check / Retry Blueprint",
    liveHeading: "Your live businesses",
    savedNote: "Saved to your account",
    noLive: "Your customer page and activity will appear here after you start Get Me Live.",
    yourBusiness: "Your business",
    live: "Live",
    inProgress: "In progress",
    interested: "Someone is interested",
    pageReady: "Your page is ready for customers",
    keepChoosing: "Keep making your choices",
    makeChanges: "Make Changes",
    keepGoing: "Keep Going",
    myBusiness: "My business",
    sharePage: "Share Page",
    peopleInterested: "People interested",
    sales: "Sales",
    salesValue: "Sales value",
    shareRewards: "Share Rewards",
    shareLinks: "Share Links",
    credits: "Credits",
    formatDate: value => new Date(value).toLocaleDateString(),
  },
  es: {
    notLoggedIn: "No has iniciado sesión",
    loadUserFailed: "No pudimos cargar tu cuenta",
    networkError: "Problema de conexión",
    openFailed: "No pudimos abrir esta evaluación",
    notReady: "Lo que compraste todavía no está listo",
    downloadFailed: "No se pudo descargar",
    fileLabel: { blueprint: "Blueprint", report: "Informe", plan: "Plan" },
    retryFailed: "No pudimos volver a intentar el Blueprint",
    loading: "Cargando tu panel...",
    returnHome: "Volver al inicio",
    title: "Tu panel",
    resume: "Seguir con tu veredicto guardado",
    logOut: "Cerrar sesión",
    heroKicker: "Prueba antes de construir",
    heroHeading: "¿Listo para probar otra idea?",
    available: n => n === 1 ? "Tienes 1 veredicto disponible." : `Tienes ${n} veredictos disponibles.`,
    startAnother: "Empezar otro veredicto",
    account: "Cuenta",
    memberSince: date => `Miembro desde ${date}`,
    verdictsAvailable: "Veredictos disponibles",
    previous: "Evaluaciones anteriores",
    noResults: "Tus evaluaciones terminadas van a salir aquí.",
    opening: "Abriendo…",
    viewReport: "Ver informe",
    purchasedKicker: "Lo que compraste",
    purchasedHeading: "Launch Blueprints y redes de medios",
    privateNote: "Privado y guardado en esta cuenta",
    noPurchases: "Lo que compres va a salir aquí.",
    badgeAction: "Te toca a ti",
    badgeAnswers: "Faltan respuestas",
    badgeBuilding: "Preparándose",
    status: status => ({
      pending: "pendiente",
      checkout_created: "pago pendiente",
      paid: "pagado",
      awaiting_seeds: "te toca a ti",
      researching: "investigando",
      generating: "preparándose",
      uncertainty: "faltan respuestas",
      ready: "listo",
      failed: "falló",
      refunded: "reembolsado",
    } satisfies Record<PlanStatus, string>)[status] ?? status,
    blueprintName: "GhostTown Launch Blueprint",
    planName: "Plan de 30 días",
    purchased: date => `Comprado el ${date}`,
    version: v => ` · Versión ${v}`,
    seedsNote: "Confirma 2 o 3 competidores o productos parecidos para empezar tu red de medios y distribución.",
    workingNote: "GhostTown está buscando podcasts, creadores, publicaciones, eventos, reseñadores, asociaciones y aliados.",
    uncertaintyNote: "GhostTown se detuvo antes de armar los 30 días porque necesita unas respuestas concretas sobre tu negocio primero.",
    chooseSeeds: "Escoger competidores para investigar",
    answerQuestions: "Contestar preguntas",
    openBlueprint: "Abrir el Blueprint",
    preparing: "Preparando…",
    pdf: "PDF",
    checking: "Revisando…",
    retry: "Intentar el Blueprint otra vez",
    checkRetry: "Revisar / intentar el Blueprint otra vez",
    liveHeading: "Tus negocios en vivo",
    savedNote: "Guardado en tu cuenta",
    noLive: "Tu página para clientes y su actividad van a salir aquí cuando empieces Get Me Live.",
    yourBusiness: "Tu negocio",
    live: "En vivo",
    inProgress: "En proceso",
    interested: "Alguien está interesado",
    pageReady: "Tu página está lista para clientes",
    keepChoosing: "Sigue tomando tus decisiones",
    makeChanges: "Hacer cambios",
    keepGoing: "Seguir",
    myBusiness: "Mi negocio",
    sharePage: "Compartir página",
    peopleInterested: "Personas interesadas",
    sales: "Ventas",
    salesValue: "Valor de ventas",
    shareRewards: "Premios por compartir",
    shareLinks: "Enlaces compartidos",
    credits: "Créditos",
    formatDate: value => new Date(value).toLocaleDateString("es-PR"),
  },
};

interface Props {
  purchaseRefresh?: boolean;
  hasDraft: boolean;
  onLogout: () => void;
  onResume: () => void;
  onStart: () => void;
  onOpenResult: (result: EvaluationResult) => void;
  locale?: Locale;
}

export default function UserDashboard({
  purchaseRefresh = false,
  hasDraft,
  onLogout,
  onResume,
  onStart,
  onOpenResult,
  locale = "en",
}: Props) {
  const copy = COPY[locale];
  const [user, setUser] = useState<PublicUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [openingResultId, setOpeningResultId] = useState("");
  const [paidPlans, setPaidPlans] = useState<PaidOrderSummary[]>([]);
  const [downloadingPlan, setDownloadingPlan] = useState("");
  const [planError, setPlanError] = useState("");
  const [openBlueprintOrderId, setOpenBlueprintOrderId] = useState("");
  const [seedOrderId, setSeedOrderId] = useState("");
  const [uncertaintyOrderId, setUncertaintyOrderId] = useState("");
  const [retryingOrderId, setRetryingOrderId] = useState("");
  const [getMeLiveOrders, setGetMeLiveOrders] = useState<GetMeLiveSummary[]>([]);

  const loadGetMeLive = () =>
    fetch(apiUrl("/api/get-me-live/orders"), { headers: authHeaders() })
      .then(response => response.ok ? response.json<{ orders?: GetMeLiveSummary[] }>() : Promise.reject())
      .then(data => setGetMeLiveOrders(data.orders ?? []))
      .catch(() => setGetMeLiveOrders([]));

  const loadPaidPlans = () =>
    fetch(apiUrl("/api/paid-test/orders"), { headers: authHeaders() })
      .then((response) =>
        response.ok
          ? response.json<{ orders?: PaidOrderSummary[] }>()
          : Promise.reject(),
      )
      .then((data) => setPaidPlans(data.orders ?? []))
      .catch(() => setPaidPlans([]));

  const refreshUser = () => {
    const token = localStorage.getItem("lit_user_token_v1");
    if (!token) return Promise.resolve();
    return fetch(apiUrl("/api/auth/verify"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json<{ user?: PublicUserData }>())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    const token = localStorage.getItem("lit_user_token_v1");
    if (!token) {
      setError(copy.notLoggedIn);
      setLoading(false);
      return;
    }
    fetch(apiUrl("/api/auth/verify"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json<{ user?: PublicUserData }>())
      .then((data) =>
        data.user ? setUser(data.user) : setError(copy.loadUserFailed),
      )
      .catch(() => setError(copy.networkError))
      .finally(() => setLoading(false));
    fetch(apiUrl("/api/results"), { headers: authHeaders() })
      .then((response) =>
        response.ok
          ? response.json<{ results?: ResultSummary[] }>()
          : Promise.reject(),
      )
      .then((data) => setResults(data.results ?? []))
      .catch(() => setResults([]));
    void loadPaidPlans();
    void loadGetMeLive();
  }, []);

  useEffect(() => {
    if (!purchaseRefresh) return;
    const timers = [
      window.setTimeout(() => { void refreshUser(); }, 1500),
      window.setTimeout(() => { void refreshUser(); }, 4000),
    ];
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [purchaseRefresh]);

  useEffect(() => {
    const hasWorkingPlan = paidPlans.some(
      (plan) => plan.status === "researching" || plan.status === "generating",
    );
    if (!hasWorkingPlan) return;
    const timer = window.setInterval(() => {
      void loadPaidPlans();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paidPlans]);

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
        throw new Error(data.error || copy.openFailed);
      onOpenResult(data.result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : copy.openFailed,
      );
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

  const safeDownloadName = (value: string) =>
    value
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "Tested Verdict";

  const downloadPlan = async (plan: PaidOrderSummary) => {
    const downloadId = `${plan.orderId}:pdf`;
    setDownloadingPlan(downloadId);
    setPlanError("");
    try {
      const base = artifactBase(plan);
      const path =
        base === "blueprint"
          ? `/api/paid-test/orders/${encodeURIComponent(plan.orderId)}/blueprint.pdf`
          : `/api/paid-test/orders/${encodeURIComponent(plan.orderId)}/${base}.pdf`;
      const response = await fetch(apiUrl(path), { headers: authHeaders() });
      if (!response.ok)
        throw new Error(copy.notReady);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const label = copy.fileLabel[base];
      anchor.download = `${label} - ${safeDownloadName(plan.ideaName)}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setPlanError(
        caught instanceof Error ? caught.message : copy.downloadFailed,
      );
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
      if (!response.ok) throw new Error(body.error || copy.retryFailed);
      await loadPaidPlans();
    } catch (caught) {
      setPlanError(
        caught instanceof Error ? caught.message : copy.retryFailed,
      );
    } finally {
      setRetryingOrderId("");
    }
  };

  if (uncertaintyOrderId) {
    return <StrategicUncertaintySprintPanel
      orderId={uncertaintyOrderId}
      onBack={() => { setUncertaintyOrderId(""); void loadPaidPlans(); }}
      onSubmitted={() => { setUncertaintyOrderId(""); void loadPaidPlans(); }}
      locale={locale}
    />;
  }

  if (seedOrderId) {
    return (
      <div className="mx-auto max-w-5xl p-4 py-8">
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
      <LaunchBlueprintRouter
        orderId={openBlueprintOrderId}
        onBack={() => {
          setOpenBlueprintOrderId("");
          void loadPaidPlans();
        }}
        locale={locale}
      />
    );

  if (loading)
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-b-blue-600" />
        <p className="mt-4 text-gray-600">{copy.loading}</p>
      </div>
    );
  if (error || !user)
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-red-600">{error || copy.notLoggedIn}</p>
        <button onClick={onLogout} className="mt-4 font-bold text-blue-600">
          {copy.returnHome}
        </button>
      </div>
    );

  const availableTests = Math.max(
    0,
    1 -
      user.testsUsed +
      user.testsPurchased +
      Math.min(user.shareCredits || 0, 1),
  );
  const needsToPurchase = availableTests <= 0;

  return (
    <div className="mx-auto max-w-4xl p-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">{copy.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {hasDraft && (
            <button
              type="button"
              onClick={onResume}
              className="rounded-lg bg-ghost-rust px-5 py-3 font-black text-white shadow-lantern transition hover:bg-[#96360d]"
            >
              {copy.resume}
            </button>
          )}
          <button onClick={onLogout} className="font-medium text-red-600">
            {copy.logOut}
          </button>
        </div>
      </div>

      <section className="mb-8 flex flex-col gap-5 rounded-xl bg-ghost-ink p-6 text-white shadow-lantern sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">
            {copy.heroKicker}
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            {copy.heroHeading}
          </h2>
          {availableTests > 0 && (
            <p className="mt-1 text-sm text-white/75">
              {copy.available(availableTests)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onStart}
          className="min-h-14 rounded-lg bg-ghost-rust px-7 py-4 font-black text-white"
        >
          {copy.startAnother}
        </button>
      </section>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="font-bold">{copy.account}</h2>
          <p className="mt-2 text-gray-700">{user.email}</p>
          <p className="mt-2 text-sm text-gray-500">
            {copy.memberSince(copy.formatDate(user.createdAt))}
          </p>
        </div>
        <div
          className={`rounded-lg border-l-4 p-6 ${needsToPurchase ? "border-red-400 bg-red-50" : "border-green-400 bg-green-50"}`}
        >
          <div className="text-sm font-bold uppercase text-gray-600">
            {copy.verdictsAvailable}
          </div>
          <div
            className={`mt-2 text-5xl font-bold ${needsToPurchase ? "text-red-600" : "text-green-600"}`}
          >
            {availableTests}
          </div>
        </div>
      </div>

      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold">{copy.previous}</h2>
        {results.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">
            {copy.noResults}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {results.map((item) => (
              <article
                key={item.resultId}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-bold">{item.ideaName}</h3>
                  <p className="text-sm text-gray-600">
                    {item.verdictHeadline}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    LIT {item.litScore}/5 ·{" "}
                    {copy.formatDate(item.generatedAt)}
                  </p>
                </div>
                <button
                  onClick={() => void openResult(item.resultId)}
                  disabled={Boolean(openingResultId)}
                  className="rounded-lg border border-blue-300 px-4 py-2 font-bold text-blue-700 disabled:opacity-50"
                >
                  {openingResultId === item.resultId
                    ? copy.opening
                    : copy.viewReport}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">
              {copy.purchasedKicker}
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {copy.purchasedHeading}
            </h2>
          </div>
          <p className="text-xs text-gray-600">
            {copy.privateNote}
          </p>
        </div>
        {planError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {planError}
          </p>
        )}
        {paidPlans.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">
            {copy.noPurchases}
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {paidPlans.map((plan) => {
              const isBlueprint = plan.artifactType === "launch_blueprint_v2";
              const awaitingSeeds =
                plan.status === "awaiting_seeds" || plan.status === "paid";
              const working =
                plan.status === "researching" || plan.status === "generating";
              const badge = awaitingSeeds
                ? copy.badgeAction
                : plan.status === "uncertainty"
                  ? copy.badgeAnswers
                  : working
                    ? copy.badgeBuilding
                    : copy.status(plan.status);
              return (
                <article
                  key={plan.orderId}
                  className="rounded-lg border border-ghost-rust/20 bg-white p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">{plan.ideaName}</h3>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-black uppercase ${plan.status === "ready" ? "bg-green-100 text-green-800" : plan.status === "failed" ? "bg-red-100 text-red-800" : awaitingSeeds ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}
                        >
                          {badge}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-700">
                        {plan.offerName ||
                          (isBlueprint
                            ? copy.blueprintName
                            : copy.planName)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {copy.purchased(copy.formatDate(plan.createdAt))}
                        {plan.planVersion
                          ? copy.version(plan.planVersion)
                          : ""}
                      </p>
                      {awaitingSeeds && (
                        <p className="mt-2 text-sm font-bold text-blue-800">
                          {copy.seedsNote}
                        </p>
                      )}
                      {working && (
                        <p className="mt-2 text-sm text-amber-700">
                          {copy.workingNote}
                        </p>
                      )}
                      {plan.status === "uncertainty" && (
                        <p className="mt-2 text-sm font-bold text-amber-800">
                          {copy.uncertaintyNote}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {awaitingSeeds && isBlueprint && (
                        <button
                          onClick={() => setSeedOrderId(plan.orderId)}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white"
                        >
                          {copy.chooseSeeds}
                        </button>
                      )}
                      {isBlueprint && plan.status === "uncertainty" && (
                        <button
                          onClick={() => setUncertaintyOrderId(plan.orderId)}
                          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-black text-white"
                        >
                          {copy.answerQuestions}
                        </button>
                      )}
                      {isBlueprint && plan.status === "ready" && (
                        <button
                          onClick={() => setOpenBlueprintOrderId(plan.orderId)}
                          className="rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white"
                        >
                          {copy.openBlueprint}
                        </button>
                      )}
                      {plan.status === "ready" && (
                        <button
                          onClick={() => void downloadPlan(plan)}
                          disabled={Boolean(downloadingPlan)}
                          className="rounded-lg border border-ghost-rust px-4 py-2 text-sm font-black text-ghost-rust disabled:opacity-50"
                        >
                          {downloadingPlan === `${plan.orderId}:pdf`
                            ? copy.preparing
                            : copy.pdf}
                        </button>
                      )}
                      {isBlueprint && (plan.status === "failed" || working) && (
                        <button
                          onClick={() => void retryBlueprint(plan.orderId)}
                          disabled={Boolean(retryingOrderId) || plan.uncertaintySprint?.status === "open"}
                          className="rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                        >
                          {retryingOrderId === plan.orderId
                            ? copy.checking
                            : plan.status === "failed"
                              ? copy.retry
                              : copy.checkRetry}
                        </button>
                      )}
                    </div>
                  </div>
                  {isBlueprint && plan.status === "ready" && <div className="mt-4">{isFirst30OrderId(plan.orderId) ? <First30WebsiteIncluded locale={locale} /> : <GetMeLiveUpsell sourceSprintOrderId={plan.orderId} compact />}</div>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Get Me Live</p><h2 className="mt-1 text-2xl font-black">{copy.liveHeading}</h2></div><p className="text-xs text-gray-600">{copy.savedNote}</p></div>
        {getMeLiveOrders.length === 0 ? <p className="mt-4 text-sm text-gray-600">{copy.noLive}</p> : <div className="mt-5 space-y-3">{getMeLiveOrders.map(item => { const liveUrl = item.customDomain ? `https://${item.customDomain}` : item.publicUrl; const live = item.status === "live"; return <article key={item.orderId} className="rounded-xl border border-emerald-200 bg-white p-5"><div className="flex flex-col gap-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">{item.businessName || copy.yourBusiness}</h3><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-black uppercase text-emerald-900">{live ? copy.live : copy.inProgress}</span></div>{liveUrl && <a href={liveUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-bold text-ghost-rust underline">{liveUrl}</a>}<p className="mt-3 text-sm font-bold text-gray-800">{item.recentActivity || (item.leadCount > 0 ? copy.interested : live ? copy.pageReady : copy.keepChoosing)}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.location.assign(`/get-me-live/setup?order_id=${encodeURIComponent(item.orderId)}${live ? "&step=review" : ""}`)} className="rounded-lg bg-ghost-rust px-4 py-3 text-sm font-black text-white">{live ? copy.makeChanges : copy.keepGoing}</button>{liveUrl && <button type="button" onClick={() => void (navigator.share ? navigator.share({ title: item.businessName || copy.myBusiness, url: liveUrl }) : navigator.clipboard.writeText(liveUrl))} className="rounded-lg border-2 border-ghost-ink px-4 py-3 text-sm font-black">{copy.sharePage}</button>}</div></div><div className="grid gap-2 text-sm sm:grid-cols-3"><div className="rounded-xl bg-gray-50 p-3"><strong className="text-xl">{item.leadCount}</strong><span className="block text-gray-600">{copy.peopleInterested}</span></div>{item.paymentStatus !== "not_requested" && <div className="rounded-xl bg-gray-50 p-3"><strong className="text-xl">{item.salesCount || 0}</strong><span className="block text-gray-600">{copy.sales}</span></div>}{Boolean(item.salesValueCents) && <div className="rounded-xl bg-gray-50 p-3"><strong className="text-xl">${((item.salesValueCents || 0) / 100).toFixed(2)}</strong><span className="block text-gray-600">{copy.salesValue}</span></div>}</div></div></article>; })}</div>}
      </section>

      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="font-bold text-blue-900">{copy.shareRewards}</h3>
        <div className="mt-4 grid max-w-md grid-cols-2 gap-6 text-center text-sm">
          <div>
            <span className="text-blue-700">{copy.shareLinks}</span>
            <div className="text-2xl font-bold text-blue-900">
              {user.sharesGiven}
            </div>
          </div>
          <div>
            <span className="text-blue-700">{copy.credits}</span>
            <div className="text-2xl font-bold text-blue-900">
              {Math.min(user.shareCredits || 0, 1)}/1
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
