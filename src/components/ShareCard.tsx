import { useMemo, useState } from 'react';
import { EvaluationResult } from '../types/lit';
import { createShareSummary, copyToClipboard } from '../lib/share';
import { apiUrl, authHeaders } from '../lib/api';
import {
  createVerdictCardPng,
  createVerdictCardSvg,
  getVerdictCardAlt,
  svgDataUrl,
  type VerdictCardFormat
} from '../lib/verdictCardImage';
import type { Locale } from '../lib/locale';

interface Props {
  result: EvaluationResult;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onRewardClaimed: () => void;
  locale?: Locale;
}

const COPY = {
  en: {
    kicker: 'Share reward',
    headingIn: 'Share your verdict card to unlock your next assessment',
    headingOut: 'Create an account to join the share reward',
    body: 'Your idea name stays private unless you choose to include it. Members can unlock one extra assessment by sharing a finished result.',
    platforms: 'Supported social sharing destinations',
    format: 'Image format',
    formatGroup: 'Verdict card image format',
    formats: { landscape: 'Wide', square: 'Square' },
    includeName: 'Include my idea name',
    shareTitle: (name: string) => `My GhostTown verdict: ${name}`,
    shareTitlePrivate: 'My GhostTown verdict',
    linkFailed: 'We could not create your share link.',
    rewardFailed: 'Your share worked, but we could not unlock the reward.',
    unlocked: (n: number | undefined) => `Assessment ${n} of 2 is now unlocked.`,
    shared: 'Shared.',
    shareFailed: 'Sharing failed. Please try again.',
    saveFailed: 'We could not save the verdict image.',
    creatingCard: 'Creating your verdict card...',
    shareButton: 'Share and unlock 1 assessment',
    joinButton: 'Create a free account to unlock more',
    creating: 'Creating...',
    save: 'Save image',
    footnote: 'On your phone, choose Instagram, TikTok, YouTube or Facebook from the share menu. One extra assessment at most.'
  },
  es: {
    kicker: 'Premio por compartir',
    headingIn: 'Comparte tu tarjeta de veredicto y desbloquea tu próxima evaluación',
    headingOut: 'Crea una cuenta para participar en el premio por compartir',
    body: 'El nombre de tu idea queda privado a menos que decidas incluirlo. Los miembros pueden desbloquear una evaluación extra al compartir un resultado terminado.',
    platforms: 'Redes sociales donde puedes compartir',
    format: 'Formato de imagen',
    formatGroup: 'Formato de la imagen del veredicto',
    formats: { landscape: 'Ancha', square: 'Cuadrada' },
    includeName: 'Incluir el nombre de mi idea',
    shareTitle: (name: string) => `Mi veredicto de GhostTown: ${name}`,
    shareTitlePrivate: 'Mi veredicto de GhostTown',
    linkFailed: 'No pudimos crear tu enlace para compartir.',
    rewardFailed: 'Compartiste bien, pero no pudimos desbloquear el premio.',
    unlocked: (n: number | undefined) => `La evaluación ${n} de 2 ya está desbloqueada.`,
    shared: 'Compartido.',
    shareFailed: 'No se pudo compartir. Inténtalo otra vez.',
    saveFailed: 'No pudimos guardar la imagen del veredicto.',
    creatingCard: 'Creando tu tarjeta de veredicto...',
    shareButton: 'Comparte y desbloquea 1 evaluación',
    joinButton: 'Crea una cuenta gratis para desbloquear más',
    creating: 'Creando...',
    save: 'Guardar imagen',
    footnote: 'En tu teléfono, elige Instagram, TikTok, YouTube o Facebook en el menú de compartir. Máximo una evaluación extra.'
  }
};

interface RewardResponse {
  rewarded?: boolean;
  reason?: 'already_rewarded' | 'limit_reached';
  message?: string;
  error?: string;
  totalFreeAssessments?: number;
}

