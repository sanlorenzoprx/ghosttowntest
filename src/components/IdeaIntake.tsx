import { useState } from 'react';
import { IdeaIntake as IdeaIntakeType } from '../types/lit';
import type { Locale } from '../lib/locale';

type IntakeCopy = Record<'errName'
  | 'errDesc'
  | 'errTarget'
  | 'errProblem'
  | 'errPublic'
  | 'titleStarter'
  | 'titleNew'
  | 'introStarter'
  | 'introNew'
  | 'starterLoaded'
  | 'starterNote'
  | 'nameLabel'
  | 'namePlaceholder'
  | 'descLabel'
  | 'descPlaceholder'
  | 'targetLabel'
  | 'targetPlaceholder'
  | 'problemLabel'
  | 'problemPlaceholder'
  | 'altLabel'
  | 'optional'
  | 'altPlaceholder'
  | 'altHelp'
  | 'motLabel'
  | 'motPlaceholder'
  | 'motHelp'
  | 'consent'
  | 'submit'
  | 'footnote', string>;

const COPY: Record<Locale, IntakeCopy> = {
  en: {
    errName: 'Idea name is required',
    errDesc: 'Description is required',
    errTarget: 'Target user is required',
    errProblem: 'Problem statement is required',
    errPublic: 'Please acknowledge public video distribution',
    titleStarter: 'Make this idea yours',
    titleNew: 'Tell us about your idea',
    introStarter: 'This starter came preloaded from the gallery. Edit anything before the assessment.',
    introNew: "Be specific. We'll use this to run the LIT evaluation.",
    starterLoaded: 'Video-ready starter loaded.',
    starterNote: 'Your edits stay on this device until you submit the assessment.',
    nameLabel: "What's your idea called?",
    namePlaceholder: 'e.g., AI QA for Design Agencies',
    descLabel: 'What does it do?',
    descPlaceholder: 'One paragraph. Be specific about what it does and who uses it.',
    targetLabel: 'Who is it for? (Be specific)',
    targetPlaceholder: 'e.g., Web design agencies with 5-50 employees',
    problemLabel: 'What painful problem does it solve?',
    problemPlaceholder: 'What pain or frustration does this relieve? Why would someone pay for this?',
    altLabel: 'How do people solve this today?',
    optional: '(Optional)',
    altPlaceholder: "What's the current workaround or solution?",
    altHelp: 'Understanding the current state helps us evaluate your advantage',
    motLabel: 'Why do you want to build this?',
    motPlaceholder: "What's your personal motivation? Why now?",
    motHelp: 'This helps us understand if this is passion or proof',
    consent: 'I understand my submitted idea, GhostTown Test report, and generated video are public content that may be reused and distributed by Shorts Factory across current and future channels. Do not include private, confidential, or identifying information.',
    submit: 'Start Assessment · About 5 Minutes',
    footnote: 'No account required. Progress saves automatically.'
  },
  es: {
    errName: 'Falta el nombre de la idea',
    errDesc: 'Falta la descripción',
    errTarget: 'Falta para quién es',
    errProblem: 'Falta el problema que resuelve',
    errPublic: 'Marca la casilla para aceptar que el contenido es público',
    titleStarter: 'Haz tuya esta idea',
    titleNew: 'Cuéntanos tu idea',
    introStarter: 'Este ejemplo viene de la galería. Cambia lo que quieras antes de la evaluación.',
    introNew: 'Sé específico. Con esto hacemos la evaluación LIT.',
    starterLoaded: 'Ejemplo listo para video cargado.',
    starterNote: 'Tus cambios se quedan en este dispositivo hasta que envíes la evaluación.',
    nameLabel: '¿Cómo se llama tu idea?',
    namePlaceholder: 'ej., Control de calidad con IA para agencias de diseño',
    descLabel: '¿Qué hace?',
    descPlaceholder: 'Un párrafo. Di con claridad qué hace y quién lo usa.',
    targetLabel: '¿Para quién es? (Sé específico)',
    targetPlaceholder: 'ej., Agencias de diseño web con 5 a 50 empleados',
    problemLabel: '¿Qué problema doloroso resuelve?',
    problemPlaceholder: '¿Qué dolor o frustración quita? ¿Por qué alguien pagaría por esto?',
    altLabel: '¿Cómo lo resuelve la gente hoy?',
    optional: '(Opcional)',
    altPlaceholder: '¿Qué hacen ahora para resolverlo?',
    altHelp: 'Saber cómo lo resuelven hoy nos ayuda a evaluar tu ventaja',
    motLabel: '¿Por qué quieres crear esto?',
    motPlaceholder: '¿Qué te motiva? ¿Por qué ahora?',
    motHelp: 'Esto nos ayuda a ver si es pasión o si hay pruebas',
    consent: 'Entiendo que la idea que envío, el informe de GhostTown Test y el video generado son contenido público que Shorts Factory puede reusar y distribuir en sus canales de hoy y del futuro. No incluyas información privada, confidencial o que te identifique.',
    submit: 'Empezar la evaluación · Unos 5 minutos',
    footnote: 'No necesitas cuenta. Tu progreso se guarda solo.'
  }
};

interface Props {
  onSubmit: (idea: IdeaIntakeType) => void;
  initialIdea?: IdeaIntakeType | null;
  locale?: Locale;
}

