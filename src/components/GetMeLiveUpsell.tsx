import { useEffect } from "react";
import { recordCommercialEvent } from "../lib/commercialAttribution";
import type { Locale } from "../lib/locale";

const COPY: Record<Locale, Record<"kicker" | "heading" | "body" | "button", string>> = {
  en: {
    kicker: "Next step",
    heading: "Turn what you learned into a real customer page.",
    body: "We build the starting point from your Sprint. You approve a few choices, connect your account, and go live.",
    button: "See Get Me Live"
  },
  es: {
    kicker: "Próximo paso",
    heading: "Convierte lo que aprendiste en una página real para tus clientes.",
    body: "Armamos el punto de partida con tu Sprint. Tú apruebas unas opciones, conectas tu cuenta y sales en vivo.",
    button: "Ver Get Me Live"
  }
};

interface Props {
  sourceSprintOrderId: string;
  compact?: boolean;
  locale?: Locale;
}

export default function GetMeLiveUpsell({ sourceSprintOrderId, compact = false, locale = "en" }: Props) {
  const t = COPY[locale];
  useEffect(() => {
    void recordCommercialEvent("get_me_live_offer_viewed", {
      orderId: sourceSprintOrderId,
      dedupeKey: `gml_offer:${sourceSprintOrderId}`
    });
  }, [sourceSprintOrderId]);

  const open = () => {
    void recordCommercialEvent("get_me_live_cta_clicked", { orderId: sourceSprintOrderId });
    window.location.assign(`/get-me-live?source_sprint_order_id=${encodeURIComponent(sourceSprintOrderId)}`);
  };

  return <section className={compact ? "rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-4" : "rounded-2xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-sm"}>
    <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">{t.kicker}</p>
    <h2 className={compact ? "mt-1 text-lg font-black" : "mt-2 text-2xl font-black"}>{t.heading}</h2>
    <p className="mt-2 text-sm text-gray-700">{t.body}</p>
    <button type="button" onClick={open} className="mt-4 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white">{t.button}</button>
  </section>;
}