export default function ShareCard({ result, isLoggedIn, onLoginClick, onRewardClaimed, locale = 'en' }: Props) {
  const t = COPY[locale];
  const [format, setFormat] = useState<VerdictCardFormat>('landscape');
  const [includeIdeaName, setIncludeIdeaName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const previewSvg = useMemo(() => createVerdictCardSvg(result, {
    format,
    includeIdeaName,
    shareUrl: window.location.origin
  }), [format, includeIdeaName, result]);

  const handleShareAndUnlock = async () => {
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const linkResponse = await fetch(apiUrl('/api/referral/create'), {
        method: 'POST',
        headers: authHeaders()
      });
      const linkData = await linkResponse.json<{ refId?: string; link?: string; error?: string }>();
      if (!linkResponse.ok || !linkData.refId || !linkData.link) {
        throw new Error(linkData.error || t.linkFailed);
      }

      const summary = createShareSummary(result, linkData.link, includeIdeaName);
      const cardFile = await createVerdictCardPng(result, {
        format,
        includeIdeaName,
        shareUrl: linkData.link
      });

      if (navigator.share) {
        try {
          const canShareFile = typeof navigator.canShare === 'function'
            && navigator.canShare({ files: [cardFile] });
          await navigator.share(canShareFile ? {
            title: includeIdeaName ? t.shareTitle(result.idea.ideaName) : t.shareTitlePrivate,
            text: summary,
            files: [cardFile]
          } : {
            title: includeIdeaName ? t.shareTitle(result.idea.ideaName) : t.shareTitlePrivate,
            text: summary
          });
        } catch (caught) {
          if (caught instanceof DOMException && caught.name === 'AbortError') return;
          throw caught;
        }
      } else {
        await copyToClipboard(summary);
        saveFile(cardFile);
      }

      const rewardResponse = await fetch(apiUrl('/api/share/reward'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ resultId: result.resultId, refId: linkData.refId })
      });
      const reward = await rewardResponse.json<RewardResponse>();
      if (!rewardResponse.ok) {
        throw new Error(reward.error || t.rewardFailed);
      }

      setMessage(reward.message || (reward.rewarded
        ? t.unlocked(reward.totalFreeAssessments)
        : t.shared));
      onRewardClaimed();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.shareFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = async () => {
    setSaving(true);
    setError('');
    try {
      const cardFile = await createVerdictCardPng(result, {
        format,
        includeIdeaName,
        shareUrl: window.location.origin
      });
      saveFile(cardFile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-blue-200 bg-ghost-sand p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t.kicker}</p>
      <h3 className="mt-2 text-xl font-bold text-blue-950">
        {isLoggedIn ? t.headingIn : t.headingOut}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-blue-800">
        {t.body}
      </p>
      <div className="mt-4 flex flex-wrap gap-2" aria-label={t.platforms}>
        {['Instagram', 'TikTok', 'YouTube', 'Facebook'].map(platform => (
          <span key={platform} className="rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-bold text-blue-800">
            {platform}
          </span>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-white/80 bg-slate-950 shadow-lg">
        <img
          src={svgDataUrl(previewSvg)}
          alt={getVerdictCardAlt(result)}
          className={`block h-auto w-full ${format === 'square' ? 'aspect-square' : 'aspect-[1200/630]'}`}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-lg border border-blue-100 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-gray-500">{t.format}</span>
          <div className="mt-2 inline-flex rounded-lg border border-gray-200 bg-white p-1" role="group" aria-label={t.formatGroup}>
            {(['landscape', 'square'] as VerdictCardFormat[]).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setFormat(option)}
                aria-pressed={format === option}
                className={`rounded-md px-3 py-1.5 text-sm font-bold capitalize transition ${
                  format === option ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="block">{t.formats[option]}</span>
                <span className="block text-[10px] font-medium opacity-80">
                  {option === 'square' ? 'Instagram · TikTok' : 'Facebook · YouTube'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={includeIdeaName}
            onChange={event => setIncludeIdeaName(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {t.includeName}
        </label>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800" role="status">
          ✓ {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          onClick={handleShareAndUnlock}
          disabled={loading || saving}
          className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? t.creatingCard
            : isLoggedIn
              ? t.shareButton
              : t.joinButton}
        </button>
        <button
          type="button"
          onClick={handleSaveImage}
          disabled={loading || saving}
          className="rounded-lg border border-blue-300 bg-white px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
        >
          {saving ? t.creating : t.save}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-blue-700">
        {t.footnote}
      </p>
    </section>
  );
}

function saveFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
