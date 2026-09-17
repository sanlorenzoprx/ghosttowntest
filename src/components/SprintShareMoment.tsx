import { useEffect, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import type { GetMeLiveShareDraft } from "../types/getMeLive";

export default function SprintShareMoment({ sourceSprintOrderId }: { sourceSprintOrderId: string }) {
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
    await navigator.clipboard.writeText(draft.editedText); await save("shared"); setNotice("Post copied.");
  };

  if (!draft || hidden) return null;
  return <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left">
    <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-800">Share your progress</p>
    <h2 className="mt-2 text-xl font-black text-ghost-ink">Your post is almost ready.</h2>
    <p className="mt-1 text-sm text-gray-700">Edit it if you want. Nothing is posted until you share it.</p>
    <textarea value={draft.editedText} onChange={event => setDraft({ ...draft, editedText: event.target.value })} onBlur={() => void save("save")} className="mt-4 min-h-32 w-full rounded-xl border-2 border-gray-500 bg-white p-3" />
    <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void navigator.clipboard.writeText(draft.editedText).then(() => setNotice("Post copied."))} className="rounded-lg border-2 border-ghost-ink px-4 py-2 font-black">Copy</button><button onClick={() => void share()} className="rounded-lg bg-ghost-rust px-4 py-2 font-black text-white">Share</button><button onClick={() => setHidden(true)} className="px-3 py-2 text-sm font-black text-gray-600">Skip</button></div>
    {notice && <p className="mt-2 text-sm font-bold text-emerald-900">{notice}</p>}
  </section>;
}
