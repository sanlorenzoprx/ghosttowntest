import { useEffect } from "react";
import { recordCommercialEvent } from "../lib/commercialAttribution";

interface Props {
  sourceSprintOrderId: string;
  compact?: boolean;
}

export default function GetMeLiveUpsell({ sourceSprintOrderId, compact = false }: Props) {
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
    <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">Next step</p>
    <h2 className={compact ? "mt-1 text-lg font-black" : "mt-2 text-2xl font-black"}>Turn what you learned into a real customer page.</h2>
    <p className="mt-2 text-sm text-gray-700">We build the starting point from your Sprint. You approve a few choices, connect your account, and go live.</p>
    <button type="button" onClick={open} className="mt-4 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white">See Get Me Live</button>
  </section>;
}
