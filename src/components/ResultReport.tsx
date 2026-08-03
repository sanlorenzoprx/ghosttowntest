import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { EvaluationResult, PublicVideoResult } from '../types/lit';
import ShareCard from './ShareCard';
import { loadResearchSignals, saveLatestResult } from '../lib/storage';
import { apiUrl, authHeaders } from '../lib/api';
import ActionPlanModal from './ActionPlanModal';
import PaywallModal from './PaywallModal';
import type { PaidTestIntake } from '../types/paidTest';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import PrePurchaseResearchSignals from './PrePurchaseResearchSignals';
import type { PrePurchaseResearchSignals as ResearchSignals } from '../types/researchSignals';

interface Props {
  result: EvaluationResult;
  onReset: () => void;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onRewardClaimed: () => void;
  locale: 'en' | 'es';
}

const verdictPresentation = {
  build_now: { label: 'Build now', tone: 'status-badge--pass', surface: 'border-pass/30 bg-pass-soft', detail: 'The assessment found a stronger case to move forward while continuing to gather evidence.' },
  test_first: { label: 'Test first', tone: 'status-badge--watch', surface: 'border-watch/30 bg-watch-soft', detail: 'The assessment found a promising direction with a meaningful uncertainty still worth testing.' },
  niche_down: { label: 'Narrow the niche', tone: 'status-badge--watch', surface: 'border-watch/30 bg-watch-soft', detail: 'The assessment found a direction that may need a more specific buyer or problem before building.' },
  change_business_dna: { label: 'Change the business model', tone: 'status-badge--watch', surface: 'border-watch/30 bg-watch-soft', detail: 'The assessment found a mismatch that deserves a different business approach before more investment.' },
  kill_it_before_it_kills_years: { label: 'Stop and rethink', tone: 'status-badge--stop', surface: 'border-stop/30 bg-stop-soft', detail: 'The assessment found risks serious enough to pause, learn, and reconsider the premise.' }
} as const;

const spanishVerdictPresentation = {
  build_now: { label: 'Construir ahora', tone: 'status-badge--pass', surface: 'border-pass/30 bg-pass-soft', detail: 'La evaluación encontró un caso más sólido para avanzar mientras sigues reuniendo evidencia.' },
  test_first: { label: 'Probar primero', tone: 'status-badge--watch', surface: 'border-watch/30 bg-watch-soft', detail: 'La evaluación encontró una dirección prometedora con una incertidumbre importante que aún vale la pena probar.' },
  niche_down: { label: 'Enfocar el nicho', tone: 'status-badge--watch', surface: 'border-watch/30 bg-watch-soft', detail: 'La evaluación encontró una dirección que puede necesitar un comprador o problema más específico antes de construir.' },
  change_business_dna: { label: 'Cambiar el modelo de negocio', tone: 'status-badge--watch', surface: 'border-watch/30 bg-watch-soft', detail: 'La evaluación encontró un desajuste que merece un enfoque de negocio diferente antes de invertir más.' },
  kill_it_before_it_kills_years: { label: 'Detenerse y replantear', tone: 'status-badge--stop', surface: 'border-stop/30 bg-stop-soft', detail: 'La evaluación encontró riesgos suficientemente serios para pausar, aprender y reconsiderar la premisa.' }
} as const;

