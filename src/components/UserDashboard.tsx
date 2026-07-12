import { useEffect, useState } from 'react';
import { PublicUserData } from '../types/auth';
import { apiUrl, authHeaders } from '../lib/api';
import type { EvaluationResult } from '../types/lit';

interface ResultSummary {
  resultId: string;
  ideaName: string;
  verdictHeadline: string;
  litScore: number;
  generatedAt: string;
}

interface Props {
  onLogout: () => void;
  onBuy: () => void;
  onOpenResult: (result: EvaluationResult) => void;
}

export default function UserDashboard({ onLogout, onBuy, onOpenResult }: Props) {
  const [user, setUser] = useState<PublicUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [openingResultId, setOpeningResultId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('lit_user_token_v1');
    if (!token) {
      setError('Not logged in');
      setLoading(false);
      return;
    }

    fetch(apiUrl('/api/auth/verify'), {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json<{ user?: PublicUserData }>())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          setError('Failed to load user data');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));

    fetch(apiUrl('/api/results'), { headers: authHeaders() })
      .then(response => response.ok ? response.json<{ results?: ResultSummary[] }>() : Promise.reject())
      .then(data => setResults(data.results ?? []))
      .catch(() => setResults([]));
  }, []);

  const openResult = async (resultId: string) => {
    setOpeningResultId(resultId);
    setError('');
    try {
      const response = await fetch(apiUrl(`/api/results/${encodeURIComponent(resultId)}`), {
        headers: authHeaders()
      });
      const data = await response.json<{ result?: EvaluationResult; error?: string }>();
      if (!response.ok || !data.result) throw new Error(data.error || 'Assessment could not be opened');
      onOpenResult(data.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Assessment could not be opened');
    } finally {
      setOpeningResultId('');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-2xl mx-auto p-4 py-8 text-center">
        <p className="text-red-600 mb-4">{error || 'Not logged in'}</p>
        <button
          onClick={onLogout}
          className="text-blue-600 hover:underline"
        >
          Return to home
        </button>
      </div>
    );
  }

  const availableTests = Math.max(
    0,
    (1 - user.testsUsed) + user.testsPurchased + Math.min(user.shareCredits || 0, 1)
  );
  const needsToPurchase = availableTests <= 0;

  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Dashboard</h1>
        <button
          onClick={onLogout}
          className="text-red-600 hover:text-red-700 font-medium"
        >
          Log Out
        </button>
      </div>

      {/* User Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="font-bold text-gray-900 mb-2">Account</h2>
        <p className="text-gray-700">{user.email}</p>
        <p className="text-sm text-gray-500 mt-2">
          Member since {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Tests Status */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className={`border-l-4 p-6 rounded-lg ${
          needsToPurchase 
            ? 'border-red-400 bg-red-50' 
            : 'border-green-400 bg-green-50'
        }`}>
          <div className="text-sm text-gray-600 uppercase font-bold">Available Tests</div>
          <div className={`text-5xl font-bold mt-2 ${
            needsToPurchase ? 'text-red-600' : 'text-green-600'
          }`}>
            {availableTests}
          </div>
          {needsToPurchase && (
            <p className="text-sm text-red-700 mt-2">Share a completed result to unlock another assessment, or purchase more.</p>
          )}
        </div>

        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
          <div className="text-sm text-gray-600 uppercase font-bold">Test History</div>
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Tests Used:</span>
              <span className="font-bold ml-2">{user.testsUsed}</span>
            </div>
            <div>
              <span className="text-gray-600">Tests Purchased:</span>
              <span className="font-bold ml-2">{user.testsPurchased}</span>
            </div>
            <div>
              <span className="text-gray-600">Free from Shares:</span>
              <span className="font-bold ml-2">{Math.min(user.shareCredits || 0, 1)}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-900">Previous Assessments</h2>
        {results.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">Your completed assessments will appear here.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {results.map(item => (
              <article key={item.resultId} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{item.ideaName}</h3>
                  <p className="text-sm text-gray-600">{item.verdictHeadline}</p>
                  <p className="mt-1 text-xs text-gray-500">LIT {item.litScore}/5 · {new Date(item.generatedAt).toLocaleDateString()}</p>
                </div>
                <button type="button" onClick={() => void openResult(item.resultId)} disabled={Boolean(openingResultId)} className="shrink-0 rounded-lg border border-blue-300 bg-white px-4 py-2 font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                  {openingResultId === item.resultId ? 'Opening…' : 'View Report'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Share Rewards */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="font-bold text-blue-900 mb-4">Share Rewards</h3>
        <div className="mx-auto grid max-w-md grid-cols-1 gap-5 text-center text-sm sm:grid-cols-2 sm:gap-8">
          <div>
            <span className="text-blue-700">Share Links Created:</span>
            <div className="text-2xl font-bold text-blue-900">{user.sharesGiven}</div>
          </div>
          <div>
            <span className="text-blue-700">Credits Unlocked:</span>
            <div className="text-2xl font-bold text-blue-900">{Math.min(user.shareCredits || 0, 1)}/1</div>
          </div>
        </div>
        <p className="text-xs text-blue-700 mt-4">
          One completed result can unlock one bonus assessment when you share it. After that, paid credits keep the testing focused.
        </p>
      </div>

      {/* Call to Action */}
      {needsToPurchase && (
        <div className="bg-blue-600 text-white rounded-lg p-8 text-center mb-8">
          <h3 className="text-2xl font-bold mb-2">Ready to test more ideas?</h3>
          <p className="mb-6">Share a result to unlock another free assessment, or get 10 more for $14.97.</p>
          <button onClick={onBuy} className="bg-white text-blue-600 px-6 py-3 rounded font-bold hover:bg-gray-100 transition">
            Buy 10 Assessments — $14.97
          </button>
        </div>
      )}

      {/* Last Activity */}
      {user.lastTestAt && (
        <div className="text-center text-sm text-gray-600">
          <p>Last test: {new Date(user.lastTestAt).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}
