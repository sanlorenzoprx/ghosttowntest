import { useEffect, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import type { GetMeLiveShareDraft } from "../types/getMeLive";
import type { Locale } from "../lib/locale";

const COPY: Record<Locale, { copied: string; kicker: string; heading: string; body: string; copy: string; share: string; skip: string }> = {
  en: {
    copied: "Post copied.",
    kicker: "Share your progress",
    heading: "Your post is almost ready.",
    body: "Edit it if you want. Nothing is posted until you share it.",
    copy: "Copy",
    share: "Share",
    skip: "Skip",
  },
  es: {
    copied: "Copiamos tu post.",
    kicker: "Comparte tu progreso",
    heading: "Tu post está casi listo.",
    body: "Edítalo si quieres. No se publica nada hasta que tú lo compartas.",
    copy: "Copiar",
    share: "Compartir",
    skip: "Ahora no",
  },
};

export default function SprintShareMoment({ sourceSprintOrderId, locale = "en" }: { sourceSprintOrderId: string; locale?: Locale }) {
  const copy = COPY[locale];
  const [draft, setDraft] = useState<GetMeLiveShareDraft | null>(null);
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch(apiUrl(`/api/get-me-live/sprints/${encodeURIComponent(sourceSprintOrderId)}/share-draft`), { headers: authHeaders() })
      .then(response => response.ok ? response.json<{ draft?: GetMeLiveShareDraft }>() : Promise.reject())
      .then(data => setDraft(data.draft || null))
      .catch(() => setDraft(null));
  }, [sourceSprintOrderId]);

  const save = async (action: "save" | "shared") => {
    if (!draft) return;
    await fetch(apiUrl(`/api/get-me-live/sprints/${encodeURIComponent(sourceSprintOrderId)}/share-draft`), {
      method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft.editedText, action })
    });
  };
  const share = async () => {
    if (!draft) return;
    if (navigator.share) {
      try { await navigator.share({ text: draft.editedText }); await save("shared"); return; } catch { /* Copy below. */ }
    }
    await navigator.clipboard.writeText(draft.editedText); await save("shared"); setNotice(copy.copied);
  };

  if (!draft || hidden) return null;
  return <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left">
    <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-800">{copy.kicker}</p>
    <h2 className="mt-2 text-xl font-black text-ghost-ink">{copy.heading}</h2>
    <p className="mt-1 text-sm text-gray-700">{copy.body}</p>
    <textarea value={draft.editedText} onChange={event => setDraft({ ...draft, editedText: event.target.value })} onBlur={() => void save("save")} className="mt-4 min-h-32 w-full rounded-xl border-2 border-gray-500 bg-white p-3" />
    <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void navigator.clipboard.writeText(draft.editedText).then(() => setNotice(copy.copied))} className="rounded-lg border-2 border-ghost-ink px-4 py-2 font-black">{copy.copy}</button><button onClick={() => void share()} className="rounded-lg bg-ghost-rust px-4 py-2 font-black text-white">{copy.share}</button><button onClick={() => setHidden(true)} className="px-3 py-2 text-sm font-black text-gray-600">{copy.skip}</button></div>
    {notice && <p className="mt-2 text-sm font-bold text-emerald-900">{notice}</p>}
  </section>;
}
