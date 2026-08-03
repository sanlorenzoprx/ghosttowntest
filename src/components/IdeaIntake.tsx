import { useEffect, useRef, useState } from 'react';
import { IdeaIntake as IdeaIntakeType } from '../types/lit';

interface Props {
  onSubmit: (idea: IdeaIntakeType) => void;
  initialIdea?: IdeaIntakeType | null;
}

export default function IdeaIntake({ onSubmit, initialIdea }: Props) {
  const isSpanish = useDocumentLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<IdeaIntakeType>(initialIdea ?? {
    ideaName: '',
    description: '',
    targetUser: '',
    painfulProblem: '',
    currentAlternative: '',
    motivation: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publicAcknowledged, setPublicAcknowledged] = useState(
    initialIdea?.publicContentAcknowledged === true
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(previous => ({ ...previous, [name]: value }));
    if (errors[name]) setErrors(previous => ({ ...previous, [name]: '' }));
  };

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!formData.ideaName.trim()) nextErrors.ideaName = isSpanish ? 'El nombre de la idea es obligatorio' : 'Idea name is required';
    if (!formData.description.trim()) nextErrors.description = isSpanish ? 'La descripción es obligatoria' : 'Description is required';
    if (!formData.targetUser.trim()) nextErrors.targetUser = isSpanish ? 'El usuario objetivo es obligatorio' : 'Target user is required';
    if (!formData.painfulProblem.trim()) nextErrors.painfulProblem = isSpanish ? 'La descripción del problema es obligatoria' : 'Problem statement is required';
    if (!publicAcknowledged) nextErrors.publicContent = isSpanish ? 'Confirma la distribución pública del video' : 'Please acknowledge public video distribution';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (validateForm()) {
      onSubmit({ ...formData, publicContentAcknowledged: true });
      return;
    }

    window.requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  };

  const fieldClass = (hasError: boolean) => [
    'input-base min-w-0 resize-y',
    hasError ? 'border-stop bg-stop-soft/40 focus:border-stop focus:ring-stop/20' : ''
  ].filter(Boolean).join(' ');

  const copy = isSpanish ? {
    eyebrow: 'Evaluación gratuita · Resumen de campo',
    title: initialIdea ? 'Haz tuya esta idea.' : 'Cuéntanos lo suficiente para evaluar la idea con honestidad.',
    intro: initialIdea
      ? 'Este inicio viene precargado de la galería. Revisa cada campo para que la evaluación refleje la idea que quieres probar.'
      : 'El contexto específico ayuda a GhostTown a identificar la señal, la incertidumbre y la próxima prueba, sin prometer un resultado.',
    preloadedLabel: 'Ejemplo listo para editar',
    preloadedBody: 'Tus cambios permanecen en este dispositivo hasta que envíes la evaluación.',
    fieldsPrimary: 'La idea y la persona a la que sirve',
    ideaNameLabel: '¿Cómo se llama tu idea?',
    descriptionLabel: '¿Qué hace?',
    targetUserLabel: '¿Para quién es?',
    problemLabel: '¿Qué problema doloroso resuelve?',
    context: 'Contexto que puede afinar la lectura',
    alternativeLabel: '¿Cómo resuelven esto hoy?',
    motivationLabel: '¿Por qué quieres construirlo?',
    required: 'Obligatorio',
    optional: 'Opcional',
    ideaNameHelp: 'Usa un nombre provisional. Puedes cambiarlo después.',
    descriptionHelp: 'Describe el trabajo práctico que ayuda a alguien a realizar.',
    targetUserHelp: 'Un rol, una situación y un contexto hacen más útil la evaluación.',
    problemHelp: 'Enfócate en el costo, retraso, riesgo o frustración que hace que actuar importe.',
    alternativeHelp: 'La alternativa actual ayuda a GhostTown a evaluar qué solución les estás pidiendo dejar.',
    motivationHelp: 'Esto ayuda a distinguir la convicción de quien funda de la evidencia que aún hace falta.',
    ideaNamePlaceholder: 'p. ej., IA para control de calidad en agencias de diseño',
    descriptionPlaceholder: 'Un párrafo. Sé específico sobre qué hace y quién lo usa.',
    targetUserPlaceholder: 'p. ej., agencias de diseño web con 5–50 empleados',
    problemPlaceholder: '¿Qué dolor o frustración alivia? ¿Por qué alguien pagaría por esto?',
    alternativePlaceholder: '¿Cuál es la solución o alternativa actual?',
    motivationPlaceholder: '¿Cuál es tu motivación personal? ¿Por qué ahora?',
    publicContent: 'Entiendo que mi idea enviada, el informe de GhostTown Test y el video generado son contenido público que Shorts Factory puede reutilizar y distribuir en canales actuales y futuros. No incluiré información privada, confidencial ni identificable.',
    publicContentError: 'Confirma la distribución pública del video',
    start: 'Iniciar evaluación',
    saveNote: 'No se requiere una cuenta. El progreso se guarda automáticamente en este dispositivo.',
    errors: {
      ideaName: 'El nombre de la idea es obligatorio',
      description: 'La descripción es obligatoria',
      targetUser: 'El usuario objetivo es obligatorio',
      painfulProblem: 'La descripción del problema es obligatoria'
    }
  } : {
    eyebrow: 'Free assessment · Field brief',
    title: initialIdea ? 'Make this idea yours.' : 'Tell us enough to evaluate the idea honestly.',
    intro: initialIdea
      ? 'This starter is preloaded from the gallery. Review each field so the assessment reflects the idea you want to test.'
      : 'Specific context helps GhostTown identify the signal, uncertainty, and next test—not promise an outcome.',
    preloadedLabel: 'Example ready to edit',
    preloadedBody: 'Your edits stay on this device until you submit the assessment.',
    fieldsPrimary: 'The idea and the person it serves',
    ideaNameLabel: "What's your idea called?",
    descriptionLabel: 'What does it do?',
    targetUserLabel: 'Who is it for?',
    problemLabel: 'What painful problem does it solve?',
    context: 'Context that can sharpen the read',
    alternativeLabel: 'How do people solve this today?',
    motivationLabel: 'Why do you want to build this?',
    required: 'Required',
    optional: 'Optional',
    ideaNameHelp: 'Use a working name. You can revise it later.',
    descriptionHelp: 'Describe the practical job it helps someone do.',
    targetUserHelp: 'A role, situation, and context make the assessment more useful.',
    problemHelp: 'Focus on the cost, delay, risk, or frustration that makes action matter.',
    alternativeHelp: 'The current workaround helps GhostTown assess the alternative you are asking people to leave.',
    motivationHelp: 'This helps distinguish founder conviction from the evidence still needed.',
    ideaNamePlaceholder: 'e.g., AI QA for Design Agencies',
    descriptionPlaceholder: 'One paragraph. Be specific about what it does and who uses it.',
    targetUserPlaceholder: 'e.g., Web design agencies with 5–50 employees',
    problemPlaceholder: 'What pain or frustration does this relieve? Why would someone pay for this?',
    alternativePlaceholder: "What's the current workaround or solution?",
    motivationPlaceholder: "What's your personal motivation? Why now?",
    publicContent: 'I understand my submitted idea, GhostTown Test report, and generated video are public content that may be reused and distributed by Shorts Factory across current and future channels. Do not include private, confidential, or identifying information.',
    publicContentError: 'Please acknowledge public video distribution',
    start: 'Start assessment',
    saveNote: 'No account required. Progress saves automatically on this device.',
    errors: {
      ideaName: 'Idea name is required',
      description: 'Description is required',
      targetUser: 'Target user is required',
      painfulProblem: 'Problem statement is required'
    }
  };

  return (
    <main className="mx-auto min-w-0 max-w-3xl px-4 py-8 pb-28 sm:px-6 sm:py-12 sm:pb-12">
      <div className="max-w-reading">
        <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust">{isSpanish ? 'Evaluación gratuita · Resumen de campo' : 'Free assessment · Field brief'}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-[0.98] tracking-[-0.03em] text-ink sm:text-5xl">
          {initialIdea ? (isSpanish ? 'Haz tuya esta idea.' : 'Make this idea yours.') : (isSpanish ? 'Cuéntanos lo suficiente para evaluar la idea con honestidad.' : 'Tell us enough to evaluate the idea honestly.')}
        </h1>
        <p className="mt-5 text-lg leading-8 text-ink-soft">
          {initialIdea
            ? (isSpanish ? 'Este inicio viene precargado de la galería. Revisa cada campo para que la evaluación refleje la idea que quieres probar.' : 'This starter is preloaded from the gallery. Review each field so the assessment reflects the idea you want to test.')
            : (isSpanish ? 'El contexto específico ayuda a GhostTown a identificar la señal, la incertidumbre y la próxima prueba, sin prometer un resultado.' : 'Specific context helps GhostTown identify the signal, uncertainty, and next test—not promise an outcome.')}
        </p>
      </div>

      {initialIdea && (
        <aside className="state-shell state-shell--success mt-8 max-w-reading" aria-label={isSpanish ? 'Aviso de ejemplo precargado' : 'Preloaded example notice'}>
          <p className="font-score text-xs font-bold uppercase tracking-[0.14em]">{isSpanish ? 'Ejemplo listo para editar' : 'Example ready to edit'}</p>
          <p className="mt-2 text-sm leading-6">{isSpanish ? 'Tus cambios permanecen en este dispositivo hasta que envíes la evaluación.' : 'Your edits stay on this device until you submit the assessment.'}</p>
        </aside>
      )}

      <form ref={formRef} onSubmit={handleSubmit} noValidate aria-label={copy.fieldsPrimary} className="mt-10 min-w-0 space-y-8">
        <fieldset className="min-w-0 space-y-7">
          <legend className="font-score text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">{isSpanish ? 'La idea y la persona a la que sirve' : 'The idea and the person it serves'}</legend>

          <div className="min-w-0">
            <label htmlFor="ideaName" className="block font-bold text-ink">{isSpanish ? '¿Cómo se llama tu idea?' : "What's your idea called?"} <span className="text-rust">{isSpanish ? 'Obligatorio' : 'Required'}</span></label>
            <p id="ideaName-help" className="mt-1 text-sm text-ink-soft">{isSpanish ? 'Usa un nombre provisional. Puedes cambiarlo después.' : 'Use a working name. You can revise it later.'}</p>
            <input data-testid="idea-input" id="ideaName" type="text" name="ideaName" value={formData.ideaName} onChange={handleChange} placeholder={isSpanish ? 'p. ej., IA para control de calidad en agencias de diseño' : 'e.g., AI QA for Design Agencies'} aria-invalid={Boolean(errors.ideaName)} aria-describedby={errors.ideaName ? 'ideaName-help ideaName-error' : 'ideaName-help'} className={`mt-3 ${fieldClass(Boolean(errors.ideaName))}`} />
            {errors.ideaName && <p id="ideaName-error" className="mt-2 text-sm font-semibold text-stop" role="alert">{errors.ideaName}</p>}
          </div>

          <div className="min-w-0">
            <label htmlFor="description" className="block font-bold text-ink">{isSpanish ? '¿Qué hace?' : 'What does it do?'} <span className="text-rust">{isSpanish ? 'Obligatorio' : 'Required'}</span></label>
            <p id="description-help" className="mt-1 text-sm text-ink-soft">{isSpanish ? 'Describe el trabajo práctico que ayuda a alguien a realizar.' : 'Describe the practical job it helps someone do.'}</p>
            <textarea name="description" id="description" value={formData.description} onChange={handleChange} placeholder={isSpanish ? 'Un párrafo. Sé específico sobre qué hace y quién lo usa.' : 'One paragraph. Be specific about what it does and who uses it.'} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-help description-error' : 'description-help'} className={`mt-3 min-h-28 ${fieldClass(Boolean(errors.description))}`} />
            {errors.description && <p id="description-error" className="mt-2 text-sm font-semibold text-stop" role="alert">{errors.description}</p>}
          </div>

          <div className="min-w-0">
            <label htmlFor="targetUser" className="block font-bold text-ink">{isSpanish ? '¿Para quién es?' : 'Who is it for?'} <span className="text-rust">{isSpanish ? 'Obligatorio' : 'Required'}</span></label>
            <p id="targetUser-help" className="mt-1 text-sm text-ink-soft">{isSpanish ? 'Un rol, una situación y un contexto hacen más útil la evaluación.' : 'A role, situation, and context make the assessment more useful.'}</p>
            <input type="text" id="targetUser" name="targetUser" value={formData.targetUser} onChange={handleChange} placeholder={isSpanish ? 'p. ej., agencias de diseño web con 5–50 empleados' : 'e.g., Web design agencies with 5–50 employees'} aria-invalid={Boolean(errors.targetUser)} aria-describedby={errors.targetUser ? 'targetUser-help targetUser-error' : 'targetUser-help'} className={`mt-3 ${fieldClass(Boolean(errors.targetUser))}`} />
            {errors.targetUser && <p id="targetUser-error" className="mt-2 text-sm font-semibold text-stop" role="alert">{errors.targetUser}</p>}
          </div>

          <div className="min-w-0">
            <label htmlFor="painfulProblem" className="block font-bold text-ink">{isSpanish ? '¿Qué problema doloroso resuelve?' : 'What painful problem does it solve?'} <span className="text-rust">{isSpanish ? 'Obligatorio' : 'Required'}</span></label>
            <p id="painfulProblem-help" className="mt-1 text-sm text-ink-soft">{isSpanish ? 'Enfócate en el costo, retraso, riesgo o frustración que hace que actuar importe.' : 'Focus on the cost, delay, risk, or frustration that makes action matter.'}</p>
            <textarea name="painfulProblem" id="painfulProblem" value={formData.painfulProblem} onChange={handleChange} placeholder={isSpanish ? '¿Qué dolor o frustración alivia? ¿Por qué alguien pagaría por esto?' : 'What pain or frustration does this relieve? Why would someone pay for this?'} aria-invalid={Boolean(errors.painfulProblem)} aria-describedby={errors.painfulProblem ? 'painfulProblem-help painfulProblem-error' : 'painfulProblem-help'} className={`mt-3 min-h-24 ${fieldClass(Boolean(errors.painfulProblem))}`} />
            {errors.painfulProblem && <p id="painfulProblem-error" className="mt-2 text-sm font-semibold text-stop" role="alert">{errors.painfulProblem}</p>}
          </div>
        </fieldset>

        <fieldset className="min-w-0 space-y-7 border-t border-border pt-8">
          <legend className="font-score text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">{isSpanish ? 'Contexto que puede afinar la lectura' : 'Context that can sharpen the read'}</legend>

          <div className="min-w-0">
            <label htmlFor="currentAlternative" className="block font-bold text-ink">{isSpanish ? '¿Cómo resuelven esto hoy?' : 'How do people solve this today?'} <span className="font-normal text-ink-muted">{isSpanish ? 'Opcional' : 'Optional'}</span></label>
            <p id="currentAlternative-help" className="mt-1 text-sm text-ink-soft">{isSpanish ? 'La alternativa actual ayuda a GhostTown a evaluar qué solución les estás pidiendo dejar.' : 'The current workaround helps GhostTown assess the alternative you are asking people to leave.'}</p>
            <input type="text" id="currentAlternative" name="currentAlternative" value={formData.currentAlternative} onChange={handleChange} placeholder={isSpanish ? '¿Cuál es la solución o alternativa actual?' : "What's the current workaround or solution?"} aria-describedby="currentAlternative-help" className={`mt-3 ${fieldClass(false)}`} />
          </div>

          <div className="min-w-0">
            <label htmlFor="motivation" className="block font-bold text-ink">{isSpanish ? '¿Por qué quieres construirlo?' : 'Why do you want to build this?'} <span className="font-normal text-ink-muted">{isSpanish ? 'Opcional' : 'Optional'}</span></label>
            <p id="motivation-help" className="mt-1 text-sm text-ink-soft">{isSpanish ? 'Esto ayuda a distinguir la convicción de quien funda de la evidencia que aún hace falta.' : 'This helps distinguish founder conviction from the evidence still needed.'}</p>
            <textarea name="motivation" id="motivation" value={formData.motivation} onChange={handleChange} placeholder={isSpanish ? '¿Cuál es tu motivación personal? ¿Por qué ahora?' : "What's your personal motivation? Why now?"} aria-describedby="motivation-help" className={`mt-3 min-h-24 ${fieldClass(false)}`} />
          </div>
        </fieldset>

        <div className={`min-w-0 rounded-panel border p-5 ${errors.publicContent ? 'border-stop/40 bg-stop-soft' : 'border-evidence-border bg-evidence-soft'}`}>
          <label className="flex min-w-0 cursor-pointer items-start gap-3">
            <input type="checkbox" checked={publicAcknowledged} onChange={event => { setPublicAcknowledged(event.target.checked); if (errors.publicContent) setErrors(previous => ({ ...previous, publicContent: '' })); }} aria-invalid={Boolean(errors.publicContent)} aria-describedby={errors.publicContent ? 'public-content-error' : undefined} className="mt-0.5 h-5 w-5 shrink-0 rounded border-input text-rust focus:ring-rust" required />
            <span className="min-w-0 text-sm leading-6 text-ink">
               {isSpanish ? 'Entiendo que mi idea enviada, el informe de GhostTown Test y el video generado son contenido público que Shorts Factory puede reutilizar y distribuir en canales actuales y futuros. No incluiré información privada, confidencial ni identificable.' : 'I understand my submitted idea, GhostTown Test report, and generated video are public content that may be reused and distributed by Shorts Factory across current and future channels. Do not include private, confidential, or identifying information.'}
            </span>
          </label>
          {errors.publicContent && <p id="public-content-error" className="mt-3 text-sm font-semibold text-stop" role="alert">{errors.publicContent}</p>}
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-canvas/95 px-4 py-4 shadow-[0_-10px_24px_rgba(32,37,35,0.08)] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <button data-testid="evaluate-button" type="submit" className="btn-primary w-full text-base sm:w-auto sm:min-w-72">{isSpanish ? 'Iniciar evaluación' : 'Start assessment'} <span className="ml-2 text-rust-soft" aria-hidden="true">→</span></button>
          <p className="mt-3 text-center text-xs leading-5 text-ink-muted sm:text-left">{isSpanish ? 'No se requiere una cuenta. El progreso se guarda automáticamente en este dispositivo.' : 'No account required. Progress saves automatically on this device.'}</p>
        </div>
      </form>
    </main>
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
