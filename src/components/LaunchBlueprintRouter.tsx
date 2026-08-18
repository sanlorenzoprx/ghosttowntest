import { useEffect, useState, type ChangeEvent, type MouseEvent } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import type { GhostTownLaunchBlueprint } from "../types/launchBlueprint";
import type { GhostTownLaunchBlueprintV21 } from "../types/launchBlueprintV21";
import LaunchBlueprintView from "./LaunchBlueprintView";
import LaunchBlueprintViewV21, { type BlueprintV21Payload } from "./LaunchBlueprintViewV21";
import { recordCommercialEvent } from "../lib/commercialAttribution";

export function isBlueprintV21(blueprint: { blueprintVersion?: string }): boolean {
  return blueprint.blueprintVersion === "2.1";
}

function RoutedBlueprintV21({ orderId, onBack, payload }: { orderId: string; onBack: () => void; payload: BlueprintV21Payload }) {
  return <LaunchBlueprintViewV21 orderId={orderId} onBack={onBack} initialPayload={payload} />;
}

export default function LaunchBlueprintRouter({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const [payload, setPayload] = useState<BlueprintV21Payload | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setLegacy(false);
    fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint`), {
      headers: authHeaders(),
    })
      .then(async response => {
        const body = await response.json<BlueprintV21Payload & { error?: string }>();
        if (!response.ok || !body.blueprint) throw new Error(body.error || "Launch Blueprint could not be opened");
        return body;
      })
      .then(body => {
        if (!active) return;
        if (isBlueprintV21(body.blueprint as GhostTownLaunchBlueprint | GhostTownLaunchBlueprintV21)) {
          setPayload(body);
        } else {
          setLegacy(true);
        }
      })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : "Launch Blueprint could not be opened");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [orderId]);

  useEffect(() => {
    if (!payload) return;
    void recordCommercialEvent('blueprint_opened', {
      orderId,
      verdictId: payload.blueprint.sourceVerdictId,
      dedupeKey: `blueprint_opened:${orderId}`
    });
  }, [orderId, payload]);

  const recordRenderedDailyPacket = (container: HTMLDivElement) => {
    if (!payload) return;
    window.setTimeout(() => {
      const match = container.textContent?.match(/Today · Day\s+(\d{1,2})/);
      const dayNumber = match ? Number(match[1]) : 0;
      if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 30) return;
      void recordCommercialEvent('daily_packet_opened', {
        orderId,
        verdictId: payload.blueprint.sourceVerdictId,
        content: `day:${dayNumber}`,
        dedupeKey: `daily_packet_opened:${orderId}:${dayNumber}`
      });
    }, 0);
  };

  const captureClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (target?.textContent?.trim() === 'Today') {
      recordRenderedDailyPacket(event.currentTarget);
      return;
    }
    recordRenderedDailyPacket(event.currentTarget);
  };

  const captureChange = (event: ChangeEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.value === 'today') {
      recordRenderedDailyPacket(event.currentTarget);
      return;
    }
    recordRenderedDailyPacket(event.currentTarget);
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl p-8 text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust" /><p className="mt-4 text-gray-600">Opening your Launch Blueprint...</p></div>;
  }
  if (error) {
    return <div className="mx-auto max-w-xl p-8 text-center"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p><button onClick={onBack} className="mt-5 font-bold text-ghost-rust">Return to Dashboard</button></div>;
  }
  if (payload) return <div onClickCapture={captureClick} onChangeCapture={captureChange}><RoutedBlueprintV21 orderId={orderId} onBack={onBack} payload={payload} /></div>;
  if (legacy) return <LaunchBlueprintView orderId={orderId} onBack={onBack} />;
  return null;
}
