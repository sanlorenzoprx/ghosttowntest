import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import { recordCommercialEvent } from '../lib/commercialAttribution';
import { dayCompletionReadiness } from '../lib/blueprintExecutionCompletion';
import { createProgressSaveQueue, type CompletedDayChange, type ProgressSaveQueue } from '../lib/blueprintProgressSaveQueue';
import LaunchBlueprintViewV21, {
  type BlueprintProgressV21,
  type BlueprintV21Payload,
} from './LaunchBlueprintViewV21';
import SprintWebsiteEvidence from './SprintWebsiteEvidence';

type ExecutionMode = 'calendar' | 'assets' | 'workspace';
type DailyAction = BlueprintV21Payload['blueprint']['dailyCalendar'][number];
type DailyAsset = NonNullable<DailyAction['executionPacket']>['assets'][number];

function assetFilename(title: string, contentType: string): string {
  const suffix = contentType === 'text/csv' ? 'csv' : contentType === 'text/plain' ? 'txt' : 'md';
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.${suffix}`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously can cancel the download before Chromium consumes the
  // blob URL. Delay cleanup so the browser can start the download reliably.
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function downloadTextAsset(title: string, content: string, contentType: string): void {
  triggerBlobDownload(
    new Blob([content], { type: `${contentType};charset=utf-8` }),
    assetFilename(title, contentType),
  );
}

async function downloadPrivateArtifact(path: string, filename: string): Promise<void> {
  const response = await fetch(apiUrl(path), { headers: authHeaders() });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  triggerBlobDownload(await response.blob(), filename);
}

function checkpointForDay(payload: BlueprintV21Payload, dayNumber: number) {
  return payload.blueprint.adaptiveCheckpoints.find(item => item.dayNumber === dayNumber);
}

function dayStatus(dayNumber: number, currentDay: number, completed: Set<number>): string {
  if (completed.has(dayNumber)) return 'Complete';
  if (dayNumber === currentDay) return 'Next action';
  if (dayNumber < currentDay) return 'Needs attention';
  return 'Upcoming';
}

function FieldList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-black text-ghost-ink">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-gray-700">
        {items.map((item, index) => <li key={`${title}-${index}`}>• {item}</li>)}
      </ul>
    </div>
  );
}

export default function LaunchBlueprintExecutionHomeV21({
  orderId,
  onBack,
  initialPayload,
}: {
  orderId: string;
  onBack: () => void;
  initialPayload: BlueprintV21Payload;
}) {
  const [payload, setPayload] = useState(initialPayload);
  const [mode, setMode] = useState<ExecutionMode>('calendar');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [openedAssetId, setOpenedAssetId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [saveError, setSaveError] = useState('');
  const [completionError, setCompletionError] = useState('');
  const [executionNoteDrafts, setExecutionNoteDrafts] = useState<Record<string, string>>({});
  const [workspaceDay, setWorkspaceDay] = useState<number | undefined>(undefined);
  const saveQueue = useRef<ProgressSaveQueue<BlueprintProgressV21> | null>(null);
  const pendingKey = `ghosttown-blueprint-progress-pending:${orderId}`;
  const { blueprint, progress } = payload;
  const completed = useMemo(() => new Set(progress.completedDays || []), [progress.completedDays]);
  const currentAction = blueprint.dailyCalendar.find(day => !completed.has(day.dayNumber)) || blueprint.dailyCalendar[29];
  const activeDay = blueprint.dailyCalendar.find(day => day.dayNumber === (selectedDay || currentAction.dayNumber)) || currentAction;
  const completionPercent = Math.round((completed.size / 30) * 100);
  const activeCheckpoint = checkpointForDay(payload, activeDay.dayNumber);
  const effectiveProgress = useMemo<BlueprintProgressV21>(() => ({
    ...progress,
    evidenceNotes: { ...progress.evidenceNotes, ...executionNoteDrafts },
  }), [executionNoteDrafts, progress]);
  const activeCompletion = useMemo(
    () => dayCompletionReadiness(blueprint, effectiveProgress, activeDay.dayNumber),
    [activeDay.dayNumber, blueprint, effectiveProgress],
  );
  const latestCheckpointReview = useMemo(() => [...(progress.checkpointReviews || [])]
    .filter(review => Boolean(review.completedAt && review.nextAction?.trim()))
    .sort((left, right) => right.dayNumber - left.dayNumber)[0], [progress.checkpointReviews]);

  useEffect(() => {
    const pending = localStorage.getItem(pendingKey);
    if (!pending) return;
    try {
      const restored = JSON.parse(pending) as BlueprintProgressV21;
      setPayload(current => ({ ...current, progress: restored }));
      setSaveState('error');
      setSaveError('Unsynced execution changes were restored on this device. Retry to save them to your account.');
    } catch {
      localStorage.removeItem(pendingKey);
    }
  }, [pendingKey]);

  const allAssets = useMemo(() => {
    const byId = new Map<string, DailyAsset>();
    for (const day of blueprint.dailyCalendar) {
      for (const asset of day.executionPacket?.assets || []) byId.set(asset.assetId, asset);
    }
    return [...byId.values()].sort((left, right) => left.dayNumber - right.dayNumber || left.title.localeCompare(right.title));
  }, [blueprint.dailyCalendar]);

  // One save at a time, latest snapshot wins, explicit day changes (see blueprintProgressSaveQueue).
  if (!saveQueue.current) {
    saveQueue.current = createProgressSaveQueue<BlueprintProgressV21>(async (snapshot, dayChanges: CompletedDayChange[]) => {
      const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/progress`), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(dayChanges.length ? { ...snapshot, completedDayChanges: dayChanges } : snapshot),
      });
      const body = await response.json<{ progress?: BlueprintProgressV21; error?: string }>();
      if (!response.ok || !body.progress) throw new Error(body.error || 'Execution progress could not be saved');
      return body.progress;
    }, {
      applied: saved => {
        localStorage.removeItem(pendingKey);
        setPayload(current => ({ ...current, progress: saved }));
        setSaveState('saved');
      },
      failed: error => {
        setSaveState('error');
        setSaveError(error instanceof Error ? error.message : 'Execution progress could not be saved');
      },
    });
  }

  const persist = (next: BlueprintProgressV21, dayChange?: CompletedDayChange): Promise<boolean> => {
    setPayload(current => ({ ...current, progress: next }));
    localStorage.setItem(pendingKey, JSON.stringify(next));
    setSaveState('saving');
    setSaveError('');
    return saveQueue.current!.save(next, dayChange);
  };

  const returnFromWorkspace = async () => {
    const pending = localStorage.getItem(pendingKey);
    if (pending) {
      try {
        const restored = JSON.parse(pending) as BlueprintProgressV21;
        setPayload(current => ({ ...current, progress: restored }));
        setSaveState('error');
        setSaveError('Unsynced workspace changes are preserved on this device. Retry to sync before relying on another device.');
      } catch {
        localStorage.removeItem(pendingKey);
      }
      setMode('calendar');
      return;
    }
    try {
      const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/progress`), {
        headers: authHeaders(),
      });
      const body = await response.json<{ progress?: BlueprintProgressV21; error?: string }>();
      if (!response.ok || !body.progress) throw new Error(body.error || 'Latest execution progress could not be loaded');
      setPayload(current => ({ ...current, progress: body.progress! }));
      setSaveState('saved');
      setSaveError('');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'Latest execution progress could not be loaded');
    }
    setMode('calendar');
  };

  const openDay = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setMode('calendar');
    setCompletionError('');
    void recordCommercialEvent('daily_packet_opened', {
      orderId,
      verdictId: blueprint.sourceVerdictId,
      content: `day:${dayNumber}`,
      dedupeKey: `daily_packet_opened:${orderId}:${dayNumber}`,
    });
    window.requestAnimationFrame(() => document.getElementById('daily-execution-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const markDay = async (dayNumber: number) => {
    const nextCompleted = new Set(progress.completedDays || []);
    const wasComplete = nextCompleted.has(dayNumber);
    const nextProgress: BlueprintProgressV21 = {
      ...effectiveProgress,
      completedDays: [...nextCompleted].sort((a, b) => a - b),
    };
    if (!wasComplete) {
      const readiness = dayCompletionReadiness(blueprint, effectiveProgress, dayNumber);
      if (!readiness.ready) {
        setCompletionError(readiness.reasons.join(' '));
        return;
      }
      nextCompleted.add(dayNumber);
      nextProgress.completedDays = [...nextCompleted].sort((a, b) => a - b);
    } else {
      nextCompleted.delete(dayNumber);
      nextProgress.completedDays = [...nextCompleted].sort((a, b) => a - b);
    }
    setCompletionError('');
    const saved = await persist(nextProgress, { dayNumber, completed: !wasComplete });
    if (saved && !wasComplete) {
      void recordCommercialEvent('day_completed', {
        orderId,
        verdictId: blueprint.sourceVerdictId,
        content: `day:${dayNumber}`,
        dedupeKey: `day_completed:${orderId}:${dayNumber}`,
      });
    }
  };

  const saveExecutionNote = async (day: DailyAction, value: string) => {
    const next = { ...progress, evidenceNotes: { ...progress.evidenceNotes, [day.completionKey]: value } };
    const saved = await persist(next);
    if (saved) {
      setExecutionNoteDrafts(current => {
        const copy = { ...current };
        delete copy[day.completionKey];
        return copy;
      });
    }
  };

  const workingCopy = (asset: DailyAsset) => progress.assetDrafts?.find(item => item.assetId === asset.assetId)?.content || asset.finishedContent;
  const saveWorkingCopy = (asset: DailyAsset, content: string) => {
    const draft = {
      assetId: asset.assetId,
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      sourceAssetVersion: asset.version,
      content,
      updatedAt: new Date().toISOString(),
    };
    const drafts = [...(progress.assetDrafts || []).filter(item => item.assetId !== asset.assetId), draft].slice(-60);
    void persist({ ...progress, assetDrafts: drafts });
  };

  const renderAsset = (asset: DailyAsset, compact = false) => {
    const content = workingCopy(asset);
    const isOpen = openedAssetId === asset.assetId;
    return (
      <article key={asset.assetId} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-rust">Day {asset.dayNumber} prepared asset</p>
            <h3 className="mt-1 text-lg font-black">{asset.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{asset.usageInstructions}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {asset.capabilities.openable && <button type="button" onClick={() => setOpenedAssetId(isOpen ? null : asset.assetId)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-black">{isOpen ? 'Close' : 'Open'}</button>}
            {asset.capabilities.copyReady && <button type="button" onClick={() => void navigator.clipboard.writeText(content)} className="rounded-lg border border-ghost-rust px-3 py-2 text-sm font-black text-ghost-rust">Copy</button>}
            {asset.capabilities.downloadable && <button type="button" onClick={() => downloadTextAsset(asset.title, content, asset.contentType)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-black">Export</button>}
          </div>
        </div>
        {isOpen && <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-[#101A17] p-4 text-white"><p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-ghost-gold">Readable asset</p><pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap font-mono text-xs leading-6">{content}</pre></div>
          {asset.capabilities.editable && !compact && <label className="block text-sm font-black">Working copy <span className="font-normal text-gray-500">— your edits never overwrite the canonical Blueprint</span><textarea defaultValue={content} onBlur={event => saveWorkingCopy(asset, event.target.value)} className="mt-2 min-h-48 w-full rounded-xl border border-gray-300 p-3 font-mono text-xs font-normal" /></label>}
        </div>}
      </article>
    );
  };

  if (mode === 'workspace') {
    return <LaunchBlueprintViewV21 orderId={orderId} onBack={() => void returnFromWorkspace()} initialPayload={payload} initialActionDay={workspaceDay} />;
  }

  const activeCheckpointReview = activeCheckpoint
    ? progress.checkpointReviews?.find(review => review.dayNumber === activeCheckpoint.dayNumber)
    : undefined;

  return (
    <div className="min-h-screen bg-[#F6F3ED] text-ghost-ink">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#101A17] text-white shadow-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-black">← Dashboard</button>
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-gold">30-Day Launch Execution</p><h1 className="font-black">{blueprint.offer.offerName}</h1></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setMode('calendar')} className={`rounded-lg px-4 py-2 text-sm font-black ${mode === 'calendar' ? 'bg-ghost-rust text-white' : 'bg-white/10 text-white'}`}>30-Day Calendar</button>
            <button type="button" onClick={() => setMode('assets')} className={`rounded-lg px-4 py-2 text-sm font-black ${mode === 'assets' ? 'bg-ghost-rust text-white' : 'bg-white/10 text-white'}`}>Asset Library</button>
            <button type="button" onClick={() => { setWorkspaceDay(undefined); setMode('workspace'); }} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-black">Evidence, reviews & site</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 py-7 sm:p-6">
        {saveState === 'error' && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"><span>{saveError || 'Changes are preserved locally but have not synced.'}</span><button type="button" onClick={() => void persist(effectiveProgress)} className="rounded-lg bg-red-700 px-4 py-2 font-black text-white">Retry save</button></div>}

        <section className="overflow-hidden rounded-[2rem] bg-[#101A17] text-white shadow-xl">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_0.65fr] lg:p-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-gold">Your primary execution interface</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">Open the day. Use the prepared assets. Record what happened. Keep moving.</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/75">You do not need to search through a folder of documents. Each day brings forward the exact actions, prepared materials, evidence prompts, success and failure thresholds, and decision rules for that point in the launch.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => openDay(currentAction.dayNumber)} className="rounded-full bg-ghost-rust px-6 py-3 font-black text-white">Open Day {currentAction.dayNumber} →</button>
                <button type="button" onClick={() => void downloadPrivateArtifact(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.pdf`, 'GhostTown-Launch-Blueprint.pdf')} className="rounded-full border border-white/25 px-6 py-3 font-black">Download Blueprint PDF</button>
                <button type="button" onClick={() => void downloadPrivateArtifact(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint-assets.zip`, 'GhostTown-Launch-Assets.zip')} className="rounded-full border border-white/25 px-6 py-3 font-black">Export all assets</button>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-6">
              <div className="flex items-end justify-between"><div><p className="text-sm font-bold text-white/65">Progress</p><p className="mt-1 text-4xl font-black">{completed.size}/30</p></div><p className="text-2xl font-black text-ghost-gold">{completionPercent}%</p></div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-ghost-gold" style={{ width: `${completionPercent}%` }} /></div>
              <div className="mt-5 border-t border-white/10 pt-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-gold">Next scheduled day</p><p className="mt-2 font-black">Day {currentAction.dayNumber}: {currentAction.title}</p><p className="mt-2 text-sm text-white/70">{currentAction.primaryObjective}</p></div>
              {latestCheckpointReview && <div className="mt-5 border-t border-white/10 pt-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-gold">Evidence route from Day {latestCheckpointReview.dayNumber}</p><p className="mt-2 text-sm font-black">{latestCheckpointReview.nextAction}</p></div>}
              <p aria-live="polite" className={`mt-4 text-xs ${saveState === 'error' ? 'text-red-300' : 'text-white/55'}`}>{saveState === 'saving' ? 'Saving progress…' : saveState === 'error' ? `Sync needed: ${saveError}` : 'Progress saved to your account'}</p>
            </div>
          </div>
        </section>

        {mode === 'calendar' && <>
          <section aria-label="30-day execution calendar" className="rounded-2xl border border-black/10 bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-ghost-rust">30-Day Calendar</p><h2 className="mt-1 text-3xl font-black">Every day is a doorway into the work.</h2></div><p className="max-w-md text-sm leading-6 text-gray-600">Checkpoint days 7, 14, 21, and 30 also surface the evidence review that determines whether to continue, revise, pivot, pause, or stop.</p></div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
              {blueprint.dailyCalendar.map(day => {
                const status = dayStatus(day.dayNumber, currentAction.dayNumber, completed);
                const checkpoint = checkpointForDay(payload, day.dayNumber);
                const selected = activeDay.dayNumber === day.dayNumber;
                return <button key={day.dayNumber} type="button" onClick={() => openDay(day.dayNumber)} className={`min-h-32 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selected ? 'border-ghost-rust bg-[#fff7f2]' : completed.has(day.dayNumber) ? 'border-emerald-200 bg-emerald-50' : day.dayNumber === currentAction.dayNumber ? 'border-amber-300 bg-amber-50' : 'border-black/10 bg-white'}`}>
                  <div className="flex items-start justify-between gap-2"><span className="text-xs font-black uppercase tracking-[0.1em] text-ghost-rust">Day {day.dayNumber}</span>{completed.has(day.dayNumber) && <span aria-label="complete" className="font-black text-emerald-700">✓</span>}</div>
                  <p className="mt-2 line-clamp-2 text-sm font-black leading-5">{day.title}</p>
                  <p className="mt-3 text-xs font-bold text-gray-500">{status}{checkpoint ? ' · Review' : ''}</p>
                </button>;
              })}
            </div>
          </section>

          <section id="daily-execution-detail" className="scroll-mt-28 space-y-5 rounded-[2rem] border border-black/10 bg-[#FBF9F4] p-5 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">Today · Day {activeDay.dayNumber}</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">{activeDay.title}</h2><p className="mt-3 max-w-3xl text-lg leading-8 text-gray-700">{activeDay.primaryObjective}</p></div>
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-2 text-sm font-bold shadow-sm">{activeDay.estimatedMinutes} min</span><span className="rounded-full bg-white px-3 py-2 text-sm font-bold shadow-sm">{activeDay.estimatedEffort} effort</span></div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-black/10 bg-white p-6"><p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-rust">Why this day exists</p><p className="mt-3 text-sm leading-7 text-gray-700">{activeDay.executionPacket?.whyThisDayExists || activeDay.whyItMatters}</p><div className="mt-6"><FieldList title="Exact actions" items={(activeDay.executionPacket?.actions || []).map(action => `${action.sequence}. ${action.instruction}${action.quantity ? ` — ${action.quantity}` : ''}`)} /></div>{activeDay.executionPacket && <div className="mt-6"><FieldList title="Exact targets" items={activeDay.executionPacket.targets.map(target => `${target.name} — minimum ${target.minimumCount}; ${target.selectionOrQualificationRule}`)} /></div>}</article>
              <article className="rounded-2xl border border-black/10 bg-white p-6"><p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-rust">Decision context</p><p className="mt-3 text-sm"><strong>Success:</strong> {activeDay.executionPacket?.successThreshold || activeDay.successMeasurement}</p>{activeDay.executionPacket && <p className="mt-3 text-sm"><strong>Failure threshold:</strong> {activeDay.executionPacket.failureThreshold}</p>}<p className="mt-3 text-sm"><strong>Expected outcome:</strong> {activeDay.executionPacket?.expectedOutcome || activeDay.expectedDeliverable}</p>{activeDay.executionPacket && <p className="mt-3 text-sm"><strong>Complete when:</strong> {activeDay.executionPacket.completionDefinition}</p>}<div className="mt-5 rounded-xl bg-[#fff7f2] p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-rust">If / then routing</p>{(activeDay.executionPacket?.branchRules || activeDay.ifThenBranches).map((branch, index) => <p key={index} className="mt-2 text-sm"><strong>IF</strong> {'condition' in branch ? branch.condition : ''} <strong>THEN</strong> {'action' in branch ? branch.action : ''}</p>)}</div></article>
            </div>

            {activeCheckpoint && <article className="rounded-2xl border border-amber-300 bg-amber-50 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-amber-900">Day {activeCheckpoint.dayNumber} evidence checkpoint</p><h3 className="mt-2 text-2xl font-black">{activeCheckpoint.title}</h3></div><span className={`rounded-full px-3 py-1 text-xs font-black ${activeCompletion.checkpointComplete ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-200 text-amber-950'}`}>{activeCompletion.checkpointComplete ? 'Review saved' : 'Review required'}</span></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><FieldList title="Questions to answer" items={activeCheckpoint.questions} /><FieldList title="Evidence required" items={activeCheckpoint.evidenceRequired} /></div><div className="mt-5"><FieldList title="Decision branches" items={activeCheckpoint.branches.map(branch => `IF ${branch.condition} THEN ${branch.action}`)} /></div>{activeCheckpointReview?.nextAction && <p className="mt-5 rounded-xl bg-white p-4 text-sm"><strong>Saved evidence route:</strong> {activeCheckpointReview.nextAction}</p>}<button type="button" onClick={() => { setWorkspaceDay(activeDay.dayNumber); setMode('workspace'); }} className="mt-5 rounded-lg bg-amber-900 px-4 py-3 text-sm font-black text-white">{activeCompletion.checkpointComplete ? 'Review checkpoint evidence' : 'Complete checkpoint review'}</button></article>}

            <SprintWebsiteEvidence orderId={orderId} dayNumber={activeDay.dayNumber} checkpointDay={activeCheckpoint?.dayNumber} />

            <section aria-label="Prepared assets for this day" className="space-y-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-ghost-rust">Prepared for this day</p><h3 className="mt-1 text-2xl font-black">Open the asset here. Do the work here.</h3></div>{activeDay.executionPacket?.assets.length ? activeDay.executionPacket.assets.map(asset => renderAsset(asset)) : <article className="rounded-2xl border border-black/10 bg-white p-6"><p className="font-black">No separate file is needed for this action.</p><p className="mt-2 text-sm text-gray-600">{activeDay.executionPacket?.nonAssetJustification || 'The work for this day is completed directly from the instructions and evidence fields above.'}</p></article>}</section>

            <article className="rounded-2xl border border-black/10 bg-white p-6"><div className="grid gap-5 lg:grid-cols-2"><div><FieldList title="Evidence to record" items={activeDay.executionPacket?.evidenceToCapture || activeDay.evidenceToRecord} /></div><label className="text-sm font-black">Execution note<textarea value={executionNoteDrafts[activeDay.completionKey] ?? progress.evidenceNotes?.[activeDay.completionKey] ?? ''} onChange={event => setExecutionNoteDrafts(current => ({ ...current, [activeDay.completionKey]: event.target.value }))} onBlur={event => void saveExecutionNote(activeDay, event.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-gray-300 p-3 font-normal" placeholder="What happened? Capture customer language, objections, commitments, numbers, or what changed." /></label></div>
              {!completed.has(activeDay.dayNumber) && !activeCompletion.ready && <div role="status" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-black">Before Day {activeDay.dayNumber} can be completed:</p><ul className="mt-2 space-y-1">{activeCompletion.reasons.map(reason => <li key={reason}>• {reason}</li>)}</ul></div>}
              {completionError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{completionError}</p>}
              <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={!completed.has(activeDay.dayNumber) && !activeCompletion.ready} onClick={() => void markDay(activeDay.dayNumber)} className={`rounded-xl px-5 py-3 font-black disabled:cursor-not-allowed disabled:opacity-50 ${completed.has(activeDay.dayNumber) ? 'bg-emerald-100 text-emerald-900' : 'bg-ghost-rust text-white'}`}>{completed.has(activeDay.dayNumber) ? 'Completed ✓ — reopen' : `Complete Day ${activeDay.dayNumber}`}</button><button type="button" onClick={() => { setWorkspaceDay(activeDay.dayNumber); setMode('workspace'); }} className="rounded-xl border border-ghost-rust px-5 py-3 font-black text-ghost-rust">{activeCompletion.requiresStructuredEvidence && !activeCompletion.hasStructuredEvidence ? 'Record structured evidence' : 'Open structured evidence log / review'}</button></div></article>
          </section>
        </>}

        {mode === 'assets' && <section className="space-y-5"><div className="rounded-2xl border border-black/10 bg-white p-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-ghost-rust">Independent asset access</p><h2 className="mt-2 text-3xl font-black">Asset Library</h2><p className="mt-3 max-w-3xl text-gray-600">The calendar brings the right assets forward automatically, but nothing is locked inside a day. Open, copy, edit a working copy, or export any prepared asset whenever you need it.</p><p className="mt-3 text-sm font-bold text-gray-500">{allAssets.length} prepared execution assets across 30 days</p></div>{allAssets.map(asset => renderAsset(asset))}</section>}
      </main>
    </div>
  );
}
