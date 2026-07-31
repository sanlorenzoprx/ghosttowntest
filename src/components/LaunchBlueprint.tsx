import { useEffect, useMemo, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import type { DayTask, ExecutionPlan30Day, TruthLabel } from '../types/paidTest';

type BlueprintSection = 'overview' | 'offer' | 'access' | 'site' | 'calendar' | 'decision';

interface Props {
  orderId: string;
  onBack: () => void;
}

const sectionLabels: Array<{ id: BlueprintSection; label: string; description: string }> = [
  { id: 'overview', label: 'Launch decision', description: 'Recommendation, risk, objective, and limits' },
  { id: 'offer', label: 'Offer & positioning', description: 'Buyer, problem, pilot, pricing, and alternatives' },
  { id: 'access', label: 'Customer Access Pack', description: 'Research status, channels, posts, and outreach' },
  { id: 'site', label: 'Launch Site Starter', description: 'Working landing-page implementation' },
  { id: 'calendar', label: '30-day calendar', description: 'Daily actions, evidence, and measurements' },
  { id: 'decision', label: 'Final decision', description: 'Continue, pivot, pause, or stop criteria' }
];

export default function LaunchBlueprint({ orderId, onBack }: Props) {
  const [plan, setPlan] = useState<ExecutionPlan30Day | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<BlueprintSection>('overview');
  const [selectedDay, setSelectedDay] = useState(1);
  const [completedDays, setCompletedDays] = useState<number[]>(() => loadCompletedDays(orderId));
  const [copyNotice, setCopyNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/plan`), { headers: authHeaders() })
      .then(async response => {
        const body = await response.json<ExecutionPlan30Day | { error?: string }>();
        if (!response.ok || !('days' in body)) {
          throw new Error('error' in body && body.error ? body.error : 'This Launch Blueprint is not ready yet.');
        }
        return body;
      })
      .then(value => {
        if (cancelled) return;
        setPlan(value);
        const nextDay = value.days.find(day => !completedDays.includes(day.dayNumber))?.dayNumber ?? 30;
        setSelectedDay(nextDay);
      })
      .catch(caught => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'The Launch Blueprint could not be opened.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orderId]);

  useEffect(() => {
    localStorage.setItem(progressKey(orderId), JSON.stringify(completedDays));
  }, [completedDays, orderId]);

  const progress = plan ? Math.round((completedDays.length / Math.max(plan.days.length, 1)) * 100) : 0;
  const currentDay = plan?.days.find(day => day.dayNumber === selectedDay) ?? plan?.days[0] ?? null;
  const currentPhase = plan?.phases.find(phase => currentDay && phase.phaseId === currentDay.phaseId) ?? null;

  const launchCopy = useMemo(() => {
    if (!plan) return null;
    const outcome = plan.idea.problem.replace(/[.]+$/, '');
    return {
      targetCallout: `For ${plan.idea.targetBuyer}`,
      headline: `A focused way to make progress on ${outcome}`,
      subheadline: `${plan.idea.offerHypothesis}—tested against the way buyers currently handle it: ${plan.idea.currentWorkaround}.`,
      price: plan.idea.priceHypothesis,
      primaryAction: 'Apply for the pilot',
      secondaryAction: 'Ask a question'
    };
  }, [plan]);

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice(`${label} copied.`);
      window.setTimeout(() => setCopyNotice(''), 1800);
    } catch {
      setCopyNotice('Copy failed. Select the text manually.');
    }
  };

  const toggleDay = (dayNumber: number) => {
    setCompletedDays(current => current.includes(dayNumber)
      ? current.filter(item => item !== dayNumber)
      : [...current, dayNumber].sort((left, right) => left - right));
  };

  const downloadPlan = async (format: 'pdf' | 'json') => {
    const suffix = format === 'pdf' ? '/plan.pdf' : '/plan';
    const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}${suffix}`), { headers: authHeaders() });
    if (!response.ok) {
      setError('The requested Blueprint download is not ready.');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ghosttown-launch-blueprint-${orderId}.${format}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-14 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust" />
        <p className="mt-4 font-semibold text-gray-700">Opening your GhostTown Launch Blueprint…</p>
      </section>
    );
  }

  if (error || !plan) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-14 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
          <h1 className="font-display text-3xl font-semibold text-gray-950">Blueprint unavailable</h1>
          <p className="mt-3 text-red-700">{error || 'The Blueprint could not be opened.'}</p>
          <button type="button" onClick={onBack} className="mt-6 rounded-lg bg-ghost-forest px-5 py-3 font-bold text-white">Return to dashboard</button>
        </div>
      </section>
    );
  }

  return (
    <div className="bg-ghost-paper">
      <section className="border-b border-ghost-forest/10 bg-ghost-ink px-4 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <button type="button" onClick={onBack} className="text-sm font-bold text-white/70 hover:text-white">← Dashboard</button>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-ghost-gold">GhostTown Launch Blueprint</p>
              <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-tight sm:text-5xl">{plan.idea.name}</h1>
              <p className="mt-3 max-w-3xl text-base text-white/75">A personalized 30-day launch and validation operating system—not a static report.</p>
            </div>
            <div className="grid min-w-[280px] gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-white/75">Execution progress</span>
                <span className="font-black">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-ghost-gold" style={{ width: `${progress}%` }} /></div>
              <p className="text-xs text-white/60">{completedDays.length} of {plan.days.length} daily milestones completed. Progress is currently saved on this browser.</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => void downloadPlan('pdf')} className="rounded-lg bg-white px-4 py-2 text-sm font-black text-ghost-ink">Download PDF</button>
            <button type="button" onClick={() => void downloadPlan('json')} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-black text-white">Download editable JSON</button>
            <button type="button" onClick={() => { setActiveSection('calendar'); setSelectedDay(plan.days.find(day => !completedDays.includes(day.dayNumber))?.dayNumber ?? 30); }} className="rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white">Open today’s action</button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside>
          <nav aria-label="Blueprint sections" className="sticky top-5 space-y-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            {sectionLabels.map(section => (
              <button key={section.id} type="button" onClick={() => setActiveSection(section.id)} className={`w-full rounded-xl px-4 py-3 text-left transition ${activeSection === section.id ? 'bg-ghost-forest text-white' : 'text-gray-800 hover:bg-gray-50'}`}>
                <span className="block font-black">{section.label}</span>
                <span className={`mt-1 block text-xs ${activeSection === section.id ? 'text-white/70' : 'text-gray-500'}`}>{section.description}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {copyNotice && <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800" role="status">{copyNotice}</p>}
          {activeSection === 'overview' && <Overview plan={plan} onOpenCalendar={() => setActiveSection('calendar')} />}
          {activeSection === 'offer' && <OfferAndPositioning plan={plan} onCopy={copyText} />}
          {activeSection === 'access' && <CustomerAccessPack plan={plan} onCopy={copyText} />}
          {activeSection === 'site' && launchCopy && <LaunchSiteStarter plan={plan} copy={launchCopy} onCopy={copyText} />}
          {activeSection === 'calendar' && currentDay && (
            <Calendar
              plan={plan}
              currentDay={currentDay}
              currentPhaseTitle={currentPhase?.title ?? ''}
              selectedDay={selectedDay}
              completedDays={completedDays}
              onSelectDay={setSelectedDay}
              onToggleDay={toggleDay}
            />
          )}
          {activeSection === 'decision' && <Decision plan={plan} />}
        </main>
      </div>
    </div>
  );
}

