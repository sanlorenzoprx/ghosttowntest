import { useEffect, useState } from "react";
import { PublicUserData } from "../types/auth";
import { apiUrl, authHeaders } from "../lib/api";
import type { EvaluationResult } from "../types/lit";
import LaunchBlueprintRouter from "./LaunchBlueprintRouter";
import CompetitorSeedStep from "./CompetitorSeedStep";
import GetMeLiveUpsell from "./GetMeLiveUpsell";

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

interface Props {
  onLogout: () => void;
  onBuy: () => void;
  onStart: () => void;
  onOpenResult: (result: EvaluationResult) => void;
}

export default function UserDashboard({
  onLogout,
  onBuy,
  onStart,
  onOpenResult,
}: Props) {
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
  const [retryingOrderId, setRetryingOrderId] = useState("");
  const [uncertaintyAnswers, setUncertaintyAnswers] = useState<Record<string, Record<string, string>>>({});
  const [savingUncertaintyOrderId, setSavingUncertaintyOrderId] = useState("");
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

  useEffect(() => {
    const token = localStorage.getItem("lit_user_token_v1");
    if (!token) {
      setError("Not logged in");
      setLoading(false);
      return;
    }
    fetch(apiUrl("/api/auth/verify"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json<{ user?: PublicUserData }>())
      .then((data) =>
        data.user ? setUser(data.user) : setError("Failed to load user data"),
      )
      .catch(() => setError("Network error"))
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
        throw new Error(data.error || "Assessment could not be opened");
      onOpenResult(data.result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Assessment could not be opened",
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
        throw new Error("The purchased artifact is not ready yet");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const label = base === "blueprint" ? "Blueprint" : base === "report" ? "Report" : "Plan";
      anchor.download = `${label} - ${safeDownloadName(plan.ideaName)}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setPlanError(
        caught instanceof Error ? caught.message : "Download failed",
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
      if (!response.ok) throw new Error(body.error || "Blueprint retry failed");
      await loadPaidPlans();
    } catch (caught) {
      setPlanError(
        caught instanceof Error ? caught.message : "Blueprint retry failed",
      );
    } finally {
      setRetryingOrderId("");
    }
  };

  const saveUncertaintySprint = async (plan: PaidOrderSummary) => {
    if (!plan.uncertaintySprint) return;
    setSavingUncertaintyOrderId(plan.orderId);
    setPlanError("");
    try {
      const answers = uncertaintyAnswers[plan.orderId] || {};
      const response = await fetch(
        apiUrl(`/api/paid-test/orders/${encodeURIComponent(plan.orderId)}/blueprint/uncertainty`),
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        },
      );
      const body = await response.json<{ error?: string; missingLinks?: string[] }>();
      if (!response.ok) {
        const missing = body.missingLinks?.length ? ` Missing: ${body.missingLinks.join(", ")}.` : "";
        throw new Error((body.error || "Uncertainty Sprint answers could not be saved") + missing);
      }
      await loadPaidPlans();
    } catch (caught) {
      setPlanError(caught instanceof Error ? caught.message : "Uncertainty Sprint answers could not be saved");
    } finally {
      setSavingUncertaintyOrderId("");
    }
  };

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
      />
    );

  if (loading)
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-b-blue-600" />
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  if (error || !user)
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-red-600">{error || "Not logged in"}</p>
        <button onClick={onLogout} className="mt-4 font-bold text-blue-600">
          Return to home
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
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Dashboard</h1>
        <button onClick={onLogout} className="font-medium text-red-600">
          Log Out
        </button>
      </div>

      <section className="mb-8 flex flex-col gap-5 rounded-xl bg-ghost-ink p-6 text-white shadow-lantern sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">
            Test before you build
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Ready to test another idea?
          </h2>
          <p className="mt-1 text-sm text-white/75">
            {availableTests} assessment{availableTests === 1 ? "" : "s"}{" "}
            available.
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="min-h-14 rounded-lg bg-ghost-rust px-7 py-4 font-black text-white"
        >
          Start New Assessment
        </button>
      </section>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="font-bold">Account</h2>
          <p className="mt-2 text-gray-700">{user.email}</p>
          <p className="mt-2 text-sm text-gray-500">
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div
          className={`rounded-lg border-l-4 p-6 ${needsToPurchase ? "border-red-400 bg-red-50" : "border-green-400 bg-green-50"}`}
        >
          <div className="text-sm font-bold uppercase text-gray-600">
            Available Tests
          </div>
          <div
            className={`mt-2 text-5xl font-bold ${needsToPurchase ? "text-red-600" : "text-green-600"}`}
          >
            {availableTests}
          </div>
        </div>
      </div>

      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold">Previous Assessments</h2>
        {results.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">
            Your completed assessments will appear here.
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
                    {new Date(item.generatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => void openResult(item.resultId)}
                  disabled={Boolean(openingResultId)}
                  className="rounded-lg border border-blue-300 px-4 py-2 font-bold text-blue-700 disabled:opacity-50"
                >
                  {openingResultId === item.resultId
                    ? "Opening…"
                    : "View Report"}
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
              Purchased products
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Launch Blueprints and Media Networks
            </h2>
          </div>
          <p className="text-xs text-gray-600">
            Private and saved to this account
          </p>
        </div>
        {planError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {planError}
          </p>
        )}
        {paidPlans.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">
            Purchased products will appear here.
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
                ? "Action required"
                : working
                  ? "Building"
                  : plan.status;
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
                            ? "GhostTown Launch Blueprint"
                            : "30-Day Implementation Plan")}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Purchased{" "}
                        {new Date(plan.createdAt).toLocaleDateString()}
                        {plan.planVersion
                          ? ` · Version ${plan.planVersion}`
                          : ""}
                      </p>
                      {awaitingSeeds && (
                        <p className="mt-2 text-sm font-bold text-blue-800">
                          Confirm 2–3 competitor or adjacent-product seeds to
                          start the Media & Distribution Network.
                        </p>
                      )}
                      {working && (
                        <p className="mt-2 text-sm text-amber-700">
                          GhostTown is mapping podcasts, creators, publications,
                          events, reviewers, associations, and partners.
                        </p>
                      )}
                      {isBlueprint && plan.uncertaintySprint && (
                        <div className="mt-4 max-w-3xl rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-900">
                            {plan.uncertaintySprint.durationDays}-Day Uncertainty Sprint
                          </p>
                          <h4 className="mt-1 text-lg font-black text-gray-950">
                            Answer these before GhostTown builds the 30-day plan
                          </h4>
                          <p className="mt-2 text-sm text-gray-700">{plan.uncertaintySprint.objective}</p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">{plan.uncertaintySprint.chainSummary}</p>
                          {plan.uncertaintySprint.status === "open" ? (
                            <div className="mt-4 space-y-4">
                              {plan.uncertaintySprint.blockers.map((blocker) => (
                                <label key={blocker.code} className="block">
                                  <span className="block text-sm font-black text-gray-900">{blocker.question}</span>
                                  <span className="mt-1 block text-xs text-gray-600">What GhostTown needs: {blocker.requiredEvidence}</span>
                                  <textarea
                                    value={uncertaintyAnswers[plan.orderId]?.[blocker.link] || ""}
                                    onChange={(event) => setUncertaintyAnswers((current) => ({
                                      ...current,
                                      [plan.orderId]: {
                                        ...(current[plan.orderId] || {}),
                                        [blocker.link]: event.target.value,
                                      },
                                    }))}
                                    rows={3}
                                    className="mt-2 w-full rounded-lg border-2 border-gray-300 bg-white p-3 text-sm"
                                    placeholder="Write what you observed, decided, or tested."
                                  />
                                </label>
                              ))}
                              <button
                                type="button"
                                onClick={() => void saveUncertaintySprint(plan)}
                                disabled={savingUncertaintyOrderId === plan.orderId}
                                className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                              >
                                {savingUncertaintyOrderId === plan.orderId ? "Saving…" : "Save answers"}
                              </button>
                              <p className="text-xs font-semibold text-amber-950">{plan.uncertaintySprint.unlockRule}</p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm font-bold text-green-800">
                              Answers saved. Retry the Blueprint to run the Strategic Coherence Gate again.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {awaitingSeeds && isBlueprint && (
                        <button
                          onClick={() => setSeedOrderId(plan.orderId)}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white"
                        >
                          Choose research seeds
                        </button>
                      )}
                      {isBlueprint && plan.status === "ready" && (
                        <button
                          onClick={() => setOpenBlueprintOrderId(plan.orderId)}
                          className="rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white"
                        >
                          Open Blueprint
                        </button>
                      )}
                      {plan.status === "ready" && (
                        <button
                          onClick={() => void downloadPlan(plan)}
                          disabled={Boolean(downloadingPlan)}
                          className="rounded-lg border border-ghost-rust px-4 py-2 text-sm font-black text-ghost-rust disabled:opacity-50"
                        >
                          {downloadingPlan === `${plan.orderId}:pdf`
                            ? "Preparing…"
                            : "PDF"}
                        </button>
                      )}
                      {isBlueprint && (plan.status === "failed" || working) && (
                        <button
                          onClick={() => void retryBlueprint(plan.orderId)}
                          disabled={Boolean(retryingOrderId) || plan.uncertaintySprint?.status === "open"}
                          className="rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                        >
                          {retryingOrderId === plan.orderId
                            ? "Checking…"
                            : plan.status === "failed"
                              ? "Retry Blueprint"
                              : "Check / Retry Blueprint"}
                        </button>
                      )}
                    </div>
                  </div>
                  {isBlueprint && plan.status === "ready" && <div className="mt-4"><GetMeLiveUpsell sourceSprintOrderId={plan.orderId} compact /></div>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Get Me Live</p><h2 className="mt-1 text-2xl font-black">Your live businesses</h2></div><p className="text-xs text-gray-600">Saved to your account</p></div>
        {getMeLiveOrders.length === 0 ? <p className="mt-4 text-sm text-gray-600">Your customer page and activity will appear here after you start Get Me Live.</p> : <div className="mt-5 space-y-3">{getMeLiveOrders.map(item => { const liveUrl = item.customDomain ? `https://${item.customDomain}` : item.publicUrl; const live = item.status === "live"; return <article key={item.orderId} className="rounded-xl border border-emerald-200 bg-white p-5"><div className="flex flex-col gap-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">{item.businessName || "Your business"}</h3><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-black uppercase text-emerald-900">{live ? "Live" : "In progress"}</span></div>{liveUrl && <a href={liveUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-bold text-ghost-rust underline">{liveUrl}</a>}<p className="mt-3 text-sm font-bold text-gray-800">{item.recentActivity || (item.leadCount > 0 ? "Someone is interested" : live ? "Your page is ready for customers" : "Keep making your choices")}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.location.assign(`/get-me-live/setup?order_id=${encodeURIComponent(item.orderId)}${live ? "&step=review" : ""}`)} className="rounded-lg bg-ghost-rust px-4 py-3 text-sm font-black text-white">{live ? "Make Changes" : "Keep Going"}</button>{liveUrl && <button type="button" onClick={() => void (navigator.share ? navigator.share({ title: item.businessName || "My business", url: liveUrl }) : navigator.clipboard.writeText(liveUrl))} className="rounded-lg border-2 border-ghost-ink px-4 py-3 text-sm font-black">Share Page</button>}</div></div><div className="grid gap-2 text-sm sm:grid-cols-3"><div className="rounded-xl bg-gray-50 p-3"><strong className="text-xl">{item.leadCount}</strong><span className="block text-gray-600">People interested</span></div>{item.paymentStatus !== "not_requested" && <div className="rounded-xl bg-gray-50 p-3"><strong className="text-xl">{item.salesCount || 0}</strong><span className="block text-gray-600">Sales</span></div>}{Boolean(item.salesValueCents) && <div className="rounded-xl bg-gray-50 p-3"><strong className="text-xl">${((item.salesValueCents || 0) / 100).toFixed(2)}</strong><span className="block text-gray-600">Sales value</span></div>}</div></div></article>; })}</div>}
      </section>

      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="font-bold text-blue-900">Share Rewards</h3>
        <div className="mt-4 grid max-w-md grid-cols-2 gap-6 text-center text-sm">
          <div>
            <span className="text-blue-700">Share Links</span>
            <div className="text-2xl font-bold text-blue-900">
              {user.sharesGiven}
            </div>
          </div>
          <div>
            <span className="text-blue-700">Credits</span>
            <div className="text-2xl font-bold text-blue-900">
              {Math.min(user.shareCredits || 0, 1)}/1
            </div>
          </div>
        </div>
      </div>

      {needsToPurchase && (
        <div className="mb-8 rounded-lg bg-blue-600 p-8 text-center text-white">
          <h3 className="text-2xl font-bold">Ready to test more ideas?</h3>
          <p className="mb-6 mt-2">
            Share a result to unlock another assessment, or get 10 more for
            $14.97.
          </p>
          <button
            onClick={onBuy}
            className="rounded bg-white px-6 py-3 font-bold text-blue-600"
          >
            Buy 10 Assessments — $14.97
          </button>
        </div>
      )}
    </div>
  );
}