const deterministicSpanishCopy = {
  build_now: {
    headline: 'Tienes la ventaja.',
    explanation: 'Demanda clara, buena puntuación LIT y una ventaja injusta. Las condiciones son favorables.',
    nextTest: 'Construye un MVP mínimo y pruébalo con tus primeros 3 clientes.',
    doNotBuildUntil: 'Ya validaste con al menos 1 cliente que paga.',
    advice: 'Empieza a construir el MVP esta semana.'
  },
  test_first: {
    headline: 'Buena idea, prueba el supuesto.',
    explanation: 'Hay potencial, pero también riesgos. Valida primero tu supuesto más riesgoso.',
    nextTest: 'Ejecuta una prueba específica para validar tu supuesto principal antes de construir.',
    doNotBuildUntil: 'Tu supuesto más riesgoso esté validado.',
    advice: 'Prueba un supuesto crítico antes de construir.'
  },
  test_first_passion: {
    headline: 'Pasión sin prueba.',
    explanation: 'Tienes entusiasmo, pero aún no validaste que a los clientes les importe tanto como a ti.',
    nextTest: 'Encuentra UN cliente que pague o una señal clara de demanda antes de construir cualquier cosa.',
    doNotBuildUntil: 'Alguien esté dispuesto a pagar por esta solución hoy.',
    advice: 'Prueba antes de construir. Encuentra primero a tu primer cliente.'
  },
  niche_down: {
    headline: 'Demasiado amplio, sin foso.',
    explanation: 'Tu idea compite en un espacio saturado sin una ventaja defendible.',
    nextTest: 'Identifica el nicho o segmento más pequeño donde tienes una ventaja injusta.',
    doNotBuildUntil: 'Tengas una ventaja injusta clara y defendible en un nicho específico.',
    advice: 'Enfoca el nicho. Encuentra el segmento donde ganas.'
  },
  change_business_dna: {
    headline: 'Cambia el modelo de negocio.',
    explanation: 'La evaluación encontró un desajuste que merece otro enfoque de negocio antes de invertir más.',
    nextTest: 'Prueba un modelo de entrega o monetización diferente antes de construir más.',
    doNotBuildUntil: 'El modelo de negocio pueda sostener el tipo de evidencia que necesitas.',
    advice: 'Cambia el modelo antes de aumentar la inversión.'
  },
  kill_it_before_it_kills_years: {
    headline: 'Esto es un ghost town.',
    explanation: 'No hay demanda real o no tienes una ventaja injusta para ganar en este espacio.',
    nextTest: 'Habla con 10 clientes potenciales antes de reconsiderar esta idea.',
    doNotBuildUntil: 'Al menos una persona esté intentando resolver activamente este problema hoy y dispuesta a pagar.',
    advice: 'No construyas esto. Mátalo antes de que te quite años de vida.'
  }
} as const;

const deterministicEnglishCopy = {
  build_now: {
    headline: 'You have the advantage.',
    explanation: 'Clear demand, strong LIT score, and unfair advantage. The conditions are right.',
    nextTest: 'Build a minimal MVP and test with your first 3 customers.',
    doNotBuildUntil: 'You have already validated with at least 1 paying customer.',
    advice: 'Start building the MVP this week.'
  },
  test_first: {
    headline: 'Good idea, test the assumption.',
    explanation: 'You have potential, but there are risks. Validate your riskiest assumption first.',
    nextTest: 'Run a specific test to validate your biggest assumption before building.',
    doNotBuildUntil: 'Your riskiest assumption is validated.',
    advice: 'Test one critical assumption before building.'
  },
  test_first_passion: {
    headline: 'Passion without proof.',
    explanation: "You are excited, but you haven't validated that customers care as much as you do.",
    nextTest: 'Find ONE paying customer or clear signal of demand before building anything.',
    doNotBuildUntil: 'Someone is willing to pay for this solution today.',
    advice: 'Test before you build. Find your first customer first.'
  },
  niche_down: {
    headline: 'Too broad, no moat.',
    explanation: 'Your idea is competing in a crowded space with no defensible advantage.',
    nextTest: 'Identify the smallest niche/segment where you have an unfair advantage.',
    doNotBuildUntil: 'You have a clear, defensible unfair advantage in a specific niche.',
    advice: 'Niche down. Find the segment where you win.'
  },
  change_business_dna: {
    headline: 'Change the business model.',
    explanation: 'The assessment found a mismatch that deserves a different business approach before more investment.',
    nextTest: 'Test a different delivery or monetization model before building more.',
    doNotBuildUntil: 'The business model can support the kind of evidence you need.',
    advice: 'Change the model before increasing investment.'
  },
  kill_it_before_it_kills_years: {
    headline: 'This is a ghost town.',
    explanation: 'There is no real demand or you have no unfair advantage to win in this space.',
    nextTest: 'Talk to 10 potential customers before reconsidering this idea.',
    doNotBuildUntil: 'At least one person is actively trying to solve this problem today and willing to pay.',
    advice: 'Do not build this. Kill it before it kills years of your life.'
  }
} as const;