function Overview({ plan, onOpenCalendar }: { plan: ExecutionPlan30Day; onOpenCalendar: () => void }) {
  const risk = plan.assumptions.find(item => item.label === 'Test') ?? plan.limitations[0];
  const dayThirty = plan.days.find(day => day.dayNumber === 30) ?? plan.days[plan.days.length - 1];
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="1 · Executive launch decision" title="Know the recommendation before doing the work" description="This opening compresses the verdict into one customer, one problem, one testable offer, one risk boundary, and one 30-day decision." />
      <div className="grid gap-4 md:grid-cols-2">
        <DecisionCard label="Original idea" value={`${plan.idea.name}: ${plan.idea.description}`} />
        <DecisionCard label="Recommended initial customer" value={plan.idea.targetBuyer} />
        <DecisionCard label="Strongest opportunity" value={plan.idea.offerHypothesis} />
        <DecisionCard label="Biggest risk to test" value={risk?.text ?? 'Buyer behavior has not yet validated the central assumption.'} />
        <DecisionCard label="30-day validation objective" value={dayThirty?.objective ?? 'Collect enough behavioral evidence to continue, revise, pivot, or stop.'} />
        <DecisionCard label="Risk limit" value="Use the daily time and cash budgets in the calendar. Do not build the full product before buyer behavior justifies it." />
      </div>
      <div className="rounded-2xl border border-ghost-rust/25 bg-[#fff7f2] p-6">
        <h3 className="font-display text-2xl font-semibold text-gray-950">Evidence required to continue</h3>
        <ul className="mt-4 space-y-3">
          {plan.decisionRules.map(rule => <li key={rule.ruleId} className="rounded-xl bg-white p-4 text-sm text-gray-800"><strong className="capitalize text-ghost-rust">{rule.outcome}:</strong> {rule.condition}</li>)}
        </ul>
        <button type="button" onClick={onOpenCalendar} className="mt-5 rounded-lg bg-ghost-forest px-5 py-3 font-black text-white">Start the 30-day calendar</button>
      </div>
      <TruthPanel title="What is known and what is still a test" claims={[...plan.assumptions, ...plan.limitations]} />
    </div>
  );
}

