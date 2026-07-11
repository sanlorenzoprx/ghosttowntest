import { useState } from 'react';
import { isValidEmail, isStrongPassword } from '../lib/utils';
import { apiUrl } from '../lib/api';
import type { AuthResponse } from '../types/auth';
import { authHeaders } from '../lib/api';
import { getReferralIdFromUrl } from '../lib/share';
import { getTestsUsed } from '../lib/storage';

interface Props {
  onLogin: (email: string) => void;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function LoginModal({ onLogin, onClose, initialMode = 'login' }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(initialMode === 'signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!isStrongPassword(password)) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          usedAnonymousAssessment: isSignup && getTestsUsed() > 0
        })
      });

      const data = await response.json<AuthResponse>();

      if (data.error) {
        setError(data.error);
      } else if (data.token) {
        localStorage.setItem('lit_user_token_v1', data.token);
        const referralId = getReferralIdFromUrl();
        if (isSignup && referralId) {
          await fetch(apiUrl(`/api/referral/claim?ref=${encodeURIComponent(referralId)}`), {
            headers: authHeaders()
          }).catch(() => undefined);
        }
        onLogin(email);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-lg max-w-md w-full shadow-lg">
        <h2 className="text-2xl font-bold mb-2">
          {isSignup ? 'Create Account' : 'Log In'}
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          {isSignup 
            ? 'Save your ideas and track results' 
            : 'Access your saved results and get more free tests'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
            }}
            className="text-center text-blue-600 hover:underline font-medium text-sm"
          >
            {isSignup 
              ? 'Already have an account? Log in' 
              : "Don't have an account? Sign up"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-gray-600 hover:text-gray-900 mt-4 text-sm font-medium"
        >
          ✕ Close
        </button>
      </div>
    </div>
  );
}
