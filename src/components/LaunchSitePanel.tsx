import type { Locale } from "../lib/locale";
import { useCallback as useCopyCallback } from "react";
import { useCallback, useEffect, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";

interface SitePayload {
  site?: {
    status: "draft" | "published" | "unpublished";
    publicSlug: string;
    publishedAt: string | null;
    updatedAt: string;
  } | null;
  publicUrl?: string | null;
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


type CopyKey = "Launch Site could not be opened" | "Launch Site status could not be changed" | "Launch Site" | "Loading Launch Site state…" | "Canonical Blueprint Launch Site" | "Ready when you choose to publish." | "Viewing this page is read-only. No Launch Site lifecycle record exists yet; D1 creates one only when you explicitly publish Blueprint" | "Publish checks still open" | "The canonical Blueprint passes the Launch Site publish checks." | "Publishing…" | "Publish Launch Site" | "Publish the offer you already approved." | "Copy is rendered directly from Blueprint" | ". D1 stores only lifecycle state and leads." | "Open public site" | "Copy URL" | "Unpublishing…" | "Unpublish" | "Leads" | "Owner-only submissions stored in D1." | "Export CSV" | "No leads yet." | "Date" | "Name" | "Email" | "Message" | "draft" | "published" | "unpublished" | "publishError" | "unpublishError";
const COPY: Record<Locale, Record<CopyKey, string>> = { en: {
  "Launch Site could not be opened": "Launch Site could not be opened",
  "Launch Site status could not be changed": "Launch Site status could not be changed",
  "Launch Site": "Launch Site",
  "Loading Launch Site state…": "Loading Launch Site state…",
  "Canonical Blueprint Launch Site": "Canonical Blueprint Launch Site",
  "Ready when you choose to publish.": "Ready when you choose to publish.",
  "Viewing this page is read-only. No Launch Site lifecycle record exists yet; D1 creates one only when you explicitly publish Blueprint": "Viewing this page is read-only. No Launch Site lifecycle record exists yet; D1 creates one only when you explicitly publish Blueprint",
  "Publish checks still open": "Publish checks still open",
  "The canonical Blueprint passes the Launch Site publish checks.": "The canonical Blueprint passes the Launch Site publish checks.",
  "Publishing…": "Publishing…",
  "Publish Launch Site": "Publish Launch Site",
  "Publish the offer you already approved.": "Publish the offer you already approved.",
  "Copy is rendered directly from Blueprint": "Copy is rendered directly from Blueprint",
  ". D1 stores only lifecycle state and leads.": ". D1 stores only lifecycle state and leads.",
  "Open public site": "Open public site",
  "Copy URL": "Copy URL",
  "Unpublishing…": "Unpublishing…",
  "Unpublish": "Unpublish",
  "Leads": "Leads",
  "Owner-only submissions stored in D1.": "Owner-only submissions stored in D1.",
  "Export CSV": "Export CSV",
  "No leads yet.": "No leads yet.",
  "Date": "Date",
  "Name": "Name",
  "Email": "Email",
  "Message": "Message",
  "draft": "draft",
  "published": "published",
  "unpublished": "unpublished",
  "publishError": "Launch Site could not be published",
  "unpublishError": "Launch Site could not be unpublished"
}, es: {
  "Launch Site could not be opened": "No pudimos abrir el sitio de lanzamiento",
  "Launch Site status could not be changed": "No pudimos cambiar el estado del sitio de lanzamiento",
  "Launch Site": "Sitio de lanzamiento",
  "Loading Launch Site state…": "Cargando el estado del sitio de lanzamiento…",
  "Canonical Blueprint Launch Site": "Sitio del Blueprint aprobado",
  "Ready when you choose to publish.": "Listo cuando decidas publicar.",
  "Viewing this page is read-only. No Launch Site lifecycle record exists yet; D1 creates one only when you explicitly publish Blueprint": "Ver esta página no cambia nada. El sitio se registra en D1 solo cuando publicas el Blueprint",
  "Publish checks still open": "Revisiones de publicación pendientes",
  "The canonical Blueprint passes the Launch Site publish checks.": "El Blueprint aprobado pasa las revisiones de publicación.",
  "Publishing…": "Publicando…",
  "Publish Launch Site": "Publicar sitio de lanzamiento",
  "Publish the offer you already approved.": "Publica la oferta que ya aprobaste.",
  "Copy is rendered directly from Blueprint": "El texto viene directamente del Blueprint",
  ". D1 stores only lifecycle state and leads.": ". D1 guarda solo el estado del sitio y los contactos.",
  "Open public site": "Abrir sitio público",
  "Copy URL": "Copiar enlace",
  "Unpublishing…": "Retirando publicación…",
  "Unpublish": "Retirar publicación",
  "Leads": "Contactos",
  "Owner-only submissions stored in D1.": "Contactos guardados en D1, visibles solo para el dueño.",
  "Export CSV": "Exportar CSV",
  "No leads yet.": "Todavía no hay contactos.",
  "Date": "Fecha",
  "Name": "Nombre",
  "Email": "Correo electrónico",
  "Message": "Mensaje",
  "draft": "borrador",
  "published": "publicado",
  "unpublished": "sin publicar",
  "publishError": "No pudimos publicar el sitio de lanzamiento",
  "unpublishError": "No pudimos retirar el sitio de lanzamiento"
} };

export default function LaunchSitePanel({ orderId, locale = "en" }: { orderId: string; locale?: Locale }) {
  const t = useCopyCallback((key: CopyKey) => COPY[locale][key], [locale]);
  const [payload, setPayload] = useState<SitePayload | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const base = `/api/paid-test/orders/${encodeURIComponent(orderId)}/launch-site`;

  const load = useCallback(async () => {
    const response = await fetch(apiUrl(base), { headers: authHeaders() });
    const body = await response.json<SitePayload>();
    if (!response.ok)
      throw new Error(body.error || t("Launch Site could not be opened"));
    setPayload(body);
    if (body.site?.status === "published") {
      const leadsResponse = await fetch(apiUrl(`${base}/leads`), {
        headers: authHeaders(),
      });
      if (leadsResponse.ok)
        setLeads(
          ((await leadsResponse.json()) as { leads?: Lead[] }).leads || [],
        );
    } else {
      setLeads([]);
    }
  }, [base, t]);

  useEffect(() => {
    void load().catch((caught) =>
      setError(
        caught instanceof Error
          ? caught.message
          : t("Launch Site could not be opened"),
      ),
    );
  }, [load]);

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
            t(action === "publish" ? "publishError" : "unpublishError"),
        );
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("Launch Site status could not be changed"),
      );
    } finally {
      setBusy("");
    }
  };

  if (!payload)
    return (
      <section className="min-w-0 max-w-full rounded-xl border border-black/10 bg-white p-6">
        <h2 className="text-2xl font-black">{t("Launch Site")}</h2>
        <p className="mt-3 text-sm text-gray-600">
          {error || t("Loading Launch Site state…")}
        </p>
      </section>
    );

  if (!payload.site)
    return (
      <section className="min-w-0 max-w-full rounded-xl border border-black/10 bg-white p-6">
        <p className="text-xs font-black uppercase tracking-wide text-ghost-rust">
          
          {t("Canonical Blueprint Launch Site")}
        </p>
        <h2 className="mt-1 text-3xl font-black">{t("Ready when you choose to publish.")}</h2>
        <p className="mt-3 text-sm text-gray-600">
          
          {t("Viewing this page is read-only. No Launch Site lifecycle record exists yet; D1 creates one only when you explicitly publish Blueprint")}{" "}
          <strong>{payload.canonicalBlueprintId}</strong>.
        </p>
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {payload.publishFailures?.length ? (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-black text-amber-900">{t("Publish checks still open")}</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
              {payload.publishFailures.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : (
          <p className="mt-5 rounded-lg bg-green-50 p-4 text-sm font-bold text-green-800">
            
            {t("The canonical Blueprint passes the Launch Site publish checks.")}
          </p>
        )}
        <button
          onClick={() => void changeStatus("publish")}
          disabled={Boolean(busy) || Boolean(payload.publishFailures?.length)}
          className="mt-5 rounded-lg bg-ghost-rust px-5 py-3 font-black text-white disabled:opacity-50"
        >
          {busy === "publish" ? t("Publishing…") : t("Publish Launch Site")}
        </button>
      </section>
    );

  const published = payload.site.status === "published";
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <section className="min-w-0 max-w-full rounded-xl border border-black/10 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-ghost-rust">
              
              {t("Canonical Blueprint Launch Site")}
            </p>
            <h2 className="mt-1 text-3xl font-black">
              
              {t("Publish the offer you already approved.")}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              
              {t("Copy is rendered directly from Blueprint")}{" "}
              <strong>{payload.canonicalBlueprintId}</strong>{t(". D1 stores only lifecycle state and leads.")}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}
          >
            {t(payload.site.status)}
          </span>
        </div>
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {payload.publishFailures?.length ? (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-black text-amber-900">
              
              {t("Publish checks still open")}
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
              {payload.publishFailures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 rounded-lg bg-green-50 p-4 text-sm font-bold text-green-800">
            
            {t("The canonical Blueprint passes the Launch Site publish checks.")}
          </p>
        )}
        <p className="mt-5 break-all rounded-lg bg-black/5 p-3 text-sm">
          {payload.publicUrl}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {published ? (
            <>
              <a
                href={payload.publicUrl || undefined}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-ghost-rust px-5 py-3 font-black text-white"
              >
                
                {t("Open public site")}
              </a>
              <button
                onClick={() =>
                  void navigator.clipboard.writeText(payload.publicUrl || "")
                }
                className="rounded-lg border border-gray-300 px-5 py-3 font-black"
              >
                
                {t("Copy URL")}
              </button>
              <button
                onClick={() => void changeStatus("unpublish")}
                disabled={Boolean(busy)}
                className="rounded-lg border border-red-300 px-5 py-3 font-black text-red-700 disabled:opacity-50"
              >
                {busy === "unpublish" ? t("Unpublishing…") : t("Unpublish")}
              </button>
            </>
          ) : (
            <button
              onClick={() => void changeStatus("publish")}
              disabled={
                Boolean(busy) || Boolean(payload.publishFailures?.length)
              }
              className="rounded-lg bg-ghost-rust px-5 py-3 font-black text-white disabled:opacity-50"
            >
              {busy === "publish" ? t("Publishing…") : t("Publish Launch Site")}
            </button>
          )}
        </div>
      </section>
      <section className="min-w-0 max-w-full rounded-xl border border-black/10 bg-white p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-black">{t("Leads")}</h2>
            <p className="mt-1 text-sm text-gray-600">
              
              {t("Owner-only submissions stored in D1.")}
            </p>
          </div>
          {leads.length > 0 && (
            <a
              href={apiUrl(`${base}/leads.csv`)}
              onClick={(event) => {
                event.preventDefault();
                fetch(apiUrl(`${base}/leads.csv`), { headers: authHeaders() })
                  .then((response) => response.blob())
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = `launch-site-${orderId}-leads.csv`;
                    anchor.click();
                    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                  });
              }}
              className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-black"
            >
              
              {t("Export CSV")}
            </a>
          )}
        </div>
        {leads.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">{t("No leads yet.")}</p>
        ) : (
          <div className="mt-4 w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">{t("Date")}</th>
                  <th className="p-2">{t("Name")}</th>
                  <th className="p-2">{t("Email")}</th>
                  <th className="p-2">{t("Message")}</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.lead_id} className="border-t">
                    <td className="p-2">
                      {new Date(lead.created_at).toLocaleDateString(locale === "es" ? "es-PR" : "en-US")}
                    </td>
                    <td className="p-2">{lead.name || "—"}</td>
                    <td className="p-2">{lead.email}</td>
                    <td className="p-2">{lead.message || "—"}</td>
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
