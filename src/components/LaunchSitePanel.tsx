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

export default function LaunchSitePanel({ orderId }: { orderId: string }) {
  const [payload, setPayload] = useState<SitePayload | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const base = `/api/paid-test/orders/${encodeURIComponent(orderId)}/launch-site`;

  const load = useCallback(async () => {
    const response = await fetch(apiUrl(base), { headers: authHeaders() });
    const body = await response.json<SitePayload>();
    if (!response.ok || !body.site)
      throw new Error(body.error || "Launch Site could not be opened");
    setPayload(body);
    if (body.site.status === "published") {
      const leadsResponse = await fetch(apiUrl(`${base}/leads`), {
        headers: authHeaders(),
      });
      if (leadsResponse.ok)
        setLeads(
          ((await leadsResponse.json()) as { leads?: Lead[] }).leads || [],
        );
    }
  }, [base]);

  useEffect(() => {
    void load().catch((caught) =>
      setError(
        caught instanceof Error
          ? caught.message
          : "Launch Site could not be opened",
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
            `Launch Site could not be ${action}ed`,
        );
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Launch Site status could not be changed",
      );
    } finally {
      setBusy("");
    }
  };

  if (!payload?.site)
    return (
      <section className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="text-2xl font-black">Launch Site</h2>
        <p className="mt-3 text-sm text-gray-600">
          {error || "Preparing the D1-backed Launch Site record…"}
        </p>
      </section>
    );
  const published = payload.site.status === "published";
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-black/10 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-ghost-rust">
              Canonical Blueprint Launch Site
            </p>
            <h2 className="mt-1 text-3xl font-black">
              Publish the offer you already approved.
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Copy is rendered directly from Blueprint{" "}
              <strong>{payload.canonicalBlueprintId}</strong>. D1 stores only
              lifecycle state and leads.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}
          >
            {payload.site.status}
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
              Publish checks still open
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
              {payload.publishFailures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 rounded-lg bg-green-50 p-4 text-sm font-bold text-green-800">
            The canonical Blueprint passes the Launch Site publish checks.
          </p>
        )}
        <p className="mt-5 break-all rounded-lg bg-black/5 p-3 text-sm">
          {payload.publicUrl}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {published ? (
            <>
              <a
                href={payload.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-ghost-rust px-5 py-3 font-black text-white"
              >
                Open public site
              </a>
              <button
                onClick={() =>
                  void navigator.clipboard.writeText(payload.publicUrl || "")
                }
                className="rounded-lg border border-gray-300 px-5 py-3 font-black"
              >
                Copy URL
              </button>
              <button
                onClick={() => void changeStatus("unpublish")}
                disabled={Boolean(busy)}
                className="rounded-lg border border-red-300 px-5 py-3 font-black text-red-700 disabled:opacity-50"
              >
                {busy === "unpublish" ? "Unpublishing…" : "Unpublish"}
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
              {busy === "publish" ? "Publishing…" : "Publish Launch Site"}
            </button>
          )}
        </div>
      </section>
      <section className="rounded-xl border border-black/10 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Leads</h2>
            <p className="mt-1 text-sm text-gray-600">
              Owner-only submissions stored in D1.
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
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-black"
            >
              Export CSV
            </a>
          )}
        </div>
        {leads.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No leads yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.lead_id} className="border-t">
                    <td className="p-2">
                      {new Date(lead.created_at).toLocaleDateString()}
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
