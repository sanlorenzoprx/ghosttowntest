import { useEffect, useState } from 'react';
import { PublicUserData } from '../types/auth';
import { apiUrl } from '../lib/api';

interface Props {
  onLogout: () => void;
  onBuy: () => void;
}

export default function UserDashboard({ onLogout, onBuy }: Props) {
  const [user, setUser] = useState<PublicUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, []);

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
    (1 - user.testsUsed) + user.testsPurchased + Math.min(user.shareCredits || 0, 4)
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
              <span className="font-bold ml-2">{Math.min(user.shareCredits || 0, 4)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Rewards */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="font-bold text-blue-900 mb-4">Share Rewards</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Share Links Created:</span>
            <div className="text-2xl font-bold text-blue-900">{user.sharesGiven}</div>
          </div>
          <div>
            <span className="text-blue-700">Credits Unlocked:</span>
            <div className="text-2xl font-bold text-blue-900">{Math.min(user.shareCredits || 0, 4)}/4</div>
          </div>
          <div>
            <span className="text-blue-700">Link Signups:</span>
            <div className="text-2xl font-bold text-blue-900">{user.sharesReceived}</div>
          </div>
        </div>
        <p className="text-xs text-blue-700 mt-4">
          Each completed result can unlock one assessment when you share it. Your first assessment plus four share rewards gives you five free assessments total.
        </p>
      </div>

      {/* Call to Action */}
      {needsToPurchase && (
        <div className="bg-blue-600 text-white rounded-lg p-8 text-center mb-8">
          <h3 className="text-2xl font-bold mb-2">Ready to test more ideas?</h3>
          <p className="mb-6">Share a result to unlock another free assessment, or get 10 more for $19.</p>
          <button onClick={onBuy} className="bg-white text-blue-600 px-6 py-3 rounded font-bold hover:bg-gray-100 transition">
            Buy 10 Tests
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
