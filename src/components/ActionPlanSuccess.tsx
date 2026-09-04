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

export default function ActionPlanSuccess({ orderId, onDone }: Props) {
  const [ready, setReady] = useState(false);
  const [needsSeeds, setNeedsSeeds] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);
  const [stage, setStage] = useState(
    "Confirming payment and getting your 30-day plan started...",
  );
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
            "Your 30-day plan and PDF are ready.",
          );
          setError("");
          return;
        }
        if (response.status === 401) {
          setError("Please log in with the email used at checkout.");
          return;
        }
        if (body.status === "awaiting_seeds" || body.status === "paid") {
          setNeedsSeeds(true);
          setStage(
            "Payment received. Review the examples GhostTown found before it finishes your market research.",
          );
          setError("");
          return;
        }
        if (body.status === "researching")
          setStage(
            "Finding where likely customers already pay attention...",
          );
        else if (body.status === "generating")
          setStage(
            "Building your offer, messages, launch website, daily plan, and downloadable files...",
          );
        else if (body.status === "failed") {
          setError(
            body.error ||
              "Blueprint generation needs attention. Return to the dashboard to retry the paid order.",
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
  }, [orderId, pollVersion]);

  const download = async () => {
    setDownloading("pdf");
    setError("");
    try {
      const path = `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.pdf`;
      const response = await fetch(apiUrl(path), { headers: authHeaders() });
      if (!response.ok)
        throw new Error("Your Launch Blueprint is not ready yet");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ghosttown-launch-blueprint-${orderId}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Download failed");
    } finally {
      setDownloading("");
    }
  };

  if (needsSeeds) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern sm:p-10">
          <p className="mb-6 text-center text-xs font-bold uppercase tracking-wider text-ghost-rust">
            Payment received
          </p>
          <CompetitorSeedStep
            orderId={orderId}
            onStarted={() => {
              setNeedsSeeds(false);
              setStage(
                "Finding where likely customers already pay attention...",
              );
              setPollVersion((version) => version + 1);
            }}
            onBack={onDone}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern sm:p-10">
        <p className="text-xs font-bold uppercase tracking-wider text-ghost-rust">
          Payment received
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-ghost-ink">
          {ready
            ? "Your GhostTown Launch Blueprint is ready."
            : "Building your 30-day plan..."}
        </h1>
        <p className="mt-4 text-gray-700">{stage}</p>
        {!ready && !error && (
          <div
            className="mx-auto mt-7 h-10 w-10 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust"
            aria-label="Building your 30-day plan"
          />
        )}
        {error && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {ready && (
          <>
            <div className="mt-7 grid gap-3">
              <button
                onClick={() => void download()}
                disabled={Boolean(downloading)}
                className="rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                {downloading === "pdf" ? "Preparing..." : "PDF"}
              </button>
            </div>
          </>
        )}
        <button
          onClick={onDone}
          className="mt-6 text-sm font-bold text-blue-700 hover:underline"
        >
          {ready
            ? "Open My Interactive Blueprint"
            : "Return to Dashboard"}
        </button>
      </div>
    </main>
  );
}
