import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
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

type AuthLocale = 'en' | 'es';

const authCopy = {
  en: {
    loginTitle: 'Log in to recover your work',
    signupTitle: 'Create your GhostTown account',
    loginIntro: 'Your account connects saved verdicts, paid orders, fulfillment status, and completed files where supported.',
    signupIntro: 'Create an account so GhostTown can associate future paid orders with your email and bring you back to progress safely.',
    ownershipTitle: 'Why this matters',
    ownershipItems: [
      'Associates paid orders with the email used at checkout.',
      'Lets you return to the fulfillment status page.',
      'Helps recover completed files and saved verdicts where supported.'
    ],
    email: 'Email address',
    password: 'Password',
    passwordHelp: 'At least 6 characters',
    invalidEmail: 'Please enter a valid email address',
    weakPassword: 'Password must be at least 6 characters',
    serviceReturned: 'Registration service returned',
    tryAgain: 'Please try again.',
    authFailed: 'Authentication failed. Please try again.',
    cannotReach: 'Cannot reach the registration service',
    loading: 'Please wait…',
    submitLogin: 'Log in',
    submitSignup: 'Create account',
    close: 'Close registration form',
    switchToLogin: 'Already have an account? Log in',
    switchToSignup: "Don't have an account? Sign up"
  },
  es: {
    loginTitle: 'Inicia sesión para recuperar tu trabajo',
    signupTitle: 'Crea tu cuenta de GhostTown',
    loginIntro: 'Tu cuenta conecta veredictos guardados, órdenes pagadas, estado de fulfillment y archivos completados donde estén disponibles.',
    signupIntro: 'Crea una cuenta para que GhostTown pueda asociar futuras órdenes pagadas con tu correo y devolverte al progreso de forma segura.',
    ownershipTitle: 'Por qué importa',
    ownershipItems: [
      'Asocia órdenes pagadas con el correo usado en checkout.',
      'Te permite volver a la página de estado de fulfillment.',
      'Ayuda a recuperar archivos completados y veredictos guardados donde esté disponible.'
    ],
    email: 'Correo electrónico',
    password: 'Contraseña',
    passwordHelp: 'Al menos 6 caracteres',
    invalidEmail: 'Ingresa un correo electrónico válido',
    weakPassword: 'La contraseña debe tener al menos 6 caracteres',
    serviceReturned: 'El servicio de registro respondió',
    tryAgain: 'Inténtalo de nuevo.',
    authFailed: 'La autenticación falló. Inténtalo de nuevo.',
    cannotReach: 'No se puede contactar el servicio de registro',
    loading: 'Espera un momento…',
    submitLogin: 'Iniciar sesión',
    submitSignup: 'Crear cuenta',
    close: 'Cerrar formulario de registro',
    switchToLogin: '¿Ya tienes cuenta? Inicia sesión',
    switchToSignup: '¿No tienes cuenta? Regístrate'
  }
};

function authLocale(): AuthLocale {
  if (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es')) return 'es';
  return 'en';
}

const dialogFocusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function dialogFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(dialogFocusableSelector)).filter(element => (
    !element.hidden && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0
  ));
}

function containDialogFocus(event: ReactKeyboardEvent<HTMLElement>, dialog: HTMLElement | null) {
  if (event.key !== 'Tab' || !dialog) return;
  const focusable = dialogFocusableElements(dialog);
  if (focusable.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

export default function LoginModal({ onLogin, onClose, initialMode = 'login' }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(initialMode === 'signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const locale = authLocale();
  const text = authCopy[locale];

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const initial = dialog.querySelector<HTMLElement>('[data-modal-initial-focus]') ?? dialogFocusableElements(dialog)[0] ?? dialog;
      initial.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !loading) {
      event.preventDefault();
      onClose();
      return;
    }
    containDialogFocus(event, dialogRef.current);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError(text.invalidEmail);
      return;
    }

    if (!isStrongPassword(password)) {
      setError(text.weakPassword);
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
        setError(data?.error || `${text.serviceReturned} ${response.status}. ${text.tryAgain}`);
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
        setError(text.authFailed);
      }
    } catch {
      setError(`${text.cannotReach} at ${apiUrl('/api/auth/signup')}. ${text.tryAgain}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        aria-describedby="auth-dialog-description"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg focus:outline-none sm:p-8"
      >
        <div className="mb-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-ghost-rust">{isSignup ? text.submitSignup : text.submitLogin}</p>
            <h2 id="auth-dialog-title" className="mt-1 break-words text-2xl font-bold text-ghost-ink">
              {isSignup ? text.signupTitle : text.loginTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={text.close}
            className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-2xl leading-none text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 disabled:opacity-50"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <p id="auth-dialog-description" className="mb-5 text-sm leading-6 text-gray-600">
          {isSignup ? text.signupIntro : text.loginIntro}
        </p>

        <section className="mb-6 rounded-lg border border-ghost-forest/20 bg-[#eef3ef] p-4">
          <h3 className="text-sm font-black text-ghost-forest">{text.ownershipTitle}</h3>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-gray-700">
            {text.ownershipItems.map(item => <li key={item}>• {item}</li>)}
          </ul>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm font-bold">{text.email}</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-11 w-full rounded border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ghost-rust/40"
              disabled={loading}
              autoComplete="email"
              data-modal-initial-focus
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1 block text-sm font-bold">{text.password}</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="min-h-11 w-full rounded border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ghost-rust/40"
              disabled={loading}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
            <p className="mt-1 text-xs text-gray-500">{text.passwordHelp}</p>
          </div>

          {error && (
            <div className="break-words rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded bg-ghost-rust py-2 font-bold text-white transition hover:bg-[#96360d] focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? text.loading : isSignup ? text.submitSignup : text.submitLogin}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
            }}
            className="text-center text-sm font-medium text-ghost-rust underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ghost-rust/30"
          >
            {isSignup ? text.switchToLogin : text.switchToSignup}
          </button>
        </div>
      </div>
    </div>
  );
}
