import { useEffect, useMemo, useState } from 'react';
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

interface Props {
  result: EvaluationResult;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onRewardClaimed: () => void;
}

interface RewardResponse {
  rewarded?: boolean;
  reason?: 'already_rewarded' | 'limit_reached';
  message?: string;
  error?: string;
  totalFreeAssessments?: number;
}

export default function ShareCard({ result, isLoggedIn, onLoginClick, onRewardClaimed }: Props) {
  const isSpanish = useDocumentLocale();
  const [format, setFormat] = useState<VerdictCardFormat>('landscape');
  const [includeIdeaName, setIncludeIdeaName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const previewSvg = useMemo(() => createVerdictCardSvg(result, {
    format,
    includeIdeaName,
    shareUrl: window.location.origin,
    locale: isSpanish ? 'es' : 'en'
  }), [format, includeIdeaName, isSpanish, result]);

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
      if (!linkResponse.ok || !linkData.refId || !linkData.link) throw new Error(linkData.error || (isSpanish ? 'No se pudo crear el enlace para compartir.' : 'Could not create your share link'));

      const summary = isSpanish ? createSpanishShareSummary(result, linkData.link, includeIdeaName) : createShareSummary(result, linkData.link, includeIdeaName);
      const cardFile = await createVerdictCardPng(result, { format, includeIdeaName, shareUrl: linkData.link, locale: isSpanish ? 'es' : 'en' });
      const shareTitle = includeIdeaName
        ? (isSpanish ? `Mi veredicto LIT: ${result.idea.ideaName}` : `My LIT verdict: ${result.idea.ideaName}`)
        : (isSpanish ? 'Mi veredicto de Ghost Town LIT' : 'My LIT Ghost Town verdict');

      if (navigator.share) {
        try {
          const canShareFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [cardFile] });
          await navigator.share(canShareFile ? {
            title: shareTitle,
            text: summary,
            files: [cardFile]
          } : {
            title: shareTitle,
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
      if (!rewardResponse.ok) throw new Error(reward.error || (isSpanish ? 'El intercambio se completó, pero no se pudo desbloquear la recompensa.' : 'Your share completed, but the reward could not be unlocked'));

      setMessage(reward.message || (reward.rewarded ? (isSpanish ? `La evaluación ${reward.totalFreeAssessments} de 2 ya está desbloqueada.` : `Assessment ${reward.totalFreeAssessments} of 2 is now unlocked.`) : (isSpanish ? 'Intercambio completado.' : 'Share completed.')));
      onRewardClaimed();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (isSpanish ? 'No se pudo compartir. Inténtalo de nuevo.' : 'Sharing failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const cardFile = await createVerdictCardPng(result, { format, includeIdeaName, shareUrl: window.location.origin, locale: isSpanish ? 'es' : 'en' });
      saveFile(cardFile);
      setMessage(isSpanish ? 'Imagen del veredicto guardada.' : 'Verdict image saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (isSpanish ? 'No se pudo guardar la imagen del veredicto.' : 'Could not save the verdict image'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card min-w-0 p-5 sm:p-7" aria-labelledby="share-card-title" aria-busy={loading || saving}>
      <div className="max-w-reading">
        <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-rust">{isSpanish ? 'Guarda o comparte tu resumen de decisión' : 'Save or share your decision brief'}</p>
        <h2 id="share-card-title" className="mt-3 font-display text-3xl font-semibold leading-tight text-ink">
          {isLoggedIn ? (isSpanish ? 'Comparte la tarjeta del veredicto cuando sea útil.' : 'Share the verdict card when it is useful.') : (isSpanish ? 'Crea una cuenta para usar la recompensa por compartir.' : 'Create an account to use the share reward.')}
        </h2>
        <p className="mt-3 leading-7 text-ink-soft">{isSpanish ? 'La tarjeta comparte un resumen del veredicto y un enlace. El nombre de tu idea permanece privado a menos que elijas incluirlo.' : 'The card shares a verdict summary and link. Your idea name stays private unless you choose to include it.'}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label={isSpanish ? 'Destinos compatibles para compartir en redes sociales' : 'Supported social sharing destinations'}>
        {['Instagram', 'TikTok', 'YouTube', 'Facebook'].map(platform => <span key={platform} className="status-badge border-border bg-surface-muted text-ink-soft">{platform}</span>)}
      </div>

      <div className="mt-6 overflow-hidden rounded-evidence border border-ink/15 bg-ink shadow-lift">
        <img src={svgDataUrl(previewSvg)} alt={getVerdictCardAlt(result, isSpanish ? 'es' : 'en')} className={`block h-auto w-full ${format === 'square' ? 'aspect-square' : 'aspect-[1200/630]'}`} />
      </div>

      <div className="mt-6 grid min-w-0 gap-5 border-y border-border py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <fieldset className="min-w-0">
          <legend className="font-score text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">{isSpanish ? 'Formato de imagen' : 'Image format'}</legend>
          <div className="mt-3 inline-flex min-w-0 rounded-field border border-border bg-surface-muted p-1" role="group" aria-label={isSpanish ? 'Formato de imagen de la tarjeta del veredicto' : 'Verdict card image format'}>
            {(['landscape', 'square'] as VerdictCardFormat[]).map(option => (
              <button key={option} type="button" onClick={() => setFormat(option)} aria-pressed={format === option} className={`min-w-0 rounded-field px-3 py-2 text-left text-sm font-bold transition-colors ${format === option ? 'bg-rust text-rust-foreground shadow-quiet' : 'text-ink-soft hover:bg-surface-raised hover:text-ink'}`}>
                <span className="block capitalize">{option === 'square' ? (isSpanish ? 'Cuadrado' : 'Square') : (isSpanish ? 'Horizontal' : 'Landscape')}</span>
                <span className="mt-0.5 block text-[0.65rem] font-medium opacity-80">{option === 'square' ? 'Instagram · TikTok' : 'Facebook · YouTube'}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
          <input type="checkbox" checked={includeIdeaName} onChange={event => setIncludeIdeaName(event.target.checked)} className="h-5 w-5 shrink-0 rounded border-input text-rust focus:ring-rust" />
          <span className="min-w-0">{isSpanish ? 'Incluir el nombre de mi idea' : 'Include my idea name'}</span>
        </label>
      </div>

      {message && <div className="state-shell state-shell--success mt-5 text-sm font-semibold" role="status" aria-live="polite">✓ {message}</div>}
      {error && <div className="state-shell state-shell--error mt-5 text-sm" role="alert">{error}</div>}

      <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <button type="button" onClick={handleShareAndUnlock} disabled={loading || saving} className="btn-primary min-w-0 text-center disabled:opacity-60">
          {loading ? (isSpanish ? 'Procesando tu intercambio…' : 'Working on your share...') : isLoggedIn ? (isSpanish ? 'Compartir en redes y desbloquear 1 evaluación' : 'Share to Social Apps & Unlock 1 Assessment') : (isSpanish ? 'Crear una cuenta gratuita para desbloquear más' : 'Create Free Account to Unlock More')}
        </button>
        <button type="button" onClick={handleSaveImage} disabled={loading || saving} className="btn-secondary min-w-0 disabled:opacity-60">
          {saving ? (isSpanish ? 'Preparando imagen…' : 'Preparing image...') : (isSpanish ? 'Guardar imagen' : 'Save image')}
        </button>
      </div>
      <p className="mt-4 text-sm leading-6 text-ink-muted">{isSpanish ? 'En móvil, elige Instagram, TikTok, YouTube o Facebook desde la hoja para compartir. Solo se concede una recompensa adicional.' : 'On mobile, choose Instagram, TikTok, YouTube, or Facebook from your share sheet. One bonus reward maximum.'}</p>
    </section>
  );
}

function useDocumentLocale(): boolean {
  const [isSpanish, setIsSpanish] = useState(() => typeof document !== 'undefined' && document.documentElement.lang === 'es');

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsSpanish(root.lang === 'es');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['lang'] });
    return () => observer.disconnect();
  }, []);

  return isSpanish;
}

const spanishShareVerdictLabels = {
  build_now: 'Construir ahora',
  test_first: 'Probar primero',
  niche_down: 'Enfocar el nicho',
  change_business_dna: 'Cambiar el modelo de negocio',
  kill_it_before_it_kills_years: 'Detenerse y replantear'
} as const;

const spanishShareRiskLabels = {
  low: 'bajo',
  medium: 'medio',
  high: 'alto'
} as const;

const spanishShareBusinessDnaLabels = {
  service: 'servicio',
  physical_product: 'producto físico',
  digital_product: 'producto digital',
  marketplace: 'mercado',
  media: 'medios',
  capital: 'capital',
  asset: 'activo'
} as const;

const spanishShareAdvice = {
  build_now: 'Empieza a construir el MVP esta semana.',
  test_first: 'Prueba un supuesto crítico antes de construir.',
  niche_down: 'Enfoca el nicho. Encuentra el segmento donde ganas.',
  change_business_dna: 'Cambia el modelo antes de aumentar la inversión.',
  kill_it_before_it_kills_years: 'No construyas esto. Mátalo antes de que te quite años de vida.'
} as const;

const spanishShareNextTest = {
  build_now: 'Construye un MVP mínimo y pruébalo con tus primeros 3 clientes.',
  test_first: 'Ejecuta una prueba específica para validar tu supuesto principal antes de construir.',
  niche_down: 'Identifica el nicho o segmento más pequeño donde tienes una ventaja injusta.',
  change_business_dna: 'Prueba un modelo de entrega o monetización diferente antes de construir más.',
  kill_it_before_it_kills_years: 'Habla con 10 clientes potenciales antes de reconsiderar esta idea.'
} as const;

function createSpanishShareSummary(result: EvaluationResult, shareUrl: string, includeIdeaName: boolean): string {
  const scores = result.deterministicScores;

  return `Probé mi idea con GhostTown LIT.

**Idea:** ${includeIdeaName ? result.idea.ideaName : 'Privada'}

**Veredicto:** ${spanishShareVerdictLabels[scores.finalVerdict]}

**Riesgo de Ghost Town:** ${scores.ghostTownScore}/5 (${spanishShareRiskLabels[scores.ghostTownRisk]})
**Puntuación LIT:** ${scores.litScore}/5
**ADN del negocio:** ${spanishShareBusinessDnaLabels[scores.businessDnaType]}

**Consejo:** ${spanishShareAdvice[scores.finalVerdict]}

**Próxima prueba:** ${spanishShareNextTest[scores.finalVerdict]}

Prueba tu idea: ${shareUrl}`;
}

function saveFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
