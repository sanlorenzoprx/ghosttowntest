import { useState } from 'react';
import { apiUrl } from '../lib/api';

interface Props {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onClose: () => void;
}

export default function PaywallModal({ isLoggedIn, onLoginClick, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = async () => {
    const token = localStorage.getItem('lit_user_token_v1');
    if (!token) {
      onLoginClick();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(apiUrl('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json<{ sessionUrl?: string; error?: string }>();
      if (!response.ok || !data.sessionUrl) {
        throw new Error(data.error || 'Checkout is not available right now');
      }
      window.location.assign(data.sessionUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Checkout failed');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h2 className="text-2xl font-bold">Keep testing before you build</h2>
        <p className="mt-3 text-gray-600">
          Your current allowance has been used. Registered members can share completed results to unlock up to four additional free assessments, or get 10 more for $19.
        </p>

        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="text-3xl font-bold text-blue-900">10 tests · $19</div>
          <p className="mt-1 text-sm text-blue-800">One-time purchase. No subscription.</p>
        </div>

        {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          type="button"
          onClick={isLoggedIn ? handlePurchase : onLoginClick}
          disabled={loading}
          className="mt-6 w-full rounded bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Opening checkout...' : isLoggedIn ? 'Buy 10 Tests' : 'Log In or Sign Up'}
        </button>
        <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-900">
          Not now
        </button>
      </div>
    </div>
  );
}
