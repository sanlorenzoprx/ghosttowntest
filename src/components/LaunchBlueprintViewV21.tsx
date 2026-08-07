import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import type { GhostTownLaunchBlueprintV21 } from "../types/launchBlueprintV21";
import LaunchSitePanel from "./LaunchSitePanel";

export type EvidenceStrength = "strong" | "moderate" | "early" | "weak";
export type PrimaryConstraint = "customer" | "urgency" | "access" | "trust" | "offer" | "fulfillment" | "price" | "message" | "missing_evidence" | "none";

export interface EvidenceLedgerEntryV21 {
  entryId: string;
  blueprintId?: string;
  blueprintVersion?: string;
  actionId?: string;
  checkpointId?: string;
  createdAt?: string;
  contactOrChannel: string;
  date: string;
  action: string;
  response: string;
  customerLanguage: string;
  alternativeMentioned: string;
  objection: string;
  commitmentOffered: string;
  commitmentReceived: string;
  revenueCents: number;
  founderMinutes: number;
  variableCostCents: number;
  followUpDate: string;
  evidenceStrength: EvidenceStrength;
  sourceNote: string;
}

export interface CheckpointReviewV21 {
  dayNumber: 7 | 14 | 21 | 30;
  completedAt: string;
  answers: Record<string, string>;
  evidenceSummary: string;
  strongestEvidence: EvidenceStrength | "none";
  primaryConstraint: PrimaryConstraint;
  nextAction: string;
  blueprintVersionId?: string;
}

export interface ReminderPreferencesV21 {
  dailyAction: boolean;
  followUps: boolean;
  checkpoints: boolean;
  preferredHourLocal: number;
}

export interface ScheduledReminderV21 {
  reminderId: string;
  blueprintId: string;
  blueprintVersion: string;
  kind: "daily_action" | "follow_up" | "checkpoint";
  dueAt: string;
  actionId?: string;
  entryId?: string;
  checkpointId?: string;
  status: "pending" | "done" | "dismissed";
}

export interface BlueprintProgressV21 {
  completedDays: number[];
  evidenceNotes: Record<string, string>;
  evidenceLedger: EvidenceLedgerEntryV21[];
  checkpointReviews: CheckpointReviewV21[];
  reminderPreferences?: ReminderPreferencesV21;
  scheduledReminders?: ScheduledReminderV21[];
  metrics: {
    outreachSent: number;
    replies: number;
    interviews: number;
    qualifiedConversations: number;
    commitments: number;
    revenueCents: number;
    founderMinutes: number;
    variableCostCents: number;
    leads: number;
  };
  finalDecision?: string;
  updatedAt: string;
}

export interface BlueprintV21Payload {
  blueprint: GhostTownLaunchBlueprintV21;
  progress: BlueprintProgressV21;
  research: {
    provider: string;
    model: string;
    completedAt: string;
    attemptedSourceCount: number;
    successfulSourceCount: number;
    sourceTypeCount: number;
    verifiedChannelCount: number;
    [key: string]: unknown;
  };
}

type Tab = "overview" | "audit" | "revenue" | "fulfillment" | "today" | "record" | "followups" | "evidence" | "review" | "reminders" | "calendar" | "site";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "today", label: "Today" },
  { id: "record", label: "Record Results" },
  { id: "followups", label: "Follow-ups" },
  { id: "evidence", label: "Evidence" },
  { id: "review", label: "Weekly Review" },
  { id: "reminders", label: "Reminders" },
  { id: "audit", label: "Starting State" },
  { id: "revenue", label: "First Revenue" },
  { id: "fulfillment", label: "Fulfillment" },
  { id: "calendar", label: "30-Day Calendar" },
  { id: "site", label: "Launch Site" },
];

const emptyEntry = (): EvidenceLedgerEntryV21 => ({
  entryId: "",
  contactOrChannel: "",
  date: new Date().toISOString().slice(0, 10),
  action: "",
  response: "",
  customerLanguage: "",
  alternativeMentioned: "",
  objection: "",
  commitmentOffered: "",
  commitmentReceived: "",
  revenueCents: 0,
  founderMinutes: 0,
  variableCostCents: 0,
  followUpDate: "",
  evidenceStrength: "weak",
  sourceNote: "",
});

export function upsertEvidenceEntry(entries: EvidenceLedgerEntryV21[], entry: EvidenceLedgerEntryV21): EvidenceLedgerEntryV21[] {
  const next = entries.filter(item => item.entryId !== entry.entryId);
  next.push(entry);
  return next.sort((a, b) => `${b.date}:${b.createdAt || ""}`.localeCompare(`${a.date}:${a.createdAt || ""}`));
}

export function upsertCheckpointReview(reviews: CheckpointReviewV21[], review: CheckpointReviewV21): CheckpointReviewV21[] {
  return [...reviews.filter(item => item.dayNumber !== review.dayNumber), review].sort((a, b) => a.dayNumber - b.dayNumber);
}

function dollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

function truthBadge(label: string) {
  const symbol = label === "Verified" ? "✓" : label === "Inferred" ? "≈" : "?";
  const style = label === "Verified" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : label === "Inferred" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-300 bg-slate-50 text-slate-800";
  return <span aria-label={`Truth label: ${label}`} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black ${style}`}><span aria-hidden="true">{symbol}</span>{label}</span>;
}

function FieldList({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="font-black">{title}</h3><ul className="mt-2 space-y-2 text-sm text-gray-700">{items.map((item, index) => <li key={`${title}-${index}`}>• {item}</li>)}</ul></div>;
}

function PilotBrief({ blueprint, onCopy }: { blueprint: GhostTownLaunchBlueprintV21; onCopy: (text: string) => void }) {
  const brief = blueprint.foundingCustomerPilotBrief;
  const text = [`Founding Customer Pilot Brief`, `Problem: ${brief.problem}`, `Scope: ${brief.scope}`, `Deliverables:`, ...brief.deliverables.map(item => `- ${item}`), `Timeline: ${brief.timeline}`, `Price: ${brief.price}`, `Buyer responsibilities:`, ...brief.buyerResponsibilities.map(item => `- ${item}`), `Proof boundary: ${brief.proofBoundary}`, `Next step: ${brief.nextStep}`].join("\n");
  return <article className="rounded-2xl border border-black/10 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-ghost-rust">Commercial one-pager</p><h2 className="mt-1 text-2xl font-black">Founding Customer Pilot Brief</h2></div><button onClick={() => onCopy(text)} className="rounded-lg border border-ghost-rust px-3 py-2 text-sm font-black text-ghost-rust">Copy brief</button></div><dl className="mt-5 grid gap-4 md:grid-cols-2"><div><dt className="font-black">Problem</dt><dd className="mt-1 text-sm text-gray-700">{brief.problem}</dd></div><div><dt className="font-black">Scope</dt><dd className="mt-1 text-sm text-gray-700">{brief.scope}</dd></div><div><dt className="font-black">Timeline</dt><dd className="mt-1 text-sm text-gray-700">{brief.timeline}</dd></div><div><dt className="font-black">Price</dt><dd className="mt-1 text-sm text-gray-700">{brief.price}</dd></div></dl><div className="mt-5 grid gap-5 md:grid-cols-2"><FieldList title="Deliverables" items={brief.deliverables} /><FieldList title="Buyer responsibilities" items={brief.buyerResponsibilities} /></div><p className="mt-5 rounded-xl bg-[#fff7f2] p-4 text-sm"><strong>Proof boundary:</strong> {brief.proofBoundary}</p></article>;
}

export default function LaunchBlueprintViewV21({ orderId, onBack, initialPayload }: { orderId: string; onBack: () => void; initialPayload: BlueprintV21Payload }) {
  const [payload, setPayload] = useState(initialPayload);
  const [tab, setTab] = useState<Tab>("overview");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [saveError, setSaveError] = useState("");
  const [entryDraft, setEntryDraft] = useState<EvidenceLedgerEntryV21>(emptyEntry());
  const [checkpointDrafts, setCheckpointDrafts] = useState<Record<number, Partial<CheckpointReviewV21>>>({});
  const debounceRef = useRef<number | null>(null);
  const pendingKey = `ghosttown-blueprint-progress-pending:${orderId}`;
  const { blueprint, progress } = payload;

  useEffect(() => {
    const pending = localStorage.getItem(pendingKey);
    if (!pending) return;
    try {
      const parsed = JSON.parse(pending) as BlueprintProgressV21;
      setPayload(current => ({ ...current, progress: parsed }));
      setSaveState("error");
      setSaveError("Unsaved local changes were restored. Retry to sync them to your account.");
    } catch {
      localStorage.removeItem(pendingKey);
    }
  }, [pendingKey]);

  const persist = async (next: BlueprintProgressV21) => {
    setPayload(current => ({ ...current, progress: next }));
    localStorage.setItem(pendingKey, JSON.stringify(next));
    setSaveState("saving");
    setSaveError("");
    try {
      const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/progress`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const body = await response.json<{ progress?: BlueprintProgressV21; error?: string }>();
      if (!response.ok || !body.progress) throw new Error(body.error || "Execution progress could not be saved");
      localStorage.removeItem(pendingKey);
      setPayload(current => ({ ...current, progress: body.progress! }));
      setSaveState("saved");
    } catch (caught) {
      setSaveState("error");
      setSaveError(caught instanceof Error ? caught.message : "Execution progress could not be saved");
    }
  };

  const debouncedNote = (key: string, value: string) => {
    const next = { ...progress, evidenceNotes: { ...progress.evidenceNotes, [key]: value } };
    setPayload(current => ({ ...current, progress: next }));
    localStorage.setItem(pendingKey, JSON.stringify(next));
    setSaveState("saving");
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void persist(next), 650);
  };

  const completed = new Set(progress.completedDays || []);
  const todayAction = blueprint.dailyCalendar.find(day => !completed.has(day.dayNumber)) || blueprint.dailyCalendar[29];
  const followUps = useMemo(() => (progress.evidenceLedger || []).filter(item => item.followUpDate && item.commitmentReceived.toLowerCase() !== "closed" ).sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)), [progress.evidenceLedger]);
  const reminders = progress.scheduledReminders || [];
  const prefs = progress.reminderPreferences || { dailyAction: true, followUps: true, checkpoints: true, preferredHourLocal: 9 };
  const completionPercent = Math.round(((progress.completedDays || []).length / 30) * 100);

  const markDay = (dayNumber: number) => {
    const set = new Set(progress.completedDays || []);
    set.has(dayNumber) ? set.delete(dayNumber) : set.add(dayNumber);
    void persist({ ...progress, completedDays: [...set].sort((a, b) => a - b) });
  };

  const scheduleReminder = (kind: ScheduledReminderV21["kind"], dueAt: string, refs: Partial<ScheduledReminderV21>) => {
    const item: ScheduledReminderV21 = {
      reminderId: `reminder_${crypto.randomUUID()}`,
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      kind,
      dueAt,
      status: "pending",
      ...refs,
    };
    void persist({ ...progress, scheduledReminders: [...reminders, item] });
  };

  const saveEntry = () => {
    const now = new Date().toISOString();
    const entry: EvidenceLedgerEntryV21 = {
      ...entryDraft,
      entryId: entryDraft.entryId || `evidence_${crypto.randomUUID()}`,
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      actionId: entryDraft.actionId || `day-${todayAction.dayNumber}`,
      checkpointId: entryDraft.checkpointId || undefined,
      createdAt: entryDraft.createdAt || now,
    };
    void persist({ ...progress, evidenceLedger: upsertEvidenceEntry(progress.evidenceLedger || [], entry) });
    setEntryDraft(emptyEntry());
    setTab("evidence");
  };

  const checkpointReview = (day: 7 | 14 | 21 | 30): CheckpointReviewV21 => {
    const existing = progress.checkpointReviews?.find(item => item.dayNumber === day);
    const draft = checkpointDrafts[day] || {};
    return {
      dayNumber: day,
      completedAt: draft.completedAt || existing?.completedAt || "",
      answers: draft.answers || existing?.answers || {},
      evidenceSummary: draft.evidenceSummary ?? existing?.evidenceSummary ?? "",
      strongestEvidence: draft.strongestEvidence ?? existing?.strongestEvidence ?? "none",
      primaryConstraint: draft.primaryConstraint ?? existing?.primaryConstraint ?? "none",
      nextAction: draft.nextAction ?? existing?.nextAction ?? "",
      blueprintVersionId: blueprint.blueprintId,
    };
  };

  const saveCheckpoint = (day: 7 | 14 | 21 | 30) => {
    const review = { ...checkpointReview(day), completedAt: new Date().toISOString() };
    void persist({ ...progress, checkpointReviews: upsertCheckpointReview(progress.checkpointReviews || [], review) });
  };

  const copy = async (text: string) => { await navigator.clipboard.writeText(text); };

  return <div className="min-h-screen bg-[#f6f1e8] text-ghost-ink">
    <header className="sticky top-0 z-30 border-b border-black/10 bg-ghost-ink text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4"><div className="flex items-center gap-3"><button onClick={onBack} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-black">← Dashboard</button><div><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">Executable Blueprint v2.1</p><h1 className="font-black">{blueprint.offer.offerName}</h1></div></div><div className="text-right text-xs"><div>{progress.completedDays.length}/30 days · {completionPercent}%</div><div aria-live="polite" className={saveState === "error" ? "text-red-300" : "text-white/70"}>{saveState === "saving" ? "Saving…" : saveState === "error" ? "Sync needed" : `Saved ${new Date(progress.updatedAt).toLocaleString()}`}</div></div></div>
      <div className="mx-auto max-w-7xl px-4 pb-3"><label className="sr-only" htmlFor="blueprint-mobile-nav">Blueprint section</label><select id="blueprint-mobile-nav" aria-label="Blueprint section" value={tab} onChange={event => setTab(event.target.value as Tab)} className="w-full rounded-lg bg-white px-3 py-2 font-black text-ghost-ink md:hidden">{tabs.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><nav aria-label="Blueprint sections" className="hidden gap-1 overflow-x-auto md:flex">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-black ${tab === item.id ? "bg-ghost-rust text-white" : "text-white/70 hover:bg-white/10"}`}>{item.label}</button>)}</nav></div>
    </header>

    <main className="mx-auto max-w-7xl space-y-6 p-4 py-7 sm:p-6">
      {saveState === "error" && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"><span>{saveError || "Changes are saved locally but have not synced."}</span><button onClick={() => void persist(progress)} className="rounded-lg bg-red-700 px-4 py-2 font-black text-white">Retry save</button></div>}

      {tab === "overview" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">48-hour Launch Card</p><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div><p className="text-xs uppercase text-white/60">First customer</p><p className="mt-1 font-black">{blueprint.launchCard48Hour.firstCustomer}</p></div><div><p className="text-xs uppercase text-white/60">First offer</p><p className="mt-1 font-black">{blueprint.launchCard48Hour.firstOffer}</p></div><div><p className="text-xs uppercase text-white/60">Founder time boundary</p><p className="mt-1 font-black">{blueprint.executiveDecision.founderTimeRiskHours} hours</p></div><div><p className="text-xs uppercase text-white/60">Test cash boundary</p><p className="mt-1 font-black">${blueprint.executiveDecision.founderCashRiskMaximum}</p></div></div><div className="mt-6 rounded-xl bg-white/10 p-5"><p className="text-xs font-black uppercase text-ghost-gold">Exact first message</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{blueprint.launchCard48Hour.exactFirstMessage}</p><button onClick={() => void copy(blueprint.launchCard48Hour.exactFirstMessage)} className="mt-3 rounded-lg border border-white/30 px-3 py-2 text-xs font-black">Copy message</button></div><div className="mt-5"><p className="text-xs font-black uppercase text-ghost-gold">First measurable commitment</p><p className="mt-2">{blueprint.launchCard48Hour.firstCommitmentRequest}</p></div></section><section className="grid gap-4 md:grid-cols-3">{blueprint.launchCard48Hour.firstThreeApproaches.map((item, index) => <article key={item.channelId} className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">Approach {index + 1}</p><h3 className="mt-1 font-black">{item.name}</h3><p className="mt-2 text-sm text-gray-700">{item.firstAction}</p><a className="mt-3 inline-block text-sm font-black text-ghost-rust" href={item.publicUrl} target="_blank" rel="noreferrer">Open public path ↗</a></article>)}</section><section className="grid gap-4 md:grid-cols-2"><article className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">Day-30 evidence requirement</p><p className="mt-2 text-sm text-gray-700">{blueprint.adaptiveCheckpoints.find(item => item.dayNumber === 30)?.evidenceRequired.join(" · ")}</p></article><article className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">Launch Site preview</p><p className="mt-2 text-sm text-gray-700">{blueprint.launchCard48Hour.launchSitePreviewReady ? "Your canonical Launch Site is ready to preview from this account." : "Launch Site data needs attention before preview."}</p><button onClick={() => setTab("site")} className="mt-3 rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white">Open Launch Site</button></article></section></div>}

      {tab === "audit" && <div className="space-y-6"><section className="grid gap-4 md:grid-cols-2">{[["Existing offer", blueprint.startingStateAudit.existingOffer],["Existing site", blueprint.startingStateAudit.existingLandingPage],["Previous outreach", blueprint.startingStateAudit.previousOutreach],["Customers, audience, contacts or partners", blueprint.startingStateAudit.existingCustomersAudienceOrPartners],["Manual fulfillment readiness", blueprint.startingStateAudit.manualFulfillmentReadiness]].map(([title, item]) => { const evidence = item as typeof blueprint.startingStateAudit.existingOffer; return <article key={String(title)} className="rounded-xl border border-black/10 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black">{String(title)}</h2>{truthBadge(evidence.truthLabel)}</div><p className="mt-3 text-sm text-gray-700">{evidence.statement}</p></article>; })}</section><section className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-2xl font-black">Skills and assets</h2><div className="mt-4 space-y-3">{blueprint.startingStateAudit.existingSkillsAndAssets.map((item, index) => <div key={index} className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-start sm:justify-between"><span className="text-sm">{item.statement}</span>{truthBadge(item.truthLabel)}</div>)}</div></section><section className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-2xl font-black">Founder constraints</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{Object.entries(blueprint.startingStateAudit.founderConstraints).map(([key, item]) => <div key={key} className="rounded-lg bg-gray-50 p-4"><div className="flex items-center justify-between gap-2"><strong>{key.replace(/([A-Z])/g, " $1")}</strong>{truthBadge(item.truthLabel)}</div><p className="mt-2 text-sm text-gray-700">{item.statement}</p></div>)}</div></section><section className="grid gap-4 lg:grid-cols-2"><article className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-xl font-black">Verified-fact register</h2><div className="mt-4 space-y-3">{blueprint.startingStateAudit.verifiedFacts.map((item, index) => <div key={index} className="rounded-lg bg-emerald-50 p-3 text-sm"><div className="mb-2">{truthBadge(item.truthLabel)}</div>{item.statement}</div>)}</div></article><article className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-xl font-black">Inference register</h2><div className="mt-4 space-y-3">{blueprint.startingStateAudit.inferences.map((item, index) => <div key={index} className="rounded-lg bg-amber-50 p-3 text-sm"><div className="mb-2">{truthBadge(item.truthLabel)}</div>{item.statement}</div>)}</div></article></section><section className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-2xl font-black">Five critical tests</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{blueprint.startingStateAudit.criticalTests.map((test, index) => <article key={test.assumptionId} className="rounded-lg border border-black/10 p-4"><p className="text-xs font-black uppercase text-ghost-rust">Critical test {index + 1}</p><h3 className="mt-1 font-black">{test.assumption}</h3><p className="mt-2 text-sm"><strong>Evidence required:</strong> {test.evidenceRequired}</p><p className="mt-2 text-sm"><strong>If false:</strong> {test.failureConsequence}</p></article>)}</div></section></div>}

      {tab === "revenue" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">Selected execution lane</p><h2 className="mt-2 text-3xl font-black">{blueprint.businessModelLane.lane.replace(/_/g, " ")}</h2><p className="mt-3 text-white/75">{blueprint.businessModelLane.rationale}</p></section><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[["First offer format", blueprint.firstRevenuePath.firstOfferFormat],["First buyer", blueprint.firstRevenuePath.firstBuyer],["First channel", blueprint.firstRevenuePath.firstChannel],["First price", blueprint.firstRevenuePath.firstPrice],["Commitment method", blueprint.firstRevenuePath.commitmentMethod],["Target day", `Day ${blueprint.firstRevenuePath.targetDay}`],["Minimum qualified asks", String(blueprint.firstRevenuePath.minimumQualifiedAsks)],["Success threshold", blueprint.firstRevenuePath.successThreshold]].map(([label, value]) => <article key={label} className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">{label}</p><p className="mt-2 text-sm font-semibold text-gray-800">{value}</p></article>)}</section><article className="rounded-xl border border-black/10 bg-white p-6"><div className="flex justify-between gap-4"><div><p className="text-xs font-black uppercase text-ghost-rust">First ask</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{blueprint.firstRevenuePath.firstAsk}</p></div><button onClick={() => void copy(blueprint.firstRevenuePath.firstAsk)} className="h-fit rounded-lg border border-ghost-rust px-3 py-2 text-xs font-black text-ghost-rust">Copy ask</button></div><FieldList title="Follow-up sequence" items={blueprint.firstRevenuePath.followUpSequence} /></article><PilotBrief blueprint={blueprint} onCopy={text => void copy(text)} /></div>}

      {tab === "fulfillment" && <div className="space-y-6"><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[["Delivery timeline", blueprint.manualFulfillmentPlan.expectedDeliveryTime],["Capacity/week", String(blueprint.manualFulfillmentPlan.capacityPerWeek)],["Founder-hours guardrail", blueprint.manualFulfillmentPlan.estimatedFounderHours],["Variable-cost field", blueprint.manualFulfillmentPlan.estimatedVariableCost],["Gross-margin guardrail", blueprint.manualFulfillmentPlan.grossMarginGuardrail]].map(([label, value]) => <article key={label} className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">{label}</p><p className="mt-2 text-sm text-gray-700">{value}</p></article>)}</section><section className="grid gap-6 lg:grid-cols-2"><article className="rounded-xl border border-black/10 bg-white p-6"><FieldList title="Onboarding steps" items={blueprint.manualFulfillmentPlan.onboardingSteps} /><div className="mt-6"><FieldList title="Required customer inputs" items={blueprint.manualFulfillmentPlan.customerInputs} /></div><div className="mt-6"><FieldList title="Communication points" items={blueprint.manualFulfillmentPlan.customerCommunicationPoints} /></div></article><article className="rounded-xl border border-black/10 bg-white p-6"><FieldList title="Founder work" items={blueprint.manualFulfillmentPlan.founderWork} /><div className="mt-6"><FieldList title="Quality checklist" items={blueprint.manualFulfillmentPlan.qualityChecklist} /></div><div className="mt-6"><FieldList title="Intentionally manual" items={blueprint.manualFulfillmentPlan.intentionallyManual} /></div></article></section></div>}

      {tab === "today" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">Today · Day {todayAction.dayNumber}</p><h2 className="mt-2 text-3xl font-black">{todayAction.title}</h2><p className="mt-3 text-white/75">{todayAction.primaryObjective}</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-sm">{todayAction.estimatedMinutes} minutes</span><span className="rounded-full bg-white/10 px-3 py-2 text-sm">{todayAction.estimatedEffort} effort</span></div></section><section className="grid gap-5 lg:grid-cols-2"><article className="rounded-xl border border-black/10 bg-white p-6"><h3 className="font-black">Why it matters</h3><p className="mt-2 text-sm text-gray-700">{todayAction.whyItMatters}</p><div className="mt-5"><FieldList title="Required actions" items={todayAction.requiredActions} /></div><div className="mt-5"><FieldList title="Prepared assets" items={todayAction.preparedAssets} /></div></article><article className="rounded-xl border border-black/10 bg-white p-6"><p><strong>Deliverable:</strong> {todayAction.expectedDeliverable}</p><p className="mt-3"><strong>Success measure:</strong> {todayAction.successMeasurement}</p><div className="mt-5"><FieldList title="Evidence to record" items={todayAction.evidenceToRecord} /></div><div className="mt-5 rounded-xl bg-[#fff7f2] p-4"><p className="text-xs font-black uppercase text-ghost-rust">Branch rule</p>{todayAction.ifThenBranches.map((branch, index) => <p key={index} className="mt-2 text-sm"><strong>IF</strong> {branch.condition} <strong>THEN</strong> {branch.action}</p>)}</div></article></section><section className="rounded-xl border border-black/10 bg-white p-6"><label htmlFor="today-note" className="font-black">Execution note</label><textarea id="today-note" value={progress.evidenceNotes?.[todayAction.completionKey] || ""} onChange={event => debouncedNote(todayAction.completionKey, event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-gray-300 p-3" placeholder="What happened while you worked this action?" /><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => markDay(todayAction.dayNumber)} className="rounded-lg bg-ghost-rust px-4 py-3 font-black text-white">{completed.has(todayAction.dayNumber) ? "Mark incomplete" : "Mark complete"}</button><button onClick={() => { setEntryDraft({ ...emptyEntry(), actionId: `day-${todayAction.dayNumber}`, action: todayAction.title }); setTab("record"); }} className="rounded-lg border border-ghost-rust px-4 py-3 font-black text-ghost-rust">Record what happened</button><button onClick={() => scheduleReminder("daily_action", new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), { actionId: `day-${todayAction.dayNumber}` })} className="rounded-lg border border-gray-300 px-4 py-3 font-black">Remind me later</button></div></section></div>}

      {tab === "record" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">GhostTown Daily Execution Log</p><h2 className="mt-2 text-3xl font-black">Record results, not impressions.</h2><p className="mt-3 text-white/75">This entry becomes evidence attached to Blueprint {blueprint.blueprintVersion}. It cannot silently rewrite the plan.</p></section><section className="grid gap-4 rounded-xl border border-black/10 bg-white p-6 md:grid-cols-2"><label className="text-sm font-black">Contact or channel<input value={entryDraft.contactOrChannel} onChange={e => setEntryDraft({ ...entryDraft, contactOrChannel: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">Date<input type="date" value={entryDraft.date} onChange={e => setEntryDraft({ ...entryDraft, date: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black md:col-span-2">Action<textarea value={entryDraft.action} onChange={e => setEntryDraft({ ...entryDraft, action: e.target.value })} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black md:col-span-2">Response<textarea value={entryDraft.response} onChange={e => setEntryDraft({ ...entryDraft, response: e.target.value })} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black md:col-span-2">Exact customer language<textarea value={entryDraft.customerLanguage} onChange={e => setEntryDraft({ ...entryDraft, customerLanguage: e.target.value })} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">Alternative mentioned<input value={entryDraft.alternativeMentioned} onChange={e => setEntryDraft({ ...entryDraft, alternativeMentioned: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">Objection<input value={entryDraft.objection} onChange={e => setEntryDraft({ ...entryDraft, objection: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">Commitment offered<input value={entryDraft.commitmentOffered} onChange={e => setEntryDraft({ ...entryDraft, commitmentOffered: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">Commitment received<input value={entryDraft.commitmentReceived} onChange={e => setEntryDraft({ ...entryDraft, commitmentReceived: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">Revenue or deposit ($)<input type="number" min="0" step="0.01" value={entryDraft.revenueCents / 100} onChange={e => setEntryDraft({ ...entryDraft, revenueCents: Math.round(Number(e.target.value || 0) * 100) })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">Founder minutes<input type="number" min="0" value={entryDraft.founderMinutes} onChange={e => setEntryDraft({ ...entryDraft, founderMinutes: Number(e.target.value || 0) })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">Variable cost ($)<input type="number" min="0" step="0.01" value={entryDraft.variableCostCents / 100} onChange={e => setEntryDraft({ ...entryDraft, variableCostCents: Math.round(Number(e.target.value || 0) * 100) })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">Follow-up date<input type="date" value={entryDraft.followUpDate} onChange={e => setEntryDraft({ ...entryDraft, followUpDate: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">Evidence strength<select value={entryDraft.evidenceStrength} onChange={e => setEntryDraft({ ...entryDraft, evidenceStrength: e.target.value as EvidenceStrength })} className="mt-1 w-full rounded-lg border p-2 font-normal"><option value="strong">Strong</option><option value="moderate">Moderate</option><option value="early">Early</option><option value="weak">Weak</option></select></label><label className="text-sm font-black md:col-span-2">Source note<textarea value={entryDraft.sourceNote} onChange={e => setEntryDraft({ ...entryDraft, sourceNote: e.target.value })} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal" /></label><div className="md:col-span-2 flex flex-wrap gap-2"><button onClick={saveEntry} className="rounded-lg bg-ghost-rust px-5 py-3 font-black text-white">Save evidence entry</button>{entryDraft.entryId && <button onClick={() => setEntryDraft(emptyEntry())} className="rounded-lg border px-5 py-3 font-black">Cancel edit</button>}</div></section></div>}

      {tab === "followups" && <div className="space-y-4"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">Follow-ups</p><h2 className="mt-2 text-3xl font-black">Every dated next step in one place.</h2></section>{followUps.length === 0 ? <p className="rounded-xl bg-white p-6">No follow-ups are scheduled yet.</p> : followUps.map(entry => <article key={entry.entryId} className="rounded-xl border border-black/10 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase text-ghost-rust">Due {entry.followUpDate}</p><h3 className="font-black">{entry.contactOrChannel || "Unlabeled contact"}</h3><p className="mt-1 text-sm text-gray-700">{entry.response || entry.action}</p></div><div className="flex gap-2"><button onClick={() => { setEntryDraft(entry); setTab("record"); }} className="rounded-lg border border-ghost-rust px-3 py-2 text-sm font-black text-ghost-rust">Edit result</button><button onClick={() => scheduleReminder("follow_up", `${entry.followUpDate}T09:00:00`, { entryId: entry.entryId })} className="rounded-lg bg-ghost-rust px-3 py-2 text-sm font-black text-white">Remind me</button></div></div></article>)}</div>}

      {tab === "evidence" && <div className="space-y-6"><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[["Entries", progress.evidenceLedger.length],["Commitments", progress.metrics.commitments],["Revenue", dollars(progress.metrics.revenueCents)],["Founder minutes", progress.metrics.founderMinutes],["Variable cost", dollars(progress.metrics.variableCostCents)]].map(([label, value]) => <article key={String(label)} className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>)}</section><section className="space-y-3">{progress.evidenceLedger.length === 0 ? <p className="rounded-xl bg-white p-6">No evidence recorded yet. Use Record Results after your next action.</p> : progress.evidenceLedger.map(entry => <article key={entry.entryId} className="rounded-xl border border-black/10 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border px-2 py-1 text-xs font-black uppercase">{entry.evidenceStrength}</span><span className="text-xs text-gray-500">{entry.date}</span><span className="text-xs text-gray-500">Blueprint {entry.blueprintVersion || blueprint.blueprintVersion}</span></div><h3 className="mt-2 font-black">{entry.contactOrChannel || "Evidence entry"}</h3><p className="mt-2 text-sm"><strong>Action:</strong> {entry.action}</p><p className="mt-1 text-sm"><strong>Response:</strong> {entry.response}</p>{entry.customerLanguage && <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm"><strong>Exact language:</strong> “{entry.customerLanguage}”</p>}{entry.commitmentReceived && <p className="mt-2 text-sm"><strong>Commitment:</strong> {entry.commitmentReceived}</p>}</div><button onClick={() => { setEntryDraft(entry); setTab("record"); }} className="rounded-lg border border-ghost-rust px-3 py-2 text-sm font-black text-ghost-rust">Edit</button></div></article>)}</section></div>}

      {tab === "review" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">Weekly Review</p><h2 className="mt-2 text-3xl font-black">Review evidence without rewriting the original Blueprint.</h2><p className="mt-3 text-white/75">Any future regeneration must create a new Blueprint version and preserve this evidence chain.</p></section>{blueprint.adaptiveCheckpoints.map(checkpoint => { const day = checkpoint.dayNumber; const review = checkpointReview(day); const done = Boolean(progress.checkpointReviews?.find(item => item.dayNumber === day)?.completedAt); return <section key={checkpoint.checkpointId} className="rounded-xl border border-black/10 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase text-ghost-rust">Day {day}</p><h2 className="text-xl font-black">{checkpoint.title}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-black ${done ? "bg-emerald-100 text-emerald-900" : "bg-gray-100"}`}>{done ? "Completed" : "Not completed"}</span></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><div><FieldList title="Canonical review questions" items={checkpoint.questions} /><div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm"><strong>Current metric summary:</strong> {progress.metrics.outreachSent} outreach · {progress.metrics.replies} replies · {progress.metrics.interviews} interviews · {progress.metrics.commitments} commitments · {dollars(progress.metrics.revenueCents)} revenue</div></div><div className="space-y-3"><label className="block text-sm font-black">Strongest evidence<select value={review.strongestEvidence} onChange={e => setCheckpointDrafts(current => ({ ...current, [day]: { ...current[day], strongestEvidence: e.target.value as CheckpointReviewV21["strongestEvidence"] } }))} className="mt-1 w-full rounded-lg border p-2 font-normal"><option value="none">None yet</option><option value="strong">Strong</option><option value="moderate">Moderate</option><option value="early">Early</option><option value="weak">Weak</option></select></label><label className="block text-sm font-black">Primary constraint<select value={review.primaryConstraint} onChange={e => setCheckpointDrafts(current => ({ ...current, [day]: { ...current[day], primaryConstraint: e.target.value as PrimaryConstraint } }))} className="mt-1 w-full rounded-lg border p-2 font-normal">{["none","customer","urgency","access","trust","offer","fulfillment","price","message","missing_evidence"].map(item => <option key={item} value={item}>{item.replace(/_/g," ")}</option>)}</select></label><label className="block text-sm font-black">Evidence summary<textarea value={review.evidenceSummary} onChange={e => setCheckpointDrafts(current => ({ ...current, [day]: { ...current[day], evidenceSummary: e.target.value } }))} className="mt-1 min-h-24 w-full rounded-lg border p-2 font-normal" /></label><label className="block text-sm font-black">Next action<textarea value={review.nextAction} onChange={e => setCheckpointDrafts(current => ({ ...current, [day]: { ...current[day], nextAction: e.target.value } }))} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal" /></label><button onClick={() => saveCheckpoint(day)} className="rounded-lg bg-ghost-rust px-4 py-3 font-black text-white">Save Day {day} review</button></div></div></section>; })}</div>}

      {tab === "reminders" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">In-app reminders</p><h2 className="mt-2 text-3xl font-black">Action, follow-up, checkpoint.</h2><p className="mt-3 text-white/75">Email, push, SMS, streaks, and calendar integrations remain deliberately deferred.</p></section><section className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-xl font-black">Reminder preferences</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["dailyAction","Daily action"],["followUps","Follow-ups"],["checkpoints","Checkpoints"]].map(([key,label]) => <label key={key} className="flex items-center gap-3 rounded-lg border p-4 font-black"><input type="checkbox" checked={Boolean(prefs[key as keyof ReminderPreferencesV21])} onChange={e => void persist({ ...progress, reminderPreferences: { ...prefs, [key]: e.target.checked } })} />{label}</label>)}</div></section><section className="space-y-3"><h2 className="text-xl font-black">Scheduled reminders</h2>{reminders.length === 0 ? <p className="rounded-xl bg-white p-6">No reminders scheduled.</p> : reminders.map(item => <article key={item.reminderId} className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase text-ghost-rust">{item.kind.replace(/_/g," ")}</p><p className="mt-1 text-sm">{new Date(item.dueAt).toLocaleString()}</p><p className="mt-1 text-xs text-gray-500">Blueprint {item.blueprintVersion}</p></div><button onClick={() => void persist({ ...progress, scheduledReminders: reminders.map(current => current.reminderId === item.reminderId ? { ...current, status: "dismissed" } : current) })} className="rounded-lg border px-3 py-2 text-sm font-black">Dismiss</button></article>)}</section></div>}

      {tab === "calendar" && <div className="space-y-4">{blueprint.dailyCalendar.map(day => <article key={day.dayNumber} className="rounded-xl border border-black/10 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase text-ghost-rust">Day {day.dayNumber}</p><h2 className="text-xl font-black">{day.title}</h2><p className="mt-1 text-sm text-gray-700">{day.primaryObjective}</p></div><button onClick={() => markDay(day.dayNumber)} className={`rounded-lg px-3 py-2 text-sm font-black ${completed.has(day.dayNumber) ? "bg-emerald-100 text-emerald-900" : "border border-gray-300"}`}>{completed.has(day.dayNumber) ? "Completed ✓" : "Mark complete"}</button></div><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div><strong className="text-sm">Why it matters</strong><p className="mt-1 text-sm text-gray-600">{day.whyItMatters}</p></div><div><strong className="text-sm">Estimated effort</strong><p className="mt-1 text-sm text-gray-600">{day.estimatedMinutes} minutes · {day.estimatedEffort}</p></div><div><strong className="text-sm">Deliverable</strong><p className="mt-1 text-sm text-gray-600">{day.expectedDeliverable}</p></div><div><strong className="text-sm">Success measure</strong><p className="mt-1 text-sm text-gray-600">{day.successMeasurement}</p></div></div><div className="mt-4 grid gap-4 md:grid-cols-3"><FieldList title="Required actions" items={day.requiredActions} /><FieldList title="Prepared assets" items={day.preparedAssets} /><FieldList title="Evidence to record" items={day.evidenceToRecord} /></div><div className="mt-4 rounded-lg bg-[#fff7f2] p-4"><p className="text-xs font-black uppercase text-ghost-rust">Branch rule</p>{day.ifThenBranches.map((branch,index) => <p key={index} className="mt-2 text-sm"><strong>IF</strong> {branch.condition} <strong>THEN</strong> {branch.action}</p>)}</div></article>)}</div>}

      {tab === "site" && <LaunchSitePanel orderId={orderId} />}
    </main>
  </div>;
}
