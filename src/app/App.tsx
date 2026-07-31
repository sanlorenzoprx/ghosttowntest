import { useState, useEffect } from 'react';
import Landing from '../components/Landing';
import IdeaIntake from '../components/IdeaIntake';
import QuestionFlow from '../components/QuestionFlow';
import ResultReport from '../components/ResultReport';
import UserDashboard from '../components/UserDashboard';
import LoginModal from '../components/LoginModal';
import PaywallModal from '../components/PaywallModal';
import Contact from '../components/Contact';
import LegalPage, { type LegalPageKind } from '../components/LegalPage';
import ActionPlanSuccess from '../components/ActionPlanSuccess';
import LaunchBlueprint from '../components/LaunchBlueprint';
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

type Screen = 'landing' | 'intake' | 'questions' | 'result' | 'dashboard' | 'contact' | 'action-plan-success' | 'blueprint' | LegalPageKind;

function blueprintOrderIdForPath(pathname: string): string {
  const match = pathname.match(/^\/blueprint\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : '';
}

function screenForPath(pathname: string, hasExample: boolean): Screen {
  if (pathname === '/contact') return 'contact';
  if (pathname === '/privacy') return 'privacy';
  if (pathname === '/terms') return 'terms';
  if (pathname === '/refunds' || pathname === '/refund-policy') return 'refund';
  if (pathname === '/disclaimer') return 'disclaimer';
  if (pathname === '/paid-test/success') return 'action-plan-success';
  if (blueprintOrderIdForPath(pathname)) return 'blueprint';
  return hasExample ? 'intake' : 'landing';
}

export default function App() {
  const [locale, setLocale] = useState<'en' | 'es'>(() => localStorage.getItem('lit_locale') === 'es' ? 'es' : 'en');
  const [initialExample] = useState(() => getFeaturedExampleBySlug(new URLSearchParams(window.location.search).get('example')));
  const [screen, setScreen] = useState<Screen>(() => screenForPath(window.location.pathname, Boolean(initialExample)));
  const [blueprintOrderId, setBlueprintOrderId] = useState(() => blueprintOrderIdForPath(window.location.pathname));
  const [idea, setIdea] = useState<IdeaIntakeType | null>(() => initialExample ? toIdeaIntake(initialExample.idea) : null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [resumeDraft, setResumeDraft] = useState<EvaluationDraft | null>(() => loadEvaluationDraft());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPaywall, setShowPaywall] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUserData | null>(null);

  useEffect(() => {
    const token = loadAuthToken();
    if (token) {
      setIsLoggedIn(true);
      void verifyToken(token);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lit_locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [screen]);

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
      ? Math.max(0, 1 + user.testsPurchased + Math.min(user.shareCredits || 0, 1) - user.testsUsed)
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
    updatePath('/');
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
    updatePath('/');
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
    updatePath('/');
    updateExampleParam(null);
    setIdea(resumeDraft.idea);
    setScreen('questions');
  };

  const handleIdeaSubmit = (ideaData: IdeaIntakeType) => {
    if (!hasAvailableTest()) {
      setShowPaywall(true);
      return;
    }
    updatePath('/');
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
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setScreen('landing');
    setBlueprintOrderId('');
    updatePath('/');
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
    setBlueprintOrderId('');
    clearAuthToken();
    setScreen('landing');
    updatePath('/');
  };

  const openDashboard = () => {
    updatePath('/');
    setScreen('dashboard');
  };

  const openBlueprint = (orderId: string) => {
    setBlueprintOrderId(orderId);
    updatePath(`/blueprint/${encodeURIComponent(orderId)}`);
    setScreen('blueprint');
  };

  return (
    <div className="min-h-screen bg-ghost-paper">
      <header className="border-b border-gray-200 bg-ghost-paper/95 backdrop-blur">
        <div className="site-header-inner relative mx-auto flex max-w-6xl items-center justify-center px-4 py-4">
          <button onClick={handleReset} className="text-center" aria-label="Ghost Town Test home">
            <span className="leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-[0.34em] text-ghost-rust sm:text-xs">Leverage / Insight / Timing</span>
              <span className="brand-wordmark mt-1 block font-display text-3xl font-semibold leading-none text-ghost-ink sm:text-4xl">Ghost Town Test</span>
            </span>
          </button>
          <div className="site-nav absolute right-4 flex items-center gap-4 sm:right-6">
            <button type="button" onClick={handleReset} className="rounded border border-ghost-forest px-3 py-1.5 text-sm font-bold text-ghost-forest hover:bg-blue-50" aria-label="Go to Home">Home</button>
            <button onClick={() => { setScreen('contact'); updatePath('/contact'); }} className="text-sm font-bold text-gray-700 hover:text-ghost-rust">Contact</button>
            <div className="flex items-center gap-2 text-sm" role="group" aria-label="Language">
              <button type="button" onClick={() => setLocale('en')} aria-pressed={locale === 'en'} className={`font-semibold ${locale === 'en' ? 'text-ghost-forest underline underline-offset-4' : 'text-gray-500 hover:text-ghost-forest'}`}>English</button>
              <span className="text-gray-300" aria-hidden="true">·</span>
              <button type="button" onClick={() => setLocale('es')} aria-pressed={locale === 'es'} className={`font-semibold ${locale === 'es' ? 'text-ghost-forest underline underline-offset-4' : 'text-gray-500 hover:text-ghost-forest'}`}>Spanish</button>
            </div>
            {isLoggedIn ? (
              <>
                <span className="text-sm text-gray-600">{userEmail}</span>
                <button onClick={openDashboard} className="text-sm text-blue-600 hover:text-blue-700">Dashboard</button>
                <button onClick={handleLogout} className="text-sm text-blue-600 hover:text-blue-700">Log Out</button>
              </>
            ) : (
              <button onClick={() => { setAuthMode('login'); setShowLoginModal(true); }} className="text-sm text-blue-600 hover:text-blue-700">Log In</button>
            )}
          </div>
        </div>
      </header>

      <main>
        {screen === 'landing' && (
          <Landing
            onStart={handleStartTest}
            onSelectExample={handleSelectExample}
            hasDraft={Boolean(resumeDraft)}
            onResume={handleResume}
            isLoggedIn={isLoggedIn}
            onLoginClick={() => { setAuthMode('login'); setShowLoginModal(true); }}
            locale={locale}
          />
        )}
        {screen === 'intake' && <IdeaIntake onSubmit={handleIdeaSubmit} initialIdea={idea} />}
        {screen === 'questions' && idea && <QuestionFlow idea={idea} onResult={handleResultReceived} initialDraft={resumeDraft} onDraftChange={setResumeDraft} />}
        {screen === 'result' && result && (
          <ResultReport
            result={result}
            onReset={handleReset}
            isLoggedIn={isLoggedIn}
            onLoginClick={() => { setAuthMode('signup'); setShowLoginModal(true); }}
            onRewardClaimed={() => { const token = loadAuthToken(); if (token) void verifyToken(token); }}
          />
        )}
        {screen === 'dashboard' && isLoggedIn && (
          <UserDashboard
            onLogout={handleLogout}
            onBuy={() => setShowPaywall(true)}
            onStart={handleStartTest}
            onOpenResult={savedResult => { setResult(savedResult); setScreen('result'); }}
          />
        )}
        {screen === 'contact' && <Contact onStart={handleStartTest} />}
        {(screen === 'privacy' || screen === 'terms' || screen === 'refund' || screen === 'disclaimer') && <LegalPage kind={screen} />}
        {screen === 'action-plan-success' && (
          <ActionPlanSuccess
            orderId={new URLSearchParams(window.location.search).get('order_id') || ''}
            onOpenBlueprint={openBlueprint}
            onDone={openDashboard}
          />
        )}
        {screen === 'blueprint' && blueprintOrderId && <LaunchBlueprint orderId={blueprintOrderId} onBack={openDashboard} />}
      </main>

      <footer className="border-t border-gray-200 bg-ghost-sand px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <p>Zayas House LLC · Commonwealth of Puerto Rico, USA</p>
          <nav aria-label="Legal policies" className="flex flex-wrap gap-x-4 gap-y-2">
            <a className="font-bold text-blue-700 hover:underline" href="/privacy">Privacy</a>
            <a className="font-bold text-blue-700 hover:underline" href="/terms">Terms</a>
            <a className="font-bold text-blue-700 hover:underline" href="/refunds">Refunds &amp; fulfillment</a>
            <a className="font-bold text-blue-700 hover:underline" href="/disclaimer">Disclaimer</a>
          </nav>
        </div>
      </footer>

      {showLoginModal && <LoginModal onLogin={handleLogin} onClose={() => setShowLoginModal(false)} initialMode={authMode} />}
      {showPaywall && (
        <PaywallModal
          isLoggedIn={isLoggedIn}
          onLoginClick={() => { setShowPaywall(false); setAuthMode('signup'); setShowLoginModal(true); }}
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

function updatePath(pathname: string): void {
  const url = new URL(window.location.href);
  if (url.pathname === pathname) return;
  url.pathname = pathname;
  url.search = '';
  url.hash = '';
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
