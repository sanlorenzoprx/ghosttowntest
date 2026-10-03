import { useState, useEffect } from 'react';
import Landing from '../components/Landing';
import IdeaIntake from '../components/IdeaIntake';
import QuestionFlow from '../components/QuestionFlow';
import ResultReport from '../components/ResultReport';
import UserDashboard from '../components/UserDashboard';
import GetMeLiveWorkspace from '../components/GetMeLiveWorkspace';
import GetMeLiveLanding from '../components/GetMeLiveLanding';
import GetMeLiveOpening from '../components/GetMeLiveOpening';
import LoginModal from '../components/LoginModal';
import PaywallModal from '../components/PaywallModal';
import VerdictUnlockPage from '../components/VerdictUnlockPage';
import Contact from '../components/Contact';
import LegalPage, { type LegalPageKind } from '../components/LegalPage';
import ActionPlanSuccess from '../components/ActionPlanSuccess';
import InternalGoogleSearchConsole from '../components/InternalGoogleSearchConsole';
import CommercialMetricsConsole from '../components/CommercialMetricsConsole';
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
import { captureCommercialAttribution, recordCommercialEvent } from '../lib/commercialAttribution';
import { litQuestions } from '../lib/litQuestions';

type Screen = 'landing' | 'intake' | 'questions' | 'result' | 'dashboard' | 'get-me-live' | 'unlock-verdict' | 'contact' | 'action-plan-success' | 'internal-research' | 'internal-metrics' | LegalPageKind;

function screenForPath(pathname: string, hasExample: boolean): Screen {
  if (pathname === '/contact') return 'contact';
  if (pathname === '/privacy') return 'privacy';
  if (pathname === '/terms') return 'terms';
  if (pathname === '/refunds' || pathname === '/refund-policy') return 'refund';
  if (pathname === '/disclaimer') return 'disclaimer';
  if (pathname === '/paid-test/success') return 'action-plan-success';
  if (pathname === '/unlock-verdict') return 'unlock-verdict';
  if (pathname.startsWith('/get-me-live')) return 'get-me-live';
  if (pathname === '/internal-research') return 'internal-research';
  if (pathname === '/internal-metrics') return 'internal-metrics';
  return hasExample ? 'intake' : 'landing';
}

export type AssessmentPackReturn = 'success' | 'cancelled' | null;

