import { EvaluationResult, PublicVideoResult } from '../types/lit';
import ShareCard from './ShareCard';
import { loadResearchSignals, saveLatestResult } from '../lib/storage';
import { useEffect } from 'react';
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import ActionPlanModal from './ActionPlanModal';
import PaywallModal from './PaywallModal';
import type { PaidTestIntake } from '../types/paidTest';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import PrePurchaseResearchSignals from './PrePurchaseResearchSignals';
import type { PrePurchaseResearchSignals as ResearchSignals } from '../types/researchSignals';
import { buildVerdictDecisionV2 } from '../verdict/verdictDecisionV2';

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

  // Save result to localStorage
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

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'WORTH_TESTING':
        return 'text-blue-900 bg-blue-50 border-blue-200';
      case 'REVISE_BEFORE_TESTING':
        return 'text-yellow-900 bg-yellow-50 border-yellow-200';
      case 'WEAK_EVIDENCE':
        return 'text-orange-900 bg-orange-50 border-orange-200';
      case 'DO_NOT_PURSUE_YET':
        return 'text-red-900 bg-red-50 border-red-200';
      default:
        return 'text-gray-900 bg-gray-50 border-gray-200';
    }
  };

  const verdictColorClass = getDecisionColor(decisionV2.decision);
  const litPercent = Math.round(scores.litScore * 20);
  const scoreTone = litPercent >= 75 ? 'text-ghost-sage' : litPercent >= 50 ? 'text-amber-700' : 'text-red-700';
  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;

  const openActionPlanForm = () => {
    if (!isLoggedIn) { onLoginClick(); return; }
    setPaidError('');
    setShowActionPlanForm(true);
  };

  const startPaidTest = async (intake: PaidTestIntake) => {
    setPaidLoading(true); setPaidError('');
    try {
      const response = await fetch(apiUrl('/api/paid-test/checkout'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(intake) });
      const data = await response.json<{ sessionUrl?: string; error?: string }>();
      if (!response.ok || !data.sessionUrl) throw new Error(data.error || 'Checkout is not available right now');
      window.location.assign(data.sessionUrl);
    } catch (error) { setPaidError(error instanceof Error ? error.message : 'Checkout failed'); setPaidLoading(false); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-10 sm:pb-10">
      <section data-testid="verdict-decision-v2" className="mb-8 overflow-hidden rounded-sm border border-ghost-rust/30 bg-white shadow-dust">
        <div className="border-b border-ghost-rust/20 bg-[#fff7f2] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ghost-rust">Decision</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-gray-950">{decisionV2.decision.replace(/_/g, ' ')}</h1>
          <p className="mt-3 text-gray-700">This is a bounded judgment about the next customer commitment test, not a prediction of whole-business success.</p>
        </div>
        <div className="space-y-6 p-6 text-sm text-gray-800 sm:p-8">
          <DecisionSection title="What we are actually predicting">
            <p>{decisionV2.predictionTarget}</p>
            <dl className="mt-3 grid gap-2 rounded-sm bg-gray-50 p-3 sm:grid-cols-2">
              <div><dt className="font-bold">Customer</dt><dd>{decisionV2.customer.initialCustomer}</dd></div>
              <div><dt className="font-bold">Problem</dt><dd>{decisionV2.problem.painfulProblem}</dd></div>
              <div><dt className="font-bold">Offer</dt><dd>{decisionV2.offerHypothesis.offer}</dd></div>
              <div><dt className="font-bold">Commitment</dt><dd>{decisionV2.offerHypothesis.commitmentRequested}{decisionV2.offerHypothesis.priceOrCommitmentRange ? ` (${decisionV2.offerHypothesis.priceOrCommitmentRange})` : ''}</dd></div>
            </dl>
          </DecisionSection>
          <DecisionSection title="Confidence"><p><span className="font-bold">{decisionV2.confidence.level}.</span> {decisionV2.confidence.rationale}</p></DecisionSection>
          <DecisionSection title="Why this may work"><DecisionList items={decisionV2.reasonsFor} /></DecisionSection>
          <DecisionSection title="Why this may fail"><DecisionList items={decisionV2.reasonsAgainst} /></DecisionSection>
          <DecisionSection title="Biggest unknown"><p className="font-bold">{decisionV2.largestUncertainty.assumption}</p><p className="mt-1">{decisionV2.largestUncertainty.whyItMatters}</p></DecisionSection>
          <DecisionSection title="Cheapest way to prove us wrong">
            <p>{decisionV2.cheapestFalsification.test}</p>
            <dl className="mt-3 grid gap-2 rounded-sm bg-gray-50 p-3 sm:grid-cols-2">
              <div><dt className="font-bold">Target</dt><dd>{decisionV2.cheapestFalsification.target}</dd></div>
              <div><dt className="font-bold">Success</dt><dd>{decisionV2.cheapestFalsification.successThreshold}</dd></div>
              <div><dt className="font-bold">Failure</dt><dd>{decisionV2.cheapestFalsification.failureThreshold}</dd></div>
              <div><dt className="font-bold">Limit</dt><dd>{decisionV2.cheapestFalsification.maximumTime} · {decisionV2.cheapestFalsification.maximumCash}</dd></div>
            </dl>
          </DecisionSection>
          <DecisionSection title="Do this first"><p className="font-bold">{decisionV2.firstAction.action}</p></DecisionSection>
          <DecisionSection title="What would change this verdict"><DecisionList items={decisionV2.whatWouldChangeTheVerdict} /></DecisionSection>
          <DecisionSection title="Evidence labels">
            <ul className="space-y-2">
              {decisionV2.evidenceLabels.map((label, index) => <li key={`${label.statement}-${index}`} className="rounded-sm border border-gray-200 p-3"><span className="mr-2 text-xs font-bold uppercase tracking-wide text-gray-500">{label.truthLabel}</span>{label.statement}</li>)}
            </ul>
          </DecisionSection>
        </div>
      </section>

      {/* Main Verdict */}
      <div data-testid="verdict-card" className={`relative overflow-hidden rounded-sm border p-6 shadow-dust sm:p-8 ${verdictColorClass}`}>
        <div className="absolute inset-x-0 top-0 h-1 bg-ghost-rust" />
        <p className="text-xs font-bold uppercase tracking-[0.18em]">Ghost Town risk: {scores.ghostTownRisk}</p>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="ghost-score-ring grid h-32 w-32 shrink-0 place-items-center rounded-full p-2" style={{ '--score': `${litPercent}%` } as CSSProperties}>
            <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
              <span className={`font-score text-5xl font-black leading-none ${scoreTone}`}>{litPercent}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">LIT score</span>
            </div>
          </div>
          <div>
            <h2 className="font-display text-4xl font-bold text-gray-950">{decisionV2.decision.replace(/_/g, ' ')}</h2>
            <p className="mt-3 text-lg text-gray-700">{decisionV2.confidence.rationale}</p>
          </div>
        </div>
      </div>

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

      {/* Scores Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div data-testid="risk-level" className="bg-white p-4 rounded-sm border border-gray-200 shadow-dust">
          <div className="text-xs text-gray-600 uppercase font-bold">Ghost Town Risk</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.ghostTownScore}/5</div>
          <div className="text-xs text-gray-500 mt-1">{scores.ghostTownRisk} risk</div>
        </div>

        <div data-testid="lit-score" className="bg-white p-4 rounded-sm border border-gray-200 shadow-dust">
          <div className="text-xs text-gray-600 uppercase font-bold">LIT Score</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.litScore}/5</div>
          <div className="text-xs text-gray-500 mt-1">{scores.litBand}</div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-dust">
          <div className="text-xs text-gray-600 uppercase font-bold">Leverage</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.leverageScore}/5</div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-dust">
          <div className="text-xs text-gray-600 uppercase font-bold">Insight</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.insightScore}/5</div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-dust">
          <div className="text-xs text-gray-600 uppercase font-bold">Timing</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.timingScore}/5</div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-dust">
          <div className="text-xs text-gray-600 uppercase font-bold">High Walls</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.highWallsScore}/5</div>
          <div className="text-xs text-gray-500 mt-1">{scores.highWallsBand}</div>
        </div>
      </div>

      {/* Business DNA */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-8">
        <h3 className="font-bold text-blue-900 mb-3">Business DNA: {scores.businessDnaType}</h3>
        <div className="space-y-2">
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

      {/* Canonical V2 guardrail */}
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-8">
        <h3 className="font-bold text-red-900 mb-2">Do Not Increase Product Work Until</h3>
        <p className="text-red-800">{decisionV2.largestUncertainty.whyItMatters}</p>
      </div>

      {/* Canonical V2 falsification */}
      <div data-testid="next-step" className="bg-green-50 border border-green-200 p-6 rounded-lg mb-8">
        <h3 className="font-bold text-green-900 mb-2">Recommended Next Test</h3>
        <p className="text-green-800">{decisionV2.cheapestFalsification.test}</p>
      </div>

      {/* Share Card */}
      <ShareCard
        result={result}
        isLoggedIn={isLoggedIn}
        onLoginClick={onLoginClick}
        onRewardClaimed={onRewardClaimed}
      />

      <PrePurchaseResearchSignals
        resultId={result.resultId}
        idea={result.idea}
        locale={locale}
        value={researchSignals}
        onChange={setResearchSignals}
      />

      <section id="thirty-day-plan" className="mb-8 rounded-sm border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ghost-rust">Your next 30 days</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-ghost-ink">Turn this verdict into evidence.</h2>
        <p className="mt-3 text-sm font-bold text-gray-800">{GHOSTTOWN_30_DAY_PLAN_V1.name}</p>
        <ul className="mt-4 space-y-2 text-sm text-gray-800">
          <li>Thirty daily actions with time budgets, cash limits, evidence, and pass/fail thresholds</li>
          <li>Buyer interviews, alternatives, offer, pricing, landing-page, outreach, and paid-pilot tests</li>
          <li>Truth-labeled executable Blueprint, readable PDF, and account history for repeat access</li>
        </ul>
        <p className="mt-4 text-sm text-gray-700">A validation experiment—not a promise of product-market fit, revenue, or certainty.</p>
        {paidError && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{paidError}</p>}
        <button type="button" aria-label="Start 30-day implementation plan checkout" onClick={openActionPlanForm} disabled={paidLoading} className="mt-5 min-h-14 w-full rounded-sm bg-ghost-rust px-5 py-4 font-bold text-white shadow-lantern hover:bg-[#96360d] disabled:opacity-50">
          {paidLoading ? 'Opening checkout...' : `Unlock the 30-Day Plan - ${displayPrice}`}
        </button>
      </section>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <button
          onClick={onReset}
          className="px-6 py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition"
        >
          Test Another Idea
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ghost-rust/20 bg-[#fff7f2]/95 p-3 backdrop-blur sm:hidden">
        <button type="button" aria-label="Start 30-day implementation plan checkout" onClick={openActionPlanForm} disabled={paidLoading} className="min-h-14 w-full rounded-sm bg-ghost-rust px-5 py-3 font-bold text-white shadow-lantern disabled:opacity-50">
          {paidLoading ? 'Opening checkout...' : `Get the 30-Day Plan - ${displayPrice}`}
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

      {/* Metadata */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          GhostTown Test verdict{result.cacheHit ? ' (cached report)' : ''}
          {' '}at {new Date(result.generatedAt).toLocaleString()}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          This is a judgment tool to help you decide what to test next. Not a guarantee of success.
        </p>
      </div>
    </div>
  );
}

function DecisionSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ghost-rust">{title}</h2><div className="mt-2 leading-6">{children}</div></section>;
}

function DecisionList({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-1 pl-5">{items.map(item => <li key={item}>{item}</li>)}</ul>;
}