function OfferAndPositioning({ plan, onCopy }: { plan: ExecutionPlan30Day; onCopy: (label: string, text: string) => void }) {
  const positioning = `For ${plan.idea.targetBuyer}, who is struggling with ${plan.idea.problem}, GhostTown recommends ${plan.idea.offerHypothesis}, which helps them make useful progress without relying only on ${plan.idea.currentWorkaround}.`;
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="2–3 · Offer and positioning" title="A focused offer somebody can understand and test" description="This is the commercial hypothesis—not an inflated value stack and not a claim of proven demand." />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">Positioning statement</p><p className="mt-3 text-lg leading-8 text-gray-900">{positioning}</p></div>
          <CopyButton onClick={() => void onCopy('Positioning statement', positioning)} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DecisionCard label="Recommended offer" value={plan.idea.offerHypothesis} />
        <DecisionCard label="Target customer" value={plan.idea.targetBuyer} />
        <DecisionCard label="Painful problem" value={plan.idea.problem} />
        <DecisionCard label="Current alternative" value={plan.idea.currentWorkaround} />
        <DecisionCard label="Initial price hypothesis" value={plan.idea.priceHypothesis} />
        <DecisionCard label="Delivery principle" value="Deliver the smallest useful result manually before automating the workflow." />
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="font-display text-2xl font-semibold text-gray-950">Offer boundaries</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div><p className="font-black text-ghost-forest">Include</p><ul className="mt-3 space-y-2 text-sm text-gray-700"><li>One narrow promised outcome</li><li>Three concrete deliverables</li><li>A stated delivery method and timeline</li><li>A measurable buyer commitment</li></ul></div>
          <div><p className="font-black text-ghost-rust">Exclude until proven</p><ul className="mt-3 space-y-2 text-sm text-gray-700"><li>Unsupported testimonials or results</li><li>A full product build</li><li>Broad audiences and vague use cases</li><li>Guarantees beyond deliverables you control</li></ul></div>
        </div>
      </div>
    </div>
  );
}