export function assessmentPackReturnFromSearch(search: string): AssessmentPackReturn {
  const purchase = new URLSearchParams(search).get('purchase');
  if (purchase === 'assessments_success') return 'success';
  if (purchase === 'assessments_cancelled') return 'cancelled';
  return null;
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
  const [purchaseReturn, setPurchaseReturn] = useState<AssessmentPackReturn>(() => assessmentPackReturnFromSearch(window.location.search));
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUserData | null>(null);
  const [autoSubmitPendingVerdict, setAutoSubmitPendingVerdict] = useState(false);

  useEffect(() => {
    captureCommercialAttribution();
    if (window.location.pathname === '/') void recordCommercialEvent('landing_viewed', { dedupeKey: 'landing_viewed' });
  }, []);

  useEffect(() => {
    const token = loadAuthToken();
    if (token) {
      setIsLoggedIn(true);
      verifyToken(token);
    }
  }, []);

  useEffect(() => {
    if (!purchaseReturn || window.location.pathname === '/unlock-verdict') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('purchase');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

    if (purchaseReturn === 'success') {
      const token = loadAuthToken();
      if (token) {
        setIsLoggedIn(true);
        setScreen('dashboard');
        void verifyToken(token);
      }
    }
  }, [purchaseReturn]);

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get('order_id');
    if (window.location.pathname === '/get-me-live' && orderId) {
      window.history.replaceState({}, '', `/get-me-live/setup${window.location.search}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    const syncScreenToLocation = () => {
      const example = getFeaturedExampleBySlug(new URLSearchParams(window.location.search).get('example'));
      setScreen(screenForPath(window.location.pathname, Boolean(example)));
    };
    syncScreenToLocation();
    window.addEventListener('popstate', syncScreenToLocation);
    return () => window.removeEventListener('popstate', syncScreenToLocation);
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
    if (isLoggedIn) {
      if (!user) return false;
      return Math.max(
        0,
        1 + user.testsPurchased + Math.min(user.shareCredits || 0, 1) - user.testsUsed
      ) > 0;
    }
    return !hasHitFreeTierLimit();
  };

  const canBeginAssessment = () => hasAvailableTest() || isLoggedIn;
  const hasCompletedPendingDraft = () => Boolean(
    resumeDraft && litQuestions.every(question => resumeDraft.answers[question.id] !== undefined)
  );

  const openVerdictPurchasePage = () => {
    if (resumeDraft) setIdea(resumeDraft.idea);
    updatePath('/unlock-verdict');
    setScreen('unlock-verdict');
  };

  const handleStartTest = () => {
    if (isLoggedIn && !hasAvailableTest() && hasCompletedPendingDraft()) {
      openVerdictPurchasePage();
      return;
    }
    if (!canBeginAssessment()) { setShowPaywall(true); return; }
    clearEvaluationDraft();
    setResumeDraft(null);
    updateExampleParam(null);
    updatePath('/');
    setIdea(null);
    setScreen('intake');
  };

  const handleSelectExample = (slug: string) => {
    if (isLoggedIn && !hasAvailableTest() && hasCompletedPendingDraft()) {
      openVerdictPurchasePage();
      return;
    }
    if (!canBeginAssessment()) { setShowPaywall(true); return; }
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
    if (!canBeginAssessment()) { setShowPaywall(true); return; }
    updatePath('/');
    updateExampleParam(null);
    setIdea(resumeDraft.idea);
    setScreen('questions');
  };

  const handleIdeaSubmit = (ideaData: IdeaIntakeType) => {
    if (!canBeginAssessment()) { setShowPaywall(true); return; }
    updatePath('/');
    updateExampleParam(null);
    const draft = saveEvaluationDraft(ideaData, {}, 0);
    setResumeDraft(draft);
    setIdea(ideaData);
    setScreen('questions');
  };

  const handleAllowanceRequired = () => {
    setAutoSubmitPendingVerdict(false);
    updatePath('/unlock-verdict');
    setScreen('unlock-verdict');
  };

  const handleUnlockCreditsReady = () => {
    const draft = loadEvaluationDraft();
    setPurchaseReturn(null);
    const token = loadAuthToken();
    if (token) void verifyToken(token);

    if (!draft) {
      setResumeDraft(null);
      setIdea(null);
      setAutoSubmitPendingVerdict(false);
      updatePath('/');
      setScreen('intake');
      return;
    }

    setResumeDraft(draft);
    setIdea(draft.idea);
    setAutoSubmitPendingVerdict(
      litQuestions.every(question => draft.answers[question.id] !== undefined)
    );
    updatePath('/');
    setScreen('questions');
  };

  const handleResultReceived = (res: EvaluationResult) => {
    setResult(res);
    setResumeDraft(null);
    setAutoSubmitPendingVerdict(false);
    setPurchaseReturn(null);
    setScreen('result');
    const token = loadAuthToken();
    if (token) void verifyToken(token);
  };

  const handleReset = () => {
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
    setIsLoggedIn(false);
    setUserEmail(null);
    setUser(null);
    clearAuthToken();
    setScreen('landing');
    updatePath('/');
  };

  const getMeLiveParams = new URLSearchParams(window.location.search);
  const getMeLiveOrderId = getMeLiveParams.get('order_id') || '';
  const getMeLiveOpening = screen === 'get-me-live' && window.location.pathname.startsWith('/get-me-live/opening');
  const getMeLiveSetup = !getMeLiveOpening && screen === 'get-me-live' && (window.location.pathname.startsWith('/get-me-live/setup') || Boolean(getMeLiveOrderId));
  const getMeLiveSourceSprintOrderId = getMeLiveParams.get('source_sprint_order_id') || '';

  return (
    <div className="min-h-screen bg-ghost-paper">
      <header className="site-header border-b border-gray-200 bg-ghost-paper/95 backdrop-blur">
        <div className="site-header-inner mx-auto grid max-w-7xl grid-cols-1 items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
          <div className="hidden lg:block" aria-hidden="true" />
          <button onClick={handleReset} className="justify-self-center text-center" aria-label="Ghost Town Test home">
            <span className="leading-tight">
              <span className="site-wordmark-kicker block text-[10px] font-bold uppercase tracking-[0.34em] text-ghost-rust sm:text-xs">Leverage / Insight / Timing</span>
              <span className="brand-wordmark mt-1 block font-display text-3xl font-semibold leading-none text-ghost-ink sm:text-4xl">Ghost Town Test</span>
            </span>
          </button>
          <div className="site-nav flex flex-wrap items-center justify-center gap-x-4 gap-y-2 lg:justify-self-end lg:flex-nowrap lg:justify-end">
            <button type="button" onClick={handleReset} className="rounded border border-ghost-forest px-3 py-1.5 text-sm font-bold text-ghost-forest hover:bg-blue-50" aria-label="Go to Home">Home</button>
            <button onClick={() => { setScreen('contact'); updatePath('/contact'); }} className="text-sm font-bold text-gray-700 hover:text-ghost-rust">Contact</button>
            <div className="flex items-center gap-2 text-sm" role="group" aria-label="Language">
              <button type="button" onClick={() => setLocale('en')} aria-pressed={locale === 'en'} className={`font-semibold ${locale === 'en' ? 'text-ghost-forest underline underline-offset-4' : 'text-gray-500 hover:text-ghost-forest'}`}>English</button>
              <span className="text-gray-300" aria-hidden="true">·</span>
              <button type="button" onClick={() => setLocale('es')} aria-pressed={locale === 'es'} className={`font-semibold ${locale === 'es' ? 'text-ghost-forest underline underline-offset-4' : 'text-gray-500 hover:text-ghost-forest'}`}>Spanish</button>
            </div>
            {isLoggedIn ? (
              <>
                <span className="max-w-48 truncate text-sm text-gray-600" title={userEmail || undefined}>{userEmail}</span>
                <button onClick={() => { setScreen('dashboard'); updatePath('/'); }} className="text-sm text-blue-600 hover:text-blue-700">Dashboard</button>
                <button onClick={handleLogout} className="text-sm text-blue-600 hover:text-blue-700">Log Out</button>
              </>
            ) : (
              <button onClick={() => { setAuthMode('login'); setShowLoginModal(true); }} className="text-sm text-blue-600 hover:text-blue-700">Log In</button>
            )}
          </div>
        </div>
      </header>

      <main>
        {purchaseReturn && screen !== 'unlock-verdict' && (
          <section
            role="status"
            className="mx-auto mt-6 flex max-w-5xl items-start justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"
          >
            <p>
              {purchaseReturn === 'success'
                ? 'Payment received. Your 10 assessments will appear in your dashboard as soon as Stripe confirms the payment. If the count has not updated yet, give it a few seconds.'
                : 'Checkout was cancelled. You were not charged, and you can try again whenever you are ready.'}
            </p>
            <button
              type="button"
              onClick={() => setPurchaseReturn(null)}
              className="shrink-0 font-bold text-blue-800 hover:underline"
            >
              Dismiss
            </button>
          </section>
        )}
        {screen === 'landing' && <Landing onStart={handleStartTest} onSelectExample={handleSelectExample} hasDraft={Boolean(resumeDraft)} onResume={handleResume} isLoggedIn={isLoggedIn} onLoginClick={() => { setAuthMode('login'); setShowLoginModal(true); }} locale={locale} />}
        {screen === 'intake' && <IdeaIntake onSubmit={handleIdeaSubmit} initialIdea={idea} />}
        {screen === 'questions' && idea && (
          <QuestionFlow
            idea={idea}
            onResult={handleResultReceived}
            initialDraft={resumeDraft}
            onDraftChange={setResumeDraft}
            onAllowanceRequired={handleAllowanceRequired}
            autoSubmitCompleteDraft={autoSubmitPendingVerdict}
            onAutoSubmitConsumed={() => setAutoSubmitPendingVerdict(false)}
          />
        )}
        {screen === 'unlock-verdict' && (
          <VerdictUnlockPage
            draft={resumeDraft}
            isLoggedIn={isLoggedIn}
            purchaseReturn={purchaseReturn}
            onLoginClick={() => { setAuthMode('login'); setShowLoginModal(true); }}
            onCreditsReady={handleUnlockCreditsReady}
          />
        )}
        {screen === 'result' && result && <ResultReport result={result} onReset={handleReset} isLoggedIn={isLoggedIn} onLoginClick={() => { setAuthMode('signup'); setShowLoginModal(true); }} onRewardClaimed={() => { const token = loadAuthToken(); if (token) void verifyToken(token); }} locale={locale} />}
        {screen === 'dashboard' && isLoggedIn && <UserDashboard purchaseRefresh={purchaseReturn === 'success'} onLogout={handleLogout} onBuy={() => setShowPaywall(true)} onStart={handleStartTest} onOpenResult={savedResult => { setResult(savedResult); setScreen('result'); }} />}
        {getMeLiveOpening && isLoggedIn && <GetMeLiveOpening orderId={getMeLiveOrderId} />}
        {getMeLiveOpening && !isLoggedIn && <section className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-3xl font-black text-ghost-ink">Log in to open your website</h1><p className="mt-3 text-gray-700">Use the email from checkout. Your website is still going online.</p><button type="button" onClick={() => { setAuthMode('login'); setShowLoginModal(true); }} className="mt-6 rounded-lg bg-ghost-rust px-6 py-3 font-black text-white">Log in</button></section>}
        {screen === 'get-me-live' && !getMeLiveOpening && !getMeLiveSetup && <GetMeLiveLanding sourceSprintOrderId={getMeLiveSourceSprintOrderId} isLoggedIn={isLoggedIn} onLoginClick={() => { setAuthMode('login'); setShowLoginModal(true); }} onBack={() => { updatePath('/'); setScreen(isLoggedIn ? 'dashboard' : 'landing'); }} />}
        {screen === 'get-me-live' && getMeLiveSetup && isLoggedIn && <GetMeLiveWorkspace orderId={getMeLiveOrderId} onBack={() => { updatePath('/'); setScreen('dashboard'); }} />}
        {screen === 'get-me-live' && getMeLiveSetup && !isLoggedIn && <section className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-3xl font-black text-ghost-ink">Log in to open your Get Me Live page</h1><p className="mt-3 text-gray-700">Use the email from checkout. Your work is saved.</p><button type="button" onClick={() => { setAuthMode('login'); setShowLoginModal(true); }} className="mt-6 rounded-lg bg-ghost-rust px-6 py-3 font-black text-white">Log in</button></section>}
        {screen === 'contact' && <Contact onStart={handleStartTest} />}
        {(screen === 'privacy' || screen === 'terms' || screen === 'refund' || screen === 'disclaimer') && <LegalPage kind={screen} />}
        {screen === 'action-plan-success' && <ActionPlanSuccess orderId={new URLSearchParams(window.location.search).get('order_id') || ''} onDone={() => { updatePath('/'); setScreen(isLoggedIn ? 'dashboard' : 'landing'); }} />}
        {screen === 'internal-research' && isLoggedIn && <InternalGoogleSearchConsole onBack={() => { updatePath('/'); setScreen('dashboard'); }} />}
        {screen === 'internal-research' && !isLoggedIn && <section className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-3xl font-black text-ghost-ink">Owner login required</h1><p className="mt-3 text-gray-700">This standalone research console is not part of the customer product.</p><button type="button" onClick={() => { setAuthMode('login'); setShowLoginModal(true); }} className="mt-6 rounded-lg bg-ghost-rust px-6 py-3 font-black text-white">Log in</button></section>}
        {screen === 'internal-metrics' && isLoggedIn && <CommercialMetricsConsole onBack={() => { updatePath('/'); setScreen('dashboard'); }} />}
        {screen === 'internal-metrics' && !isLoggedIn && <section className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-3xl font-black text-ghost-ink">Owner login required</h1><p className="mt-3 text-gray-700">Commercial metrics are private operating evidence.</p><button type="button" onClick={() => { setAuthMode('login'); setShowLoginModal(true); }} className="mt-6 rounded-lg bg-ghost-rust px-6 py-3 font-black text-white">Log in</button></section>}
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