export default function IdeaIntake({ onSubmit, initialIdea, locale = 'en' }: Props) {
  const t = COPY[locale];
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ideaName.trim()) newErrors.ideaName = t.errName;
    if (!formData.description.trim()) newErrors.description = t.errDesc;
    if (!formData.targetUser.trim()) newErrors.targetUser = t.errTarget;
    if (!formData.painfulProblem.trim()) newErrors.painfulProblem = t.errProblem;
    if (!publicAcknowledged) newErrors.publicContent = t.errPublic;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ ...formData, publicContentAcknowledged: true });
    }
  };

  return (
    <div className="day-hero min-h-[calc(100dvh-72px)]">
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-12 sm:pb-16">
      <span className="day-pop mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE9DC] text-[#B4471B] shadow-quiet" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.200v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" /></svg></span>
      <h2 className="mb-2 font-display text-4xl font-semibold tracking-[-0.02em] text-ghost-ink sm:text-5xl">{initialIdea ? t.titleStarter : t.titleNew}</h2>
      <p className="mb-6 text-lg text-gray-600">{initialIdea
        ? t.introStarter
        : t.introNew}</p>

      {initialIdea && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <span className="font-bold">{t.starterLoaded}</span> {t.starterNote}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="day-pop space-y-6 rounded-3xl border border-white bg-white p-5 shadow-pop sm:p-8">
        {/* Idea Name */}
        <div>
          <label htmlFor="ideaName" className="block font-bold mb-2">
            {t.nameLabel}
          </label>
          <input
            data-testid="idea-input"
            id="ideaName"
            type="text"
            name="ideaName"
            value={formData.ideaName}
            onChange={handleChange}
            placeholder={t.namePlaceholder}
            className={`min-h-12 w-full rounded-xl border px-4 py-2 text-base focus:outline-none focus:ring-0 ${
              errors.ideaName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.ideaName && <p className="text-red-600 text-sm mt-1">{errors.ideaName}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block font-bold mb-2">
            {t.descLabel}
          </label>
          <textarea
            name="description"
            id="description"
            value={formData.description}
            onChange={handleChange}
            placeholder={t.descPlaceholder}
            className={`h-28 w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-0 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
        </div>

        {/* Target User */}
        <div>
          <label htmlFor="targetUser" className="block font-bold mb-2">
            {t.targetLabel}
          </label>
          <input
            type="text"
            id="targetUser"
            name="targetUser"
            value={formData.targetUser}
            onChange={handleChange}
            placeholder={t.targetPlaceholder}
            className={`min-h-12 w-full rounded-xl border px-4 py-2 text-base focus:outline-none focus:ring-0 ${
              errors.targetUser ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.targetUser && <p className="text-red-600 text-sm mt-1">{errors.targetUser}</p>}
        </div>

        {/* Painful Problem */}
        <div>
          <label htmlFor="painfulProblem" className="block font-bold mb-2">
            {t.problemLabel}
          </label>
          <textarea
            name="painfulProblem"
            id="painfulProblem"
            value={formData.painfulProblem}
            onChange={handleChange}
            placeholder={t.problemPlaceholder}
            className={`h-24 w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-0 ${
              errors.painfulProblem ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.painfulProblem && <p className="text-red-600 text-sm mt-1">{errors.painfulProblem}</p>}
        </div>

        {/* Current Alternative */}
        <div>
          <label htmlFor="currentAlternative" className="block font-bold mb-2">
            {t.altLabel} <span className="font-normal text-gray-500">{t.optional}</span>
          </label>
          <input
            type="text"
            id="currentAlternative"
            name="currentAlternative"
            value={formData.currentAlternative}
            onChange={handleChange}
            placeholder={t.altPlaceholder}
            className="min-h-12 w-full rounded-xl border border-gray-300 px-4 py-2 text-base focus:outline-none focus:ring-0"
          />
          <p className="text-gray-500 text-sm mt-1">{t.altHelp}</p>
        </div>

        {/* Motivation */}
        <div>
          <label htmlFor="motivation" className="block font-bold mb-2">
            {t.motLabel} <span className="font-normal text-gray-500">{t.optional}</span>
          </label>
          <textarea
            name="motivation"
            id="motivation"
            value={formData.motivation}
            onChange={handleChange}
            placeholder={t.motPlaceholder}
            className="h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-0"
          />
          <p className="text-gray-500 text-sm mt-1">{t.motHelp}</p>
        </div>

        <div className={`rounded-2xl border p-4 ${errors.publicContent ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={publicAcknowledged}
              onChange={event => {
                setPublicAcknowledged(event.target.checked);
                if (errors.publicContent) setErrors(previous => ({ ...previous, publicContent: '' }));
              }}
              className="mt-1 h-5 w-5"
              required
            />
            <span className="text-sm text-gray-800">
              {t.consent}
            </span>
          </label>
          {errors.publicContent && <p className="mt-2 text-sm text-red-700">{errors.publicContent}</p>}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-0 -mx-5 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.1)] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <button
            data-testid="evaluate-button"
            type="submit"
            className="min-h-14 w-full rounded-full bg-day-coral px-6 py-3 text-lg font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-day-coral-hover"
          >
            {t.submit}
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">{t.footnote}</p>
        </div>
      </form>
    </div>
    </div>
  );
}
