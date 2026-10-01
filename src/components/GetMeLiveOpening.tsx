import { useEffect, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import { preferredPublicUrl } from "../lib/getMeLiveOffer";
import type { GetMeLiveOrder } from "../types/getMeLive";

interface Props { orderId: string; }
export interface OpeningVerifyResult { status?: string; verified?: boolean; pending?: boolean; failure?: string; }
export type OpeningStep = "wait" | "open" | "slow";

export const OPENING_POLL_MS = 3000;
export const OPENING_GIVE_UP_MS = 3 * 60 * 1000;

/**
 * Decides what the opening tab does after one verify call. The tab opens before
 * the publish request has claimed an attempt, so an early "nothing pending" or a
 * failure left over from an earlier try is not this click's result: a failure
 * only counts once this tab has seen the attempt running.
 */
export function openingStep(result: OpeningVerifyResult | null, sawPending: boolean, elapsedMs: number): OpeningStep {
  if (result?.verified && result.status === "live") return "open";
  if (elapsedMs >= OPENING_GIVE_UP_MS) return "slow";
  if (sawPending && result && !result.pending && (result.failure || result.status === "failed")) return "slow";
  return "wait";
}

export default function GetMeLiveOpening({ orderId }: Props) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!orderId) { setSlow(true); return; }
    const started = Date.now();
    let sawPending = false;
    let active = true;
    let timer = 0;
    const tick = async () => {
      let result: OpeningVerifyResult | null = null;
      try {
        const response = await fetch(apiUrl(`/api/get-me-live/orders/${encodeURIComponent(orderId)}/publish/verify`), { method: "POST", headers: authHeaders() });
        if (response.ok) result = await response.json<OpeningVerifyResult>();
      } catch { /* keep waiting; the workspace and server settle the attempt */ }
      if (!active) return;
      if (result?.pending) sawPending = true;
      const step = openingStep(result, sawPending, Date.now() - started);
      if (step === "open") {
        try {
          const response = await fetch(apiUrl(`/api/get-me-live/orders/${encodeURIComponent(orderId)}`), { headers: authHeaders() });
          const data = response.ok ? await response.json<{ order: GetMeLiveOrder }>() : null;
          const url = data ? preferredPublicUrl(data.order) || data.order.publicUrl : undefined;
          if (url && active) { window.location.replace(url); return; }
        } catch { /* fall through to the slow message */ }
        if (active) setSlow(true);
        return;
      }
      if (step === "slow") { setSlow(true); return; }
      timer = window.setTimeout(() => void tick(), OPENING_POLL_MS);
    };
    void tick();
    return () => { active = false; window.clearTimeout(timer); };
  }, [orderId]);

  const back = `/get-me-live/setup?order_id=${encodeURIComponent(orderId)}&step=review`;
  return <main className="mx-auto max-w-xl px-4 py-20 text-center">
    {slow ? <>
      <h1 className="text-3xl font-black text-ghost-ink">This is taking longer than usual.</h1>
      <p className="mt-3 text-gray-700">GhostTown will keep checking. You can close this tab; your website link will be on your Get Me Live page.</p>
      <a href={back} className="mt-6 inline-block rounded-xl bg-ghost-rust px-6 py-3 font-black text-white">Back to GhostTown</a>
    </> : <>
      <h1 className="text-3xl font-black text-ghost-ink">Putting your website online…</h1>
      <p className="mt-3 text-gray-700">This tab will open your website as soon as it is ready. This can take a minute.</p>
    </>}
  </main>;
}