export default function ResultReport({ result, onReset, isLoggedIn, onLoginClick, onRewardClaimed, locale }: Props) {
  const [paidLoading, setPaidLoading] = useState(false);
  const [paidError, setPaidError] = useState('');
  const [showActionPlanForm, setShowActionPlanForm] = useState(false);
  const [showDeclinedPlanOffer, setShowDeclinedPlanOffer] = useState(false);
  const [video, setVideo] = useState<PublicVideoResult | undefined>(result.video);
  const [researchSignals, setResearchSignals] = useState<ResearchSignals | null>(() => loadResearchSignals(result.resultId));
  const scores = result.deterministicScores;
  const verdict = result.verdict;

  useEffect(() => {
    saveLatestResult(result);
    if (isLoggedIn) {
      void fetch(apiUrl('/api/results'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ result })
      });
    }
  }, [isLoggedIn, result]);

  useEffect(() => {
    setVideo(result.video);
    setResearchSignals(loadResearchSignals(result.resultId));
  }, [result]);

  useEffect(() => {
    if (!video || video.status === 'complete') return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(apiUrl(video.status_url));
        if (!response.ok) return;
        const next = await response.json<PublicVideoResult>();
        if (active) setVideo(next);
      } catch {
        // The report remains available while a transient video-status request retries.
      }
    };
    const interval = window.setInterval(() => void refresh(), 4000);
    void refresh();
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [video?.job_id, video?.status, video?.status_url]);

  const litPercent = Math.round(scores.litScore * 20);
  const scoreTone = litPercent >= 75 ? 'text-pass' : litPercent >= 50 ? 'text-watch' : 'text-stop';
  const presentation = (locale === 'es' ? spanishVerdictPresentation : verdictPresentation)[scores.finalVerdict];
  const headline = localizeDeterministicField(locale, scores.finalVerdict, 'headline', verdict?.verdict_headline ?? scores.verdictHeadline);
  const advice = localizeDeterministicField(locale, scores.finalVerdict, 'advice', verdict?.one_sentence_advice ?? scores.oneSentenceAdvice);
  const verdictExplanation = localizeDeterministicField(locale, scores.finalVerdict, 'explanation', scores.verdictExplanation);
  const doNotBuildUntil = localizeDeterministicField(locale, scores.finalVerdict, 'doNotBuildUntil', verdict?.do_not_build_until ?? scores.doNotBuildUntil);
  const recommendedNextTest = localizeDeterministicField(locale, scores.finalVerdict, 'nextTest', verdict?.recommended_next_test ?? scores.recommendedNextTest);
  const confidencePercent = verdict ? Math.round(verdict.confidence * 100) : null;
  const litBandLabel = getScoreBandLabel(scores.litBand, locale);
  const highWallsBandLabel = getScoreBandLabel(scores.highWallsBand, locale);
  const ghostTownRiskLabel = getRiskLevelLabel(scores.ghostTownRisk, locale);
  const businessDnaTypeLabel = getBusinessDnaLabel(scores.businessDnaType, locale);
  const highestScoringDimension = [
    { label: locale === 'es' ? 'Ventaja' : 'Leverage', value: scores.leverageScore, detail: result.analysis?.unfair_advantage },
    { label: locale === 'es' ? 'Conocimiento' : 'Insight', value: scores.insightScore, detail: result.analysis?.market_need },
    { label: locale === 'es' ? 'Momento' : 'Timing', value: scores.timingScore, detail: result.analysis?.timing_readiness },
    { label: locale === 'es' ? 'Barreras altas' : 'High walls', value: scores.highWallsScore, detail: result.analysis?.competitive_landscape }
  ].reduce((strongest, candidate) => candidate.value > strongest.value ? candidate : strongest);
  const businessDnaCaution = verdict?.biggest_trap ?? scores.businessDnaTrap;
  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;
  const scoreCards = [
    { label: locale === 'es' ? 'Riesgo de Ghost Town' : 'Ghost Town risk', value: `${scores.ghostTownScore}/5`, detail: `${ghostTownRiskLabel} ${locale === 'es' ? 'riesgo' : 'risk'}`, testId: 'risk-level' },
    { label: locale === 'es' ? 'Puntuación LIT' : 'LIT score', value: `${scores.litScore}/5`, detail: litBandLabel, testId: 'lit-score' },
    { label: locale === 'es' ? 'Ventaja' : 'Leverage', value: `${scores.leverageScore}/5` },
    { label: locale === 'es' ? 'Conocimiento' : 'Insight', value: `${scores.insightScore}/5` },
    { label: locale === 'es' ? 'Momento' : 'Timing', value: `${scores.timingScore}/5` },
    { label: locale === 'es' ? 'Barreras altas' : 'High walls', value: `${scores.highWallsScore}/5`, detail: highWallsBandLabel }
  ];

  const openActionPlanForm = () => {
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }
    setPaidError('');
    setShowActionPlanForm(true);
  };

  const startPaidTest = async (intake: PaidTestIntake) => {
    setPaidLoading(true);
    setPaidError('');
    try {
      const response = await fetch(apiUrl('/api/paid-test/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(intake)
      });
      const data = await response.json<{ sessionUrl?: string; error?: string }>();
      if (!response.ok || !data.sessionUrl) throw new Error(data.error || 'Checkout is not available right now');
      window.location.assign(data.sessionUrl);
    } catch (error) {
      setPaidError(error instanceof Error ? error.message : (locale === 'es' ? 'El checkout no se pudo completar.' : 'Checkout failed'));
      setPaidLoading(false);
    }
  };

  return (
    <main className="mx-auto min-w-0 max-w-4xl px-4 py-8 pb-12 sm:px-6 sm:py-12 sm:pb-12">
      <section data-testid="verdict-card" className={`relative min-w-0 overflow-hidden rounded-evidence border p-6 shadow-lift sm:p-9 ${presentation.surface}`} aria-labelledby="verdict-title">
        <div className="absolute inset-x-0 top-0 h-1 bg-rust" />
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust">{locale === 'es' ? 'Evaluación gratuita · Resumen de decisión' : 'Free assessment · Decision brief'}</p>
            <span className={`status-badge mt-4 ${presentation.tone}`}>{presentation.label}</span>
          </div>
          <div className="max-w-sm text-sm leading-6 text-ink-soft">
            <p>{locale === 'es' ? 'Banda LIT' : 'LIT band'}: <span className="font-bold capitalize text-ink">{litBandLabel}</span>{confidencePercent !== null ? ` · ${locale === 'es' ? 'confianza del veredicto' : 'verdict confidence'} ${confidencePercent}%` : ''}</p>
            <p className="mt-1">{locale === 'es' ? 'Se basa en tus respuestas y no constituye prueba de demanda de mercado.' : 'Based on your answers; this is not proof of market demand.'}</p>
          </div>
        </div>

        <div className="mt-7 flex min-w-0 flex-col gap-6 sm:flex-row sm:items-center">
          <div className="ghost-score-ring grid h-32 w-32 shrink-0 place-items-center rounded-full p-2" style={{ '--score': `${litPercent}%` } as CSSProperties} aria-label={`${locale === 'es' ? 'Puntuación LIT' : 'LIT score'} ${litPercent} ${locale === 'es' ? 'por ciento' : 'percent'}`}>
            <div className="grid h-full w-full place-items-center rounded-full bg-surface-raised text-center">
              <span className={`font-score text-5xl font-bold leading-none ${scoreTone}`}>{litPercent}</span>
              <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-ink-muted">{locale === 'es' ? 'Puntuación LIT' : 'LIT score'}</span>
            </div>
          </div>
          <div className="min-w-0">
            <h1 id="verdict-title" className="font-display text-4xl font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-5xl">{headline}</h1>
            <p className="mt-4 max-w-reading text-lg leading-8 text-ink">{advice}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid min-w-0 gap-4 md:grid-cols-2" aria-label={locale === 'es' ? 'Puntuación y cautela principales' : 'Leading score and caution'}>
        <article className="evidence-panel min-w-0">
          <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-pass">{locale === 'es' ? 'Dimensión con mayor puntuación' : 'Highest-scoring dimension'}</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-ink">{highestScoringDimension.label}</h2>
          <p className="mt-3 font-score text-3xl font-bold text-ink">{highestScoringDimension.value}/5</p>
          <p className="mt-3 break-words text-sm leading-6 text-ink-soft">{highestScoringDimension.detail ?? (locale === 'es' ? 'Es la dimensión con mayor puntuación en esta evaluación.' : 'This is the highest-scoring dimension in this assessment.')}</p>
        </article>
        <article className="state-shell min-w-0 border-stop/30 bg-stop-soft">
          <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-stop">{locale === 'es' ? 'Cautela de ADN del negocio' : 'Business DNA caution'}</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-ink">{locale === 'es' ? 'Lo que debes observar antes de construir' : 'What to watch before building'}</h2>
          <p className="mt-3 break-words leading-7 text-ink-soft">{businessDnaCaution}</p>
          <p className="mt-4 border-t border-stop/20 pt-4 text-sm leading-6 text-ink-soft"><span className="font-bold text-ink">{locale === 'es' ? 'No construyas hasta:' : 'Do not build until:'}</span> {doNotBuildUntil}</p>
        </article>
      </section>

      <section data-testid="next-step" className="state-shell mt-4 min-w-0 border-pass/30 bg-pass-soft" aria-labelledby="next-test-title">
        <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-pass">{locale === 'es' ? 'Próxima prueba de campo recomendada' : 'Recommended next field test'}</p>
        <h2 id="next-test-title" className="mt-3 font-display text-2xl font-semibold text-ink">{locale === 'es' ? 'Reúne la evidencia que podría cambiar la decisión.' : 'Gather the evidence that could change the decision.'}</h2>
        <p className="mt-4 max-w-reading break-words text-lg leading-8 text-ink">{recommendedNextTest}</p>
      </section>

      {video && (
        <section className="card mt-6 min-w-0 bg-ink p-5 text-ink-inverse sm:p-6" aria-labelledby="public-short-title">
          <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-rust-soft">{locale === 'es' ? 'Tu video corto público' : 'Your public short'}</p>
          <h2 id="public-short-title" className="mt-2 font-display text-2xl font-semibold">{locale === 'es' ? 'Tu informe está listo mientras preparamos el contenido multimedia.' : 'Your report is ready while media is prepared.'}</h2>
          {video.status === 'complete' && video.video_url ? (
            <video className="mx-auto mt-5 max-h-[70vh] w-full max-w-sm rounded-field bg-black" controls playsInline preload="metadata" src={apiUrl(video.video_url)}>{locale === 'es' ? 'Tu navegador no admite video MP4.' : 'Your browser does not support MP4 video.'}</video>
          ) : (
            <div className="mt-5 rounded-panel border border-white/15 bg-white/5 p-5">
              <p className="font-bold">{locale === 'es' ? 'Shorts Factory está preparando el video.' : 'Shorts Factory is preparing the video.'}</p>
              <p className="mt-2 text-sm leading-6 text-white/70">{locale === 'es' ? 'Este panel se actualiza automáticamente. Tu evaluación ya está disponible.' : 'This panel updates automatically. Your assessment remains available now.'}</p>
            </div>
          )}
          <p className="mt-4 text-xs leading-5 text-white/60">{locale === 'es' ? 'Contenido público · elegible para reutilización y distribución después de verificar el contenido multimedia.' : 'Public content · eligible for reuse and distribution after media verification.'}</p>
        </section>
      )}

      <section className="mt-8" aria-labelledby="score-detail-title">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-rust">{locale === 'es' ? 'Detalle de puntuación' : 'Score detail'}</p>
            <h2 id="score-detail-title" className="mt-2 font-display text-3xl font-semibold text-ink">{locale === 'es' ? 'Las dimensiones detrás de la lectura' : 'The dimensions behind the read'}</h2>
          </div>
          <p className="text-sm text-ink-muted">{locale === 'es' ? 'Las puntuaciones resumen los datos; no sustituyen la evidencia.' : 'Scores summarize inputs; they do not replace evidence.'}</p>
        </div>
        <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 sm:gap-4">
          {scoreCards.map(card => (
            <article key={card.label} data-testid={card.testId} className="card min-w-0 p-4 sm:p-5">
              <p className="font-score text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-muted">{card.label}</p>
              <p className="mt-3 font-score text-3xl font-bold leading-none text-ink">{card.value}</p>
              {card.detail && <p className="mt-2 break-words text-sm text-ink-soft">{card.detail}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid min-w-0 gap-4 md:grid-cols-2" aria-label={locale === 'es' ? 'Interpretación detallada del veredicto' : 'Detailed verdict interpretation'}>
        <article className="state-shell min-w-0 border-evidence-border bg-evidence-soft">
          <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-rust">{locale === 'es' ? 'ADN del negocio' : 'Business DNA'} · {businessDnaTypeLabel}</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-ink">{locale === 'es' ? 'El patrón operativo que debes observar' : 'The operating pattern to watch'}</h2>
          <dl className="mt-5 space-y-4 text-sm leading-6">
            <div><dt className="font-bold text-ink">{locale === 'es' ? 'La trampa' : 'The trap'}</dt><dd className="mt-1 break-words text-ink-soft">{scores.businessDnaTrap}</dd></div>
            <div><dt className="font-bold text-ink">{locale === 'es' ? 'Cómo ganar' : 'How to win'}</dt><dd className="mt-1 break-words text-ink-soft">{scores.businessDnaWinStrategy}</dd></div>
          </dl>
        </article>
        <article className="card min-w-0 p-5">
          <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-rust">{locale === 'es' ? 'Lectura de decisión' : 'Decision read'}</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-ink">{locale === 'es' ? 'Lo que dice la evaluación' : 'What the assessment is saying'}</h2>
          <p className="mt-3 break-words leading-7 text-ink-soft">{verdictExplanation}</p>
          <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-ink-muted">{presentation.detail} {locale === 'es' ? 'La próxima prueba es de donde surge evidencia más sólida.' : 'The next test is where stronger evidence comes from.'}</p>
        </article>
      </section>

      <div className="mt-8"><ShareCard result={result} isLoggedIn={isLoggedIn} onLoginClick={onLoginClick} onRewardClaimed={onRewardClaimed} /></div>

      <div className="mt-8"><PrePurchaseResearchSignals resultId={result.resultId} idea={result.idea} locale={locale} value={researchSignals} onChange={setResearchSignals} /></div>

      <section id="thirty-day-plan" className="card mt-8 min-w-0 border-rust/30 bg-[#fff7f2] p-6 sm:p-8" aria-labelledby="thirty-day-title">
        <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust">{locale === 'es' ? 'Tus próximos 30 días' : 'Your next 30 days'}</p>
        <h2 id="thirty-day-title" className="mt-3 font-display text-3xl font-semibold leading-tight text-ink">{locale === 'es' ? 'Convierte este veredicto en evidencia.' : 'Turn this verdict into evidence.'}</h2>
        <p className="mt-4 text-sm font-bold text-ink">{GHOSTTOWN_30_DAY_PLAN_V1.name}</p>
        <ul className="mt-5 space-y-2 text-sm leading-6 text-ink-soft">
          <li>{locale === 'es' ? 'Treinta acciones diarias con límites de tiempo y dinero, evidencia y umbrales de aprobado o fallido' : 'Thirty daily actions with time budgets, cash limits, evidence, and pass/fail thresholds'}</li>
          <li>{locale === 'es' ? 'Entrevistas con compradores, alternativas, oferta, precios, página de aterrizaje, alcance y pruebas piloto pagadas' : 'Buyer interviews, alternatives, offer, pricing, landing-page, outreach, and paid-pilot tests'}</li>
          <li>{locale === 'es' ? 'JSON canónico con etiquetas de verdad, PDF legible e historial de cuenta para volver a descargarlo' : 'Truth-labeled canonical JSON, readable PDF, and account history for repeat download'}</li>
        </ul>
        <p className="mt-5 text-sm leading-6 text-ink-soft">{locale === 'es' ? 'Un experimento de validación, no una promesa de encaje producto-mercado, ingresos ni certeza.' : 'A validation experiment—not a promise of product-market fit, revenue, or certainty.'}</p>
        {paidError && <p className="state-shell state-shell--error mt-4 text-sm" role="alert">{paidError}</p>}
        <button type="button" aria-label={locale === 'es' ? 'Iniciar checkout del plan de implementación de 30 días' : 'Start 30-day implementation plan checkout'} onClick={openActionPlanForm} disabled={paidLoading} className="btn-primary mt-6 w-full sm:w-auto">{paidLoading ? (locale === 'es' ? 'Abriendo checkout…' : 'Opening checkout...') : `${locale === 'es' ? 'Desbloquear el plan de 30 días' : 'Unlock the 30-Day Plan'} - ${displayPrice}`}</button>
      </section>

      <div className="mt-8 flex justify-center border-t border-border pt-8">
        <button type="button" onClick={onReset} className="btn-secondary w-full sm:w-auto">{locale === 'es' ? 'Probar otra idea' : 'Test another idea'}</button>
      </div>

      {showActionPlanForm && <ActionPlanModal idea={result.idea} verdictId={result.resultId} loading={paidLoading} error={paidError} onClose={() => { setShowActionPlanForm(false); setShowDeclinedPlanOffer(true); }} onSubmit={intake => void startPaidTest(intake)} researchSignals={researchSignals} />}

      {showDeclinedPlanOffer && <PaywallModal context="plan-declined" isLoggedIn={isLoggedIn} onLoginClick={onLoginClick} onClose={() => setShowDeclinedPlanOffer(false)} />}

      <footer className="mt-8 border-t border-border pt-6 text-center">
        <p className="text-xs leading-5 text-ink-muted">GhostTown Test {locale === 'es' ? 'veredicto' : 'verdict'}{result.cacheHit ? (locale === 'es' ? ' (informe en caché)' : ' (cached report)') : ''}{' '}{locale === 'es' ? 'a las' : 'at'} {new Date(result.generatedAt).toLocaleString()}</p>
        <p className="mt-2 text-xs leading-5 text-ink-muted">{locale === 'es' ? 'Esta es una herramienta de juicio para ayudarte a decidir qué probar después. No garantiza el éxito.' : 'This is a judgment tool to help you decide what to test next. Not a guarantee of success.'}</p>
      </footer>
    </main>
  );
}

type DeterministicCopyKey = keyof typeof deterministicSpanishCopy;
type DeterministicField = keyof typeof deterministicSpanishCopy.kill_it_before_it_kills_years;

const spanishRiskLabels = {
  low: 'bajo',
  medium: 'medio',
  high: 'alto'
} as const;

const spanishScoreBandLabels = {
  weak: 'débil',
  unclear: 'incierta',
  promising: 'prometedora',
  strong: 'sólida'
} as const;

const spanishBusinessDnaLabels = {
  service: 'servicio',
  physical_product: 'producto físico',
  digital_product: 'producto digital',
  marketplace: 'mercado',
  media: 'medios',
  capital: 'capital',
  asset: 'activo'
} as const;

function getRiskLevelLabel(value: keyof typeof spanishRiskLabels, locale: 'en' | 'es'): string {
  return locale === 'es' ? spanishRiskLabels[value] : value;
}

function getScoreBandLabel(value: keyof typeof spanishScoreBandLabels, locale: 'en' | 'es'): string {
  return locale === 'es' ? spanishScoreBandLabels[value] : value;
}

function getBusinessDnaLabel(value: keyof typeof spanishBusinessDnaLabels, locale: 'en' | 'es'): string {
  return locale === 'es' ? spanishBusinessDnaLabels[value] : value;
}

function localizeDeterministicField(
  locale: 'en' | 'es',
  verdict: keyof typeof verdictPresentation,
  field: DeterministicField,
  value: string
): string {
  if (locale !== 'es') return value;

  const copyKey = getDeterministicCopyKey(verdict, field, value);
  return copyKey ? deterministicSpanishCopy[copyKey][field] : value;
}

function getDeterministicCopyKey(
  verdict: keyof typeof verdictPresentation,
  field: DeterministicField,
  value: string
): DeterministicCopyKey | null {
  if (verdict === 'test_first') {
    if (deterministicEnglishCopy.test_first_passion[field] === value) return 'test_first_passion';
    if (deterministicEnglishCopy.test_first[field] === value) return 'test_first';
    return null;
  }

  const key = verdict as DeterministicCopyKey;
  return deterministicEnglishCopy[key][field] === value ? key : null;
}
