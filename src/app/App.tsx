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
import InternalGoogleSearchConsole from '../components/InternalGoogleSearchConsole';
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

type Screen = 'landing' | 'intake' | 'questions' | 'result' | 'dashboard' | 'contact' | 'action-plan-success' | 'internal-research' | LegalPageKind;

function screenForPath(pathname: string, hasExample: boolean): Screen {
  if (pathname === '/contact') return 'contact';
  if (pathname === '/privacy') return 'privacy';
  if (pathname === '/terms') return 'terms';
  if (pathname === '/refunds' || pathname === '/refund-policy') return 'refund';
  if (pathname === '/disclaimer') return 'disclaimer';
  if (pathname === '/paid-test/success') return 'action-plan-success';
  if (pathname === '/internal-research') return 'internal-research';
  return hasExample ? 'intake' : 'landing';
}

export default function App() {
  const [locale, setLocale] = useState<'en' | 'es'>(() => localStorage.getItem('lit_locale') === 'es' ? 'es' : 'en');
  const [initialExample] = useState(() => getFeaturedExampleBySlug(new URLSearchParams(window.location.search).get('example')));
  const [screen, setScreen] = useState<Screen>(() => screenForPath(window.location.pathname, Boolean(initialExample)));
  const [idea, setIdea] = useState<IdeaIntakeType | null>(() => initialExample ? toIdeaIntake(initialExample.idea) : null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [resumeDraft, setResumeDraft] = useState<EvaluationDraft | null>(() => loadEvaluationDraft());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPaywall, setShowPaywall] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUserData | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const token = loadAuthToken();
    if (token) {
      setIsLoggedIn(true);
      verifyToken(token);
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
    setIsMobileNavOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setScreen('landing');
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
    setIsMobileNavOpen(false);
    setIsLoggedIn(false);
    setUserEmail(null);
    setUser(null);
    clearAuthToken();
    setScreen('landing');
    updatePath('/');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="site-header border-b border-border">
        <div className="site-header-inner relative mx-auto flex max-w-workspace items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 lg:px-8">
          <button type="button" onClick={handleReset} className="tap-target min-w-0 shrink-0 text-left" aria-label="GhostTown Test home">
            <span className="leading-tight">
              <span className="site-wordmark-kicker block text-[9px] font-semibold uppercase sm:text-[10px]">Leverage / Insight / Timing</span>
              <span className="site-wordmark mt-1 block text-xl font-semibold leading-none text-ink sm:text-3xl">GhostTown Test</span>
            </span>
          </button>
          <nav className="site-nav hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            <button type="button" onClick={handleReset} className="btn-tertiary text-sm" aria-label="Go to Home">Home</button>
            <button type="button" onClick={() => { setScreen('contact'); updatePath('/contact'); }} className="btn-tertiary text-sm">Contact</button>
            <div className="flex items-center gap-2 text-sm" role="group" aria-label="Language">
              <button type="button" onClick={() => setLocale('en')} aria-pressed={locale === 'en'} className={`tap-target rounded-field px-2.5 font-semibold ${locale === 'en' ? 'bg-surface-muted text-ink' : 'text-ink-soft hover:bg-surface-muted hover:text-ink'}`}>English</button>
              <span className="text-gray-300" aria-hidden="true">·</span>
              <button type="button" onClick={() => setLocale('es')} aria-pressed={locale === 'es'} className={`tap-target rounded-field px-2.5 font-semibold ${locale === 'es' ? 'bg-surface-muted text-ink' : 'text-ink-soft hover:bg-surface-muted hover:text-ink'}`}>Español</button>
            </div>
            {isLoggedIn ? (
              <>
                <span className="max-w-36 truncate px-2 text-sm text-ink-soft" title={userEmail ?? undefined}>{userEmail}</span>
                <button type="button" onClick={() => { setScreen('dashboard'); updatePath('/'); }} className="btn-tertiary text-sm">Dashboard</button>
                <button type="button" onClick={handleLogout} className="btn-tertiary text-sm text-stop">Log out</button>
              </>
            ) : (
              <button type="button" onClick={() => { setAuthMode('login'); setShowLoginModal(true); }} className="btn-primary text-sm">Log in</button>
            )}
          </nav>
          <button
            type="button"
            className="site-menu-toggle btn-secondary min-w-11 px-2.5 text-sm"
            onClick={() => setIsMobileNavOpen(current => !current)}
            aria-expanded={isMobileNavOpen}
            aria-controls="mobile-site-navigation"
          >
            {isMobileNavOpen ? 'Close' : 'Menu'}
          </button>
        </div>
        {isMobileNavOpen && (
          <nav id="mobile-site-navigation" className="site-mobile-panel px-4 py-4 sm:px-6 md:hidden" aria-label="Mobile navigation">
            <div className="mx-auto flex max-w-workspace flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleReset} className="btn-secondary w-full">Home</button>
                <button type="button" onClick={() => { setScreen('contact'); updatePath('/contact'); setIsMobileNavOpen(false); }} className="btn-secondary w-full">Contact</button>
              </div>
              <div className="flex min-w-0 flex-col gap-2 rounded-field border border-border bg-surface-muted px-3 py-2 sm:flex-row sm:items-center sm:justify-between" role="group" aria-label="Language">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Language</span>
                <div className="grid min-w-0 grid-cols-2 gap-1 sm:flex sm:items-center">
                  <button type="button" onClick={() => { setLocale('en'); setIsMobileNavOpen(false); }} aria-pressed={locale === 'en'} className={`tap-target rounded-field px-3 text-sm font-semibold ${locale === 'en' ? 'bg-surface-raised text-ink shadow-quiet' : 'text-ink-soft'}`}>English</button>
                  <button type="button" onClick={() => { setLocale('es'); setIsMobileNavOpen(false); }} aria-pressed={locale === 'es'} className={`tap-target rounded-field px-3 text-sm font-semibold ${locale === 'es' ? 'bg-surface-raised text-ink shadow-quiet' : 'text-ink-soft'}`}>Español</button>
                </div>
              </div>
              {isLoggedIn ? (
                <div className="grid gap-2 border-t border-border pt-3">
                  {userEmail && <span className="truncate px-1 text-sm text-ink-soft" title={userEmail}>{userEmail}</span>}
                  <button type="button" onClick={() => { setScreen('dashboard'); updatePath('/'); setIsMobileNavOpen(false); }} className="btn-primary w-full">Dashboard</button>
                  <button type="button" onClick={handleLogout} className="btn-destructive w-full">Log out</button>
                </div>
              ) : (
                <button type="button" onClick={() => { setAuthMode('login'); setShowLoginModal(true); setIsMobileNavOpen(false); }} className="btn-primary w-full">Log in</button>
              )}
            </div>
          </nav>
        )}
      </header>

      <main>
        {screen === 'landing' && <Landing onStart={handleStartTest} onSelectExample={handleSelectExample} hasDraft={Boolean(resumeDraft)} onResume={handleResume} isLoggedIn={isLoggedIn} onLoginClick={() => { setAuthMode('login'); setShowLoginModal(true); }} locale={locale} />}
        {screen === 'intake' && <IdeaIntake onSubmit={handleIdeaSubmit} initialIdea={idea} />}
        {screen === 'questions' && idea && <QuestionFlow idea={idea} onResult={handleResultReceived} initialDraft={resumeDraft} onDraftChange={setResumeDraft} />}
        {screen === 'result' && result && <ResultReport result={result} onReset={handleReset} isLoggedIn={isLoggedIn} onLoginClick={() => { setAuthMode('signup'); setShowLoginModal(true); }} onRewardClaimed={() => { const token = loadAuthToken(); if (token) void verifyToken(token); }} locale={locale} />}
        {screen === 'dashboard' && isLoggedIn && <UserDashboard onLogout={handleLogout} onBuy={() => setShowPaywall(true)} onStart={handleStartTest} onOpenResult={savedResult => { setResult(savedResult); setScreen('result'); }} />}
        {screen === 'contact' && <Contact onStart={handleStartTest} />}
        {(screen === 'privacy' || screen === 'terms' || screen === 'refund' || screen === 'disclaimer') && <LegalPage kind={screen} />}
        {screen === 'action-plan-success' && <ActionPlanSuccess orderId={new URLSearchParams(window.location.search).get('order_id') || ''} onDone={() => { updatePath('/'); setScreen(isLoggedIn ? 'dashboard' : 'landing'); }} />}
        {screen === 'internal-research' && isLoggedIn && <InternalGoogleSearchConsole onBack={() => { updatePath('/'); setScreen('dashboard'); }} />}
        {screen === 'internal-research' && !isLoggedIn && <section className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-3xl font-black text-ghost-ink">Owner login required</h1><p className="mt-3 text-gray-700">This standalone research console is not part of the customer product.</p><button type="button" onClick={() => { setAuthMode('login'); setShowLoginModal(true); }} className="btn-primary mt-6 px-6 py-3">Log in</button></section>}
      </main>

      <footer className="border-t border-border bg-surface-stone px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-workspace flex-col gap-4 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>Zayas House LLC · Commonwealth of Puerto Rico, USA</p>
          <nav aria-label="Legal policies" className="flex flex-wrap gap-x-4 gap-y-2">
            <a className="font-bold text-rust hover:underline" href="/privacy">Privacy</a>
            <a className="font-bold text-rust hover:underline" href="/terms">Terms</a>
            <a className="font-bold text-rust hover:underline" href="/refunds">Refunds &amp; fulfillment</a>
            <a className="font-bold text-rust hover:underline" href="/disclaimer">Disclaimer</a>
          </nav>
        </div>
      </footer>

      {showLoginModal && <LoginModal onLogin={handleLogin} onClose={() => setShowLoginModal(false)} initialMode={authMode} />}
      {showPaywall && <PaywallModal isLoggedIn={isLoggedIn} onLoginClick={() => { setShowPaywall(false); setAuthMode('signup'); setShowLoginModal(true); }} onClose={() => setShowPaywall(false)} />}
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
