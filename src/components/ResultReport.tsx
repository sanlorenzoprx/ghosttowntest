import { EvaluationResult } from '../types/lit';
import ShareCard from './ShareCard';
import { saveLatestResult } from '../lib/storage';
import { useEffect } from 'react';
import { useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';

interface Props {
  result: EvaluationResult;
  onReset: () => void;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onRewardClaimed: () => void;
}

export default function ResultReport({ result, onReset, isLoggedIn, onLoginClick, onRewardClaimed }: Props) {
  const [paidLoading, setPaidLoading] = useState(false);
  const [paidError, setPaidError] = useState('');
  const scores = result.deterministicScores;
  const verdict = result.verdict;

  // Save result to localStorage
  useEffect(() => {
    saveLatestResult(result);
  }, [result]);

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'build_now':
        return 'text-green-900 bg-green-50 border-green-200';
      case 'test_first':
        return 'text-blue-900 bg-blue-50 border-blue-200';
      case 'niche_down':
        return 'text-yellow-900 bg-yellow-50 border-yellow-200';
      case 'change_business_dna':
        return 'text-orange-900 bg-orange-50 border-orange-200';
      case 'kill_it_before_it_kills_years':
        return 'text-red-900 bg-red-50 border-red-200';
      default:
        return 'text-gray-900 bg-gray-50 border-gray-200';
    }
  };

  const verdictColorClass = getVerdictColor(scores.finalVerdict);

  const startPaidTest = async () => {
    if (!isLoggedIn) { onLoginClick(); return; }
    const targetBuyer = window.prompt('Who is the one buyer segment you want to test?', result.idea.targetUser);
    const problem = window.prompt('What urgent problem will this buyer pay to solve?', result.idea.painfulProblem);
    const currentWorkaround = window.prompt('What do they use or do instead today?', result.idea.currentAlternative);
    if (!targetBuyer?.trim() || !problem?.trim() || !currentWorkaround?.trim()) return;
    setPaidLoading(true); setPaidError('');
    try {
      const response = await fetch(apiUrl('/api/paid-test/checkout'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ verdictId: result.resultId, targetBuyer, problem, currentWorkaround, expectedPrice: '$29' }) });
      const data = await response.json<{ sessionUrl?: string; error?: string }>();
      if (!response.ok || !data.sessionUrl) throw new Error(data.error || 'Checkout is not available right now');
      window.location.assign(data.sessionUrl);
    } catch (error) { setPaidError(error instanceof Error ? error.message : 'Checkout failed'); setPaidLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      {/* Main Verdict */}
      <div data-testid="verdict-card" className={`border-l-4 p-6 rounded-lg mb-8 ${verdictColorClass}`}>
        <h1 className="text-4xl font-bold mb-4">{verdict?.verdict_headline ?? scores.verdictHeadline}</h1>
        <p className="text-xl opacity-90">{verdict?.one_sentence_advice ?? scores.oneSentenceAdvice}</p>
      </div>

      {/* Scores Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div data-testid="risk-level" className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 uppercase font-bold">Ghost Town Risk</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.ghostTownScore}/5</div>
          <div className="text-xs text-gray-500 mt-1">{scores.ghostTownRisk} risk</div>
        </div>

        <div data-testid="lit-score" className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 uppercase font-bold">LIT Score</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.litScore}/5</div>
          <div className="text-xs text-gray-500 mt-1">{scores.litBand}</div>
        </div>

        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 uppercase font-bold">Leverage</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.leverageScore}/5</div>
        </div>

        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 uppercase font-bold">Insight</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.insightScore}/5</div>
        </div>

        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 uppercase font-bold">Timing</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{scores.timingScore}/5</div>
        </div>

        <div className="bg-gray-50 p-4 rounded border border-gray-200">
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

      {/* Do Not Build Until */}
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-8">
        <h3 className="font-bold text-red-900 mb-2">🚫 Do Not Build Until</h3>
        <p className="text-red-800">{verdict?.do_not_build_until ?? scores.doNotBuildUntil}</p>
      </div>

      {/* Recommended Next Test */}
      <div data-testid="next-step" className="bg-green-50 border border-green-200 p-6 rounded-lg mb-8">
        <h3 className="font-bold text-green-900 mb-2">✓ Recommended Next Test</h3>
        <p className="text-green-800">{verdict?.recommended_next_test ?? scores.recommendedNextTest}</p>
      </div>

      {/* Biggest Trap */}
      {verdict?.biggest_trap && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mb-8">
          <h3 className="font-bold text-yellow-900 mb-2">⚠️ Biggest Trap</h3>
          <p className="text-yellow-800">{verdict.biggest_trap}</p>
        </div>
      )}

      {/* Share Card */}
      <ShareCard
        result={result}
        isLoggedIn={isLoggedIn}
        onLoginClick={onLoginClick}
        onRewardClaimed={onRewardClaimed}
      />

      <section className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 p-6">
        <h2 className="text-xl font-bold text-indigo-950">Turn this verdict into a 7-day GhostTown Test</h2>
        <p className="mt-2 text-indigo-900">Get a buyer interview kit, alternatives map, landing-page copy, offer and price test, evidence scoreboard, printable report, and a seven-day plan. $29 one time.</p>
        <p className="mt-2 text-sm text-indigo-800">It is a validation experiment—not a promise of product-market fit, revenue, or certainty.</p>
        {paidError && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{paidError}</p>}
        <button type="button" onClick={startPaidTest} disabled={paidLoading} className="mt-4 rounded bg-indigo-700 px-5 py-3 font-bold text-white hover:bg-indigo-800 disabled:opacity-50">
          {paidLoading ? 'Opening checkout...' : 'Get my 7-day plan — $29'}
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

      {/* Metadata */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          {result.usedAI ? (
            <>Generated with AI analysis{result.cacheHit ? ' (cached)' : ''}</>
          ) : (
            <>Generated with deterministic scoring</>
          )}
          {' '}at {new Date(result.generatedAt).toLocaleString()}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          This is a judgment tool to help you decide what to test next. Not a guarantee of success.
        </p>
      </div>
    </div>
  );
}
