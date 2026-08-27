import { useEffect, useState } from 'react';
import App from './App';
import AgentHandoff from '../components/AgentHandoff';
import LoginModal from '../components/LoginModal';
import ResultReport from '../components/ResultReport';
import { apiUrl } from '../lib/api';
import { clearAuthToken, loadAuthToken } from '../lib/storage';
import type { EvaluationResult } from '../types/lit';

function handoffToken(pathname: string): string | null {
  const match = pathname.match(/^\/agent\/handoff\/([a-f0-9]{64})\/?$/i);
  return match?.[1] || null;
}

function AgentHandoffEntry({ token }: { token: string }) {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(loadAuthToken()));
  const [showLogin, setShowLogin] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [locale] = useState<'en' | 'es'>(() => localStorage.getItem('lit_locale') === 'es' ? 'es' : 'en');

  useEffect(() => {
    const authToken = loadAuthToken();
    if (!authToken) return;
    void fetch(apiUrl('/api/auth/verify'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }).then(response => {
      if (!response.ok) {
        clearAuthToken();
        setIsLoggedIn(false);
      } else {
        setIsLoggedIn(true);
      }
    }).catch(() => undefined);
  }, []);

  if (result) {
    return (
      <div className="min-h-screen bg-ghost-paper">
        <ResultReport
          result={result}
          onReset={() => { window.location.href = '/'; }}
          isLoggedIn={isLoggedIn}
          onLoginClick={() => setShowLogin(true)}
          onRewardClaimed={() => undefined}
          locale={locale}
        />
        {showLogin && <LoginModal onLogin={() => { setIsLoggedIn(true); setShowLogin(false); }} onClose={() => setShowLogin(false)} initialMode="login" />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-paper">
      <AgentHandoff
        handoffToken={token}
        isLoggedIn={isLoggedIn}
        onLoginClick={() => setShowLogin(true)}
        onClaimed={setResult}
        onHome={() => { window.location.href = '/'; }}
      />
      {showLogin && <LoginModal onLogin={() => { setIsLoggedIn(true); setShowLogin(false); }} onClose={() => setShowLogin(false)} initialMode="login" />}
    </div>
  );
}

export default function RootApp() {
  const token = handoffToken(window.location.pathname);
  return token ? <AgentHandoffEntry token={token} /> : <App />;
}
