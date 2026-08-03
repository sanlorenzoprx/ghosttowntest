import { useCallback, useEffect, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";

interface SitePayload {
  site?: {
    status: "draft" | "published" | "unpublished";
    publicSlug: string;
    publishedAt: string | null;
    updatedAt: string;
  };
  publicUrl?: string;
  publishFailures?: string[];
  canonicalBlueprintId?: string;
  error?: string;
}

interface Lead {
  lead_id: string;
  email: string;
  name: string | null;
  message: string | null;
  source_path: string;
  created_at: string;
}

type SiteLocale = "en" | "es";

const siteCopy = {
  en: {
    stage: "Launch Site",
    loading: "Preparing the D1-backed Launch Site record…",
    errorFallback: "Launch Site could not be opened",
    title: "Launch Site generated from the canonical Blueprint.",
    body: "The site configuration comes from the ready Blueprint. D1 stores lifecycle state and owner-only leads.",
    blueprint: "Canonical Blueprint",
    publicUrl: "Public URL",
    draft: {
      label: "Draft",
      meaning: "A Launch Site record exists, but it is not public.",
      action: "Publish Launch Site"
    },
    unpublished: {
      label: "Unpublished",
      meaning: "This Launch Site is not public. It can be published again when checks pass.",
      action: "Publish Launch Site"
    },
    published: {
      label: "Published",
      meaning: "This Launch Site is public at the URL below.",
      action: "Open public site"
    },
    publishing: "Publishing…",
    unpublishing: "Unpublishing…",
    checksOpen: "Publish checks still open",
    checksPass: "The canonical Blueprint passes the Launch Site publish checks.",
    copyUrl: "Copy URL",
    copied: "Copied",
    unpublish: "Unpublish",
    leads: "Leads",
    leadsBody: "Owner-only submissions stored in D1. No visitor counts or conversion rates are inferred here.",
    noLeads: "No leads yet.",
    exportCsv: "Export CSV",
    date: "Date",
    name: "Name",
    email: "Email",
    message: "Message",
    dash: "—",
    csvFailed: "Lead CSV could not be downloaded",
    copyFailed: "Copy failed",
    publishFailed: "Launch Site could not be published",
    unpublishFailed: "Launch Site could not be unpublished",
    statusChangeFailed: "Launch Site status could not be changed"
  },
  es: {
    stage: "Launch Site",
    loading: "Preparando el registro del Launch Site respaldado por D1…",
    errorFallback: "No se pudo abrir el Launch Site",
    title: "Launch Site generado desde el Blueprint canónico.",
    body: "La configuración del sitio viene del Blueprint listo. D1 guarda el estado de ciclo de vida y leads solo para el dueño.",
    blueprint: "Blueprint canónico",
    publicUrl: "URL pública",
    draft: {
      label: "Borrador",
      meaning: "Existe un registro de Launch Site, pero no es público.",
      action: "Publicar Launch Site"
    },
    unpublished: {
      label: "No publicado",
      meaning: "Este Launch Site no es público. Puede publicarse otra vez cuando las revisiones pasen.",
      action: "Publicar Launch Site"
    },
    published: {
      label: "Publicado",
      meaning: "Este Launch Site es público en la URL de abajo.",
      action: "Abrir sitio público"
    },
    publishing: "Publicando…",
    unpublishing: "Despublicando…",
    checksOpen: "Revisiones de publicación pendientes",
    checksPass: "El Blueprint canónico pasa las revisiones de publicación del Launch Site.",
    copyUrl: "Copiar URL",
    copied: "Copiado",
    unpublish: "Despublicar",
    leads: "Leads",
    leadsBody: "Envíos solo para el dueño guardados en D1. No se infieren visitas ni tasas de conversión aquí.",
    noLeads: "Aún no hay leads.",
    exportCsv: "Exportar CSV",
    date: "Fecha",
    name: "Nombre",
    email: "Correo",
    message: "Mensaje",
    dash: "—",
    csvFailed: "No se pudo descargar el CSV de leads",
    copyFailed: "No se pudo copiar",
    publishFailed: "No se pudo publicar el Launch Site",
    unpublishFailed: "No se pudo despublicar el Launch Site",
    statusChangeFailed: "No se pudo cambiar el estado del Launch Site"
  }
};

function siteLocale(): SiteLocale {
  if (typeof document !== "undefined" && document.documentElement.lang.toLowerCase().startsWith("es")) return "es";
  return "en";
}

function customerError(caught: unknown, fallback: string, locale: SiteLocale): string {
  if (locale === "es") return fallback;
  return caught instanceof Error && caught.message ? caught.message : fallback;
}

function statusClasses(status: "draft" | "published" | "unpublished"): string {
  if (status === "published") return "border-green-200 bg-green-50 text-green-900";
  if (status === "unpublished") return "border-gray-300 bg-gray-100 text-gray-800";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

export default function LaunchSitePanel({ orderId }: { orderId: string }) {
  const locale = siteLocale();
  const text = siteCopy[locale];
  const [payload, setPayload] = useState<SitePayload | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const base = `/api/paid-test/orders/${encodeURIComponent(orderId)}/launch-site`;

  const load = useCallback(async () => {
    const response = await fetch(apiUrl(base), { headers: authHeaders() });
    const body = await response.json<SitePayload>();
    if (!response.ok || !body.site)
      throw new Error(body.error || text.errorFallback);
    setPayload(body);
    setLeads([]);
    if (body.site.status === "published") {
      const leadsResponse = await fetch(apiUrl(`${base}/leads`), {
        headers: authHeaders(),
      });
      if (leadsResponse.ok)
        setLeads(
          ((await leadsResponse.json()) as { leads?: Lead[] }).leads || [],
        );
    }
  }, [base, text.errorFallback]);

  useEffect(() => {
    void load().catch((caught) =>
      setError(customerError(caught, text.errorFallback, locale)),
    );
  }, [load, text.errorFallback]);

  const changeStatus = async (action: "publish" | "unpublish") => {
    setBusy(action);
    setError("");
    try {
      const response = await fetch(apiUrl(`${base}/${action}`), {
        method: "POST",
        headers: authHeaders(),
      });
      const body = await response.json<SitePayload>();
      if (!response.ok)
        throw new Error(
          body.publishFailures?.join(" ") ||
            body.error ||
            (action === "publish" ? text.publishFailed : text.unpublishFailed),
        );
      await load();
    } catch (caught) {
      setError(customerError(caught, text.statusChangeFailed, locale));
    } finally {
      setBusy("");
    }
  };

  const copyUrl = async () => {
    setError("");
    try {
      await navigator.clipboard.writeText(payload?.publicUrl || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch (caught) {
      setError(customerError(caught, text.copyFailed, locale));
    }
  };

  const exportCsv = async () => {
    setError("");
    try {
      const response = await fetch(apiUrl(`${base}/leads.csv`), { headers: authHeaders() });
      if (!response.ok) throw new Error(text.csvFailed);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `launch-site-${orderId}-leads.csv`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(customerError(caught, text.csvFailed, locale));
    }
  };

  if (!payload?.site)
    return (
      <section className="rounded-xl border border-black/10 bg-white p-6" aria-labelledby="launch-site-title">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-ghost-rust">{text.stage}</p>
        <h2 id="launch-site-title" className="mt-2 text-2xl font-black">{text.title}</h2>
        <p className="mt-3 break-words text-sm leading-6 text-gray-600">
          {error || text.loading}
        </p>
      </section>
    );
  const status = payload.site.status;
  const statusText = text[status];
  const published = status === "published";
  const publishBlocked = Boolean(payload.publishFailures?.length);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="launch-site-title">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-ghost-rust">{text.stage}</p>
            <h2 id="launch-site-title" className="mt-1 break-words text-3xl font-black">{text.title}</h2>
            <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-gray-600">{text.body}</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${statusClasses(status)}`}>
            <span aria-hidden="true">{published ? "✓" : status === "draft" ? "•" : "–"}</span>
            {statusText.label}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 rounded-lg border border-gray-200 bg-[#fbfaf7] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{text.blueprint}</p>
            <p className="mt-2 break-all text-sm font-bold text-ghost-ink">{payload.canonicalBlueprintId || text.dash}</p>
          </div>
          <div className="min-w-0 rounded-lg border border-gray-200 bg-[#fbfaf7] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{text.publicUrl}</p>
            <p className="mt-2 break-all text-sm font-bold text-ghost-ink">{payload.publicUrl || text.dash}</p>
          </div>
        </div>

        <p className={`mt-5 rounded-lg border p-4 text-sm font-bold leading-6 ${statusClasses(status)}`}>{statusText.meaning}</p>

        {error && (
          <p className="mt-4 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {payload.publishFailures?.length ? (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-black text-amber-900">{text.checksOpen}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
              {payload.publishFailures.map((item) => (
                <li key={item} className="break-words">{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
            {text.checksPass}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {published ? (
            <>
              <a
                href={payload.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="min-h-11 rounded-lg bg-ghost-rust px-5 py-3 text-center font-black text-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/40"
              >
                {statusText.action}
              </a>
              <button type="button" onClick={() => void copyUrl()} className="min-h-11 rounded-lg border border-gray-300 px-5 py-3 font-black focus:outline-none focus:ring-2 focus:ring-ghost-rust/30">
                {copied ? text.copied : text.copyUrl}
              </button>
              <button type="button" onClick={() => void changeStatus("unpublish")} disabled={Boolean(busy)} className="min-h-11 rounded-lg border border-red-300 px-5 py-3 font-black text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50">
                {busy === "unpublish" ? text.unpublishing : text.unpublish}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => void changeStatus("publish")} disabled={Boolean(busy) || publishBlocked} className="min-h-11 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 disabled:opacity-50">
              {busy === "publish" ? text.publishing : statusText.action}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="launch-site-leads">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="launch-site-leads" className="text-2xl font-black">{text.leads}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">{text.leadsBody}</p>
          </div>
          {leads.length > 0 && (
            <button type="button" onClick={() => void exportCsv()} className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-black focus:outline-none focus:ring-2 focus:ring-ghost-rust/30">
              {text.exportCsv}
            </button>
          )}
        </div>
        {leads.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">{text.noLeads}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[38rem] text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">{text.date}</th>
                  <th className="p-2">{text.name}</th>
                  <th className="p-2">{text.email}</th>
                  <th className="p-2">{text.message}</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.lead_id} className="border-t">
                    <td className="p-2">{new Date(lead.created_at).toLocaleDateString()}</td>
                    <td className="break-words p-2">{lead.name || text.dash}</td>
                    <td className="break-all p-2">{lead.email}</td>
                    <td className="break-words p-2">{lead.message || text.dash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
