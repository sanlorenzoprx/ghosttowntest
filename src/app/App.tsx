import { useState, useEffect } from 'react';
import Landing from '../components/Landing';
import IdeaIntake from '../components/IdeaIntake';
import QuestionFlow from '../components/QuestionFlow';
import ResultReport from '../components/ResultReport';
import UserDashboard from '../components/UserDashboard';
import LoginModal from '../components/LoginModal';
import PaywallModal from '../components/PaywallModal';
import { IdeaIntake as IdeaIntakeType, EvaluationResult } from '../types/lit';
import {
  clearAuthToken,
  clearEvaluationDraft,
  hasHitFreeTierLimit,
  loadAuthToken,
  loadEvaluationDraft,
  saveEvaluationDraft,
  type EvaluationDraft
} from '../lib/storage';
import { apiUrl } from '../lib/api';
import type { PublicUserData } from '../types/auth';
import { getFeaturedExampleBySlug, toIdeaIntake } from '../lib/exampleIdeas';

type Screen = 'landing' | 'intake' | 'questions' | 'result' | 'dashboard';

export default function App() {
  const [locale, setLocale] = useState<'en' | 'es'>(() => localStorage.getItem('lit_locale') === 'es' ? 'es' : 'en');
  const [initialExample] = useState(() => getFeaturedExampleBySlug(new URLSearchParams(window.location.search).get('example')));
  const [screen, setScreen] = useState<Screen>(initialExample ? 'intake' : 'landing');
  const [idea, setIdea] = useState<IdeaIntakeType | null>(() => initialExample ? toIdeaIntake(initialExample.idea) : null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [resumeDraft, setResumeDraft] = useState<EvaluationDraft | null>(() => loadEvaluationDraft());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPaywall, setShowPaywall] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUserData | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const token = loadAuthToken();
    if (token) {
      setIsLoggedIn(true);
      // Verify token with backend
      verifyToken(token);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lit_locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  async function verifyToken(token: string) {
    try {
      const response = await fetch(apiUrl('/api/auth/verify'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json<{ user?: PublicUserData }>();
        setUserEmail(data.user?.email ?? null);
        setUser(data.user ?? null);
        setIsLoggedIn(Boolean(data.user));
      } else {
        clearAuthToken();
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }
  }

  const hasAvailableTest = () => {
    const testsAvailable = user
      ? Math.max(0, 1 + user.testsPurchased + Math.min(user.shareCredits || 0, 4) - user.testsUsed)
      : hasHitFreeTierLimit() ? 0 : 1;
    return testsAvailable > 0;
  };

  const handleStartTest = () => {
    if (!hasAvailableTest()) {
      setShowPaywall(true);
      return;
    }
    clearEvaluationDraft();
    setResumeDraft(null);
    updateExampleParam(null);
    setIdea(null);
    setScreen('intake');
  };

  const handleSelectExample = (slug: string) => {
    if (!hasAvailableTest()) {
      setShowPaywall(true);
      return;
    }
    const example = getFeaturedExampleBySlug(slug);
    if (!example) return;
    clearEvaluationDraft();
    setResumeDraft(null);
    updateExampleParam(slug);
    setIdea(toIdeaIntake(example.idea));
    setScreen('intake');
  };

  const handleResume = () => {
    if (!resumeDraft) return;
    if (!hasAvailableTest()) {
      setShowPaywall(true);
      return;
    }
    updateExampleParam(null);
    setIdea(resumeDraft.idea);
    setScreen('questions');
  };

  const handleIdeaSubmit = (ideaData: IdeaIntakeType) => {
    if (!hasAvailableTest()) {
      setShowPaywall(true);
      return;
    }
    updateExampleParam(null);
    const draft = saveEvaluationDraft(ideaData, {}, 0);
    setResumeDraft(draft);
    setIdea(ideaData);
    setScreen('questions');
  };

  const handleResultReceived = (res: EvaluationResult) => {
    setResult(res);
    setResumeDraft(null);
    setScreen('result');
    const token = loadAuthToken();
    if (token) void verifyToken(token);
  };

  const handleReset = () => {
    setScreen('landing');
    updateExampleParam(null);
    setIdea(null);
    setResult(null);
  };

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    setShowLoginModal(false);
    setShowPaywall(false);
    const token = loadAuthToken();
    if (token) void verifyToken(token);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail(null);
    setUser(null);
    clearAuthToken();
    setScreen('landing');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <button onClick={handleReset} className="text-2xl font-bold">LIT</button>
          <div className="flex gap-4">
            <button onClick={() => setLocale(current => current === 'en' ? 'es' : 'en')} className="text-sm font-bold text-blue-700 hover:text-blue-900" aria-label="Change language">
              {locale === 'en' ? 'ES' : 'EN'}
            </button>
            {isLoggedIn ? (
              <>
                <span className="text-sm text-gray-600">{userEmail}</span>
                <button
                  onClick={() => setScreen('dashboard')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Log Out
                </button>
              </>
            ) : (
              <button
                  onClick={() => {
                    setAuthMode('login');
                    setShowLoginModal(true);
                  }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {screen === 'landing' && (
          <Landing
            onStart={handleStartTest}
            onSelectExample={handleSelectExample}
            hasDraft={Boolean(resumeDraft)}
            onResume={handleResume}
            isLoggedIn={isLoggedIn}
            onLoginClick={() => {
              setAuthMode('login');
              setShowLoginModal(true);
            }}
            locale={locale}
          />
        )}
        {screen === 'intake' && (
          <IdeaIntake onSubmit={handleIdeaSubmit} initialIdea={idea} />
        )}
        {screen === 'questions' && idea && (
          <QuestionFlow
            idea={idea}
            onResult={handleResultReceived}
            initialDraft={resumeDraft}
            onDraftChange={setResumeDraft}
          />
        )}
        {screen === 'result' && result && (
          <ResultReport
            result={result}
            onReset={handleReset}
            isLoggedIn={isLoggedIn}
            onLoginClick={() => {
              setAuthMode('signup');
              setShowLoginModal(true);
            }}
            onRewardClaimed={() => {
              const token = loadAuthToken();
              if (token) void verifyToken(token);
            }}
          />
        )}
        {screen === 'dashboard' && isLoggedIn && (
          <UserDashboard onLogout={handleLogout} onBuy={() => setShowPaywall(true)} />
        )}
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => setShowLoginModal(false)}
          initialMode={authMode}
        />
      )}

      {showPaywall && (
        <PaywallModal
          isLoggedIn={isLoggedIn}
          onLoginClick={() => {
            setShowPaywall(false);
            setAuthMode('signup');
            setShowLoginModal(true);
          }}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  );
}

function updateExampleParam(slug: string | null): void {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set('example', slug);
  else url.searchParams.delete('example');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
