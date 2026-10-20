import { EvaluationResult, PublicVideoResult } from '../types/lit';
import ShareCard from './ShareCard';
import { loadResearchSignals, saveLatestResult } from '../lib/storage';
import { useEffect } from 'react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import ActionPlanModal from './ActionPlanModal';
import PaywallModal from './PaywallModal';
import type { PaidTestIntake } from '../types/paidTest';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import type { PrePurchaseResearchSignals as ResearchSignals } from '../types/researchSignals';
import { buildVerdictDecisionV2 } from '../verdict/verdictDecisionV2';
import { buildVerdictDecisionV3 } from '../verdict/verdictDecisionV3';
import { explainVerdict } from '../lib/verdictWhy';
import { presentVerdict } from '../lib/verdictPresentation';
import EvidenceScanPanel from './EvidenceScanPanel';
import First30Waitlist from './First30Waitlist';
import { FIRST30_OFFER_ACTIVE, SPRINT_OFFER_ACTIVE } from '../lib/postVerdictOffer';
import First30PurchasePanel from './First30PurchasePanel';

interface Props {
  result: EvaluationResult;
  onReset: () => void;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onRewardClaimed: () => void;
  locale: 'en' | 'es';
}

export default function ResultReport({ result, onReset, isLoggedIn, onLoginClick, onRewardClaimed, locale }: Props) {
  const [paidLoading, setPaidLoading] = useState(false);
  const [paidError, setPaidError] = useState('');
  const [showActionPlanForm, setShowActionPlanForm] = useState(false);
  const [showDeclinedPlanOffer, setShowDeclinedPlanOffer] = useState(false);
  const [video, setVideo] = useState<PublicVideoResult | undefined>(result.video);
  const [researchSignals, setResearchSignals] = useState<ResearchSignals | null>(() => loadResearchSignals(result.resultId));
  const scores = result.deterministicScores;
  const decisionV2 = result.verdictDecisionV2 ?? buildVerdictDecisionV2({
    idea: result.idea,
    scores: result.deterministicScores
  });
  const decisionV3 = result.evidenceScan
    ? result.verdictDecisionV3?.evidenceModelVersion === 'seven-layer-v1'
      ? result.verdictDecisionV3
      : buildVerdictDecisionV3({
          idea: result.idea,
          scores: result.deterministicScores,
          evidenceScan: result.evidenceScan
        })
    : undefined;
  const decision = decisionV3 ?? decisionV2;
  const why = explainVerdict(decision, locale);
  const view = presentVerdict(result, decision, locale);
  const whyLine = (text: string, testId?: string) => <p data-testid={testId} className="mt-3 max-w-2xl text-sm leading-6 text-gray-800"><strong>{why.label}:</strong> {text}</p>;

  useEffect(() => {
    saveLatestResult(result);
    if (isLoggedIn) {
      void fetch(apiUrl('/api/results'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ result })
      });
    }
  }, [isLoggedIn, result]);

  useEffect(() => {
    setVideo(result.video);
    setResearchSignals(loadResearchSignals(result.resultId));
  }, [result]);

  useEffect(() => {
    if (!video || video.status === 'complete') return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(apiUrl(video.status_url));
        if (!response.ok) return;
        const next = await response.json<PublicVideoResult>();
        if (active) setVideo(next);
      } catch {
        // The report remains available while a transient video-status request retries.
      }
    };
    const interval = window.setInterval(() => void refresh(), 4000);
    void refresh();
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [video?.job_id, video?.status, video?.status_url]);

  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;

  const openActionPlanForm = () => {
    if (!isLoggedIn) { onLoginClick(); return; }
    setPaidError('');
    setShowActionPlanForm(true);
  };

  const startPaidTest = async (intake: PaidTestIntake) => {
    setPaidLoading(true); setPaidError('');
    try {
      // Establish/confirm this account's owner-scoped verdict before checkout.
      // The server ignores client verdict content and claims only its own
      // server-issued verdict instance for this resultId.
      const claimResponse = await fetch(apiUrl('/api/results'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ result })
      });
      if (!claimResponse.ok) {
        throw new Error('Save this verdict to your account before checkout. Please log in again and retry.');
      }
      const response = await fetch(apiUrl(FIRST30_OFFER_ACTIVE ? '/api/first30/checkout' : '/api/paid-test/checkout'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(intake) });
      const data = await response.json<{ sessionUrl?: string; error?: string }>();
      if (!response.ok || !data.sessionUrl) throw new Error(data.error || 'Checkout is not available right now');
      window.location.assign(data.sessionUrl);
    } catch (error) { setPaidError(error instanceof Error ? error.message : 'Checkout failed'); setPaidLoading(false); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-10 sm:pb-10">
      {result.evidenceScan && decisionV3 && <EvidenceScanPanel scan={result.evidenceScan} decision={decisionV3} idea={result.idea} locale={locale} />}
      <section data-testid="verdict-decision-v2" data-verdict-version={decisionV3 ? 'v3' : 'v2'} className="mb-8 overflow-hidden rounded-2xl border border-ghost-rust/30 bg-white shadow-dust">
        <div data-testid="verdict-card" className="border-b border-ghost-rust/20 bg-[#fff7f2] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ghost-rust">{view.labels.decision}</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-gray-950">{view.decisionLabel}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-700">{view.confidenceText}</p>
          {whyLine(why.decision, 'verdict-why')}
          <p className="mt-3 text-sm text-gray-600">{view.disclaimer}</p>
        </div>

        <div className="grid gap-4 p-6 sm:p-8">
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">{view.labels.biggestUnknown}</p>
            <h2 className="mt-2 text-xl font-black text-gray-950">{view.biggestUnknown.question}</h2>
            <p className="mt-2 leading-7 text-gray-700">{view.biggestUnknown.why}</p>
          </article>

          <article data-testid="next-step" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800">{view.labels.fastestTest}</p>
            <h2 className="mt-2 text-xl font-black text-gray-950">{view.test.text}</h2>
            {whyLine(why.test)}
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-white/80 p-3"><dt className="font-black text-gray-900">{view.labels.who}</dt><dd className="mt-1 text-gray-700">{view.test.who}</dd></div>
              <div className="rounded-lg bg-white/80 p-3"><dt className="font-black text-gray-900">{view.labels.good}</dt><dd className="mt-1 text-gray-700">{view.test.good}</dd></div>
              <div className="rounded-lg bg-white/80 p-3"><dt className="font-black text-gray-900">{view.labels.stop}</dt><dd className="mt-1 text-gray-700">{view.test.stop}</dd></div>
              <div className="rounded-lg bg-white/80 p-3"><dt className="font-black text-gray-900">{view.labels.limit}</dt><dd className="mt-1 text-gray-700">{view.test.limit}</dd></div>
            </dl>
          </article>

          <article className="rounded-xl border-2 border-ghost-rust bg-white p-5 shadow-lantern">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-rust">{view.labels.doFirst}</p>
            <h2 className="mt-2 text-2xl font-black leading-8 text-gray-950">{view.firstAction}</h2>
            {whyLine(why.firstAction)}
          </article>
        </div>

        <div className="space-y-6 border-t border-gray-200 p-6 text-sm text-gray-800 sm:p-8">
          <DecisionSection title={view.labels.testing}>
            <p>{view.testing.target}</p>
            <dl className="mt-3 grid gap-2 rounded-sm bg-gray-50 p-3 sm:grid-cols-2">
              <div><dt className="font-bold">{view.labels.customer}</dt><dd>{view.testing.customer}</dd></div>
              <div><dt className="font-bold">{view.labels.problem}</dt><dd>{view.testing.problem}</dd></div>
              <div><dt className="font-bold">{view.labels.offer}</dt><dd>{view.testing.offer}</dd></div>
              <div><dt className="font-bold">{view.labels.commitment}</dt><dd>{view.testing.commitment}</dd></div>
            </dl>
          </DecisionSection>
          <DecisionSection title={view.labels.confidence}><p><span className="font-bold">{view.confidenceLevel}.</span> {view.confidenceText}</p></DecisionSection>
          <DecisionSection title={view.labels.mayWork}><DecisionList items={view.reasonsFor} /></DecisionSection>
          <DecisionSection title={view.labels.mayFail}><DecisionList items={view.reasonsAgainst} /></DecisionSection>
          <DecisionSection title={view.labels.wouldChange}><DecisionList items={view.wouldChange} /></DecisionSection>
          <DecisionSection title={view.labels.evidenceLabels}>
            <ul className="space-y-2">
              {view.evidenceLabels.map((item, index) => <li key={`${item.statement}-${index}`} className="rounded-sm border border-gray-200 p-3"><span className="mr-2 text-xs font-bold uppercase tracking-wide text-gray-500">{item.label}</span>{item.statement}</li>)}
            </ul>
          </DecisionSection>
        </div>
      </section>

      {video && (
        <section className="mb-8 rounded-sm border border-gray-200 bg-gray-950 p-5 text-white shadow-dust">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ghost-gold">{view.labels.video}</p>
          {video.status === 'complete' && video.video_url ? (
            <video
              className="mx-auto mt-4 max-h-[70vh] w-full max-w-sm rounded bg-black"
              controls
              playsInline
              preload="metadata"
              src={apiUrl(video.video_url)}
            >
              {view.labels.videoUnsupported}
            </video>
          ) : (
            <div className="mt-4 rounded border border-white/15 bg-white/5 p-6 text-center">
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-ghost-gold border-t-transparent" />
              <p className="font-bold">{view.labels.videoPreparing}</p>
              <p className="mt-2 text-sm text-white/70">{view.labels.videoReady}</p>
            </div>
          )}
          <p className="mt-4 text-xs text-white/60">{view.labels.videoPublic}</p>
        </section>
      )}

      <details data-testid="detailed-analysis" className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-dust">
        <summary className="cursor-pointer list-none p-5 font-black text-gray-950 focus:outline-none focus:ring-4 focus:ring-ghost-rust/20 sm:p-6">
          <span className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-lg">{view.labels.detailed}</span>
              <span className="mt-1 block text-sm font-normal text-gray-600">{view.labels.detailedSub}</span>
            </span>
            <span aria-hidden="true" className="text-2xl text-ghost-rust">＋</span>
          </span>
        </summary>
        <div className="border-t border-gray-200 p-5 sm:p-6">
          <p className="mb-5 text-sm leading-6 text-gray-600">{view.labels.detailedIntro}</p>
          <p className="mb-4 text-sm font-semibold text-gray-800">{why.scoresIntro}</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <ScoreCard testId="risk-level" name={view.scores.names.ghostTownRisk} value={scores.ghostTownScore} band={view.scores.risk} meaning={why.scores.ghostTownRisk} />
            <ScoreCard testId="lit-score" name={view.scores.names.lit} value={scores.litScore} band={view.scores.litBand} meaning={why.scores.lit} />
            <ScoreCard name={view.scores.names.leverage} value={scores.leverageScore} meaning={why.scores.leverage} />
            <ScoreCard name={view.scores.names.insight} value={scores.insightScore} meaning={why.scores.insight} />
            <ScoreCard name={view.scores.names.timing} value={scores.timingScore} meaning={why.scores.timing} />
            <ScoreCard name={view.scores.names.highWalls} value={scores.highWallsScore} band={view.scores.highWallsBand} meaning={why.scores.highWalls} />
          </div>

          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h3 className="font-bold text-blue-900">{view.labels.businessType}: {view.dna.type}</h3>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-sm font-bold text-blue-900">{view.labels.trap}</p>
                <p className="text-sm text-blue-800">{view.dna.trap}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">{view.labels.win}</p>
                <p className="text-sm text-blue-800">{view.dna.win}</p>
              </div>
            </div>
          </div>
        </div>
      </details>

      <p data-testid="verdict-ask-more" className="mb-8 text-sm text-gray-700">{why.askMore.before}<a className="font-bold text-ghost-rust underline" href={`mailto:${why.askMore.email}`}>{why.askMore.email}</a>{why.askMore.after}</p>

      <ShareCard
        result={result}
        isLoggedIn={isLoggedIn}
        onLoginClick={onLoginClick}
        onRewardClaimed={onRewardClaimed}
        locale={locale}
      />

      {!SPRINT_OFFER_ACTIVE && !FIRST30_OFFER_ACTIVE && <First30Waitlist source="verdict" verdictId={result.resultId} locale={locale} />}
      {FIRST30_OFFER_ACTIVE && <First30PurchasePanel locale={locale} loading={paidLoading} error={paidError} onStart={openActionPlanForm} />}

      {SPRINT_OFFER_ACTIVE && <section id="thirty-day-plan" className="mb-8 rounded-sm border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ghost-rust">30-Day Evidence Sprint</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-ghost-ink">Know what to do with your idea 30 days from now.</h2>
        <p className="mt-3 text-sm leading-6 text-gray-700">{GHOSTTOWN_30_DAY_PLAN_V1.subtitle}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PersuasionCard label="Know what to do" text={GHOSTTOWN_30_DAY_PLAN_V1.persuasion.gain} />
          <PersuasionCard label="Stop guessing" text={GHOSTTOWN_30_DAY_PLAN_V1.persuasion.relief} />
          <PersuasionCard label="Do not lose another month" text={GHOSTTOWN_30_DAY_PLAN_V1.persuasion.risk} />
          <PersuasionCard label="Do not quit for the wrong reason" text={GHOSTTOWN_30_DAY_PLAN_V1.persuasion.miss} />
        </div>
        <p className="mt-4 rounded-lg border border-ghost-forest/20 bg-white p-4 text-sm font-bold text-ghost-ink"><span className="text-ghost-forest">Start now:</span> {GHOSTTOWN_30_DAY_PLAN_V1.persuasion.immediatePayoff}</p>
        <p className="mt-4 text-xs leading-5 text-gray-600">{GHOSTTOWN_30_DAY_PLAN_V1.persuasion.truthBoundary}</p>
        {paidError && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{paidError}</p>}
        <button type="button" aria-label="Start 30-Day Evidence Sprint checkout" onClick={openActionPlanForm} disabled={paidLoading} className="mt-5 min-h-14 w-full rounded-sm bg-ghost-rust px-5 py-4 font-bold text-white shadow-lantern hover:bg-[#96360d] disabled:opacity-50">
          {paidLoading ? 'Opening checkout...' : `Run the 30-Day Evidence Sprint - ${displayPrice}`}
        </button>
      </section>}

      <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
        <button
          onClick={onReset}
          className="rounded bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
        >
          {view.labels.testAnother}
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ghost-rust/20 bg-[#fff7f2]/95 p-3 backdrop-blur sm:hidden">
        {SPRINT_OFFER_ACTIVE ? (
          <button type="button" aria-label="Start 30-Day Evidence Sprint checkout" onClick={openActionPlanForm} disabled={paidLoading} className="min-h-14 w-full rounded-sm bg-ghost-rust px-5 py-3 font-bold text-white shadow-lantern disabled:opacity-50">
            {paidLoading ? 'Opening checkout...' : `Run the Evidence Sprint - ${displayPrice}`}
          </button>
        ) : (
          <a href="#first-30" className="flex min-h-14 w-full items-center justify-center rounded-sm bg-ghost-rust px-5 py-3 font-bold text-white shadow-lantern">
            {FIRST30_OFFER_ACTIVE ? view.labels.stickyFirst30Buy : view.labels.stickyFirst30}
          </a>
        )}
      </div>

      {showActionPlanForm && (
        <ActionPlanModal
          idea={result.idea}
          verdictId={result.resultId}
          loading={paidLoading}
          error={paidError}
          onClose={() => {
            setShowActionPlanForm(false);
            if (SPRINT_OFFER_ACTIVE) setShowDeclinedPlanOffer(true);
          }}
          onSubmit={intake => void startPaidTest(intake)}
          researchSignals={researchSignals}
          locale={locale}
          offer={FIRST30_OFFER_ACTIVE ? 'first30' : 'sprint'}
        />
      )}

      {showDeclinedPlanOffer && (
        <PaywallModal
          context="plan-declined"
          isLoggedIn={isLoggedIn}
          onLoginClick={onLoginClick}
          onClose={() => setShowDeclinedPlanOffer(false)}
        />
      )}

      <div className="mt-8 border-t border-gray-200 pt-6 text-center">
        <p className="text-xs text-gray-500">
          {view.footer.madeAt}{view.footer.cached}{' '}{new Date(result.generatedAt).toLocaleString(locale === 'es' ? 'es-PR' : 'en-US')}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          {view.footer.boundary}
        </p>
      </div>
    </div>
  );
}

function ScoreCard({ name, value, band, meaning, testId }: { name: string; value: number; band?: string; meaning: string; testId?: string }) {
  return (
    <div data-testid={testId} className="rounded-sm border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs font-bold uppercase text-gray-600">{name}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}/5</div>
      {band && <div className="mt-1 text-xs text-gray-500">{band}</div>}
      <p className="mt-2 text-xs leading-5 text-gray-600">{meaning}</p>
    </div>
  );
}

function PersuasionCard({ label, text }: { label: string; text: string }) {
  return <article className="rounded-lg border border-ghost-rust/15 bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-rust">{label}</p><p className="mt-2 text-sm leading-6 text-gray-700">{text}</p></article>;
}

function DecisionSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ghost-rust">{title}</h2><div className="mt-2 leading-6">{children}</div></section>;
}

function DecisionList({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-1 pl-5">{items.map(item => <li key={item}>{item}</li>)}</ul>;
}
