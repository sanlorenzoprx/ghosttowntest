import { useEffect, useState } from 'react';
import { isValidEmail, isStrongPassword } from '../lib/utils';
import { apiUrl } from '../lib/api';
import type { AuthResponse } from '../types/auth';
import { authHeaders } from '../lib/api';
import { getReferralIdFromUrl } from '../lib/share';
import { getTestsUsed } from '../lib/storage';
import type { Locale } from '../lib/locale';

type LoginCopy = {
  badEmail: string;
  shortPassword: string;
  serviceStatus: (status: number) => string;
  authFailed: string;
  unreachable: (url: string) => string;
  createAccount: string;
  logIn: string;
  close: string;
  signupIntro: string;
  loginIntro: string;
  email: string;
  password: string;
  passwordHint: string;
  wait: string;
  toLogin: string;
  toSignup: string;
};

const COPY: Record<Locale, LoginCopy> = {
  en: {
    badEmail: 'Please enter a valid email address',
    shortPassword: 'Password must be at least 6 characters',
    serviceStatus: status => `Registration service returned ${status}. Please try again.`,
    authFailed: 'Authentication failed. Please try again.',
    unreachable: url => `Cannot reach the registration service at ${url}. Please try again.`,
    createAccount: 'Create Account',
    logIn: 'Log In',
    close: 'Close registration form',
    signupIntro: 'Save your ideas and track results',
    loginIntro: 'Access your saved results and get more free tests',
    email: 'Email Address',
    password: 'Password',
    passwordHint: 'At least 6 characters',
    wait: 'Please wait...',
    toLogin: 'Already have an account? Log in',
    toSignup: "Don't have an account? Sign up"
  },
  es: {
    badEmail: 'Escribe un correo electrónico válido',
    shortPassword: 'La contraseña debe tener al menos 6 caracteres',
    serviceStatus: status => `El servicio de registro respondió ${status}. Inténtalo otra vez.`,
    authFailed: 'No pudimos confirmar tu cuenta. Inténtalo otra vez.',
    unreachable: url => `No pudimos conectar con el servicio de registro en ${url}. Inténtalo otra vez.`,
    createAccount: 'Crear cuenta',
    logIn: 'Entrar',
    close: 'Cerrar el formulario de registro',
    signupIntro: 'Guarda tus ideas y sigue tus resultados',
    loginIntro: 'Mira tus resultados guardados y consigue más pruebas gratis',
    email: 'Correo electrónico',
    password: 'Contraseña',
    passwordHint: 'Al menos 6 caracteres',
    wait: 'Espera un momento...',
    toLogin: '¿Ya tienes cuenta? Entra',
    toSignup: '¿No tienes cuenta? Crea una'
  }
};

interface Props {
  onLogin: (email: string) => void;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  locale?: Locale;
}

export default function LoginModal({ onLogin, onClose, initialMode = 'login', locale = 'en' }: Props) {
  const t = COPY[locale];
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
      setError(t.badEmail);
      return;
    }

    if (!isStrongPassword(password)) {
      setError(t.shortPassword);
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
        setError(data?.error || t.serviceStatus(response.status));
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
        setError(t.authFailed);
      }
    } catch {
      setError(t.unreachable(apiUrl('/api/auth/signup')));
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
            {isSignup ? t.createAccount : t.logIn}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={t.close}
            className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-2xl leading-none text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <p className="text-gray-600 text-sm mb-6">
          {isSignup 
            ? t.signupIntro
            : t.loginIntro}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-bold mb-1">{t.email}</label>
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
            <label htmlFor="auth-password" className="block text-sm font-bold mb-1">{t.password}</label>
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
            <p className="text-xs text-gray-500 mt-1">{t.passwordHint}</p>
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
            {loading ? t.wait : isSignup ? t.createAccount : t.logIn}
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
              ? t.toLogin
              : t.toSignup}
          </button>
        </div>

      </div>
    </div>
  );
}