function CustomerAccessPack({ plan, onCopy }: { plan: ExecutionPlan30Day; onCopy: (label: string, text: string) => void }) {
  const interviewScript = `I’m researching how ${plan.idea.targetBuyer} currently handle ${plan.idea.problem}. I noticed many rely on ${plan.idea.currentWorkaround}. I’m not trying to sell you anything during this conversation. I’m looking for 15 minutes to understand what currently works, what is frustrating, and what you have already tried. In return, I can send you the short findings summary when it is complete.`;
  const helpfulPosts = [
    `Checklist: five questions to ask before changing how you handle ${plan.idea.problem}.`,
    `Breakdown: how to compare ${plan.idea.currentWorkaround} with a focused manual pilot.`,
    `Observation: the difference between interest in ${plan.idea.problem} and evidence of urgency.`,
    `Template: a one-page evidence log for buyer conversations and commitments.`,
    `Conversation: what is the hardest part of the current workflow for ${plan.idea.targetBuyer}?`
  ];
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="4–5–7 · Customer Access Pack" title="Find the first people who might actually care" description="Community research must be current, sourced, prioritized, and performed when the Blueprint is generated." />
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Capability status: research not yet attached</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-gray-950">The current paid artifact does not contain live community research.</h3>
        <p className="mt-3 text-sm leading-6 text-gray-700">GhostTown must not invent groups, activity levels, rules, creators, associations, or source links. The production generator still needs a current-research step that returns 10–25 high-confidence channels with research date, source, relevance, activity confidence, participation rules, risk, and first action.</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">Interview invitation</p><p className="mt-3 whitespace-pre-line text-gray-800">{interviewScript}</p></div><CopyButton onClick={() => void onCopy('Interview invitation', interviewScript)} /></div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="font-display text-2xl font-semibold text-gray-950">Five helpful things to post</h3>
        <div className="mt-4 space-y-3">{helpfulPosts.map((post, index) => <div key={post} className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">Post {index + 1}</p><p className="mt-1 text-sm text-gray-800">{post}</p></div><CopyButton onClick={() => void onCopy(`Post ${index + 1}`, post)} /></div>)}</div>
        <p className="mt-4 text-xs text-gray-500">Read community rules and participate genuinely before posting. Do not use these drafts for unsolicited mass promotion.</p>
      </div>
    </div>
  );
}

function LaunchSiteStarter({ plan, copy, onCopy }: { plan: ExecutionPlan30Day; copy: { targetCallout: string; headline: string; subheadline: string; price: string; primaryAction: string; secondaryAction: string }; onCopy: (label: string, text: string) => void }) {
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="6 · GhostTown Launch Site Starter" title="The landing-page section implemented as a working page" description="The first version makes the proposed business tangible without inventing proof." />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="border-b border-gray-100 px-6 py-4"><p className="font-display text-xl font-semibold text-gray-950">{plan.idea.name}</p></div>
        <div className="bg-gradient-to-br from-emerald-950 to-emerald-800 px-6 py-14 text-white sm:px-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">{copy.targetCallout}</p>
          <h3 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">{copy.headline}</h3>
          <p className="mt-5 max-w-2xl text-lg text-white/75">{copy.subheadline}</p>
          <p className="mt-5 font-black text-ghost-gold">{copy.price}</p>
          <div className="mt-7 flex flex-wrap gap-3"><button type="button" className="rounded-lg bg-white px-5 py-3 font-black text-emerald-950">{copy.primaryAction}</button><button type="button" className="rounded-lg border border-white/40 px-5 py-3 font-black text-white">{copy.secondaryAction}</button></div>
        </div>
        <div className="grid gap-6 p-6 sm:p-10 md:grid-cols-2">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">The problem</p><p className="mt-3 text-gray-800">{plan.idea.problem}</p></div>
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">What customers do today</p><p className="mt-3 text-gray-800">{plan.idea.currentWorkaround}</p></div>
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">The proposed offer</p><p className="mt-3 text-gray-800">{plan.idea.offerHypothesis}</p></div>
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">Validation-stage proof</p><p className="mt-3 text-gray-800">No testimonials, customer counts, or results are claimed. Add proof only after it exists and can be verified.</p></div>
        </div>
      </div>
      <button type="button" onClick={() => void onCopy('Launch-page copy', `${copy.targetCallout}\n${copy.headline}\n${copy.subheadline}\n${copy.price}\n${copy.primaryAction}`)} className="rounded-lg border border-ghost-forest px-5 py-3 font-black text-ghost-forest">Copy launch-page copy</button>
      <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">This SPA preview is the first vertical slice. ZIP generation, editable business fields, Cloudflare deployment instructions, legal placeholders, and domain connection assets still need to be generated from a versioned site data contract.</p>
    </div>
  );
}

