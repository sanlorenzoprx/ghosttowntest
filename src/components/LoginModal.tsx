import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [loading, onClose]);

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

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json<AuthResponse>()
        : null;

      if (!response.ok) {
        setError(data?.error || `Registration service returned ${response.status}. Please try again.`);
      } else if (data?.error) {
        setError(data.error);
      } else if (data?.token) {
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
    } catch {
      setError(`Cannot reach the registration service at ${apiUrl('/api/auth/signup')}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="relative bg-white p-6 sm:p-8 rounded-lg max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-lg"
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <h2 id="auth-dialog-title" className="text-2xl font-bold">
            {isSignup ? 'Create Account' : 'Log In'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close registration form"
            className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-2xl leading-none text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <p className="text-gray-600 text-sm mb-6">
          {isSignup 
            ? 'Save your ideas and track results' 
            : 'Access your saved results and get more free tests'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-bold mb-1">Email Address</label>
            <input
              id="auth-email"
              name="email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-bold mb-1">Password</label>
            <input
              id="auth-password"
              name="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
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

      </div>
    </div>
  );
}
