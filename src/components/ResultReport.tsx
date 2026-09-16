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
import EvidenceScanPanel from './EvidenceScanPanel';

interface Props {
  result: EvaluationResult;
  onReset: () => void;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onRewardClaimed: () => void;
  locale: 'en' | 'es';
}

export default function ResultReport({ result, onReset, isLoggedIn, onLoginClick, onRewardClaimed }: Props) {
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
      const response = await fetch(apiUrl('/api/paid-test/checkout'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(intake) });
      const data = await response.json<{ sessionUrl?: string; error?: string }>();
      if (!response.ok || !data.sessionUrl) throw new Error(data.error || 'Checkout is not available right now');
      window.location.assign(data.sessionUrl);
    } catch (error) { setPaidError(error instanceof Error ? error.message : 'Checkout failed'); setPaidLoading(false); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-10 sm:pb-10">
      {result.evidenceScan && decisionV3 && <EvidenceScanPanel scan={result.evidenceScan} decision={decisionV3} />}
      <section data-testid="verdict-decision-v2" data-verdict-version={decisionV3 ? 'v3' : 'v2'} className="mb-8 overflow-hidden rounded-2xl border border-ghost-rust/30 bg-white shadow-dust">
        <div data-testid="verdict-card" className="border-b border-ghost-rust/20 bg-[#fff7f2] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ghost-rust">Decision</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-gray-950">{decision.decision.replace(/_/g, ' ')}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-700">{decision.confidence.rationale}</p>
          <p className="mt-3 text-sm text-gray-600">This tells you what is worth testing next. It is not a prediction that the whole business will succeed.</p>
        </div>

        <div className="grid gap-4 p-6 sm:p-8">
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Biggest unknown</p>
            <h2 className="mt-2 text-xl font-black text-gray-950">{decision.largestUncertainty.assumption}</h2>
            <p className="mt-2 leading-7 text-gray-700">{decision.largestUncertainty.whyItMatters}</p>
          </article>

          <article data-testid="next-step" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800">Fastest test</p>
            <h2 className="mt-2 text-xl font-black text-gray-950">{decision.cheapestFalsification.test}</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-white/80 p-3"><dt className="font-black text-gray-900">Who to test</dt><dd className="mt-1 text-gray-700">{decision.cheapestFalsification.target}</dd></div>
              <div className="rounded-lg bg-white/80 p-3"><dt className="font-black text-gray-900">Good result</dt><dd className="mt-1 text-gray-700">{decision.cheapestFalsification.successThreshold}</dd></div>
              <div className="rounded-lg bg-white/80 p-3"><dt className="font-black text-gray-900">Stop / revise</dt><dd className="mt-1 text-gray-700">{decision.cheapestFalsification.failureThreshold}</dd></div>
              <div className="rounded-lg bg-white/80 p-3"><dt className="font-black text-gray-900">Limit</dt><dd className="mt-1 text-gray-700">{decision.cheapestFalsification.maximumTime} · {decision.cheapestFalsification.maximumCash}</dd></div>
            </dl>
          </article>

          <article className="rounded-xl border-2 border-ghost-rust bg-white p-5 shadow-lantern">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-rust">Do this first</p>
            <h2 className="mt-2 text-2xl font-black leading-8 text-gray-950">{decision.firstAction.action}</h2>
          </article>
        </div>

        <div className="space-y-6 border-t border-gray-200 p-6 text-sm text-gray-800 sm:p-8">
          <DecisionSection title="What we are testing">
            <p>{decision.predictionTarget}</p>
            <dl className="mt-3 grid gap-2 rounded-sm bg-gray-50 p-3 sm:grid-cols-2">
              <div><dt className="font-bold">Customer</dt><dd>{decision.customer.initialCustomer}</dd></div>
              <div><dt className="font-bold">Problem</dt><dd>{decision.problem.painfulProblem}</dd></div>
              <div><dt className="font-bold">Offer</dt><dd>{decision.offerHypothesis.offer}</dd></div>
              <div><dt className="font-bold">Commitment</dt><dd>{decision.offerHypothesis.commitmentRequested}{decision.offerHypothesis.priceOrCommitmentRange ? ` (${decision.offerHypothesis.priceOrCommitmentRange})` : ''}</dd></div>
            </dl>
          </DecisionSection>
          <DecisionSection title="Confidence"><p><span className="font-bold">{decision.confidence.level}.</span> {decision.confidence.rationale}</p></DecisionSection>
          <DecisionSection title="Why this may work"><DecisionList items={decision.reasonsFor} /></DecisionSection>
          <DecisionSection title="Why this may fail"><DecisionList items={decision.reasonsAgainst} /></DecisionSection>
          <DecisionSection title="What would change this verdict"><DecisionList items={decision.whatWouldChangeTheVerdict} /></DecisionSection>
          <DecisionSection title="Evidence labels">
            <ul className="space-y-2">
              {decision.evidenceLabels.map((label, index) => <li key={`${label.statement}-${index}`} className="rounded-sm border border-gray-200 p-3"><span className="mr-2 text-xs font-bold uppercase tracking-wide text-gray-500">{label.truthLabel}</span>{label.statement}</li>)}
            </ul>
          </DecisionSection>
        </div>
      </section>

      {video && (
        <section className="mb-8 rounded-sm border border-gray-200 bg-gray-950 p-5 text-white shadow-dust">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ghost-gold">Your public short</p>
          {video.status === 'complete' && video.video_url ? (
            <video
              className="mx-auto mt-4 max-h-[70vh] w-full max-w-sm rounded bg-black"
              controls
              playsInline
              preload="metadata"
              src={apiUrl(video.video_url)}
            >
              Your browser does not support MP4 video.
            </video>
          ) : (
            <div className="mt-4 rounded border border-white/15 bg-white/5 p-6 text-center">
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-ghost-gold border-t-transparent" />
              <p className="font-bold">Shorts Factory is preparing the video.</p>
              <p className="mt-2 text-sm text-white/70">Your report is ready now. This panel updates automatically.</p>
            </div>
          )}
          <p className="mt-4 text-xs text-white/60">
            Public content · eligible for reuse and distribution after media verification.
          </p>
        </section>
      )}

      <details data-testid="detailed-analysis" className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-dust">
        <summary className="cursor-pointer list-none p-5 font-black text-gray-950 focus:outline-none focus:ring-4 focus:ring-ghost-rust/20 sm:p-6">
          <span className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-lg">Detailed analysis</span>
              <span className="mt-1 block text-sm font-normal text-gray-600">Diagnostic scores and business-model notes</span>
            </span>
            <span aria-hidden="true" className="text-2xl text-ghost-rust">＋</span>
          </span>
        </summary>
        <div className="border-t border-gray-200 p-5 sm:p-6">
          <p className="mb-5 text-sm leading-6 text-gray-600">These diagnostics help explain the decision. They are not a prediction that the business will succeed.</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div data-testid="risk-level" className="rounded-sm border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-bold uppercase text-gray-600">Ghost Town Risk</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{scores.ghostTownScore}/5</div>
              <div className="mt-1 text-xs text-gray-500">{scores.ghostTownRisk} risk</div>
            </div>

            <div data-testid="lit-score" className="rounded-sm border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-bold uppercase text-gray-600">LIT Score</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{scores.litScore}/5</div>
              <div className="mt-1 text-xs text-gray-500">{scores.litBand}</div>
            </div>

            <div className="rounded-sm border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-bold uppercase text-gray-600">Leverage</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{scores.leverageScore}/5</div>
            </div>

            <div className="rounded-sm border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-bold uppercase text-gray-600">Insight</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{scores.insightScore}/5</div>
            </div>

            <div className="rounded-sm border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-bold uppercase text-gray-600">Timing</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{scores.timingScore}/5</div>
            </div>

            <div className="rounded-sm border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-bold uppercase text-gray-600">High Walls</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{scores.highWallsScore}/5</div>
              <div className="mt-1 text-xs text-gray-500">{scores.highWallsBand}</div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h3 className="font-bold text-blue-900">Business DNA: {scores.businessDnaType}</h3>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-sm font-bold text-blue-900">The Trap:</p>
                <p className="text-sm text-blue-800">{scores.businessDnaTrap}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">How to Win:</p>
                <p className="text-sm text-blue-800">{scores.businessDnaWinStrategy}</p>
              </div>
            </div>
          </div>
        </div>
      </details>

      <ShareCard
        result={result}
        isLoggedIn={isLoggedIn}
        onLoginClick={onLoginClick}
        onRewardClaimed={onRewardClaimed}
      />

      <section id="thirty-day-plan" className="mb-8 rounded-sm border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern">
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
      </section>

      <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
        <button
          onClick={onReset}
          className="rounded bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
        >
          Test Another Idea
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ghost-rust/20 bg-[#fff7f2]/95 p-3 backdrop-blur sm:hidden">
        <button type="button" aria-label="Start 30-Day Evidence Sprint checkout" onClick={openActionPlanForm} disabled={paidLoading} className="min-h-14 w-full rounded-sm bg-ghost-rust px-5 py-3 font-bold text-white shadow-lantern disabled:opacity-50">
          {paidLoading ? 'Opening checkout...' : `Run the Evidence Sprint - ${displayPrice}`}
        </button>
      </div>

      {showActionPlanForm && (
        <ActionPlanModal
          idea={result.idea}
          verdictId={result.resultId}
          loading={paidLoading}
          error={paidError}
          onClose={() => {
            setShowActionPlanForm(false);
            setShowDeclinedPlanOffer(true);
          }}
          onSubmit={intake => void startPaidTest(intake)}
          researchSignals={researchSignals}
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
          GhostTown Test verdict{result.cacheHit ? ' (cached report)' : ''}
          {' '}at {new Date(result.generatedAt).toLocaleString()}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          This is a judgment tool to help you decide what to test next. Not a guarantee of success.
        </p>
      </div>
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