function Calendar({ plan, currentDay, currentPhaseTitle, selectedDay, completedDays, onSelectDay, onToggleDay }: { plan: ExecutionPlan30Day; currentDay: DayTask; currentPhaseTitle: string; selectedDay: number; completedDays: number[]; onSelectDay: (day: number) => void; onToggleDay: (day: number) => void }) {
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="8 · Personalized 30-day launch roadmap" title="Every day ends with evidence" description="Each action includes why it matters, exact work, a deliverable, and a success measurement." />
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="max-h-[720px] space-y-2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3">
          {plan.days.map(day => {
            const complete = completedDays.includes(day.dayNumber);
            return <button key={day.dayNumber} type="button" onClick={() => onSelectDay(day.dayNumber)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${selectedDay === day.dayNumber ? 'bg-ghost-forest text-white' : 'hover:bg-gray-50'}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${complete ? 'bg-green-600 text-white' : selectedDay === day.dayNumber ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'}`}>{complete ? '✓' : day.dayNumber}</span><span><span className="block text-xs font-black uppercase tracking-[0.12em] opacity-70">Day {day.dayNumber}</span><span className="block text-sm font-bold">{day.title}</span></span></button>;
          })}
        </div>
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">Day {currentDay.dayNumber} · {currentPhaseTitle}</p><h3 className="mt-2 font-display text-3xl font-semibold text-gray-950">{currentDay.title}</h3><p className="mt-3 text-lg text-gray-700">{currentDay.objective}</p></div>
            <button type="button" onClick={() => onToggleDay(currentDay.dayNumber)} className={`shrink-0 rounded-lg px-4 py-3 text-sm font-black ${completedDays.includes(currentDay.dayNumber) ? 'border border-green-600 bg-white text-green-700' : 'bg-ghost-forest text-white'}`}>{completedDays.includes(currentDay.dayNumber) ? 'Mark incomplete' : 'Complete milestone'}</button>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Effort" value={`${currentDay.timeBudgetMinutes} minutes`} /><Metric label="Cash limit" value={`${currentDay.cashBudget.currency} ${currentDay.cashBudget.maximumAmount}`} /><Metric label="Expected assets" value={`${currentDay.expectedArtifacts.length}`} /></div>
          <DetailBlock title="Why it matters"><p>{currentDay.whyItMatters}</p></DetailBlock>
          <DetailBlock title="Exact instructions"><ol className="space-y-3">{currentDay.actions.map((item, index) => <li key={item.actionId} className="rounded-xl bg-gray-50 p-4"><div className="flex gap-3"><span className="font-black text-ghost-rust">{index + 1}.</span><div><p className="font-semibold text-gray-900">{item.description}</p><p className="mt-1 text-xs text-gray-500">Quantity: {item.quantity} · {item.truthLabel}</p></div></div></li>)}</ol></DetailBlock>
          <DetailBlock title="Deliverable"><ul className="space-y-2">{currentDay.expectedArtifacts.map(item => <li key={item}>• {item}</li>)}</ul></DetailBlock>
          <DetailBlock title="Evidence to record"><ul className="space-y-3">{currentDay.requiredEvidence.map(item => <li key={item.evidenceId} className="rounded-xl border border-gray-200 p-4"><p className="font-semibold">{item.description}</p><p className="mt-1 text-xs text-gray-500">Minimum: {item.minimumQuantity}</p></li>)}</ul></DetailBlock>
          <div className="mt-7 grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-green-200 bg-green-50 p-5"><p className="text-xs font-black uppercase tracking-[0.15em] text-green-800">Success measurement</p><p className="mt-2 text-sm text-green-950">{currentDay.passThreshold}</p></div><div className="rounded-xl border border-red-200 bg-red-50 p-5"><p className="text-xs font-black uppercase tracking-[0.15em] text-red-800">Failure signal</p><p className="mt-2 text-sm text-red-950">{currentDay.failThreshold}</p></div></div>
        </article>
      </div>
    </div>
  );
}

function Decision({ plan }: { plan: ExecutionPlan30Day }) {
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Day 29–30 · Final decision" title="Make the next decision from observable evidence" description="Do not create another 30-day plan unless the evidence supports continuing." />
      <div className="grid gap-4 md:grid-cols-2">{plan.decisionRules.map(rule => <article key={rule.ruleId} className="rounded-2xl border border-gray-200 bg-white p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">{rule.outcome}</p><h3 className="mt-2 font-display text-2xl font-semibold text-gray-950">When this is true</h3><p className="mt-3 text-gray-700">{rule.condition}</p><p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-900">Next: {rule.nextAction}</p></article>)}</div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6"><h3 className="font-display text-2xl font-semibold text-gray-950">Weekly checkpoints</h3><div className="mt-4 space-y-4">{plan.weeklyCheckpoints.map(checkpoint => <details key={checkpoint.checkpointId} className="rounded-xl border border-gray-200 p-4"><summary className="cursor-pointer font-black text-gray-950">Day {checkpoint.dayNumber}: {checkpoint.title}</summary><ul className="mt-4 space-y-2 text-sm text-gray-700">{checkpoint.questions.map(question => <li key={question}>• {question}</li>)}</ul><div className="mt-4 grid gap-3 sm:grid-cols-2"><p className="rounded-lg bg-green-50 p-3 text-sm text-green-900"><strong>Pass:</strong> {checkpoint.passSignal}</p><p className="rounded-lg bg-red-50 p-3 text-sm text-red-900"><strong>Fail:</strong> {checkpoint.failSignal}</p></div></details>)}</div></div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-rust">{eyebrow}</p><h2 className="mt-2 font-display text-3xl font-semibold text-gray-950 sm:text-4xl">{title}</h2><p className="mt-3 max-w-3xl text-gray-600">{description}</p></header>;
}

function DecisionCard({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">{label}</p><p className="mt-3 leading-7 text-gray-900">{value}</p></article>;
}

function TruthPanel({ title, claims }: { title: string; claims: Array<{ label: TruthLabel; text: string }> }) {
  return <section className="rounded-2xl border border-gray-200 bg-white p-6"><h3 className="font-display text-2xl font-semibold text-gray-950">{title}</h3><div className="mt-4 space-y-3">{claims.map((item, index) => <div key={`${item.label}-${index}`} className="flex gap-3 rounded-xl bg-gray-50 p-4"><TruthBadge label={item.label} /><p className="text-sm text-gray-800">{item.text}</p></div>)}</div></section>;
}

function TruthBadge({ label }: { label: TruthLabel }) {
  const classes = label === 'Verified' ? 'bg-green-100 text-green-800' : label === 'Inferred' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900';
  return <span className={`h-fit shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${classes}`}>{label}</span>;
}

function CopyButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-50">Copy</button>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">{label}</p><p className="mt-1 font-bold text-gray-950">{value}</p></div>;
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-7"><h4 className="font-display text-xl font-semibold text-gray-950">{title}</h4><div className="mt-3 text-sm leading-6 text-gray-700">{children}</div></section>;
}

function progressKey(orderId: string): string {
  return `ghosttown_blueprint_progress_v1_${orderId}`;
}

function loadCompletedDays(orderId: string): number[] {
  try {
    const value = JSON.parse(localStorage.getItem(progressKey(orderId)) || '[]');
    return Array.isArray(value) ? value.filter(item => Number.isInteger(item) && item >= 1 && item <= 30) : [];
  } catch {
    return [];
  }
}
