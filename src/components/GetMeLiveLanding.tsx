import { useEffect, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import { recordCommercialEvent } from "../lib/commercialAttribution";
import { DEFAULT_GET_ME_LIVE_DISPLAY_PRICE } from "../lib/getMeLiveOffer";
import type { Locale } from "../lib/locale";

const COPY: Record<Locale, Record<"needBlueprint" | "checkoutFailed" | "noDestination" | "b1" | "b2" | "b3" | "b4" | "b5" | "b6" | "b7" | "b8" | "back" | "heading" | "intro" | "opening" | "cta" | "setupPrice" | "extraFees" | "whatYouGet" | "ownTitle" | "ownBody" | "extraTitle" | "extraBody" | "doneTitle" | "doneBody", string>> = {
  en: {
    needBlueprint: "Open Get Me Live from a finished Blueprint so we know what to build.",
    checkoutFailed: "Checkout could not be opened",
    noDestination: "Checkout did not return a destination",
    b1: "Your first page built from your Sprint",
    b2: "A business name and website address",
    b3: "Your logo, photos, and offer",
    b4: "A way for customers to contact you",
    b5: "A business email if you want one",
    b6: "Stripe payments if you want them",
    b7: "A site in a Cloudflare account you own",
    b8: "A ready-to-share launch post",
    back: "← Back",
    heading: "Turn your business idea into a real page customers can use.",
    intro: "GhostTown already knows what you are testing. We build the first version for you. You choose the name, look, and offer. Then we help you put it online.",
    opening: "Opening checkout…",
    cta: "Get My Business Live",
    setupPrice: "GhostTown setup:",
    extraFees: "Domain and Stripe fees, if any, are separate.",
    whatYouGet: "What you get",
    ownTitle: "You own your site.",
    ownBody: "Your website lives in your Cloudflare account. GhostTown helps set it up and manage it. You can remove our access later.",
    extraTitle: "What may cost extra",
    extraBody: "Your website goes live on a free Cloudflare address first. If you later want your own domain, you buy it from Cloudflare at their price. Stripe charges its normal payment fees.",
    doneTitle: "Most of the work is already done.",
    doneBody: "After payment, we open your starting page. You review a few choices, connect your account, and go live."
  },
  es: {
    needBlueprint: "Abre Get Me Live desde un Blueprint terminado para que sepamos qué construir.",
    checkoutFailed: "No pudimos abrir el pago",
    noDestination: "El pago no nos dijo a dónde llevarte",
    b1: "Tu primera página, hecha con tu Sprint",
    b2: "Un nombre para tu negocio y una dirección web",
    b3: "Tu logo, tus fotos y tu oferta",
    b4: "Una forma para que los clientes te contacten",
    b5: "Un correo del negocio si lo quieres",
    b6: "Pagos con Stripe si los quieres",
    b7: "Una página en una cuenta de Cloudflare que es tuya",
    b8: "Una publicación de lanzamiento lista para compartir",
    back: "← Atrás",
    heading: "Convierte tu idea de negocio en una página real que tus clientes pueden usar.",
    intro: "GhostTown ya sabe lo que estás probando. Nosotros armamos la primera versión. Tú escoges el nombre, el estilo y la oferta. Después te ayudamos a ponerla en línea.",
    opening: "Abriendo el pago…",
    cta: "Poner mi negocio en vivo",
    setupPrice: "Configuración de GhostTown:",
    extraFees: "El dominio y los cargos de Stripe, si los hay, van aparte.",
    whatYouGet: "Lo que recibes",
    ownTitle: "Tu página es tuya.",
    ownBody: "Tu página web vive en tu cuenta de Cloudflare. GhostTown te ayuda a configurarla y manejarla. Puedes quitarnos el acceso más adelante.",
    extraTitle: "Lo que puede costar aparte",
    extraBody: "Tu página sale primero en una dirección gratis de Cloudflare. Si después quieres tu propio dominio, lo compras en Cloudflare al precio de ellos. Stripe cobra sus cargos normales por cada pago.",
    doneTitle: "Casi todo el trabajo ya está hecho.",
    doneBody: "Después del pago, abrimos tu página inicial. Revisas unas opciones, conectas tu cuenta y sales en vivo."
  }
};

interface Props {
  sourceSprintOrderId: string;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onBack: () => void;
  locale?: Locale;
}

export default function GetMeLiveLanding({ sourceSprintOrderId, isLoggedIn, onLoginClick, onBack, locale = "en" }: Props) {
  const t = COPY[locale];
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
      setError(t.needBlueprint);
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
      if (!response.ok) throw new Error(body.error || t.checkoutFailed);
      void recordCommercialEvent("get_me_live_checkout_started", { orderId: body.orderId || sourceSprintOrderId });
      if (body.nextUrl) window.location.assign(body.nextUrl);
      else if (body.sessionUrl) window.location.assign(body.sessionUrl);
      else if (body.orderId) window.location.assign(`/get-me-live/setup?order_id=${encodeURIComponent(body.orderId)}`);
      else throw new Error(t.noDestination);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.checkoutFailed);
      setBusy(false);
    }
  };

  const benefits = [
    t.b1,
    t.b2,
    t.b3,
    t.b4,
    t.b5,
    t.b6,
    t.b7,
    t.b8
  ];
  return <main className="bg-ghost-paper">
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
      <button type="button" onClick={onBack} className="text-sm font-black text-ghost-rust">{t.back}</button>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-rust">Get Me Live</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-black leading-tight text-ghost-ink sm:text-6xl">{t.heading}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-700">{t.intro}</p>
          <button type="button" onClick={() => void checkout()} disabled={busy} className="mt-8 min-h-14 rounded-xl bg-ghost-rust px-7 py-4 text-lg font-black text-white shadow-lantern disabled:opacity-50">
            {busy ? t.opening : t.cta}
          </button>
          <p className="mt-3 text-sm font-semibold text-gray-600">{t.setupPrice} {DEFAULT_GET_ME_LIVE_DISPLAY_PRICE}. {t.extraFees}</p>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{error}</p>}
        </div>
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-lantern sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">{t.whatYouGet}</p>
          <div className="mt-5 grid gap-3">{benefits.map(item => <div key={item} className="flex gap-3 rounded-xl bg-ghost-sand/50 p-3"><span aria-hidden="true" className="font-black text-emerald-700">✓</span><span className="font-bold text-ghost-ink">{item}</span></div>)}</div>
        </div>
      </div>
    </section>

    <section className="border-y border-black/10 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-2">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-2xl font-black text-ghost-ink">{t.ownTitle}</h2>
          <p className="mt-3 text-gray-700">{t.ownBody}</p>
        </article>        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-2xl font-black text-ghost-ink">{t.extraTitle}</h2>
          <p className="mt-3 text-gray-700">{t.extraBody}</p>
        </article>
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-14 text-center">
      <h2 className="text-3xl font-black text-ghost-ink">{t.doneTitle}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-gray-700">{t.doneBody}</p>
      <button type="button" onClick={() => void checkout()} disabled={busy} className="mt-7 rounded-xl bg-ghost-rust px-7 py-4 font-black text-white disabled:opacity-50">{t.cta}</button>
    </section>
  </main>;
}
