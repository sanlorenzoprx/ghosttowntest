import { useEffect, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import { recordCommercialEvent } from "../lib/commercialAttribution";
import { DEFAULT_GET_ME_LIVE_DISPLAY_PRICE } from "../lib/getMeLiveOffer";

interface Props {
  sourceSprintOrderId: string;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onBack: () => void;
}

export default function GetMeLiveLanding({ sourceSprintOrderId, isLoggedIn, onLoginClick, onBack }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sourceSprintOrderId) void recordCommercialEvent("get_me_live_offer_viewed", {
      orderId: sourceSprintOrderId,
      dedupeKey: `gml_offer:${sourceSprintOrderId}`
    });
  }, [sourceSprintOrderId]);

  const checkout = async () => {
    if (!isLoggedIn) { onLoginClick(); return; }
    if (!sourceSprintOrderId) {
      setError("Open Get Me Live from a finished Blueprint so we know what to build.");
      return;
    }    setBusy(true);
    setError("");
    void recordCommercialEvent("get_me_live_cta_clicked", { orderId: sourceSprintOrderId });
    try {
      const response = await fetch(apiUrl("/api/get-me-live/checkout"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ sourceSprintOrderId })
      });
      const body = await response.json<{ sessionUrl?: string; nextUrl?: string; orderId?: string; error?: string }>();
      if (!response.ok) throw new Error(body.error || "Checkout could not be opened");
      void recordCommercialEvent("get_me_live_checkout_started", { orderId: body.orderId || sourceSprintOrderId });
      if (body.nextUrl) window.location.assign(body.nextUrl);
      else if (body.sessionUrl) window.location.assign(body.sessionUrl);
      else if (body.orderId) window.location.assign(`/get-me-live/setup?order_id=${encodeURIComponent(body.orderId)}`);
      else throw new Error("Checkout did not return a destination");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not be opened");
      setBusy(false);
    }
  };

  const benefits = [
    "Your first page built from your Sprint",
    "A business name and website address",
    "Your logo, photos, and offer",
    "A way for customers to contact you",
    "A business email if you want one",
    "Stripe payments if you want them",
    "A site in a Cloudflare account you own",
    "A ready-to-share launch post"
  ];
  return <main className="bg-ghost-paper">
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
      <button type="button" onClick={onBack} className="text-sm font-black text-ghost-rust">← Back</button>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-rust">Get Me Live</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-black leading-tight text-ghost-ink sm:text-6xl">Turn your business idea into a real page customers can use.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-700">GhostTown already knows what you are testing. We build the first version for you. You choose the name, look, and offer. Then we help you put it online.</p>
          <button type="button" onClick={() => void checkout()} disabled={busy} className="mt-8 min-h-14 rounded-xl bg-ghost-rust px-7 py-4 text-lg font-black text-white shadow-lantern disabled:opacity-50">
            {busy ? "Opening checkout…" : "Get My Business Live"}
          </button>
          <p className="mt-3 text-sm font-semibold text-gray-600">GhostTown setup: {DEFAULT_GET_ME_LIVE_DISPLAY_PRICE}. Domain and Stripe fees, if any, are separate.</p>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{error}</p>}
        </div>
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-lantern sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">What you get</p>
          <div className="mt-5 grid gap-3">{benefits.map(item => <div key={item} className="flex gap-3 rounded-xl bg-ghost-sand/50 p-3"><span aria-hidden="true" className="font-black text-emerald-700">✓</span><span className="font-bold text-ghost-ink">{item}</span></div>)}</div>
        </div>
      </div>
    </section>

    <section className="border-y border-black/10 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-2">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-2xl font-black text-ghost-ink">You own your site.</h2>
          <p className="mt-3 text-gray-700">Your website lives in your Cloudflare account. GhostTown helps set it up and manage it. You can remove our access later.</p>
        </article>        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-2xl font-black text-ghost-ink">What may cost extra</h2>
          <p className="mt-3 text-gray-700">Your website goes live on a free Cloudflare address first. If you later want your own domain, you buy it from Cloudflare at their price. Stripe charges its normal payment fees.</p>
        </article>
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-14 text-center">
      <h2 className="text-3xl font-black text-ghost-ink">Most of the work is already done.</h2>
      <p className="mx-auto mt-3 max-w-2xl text-gray-700">After payment, we open your starting page. You review a few choices, connect your account, and go live.</p>
      <button type="button" onClick={() => void checkout()} disabled={busy} className="mt-7 rounded-xl bg-ghost-rust px-7 py-4 font-black text-white disabled:opacity-50">Get My Business Live</button>
    </section>
  </main>;
}
