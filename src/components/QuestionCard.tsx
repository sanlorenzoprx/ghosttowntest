import { useEffect, useState } from 'react';
import { EvaluationQuestion } from '../types/lit';

interface Props {
  question: EvaluationQuestion;
  onAnswer: (value: number | string) => void;
  selectedValue?: number | string;
}

export default function QuestionCard({ question, onAnswer, selectedValue }: Props) {
  const isSpanish = useDocumentLocale();
  const localized = isSpanish ? spanishQuestionCopy[question.id] : undefined;

  return (
    <section className="card min-w-0 p-5 sm:p-8" aria-labelledby={`question-${question.id}`}>
      <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-rust">{isSpanish ? 'Pregunta de evidencia' : 'Evidence prompt'}</p>
      <h1 id={`question-${question.id}`} tabIndex={-1} className="mt-3 max-w-reading font-display text-3xl font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-4xl">{localized?.question ?? question.question}</h1>

      {(localized?.helper ?? question.helper) && <p className="mt-4 max-w-reading text-base leading-7 text-ink-soft">{localized?.helper ?? question.helper}</p>}

      <div className="mt-7 space-y-3" aria-label={isSpanish ? 'Opciones de respuesta' : 'Answer options'}>
        {question.options.map((option, index) => {
          const isSelected = selectedValue === option.value;
          const optionLabel = localized?.options[index] ?? option.label;
          const optionHelper = localized?.optionHelpers?.[index] ?? option.helper;
          return (
            <button key={index} type="button" onClick={() => onAnswer(option.value)} aria-pressed={isSelected} className={`group flex min-h-16 w-full min-w-0 items-start gap-3 rounded-panel border p-4 text-left transition-colors sm:p-5 ${isSelected ? 'border-rust bg-evidence-soft shadow-quiet' : 'border-border bg-surface-raised hover:border-rust/50 hover:bg-surface-muted'}`}>
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border font-score text-xs font-bold ${isSelected ? 'border-rust bg-rust text-rust-foreground' : 'border-input bg-surface text-ink-muted group-hover:border-rust/60 group-hover:text-rust'}`} aria-hidden="true">{isSelected ? '✓' : index + 1}</span>
              <span className="min-w-0">
                 <span className="block break-words font-bold leading-snug text-ink">{optionLabel}</span>
                 {optionHelper && <span className="mt-1 block break-words text-sm leading-6 text-ink-soft">{optionHelper}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-7 border-t border-border pt-4 text-sm leading-6 text-ink-muted">{isSpanish ? 'No hay respuestas incorrectas. Evaluamos tu idea de forma objetiva.' : "There are no wrong answers. We're evaluating your idea objectively."}</p>
    </section>
  );
}

interface LocalizedQuestion {
  question: string;
  helper?: string;
  options: string[];
  optionHelpers?: (string | undefined)[];
}

const spanishQuestionCopy: Record<string, LocalizedQuestion> = {
  gt_1: {
    question: "¿Quién necesita esto con urgencia?",
    helper: 'Sé específico. No "mucha gente", sino "un cargo X en una empresa de tamaño Y".',
    options: ['Todavía no estoy seguro', 'A un grupo amplio podría gustarle', 'Un grupo específico tiene este problema a veces', 'Un grupo específico tiene este problema con frecuencia', 'Un comprador o usuario específico intenta resolverlo activamente ahora']
  },
  gt_2: {
    question: '¿Qué se rompe si esto no existe?',
    helper: 'Sé honesto. ¿Algo falla, cuesta dinero o crea un dolor real?',
    options: ['En realidad, nada se rompe', 'Sería bueno tenerlo', 'Ahorra algo de tiempo o molestia', 'Evita dolor, costo, retraso o riesgo reales', 'Resuelve un problema doloroso que la gente ya evita pagando o dedicando tiempo']
  },
  gt_3: {
    question: '¿Cómo resuelven esto las personas hoy?',
    helper: 'Entiende la alternativa actual. ¿Qué hacen ahora?',
    options: ['No lo sé', 'Probablemente no hacen nada', 'Usan una solución alternativa o un proceso manual', 'Pagan por una solución imperfecta', 'Pagan, se quejan y aún tienen dificultades']
  },
  gt_4: {
    question: '¿Puedes llegar a los primeros 10 usuarios o compradores?',
    helper: 'Sé realista. ¿Sabes dónde están o cómo contactarlos?',
    options: ['No hay un camino claro', 'Quizá mediante contacto en frío o redes sociales', 'Sé dónde se reúnen (comunidades, foros, eventos)', 'Puedo contactarlos directamente (correo, LinkedIn)', 'Ya tengo acceso o relaciones con ellos']
  },
  pg_1: {
    question: '¿Construyes esto por demanda o principalmente porque te encanta la idea?',
    helper: 'La pasión es combustible, no brújula. ¿Los clientes están impulsando esto?',
    options: ['Principalmente pasión o fantasía, sin demanda real', 'Pasión con poca evidencia de demanda', 'Algo de evidencia y algo de pasión', 'Dolor claro del cliente más motivación personal', 'La demanda de los clientes está impulsando esto']
  },
  lev_1: {
    question: '¿Qué ventaja injusta tienes?',
    helper: '¿Qué puedes hacer que la competencia no pueda copiar fácilmente? (red, experiencia, datos, relaciones)',
    options: ['No hay una ventaja injusta clara', 'Alguna ventaja, pero fácil de replicar', 'Ventaja moderada (experiencia, algunas relaciones)', 'Ventaja fuerte (red profunda, experiencia única)', 'Ventaja duradera y defendible (foso de datos, relaciones exclusivas)']
  },
  lev_2: {
    question: '¿Tienes distribución o audiencia existente?',
    helper: '¿Puedes llegar a clientes sin contacto en frío? (lista de correo, seguidores, red)',
    options: ['Cero distribución existente', 'Audiencia existente pequeña (<100)', 'Audiencia moderada (100–1000)', 'Buena audiencia (1000–10000)', 'Audiencia grande y activa (10000+)']
  },
  lev_3: {
    question: '¿Has hecho esto antes (o algo parecido)?',
    helper: '¿Has construido o lanzado algo con éxito en este espacio?',
    options: ['Es la primera vez, sin experiencia relevante', 'Algo de experiencia tangencial', 'Experiencia relevante en un campo relacionado', 'Experiencia directa construyendo productos similares', 'Historial de éxito en este dominio exacto']
  },
  ins_1: {
    question: '¿Sabes algo del mercado que otros no ven?',
    helper: '¿Qué conocimiento secreto impulsa tu convicción? ¿Por qué crees que funcionará cuando otros no lo ven?',
    options: ['No hay un conocimiento particular, solo parece una buena idea', 'Observación menor sobre el mercado', 'Conocimiento moderado (tendencias, identificación de brechas)', 'Conocimiento fuerte (dolor del cliente, momento del mercado)', 'Conocimiento profundo (los clientes te lo dijeron, observaste el problema directamente)']
  },
  ins_2: {
    question: '¿Has hablado con clientes potenciales?',
    helper: 'Conversaciones reales, no encuestas. ¿Confirman tu comprensión?',
    options: ['Nunca he hablado con clientes', 'Conversaciones casuales, sin validación real', 'Hablé con 3–5 clientes potenciales', 'Tuve 5–10 conversaciones y empiezan a aparecer patrones', 'Hablé con más de 10 clientes y validaron el problema']
  },
  ins_3: {
    question: '¿Podría otra persona construir esto igual de bien?',
    helper: '¿Este conocimiento es defendible o cualquier persona capaz con capital podría replicarlo?',
    options: ['Cualquiera con capital podría construirlo', 'Muchas personas podrían construirlo', 'Algunas personas podrían construirlo, pero no fácilmente', 'Pocas personas tienen el conocimiento para construirlo bien', 'Solo tú (o muy pocas personas) entienden realmente este problema']
  },
  tim_1: {
    question: '¿El mercado está listo para esto AHORA?',
    helper: '¿Hay un impulso favorable (auge de la IA, cambio regulatorio, cambio de consumo) o te estás adelantando?',
    options: ['El mercado no está listo; te adelantas 3–5 años', 'El mercado aún no está listo; quizá faltan 2 años', 'El mercado está surgiendo o es incierto', 'El mercado está claramente listo, con fuertes impulsos favorables', 'El mercado necesita desesperadamente esta solución AHORA']
  },
  tim_2: {
    question: '¿Hay impulsos favorables potentes (tecnología, regulación, comportamiento)?',
    helper: '¿La tecnología lo permite? ¿Cambian las regulaciones? ¿Los consumidores están listos?',
    options: ['Vientos en contra (regulación bloqueadora, tecnología inmadura)', 'No hay impulsos favorables ni vientos en contra particulares', 'Impulsos favorables emergentes (algún cambio de mercado)', 'Impulsos favorables fuertes (tendencia macro clara)', 'Tormenta perfecta de impulsos favorables (varias fuerzas se alinean)']
  },
  tim_3: {
    question: '¿Por qué ahora y no después?',
    helper: '¿Qué cambia en los próximos 12 meses para que esto sea urgente?',
    options: ['No hay urgencia; podría esperar indefinidamente', 'Hay una razón menor para hacerlo ahora', 'Buena razón (el mercado está cambiando)', 'Razón fuerte (se avecinan grandes cambios en 12 meses)', 'Razón urgente (si esperas 6 meses, pierdes la oportunidad)']
  },
  dna_1: {
    question: '¿Qué tipo de negocio es este?',
    helper: '¿Qué vendes: tiempo o talento, bienes físicos, software, conexiones, atención, dinero o activos?',
    options: ['Servicio (vendes tu tiempo o talento)', 'Producto físico (átomos)', 'Producto digital (software)', 'Mercado (conecta oferta y demanda)', 'Medios (atención humana)', 'Capital (dinero o rendimiento)', 'Activo (bienes raíces o recursos)'],
    optionHelpers: ['Abogados, consultores, agencias', 'Hardware, bienes manufacturados, mercancía', 'SaaS, aplicaciones, herramientas digitales', 'Airbnb, Uber, bolsas de trabajo', 'Contenido, YouTube, boletín', 'Fondos, préstamos, inversiones', 'Propiedad, equipos, regalías']
  },
  walls_1: {
    question: '¿Qué tan defendible es este negocio a largo plazo?',
    helper: '¿Puedes construir ventajas competitivas duraderas (un foso)?',
    options: ['Fácil de copiar, sin foso (cualquiera puede replicarlo)', 'Algunas barreras, pero defensas débiles', 'Defendibilidad moderada (marca, posibles efectos de red)', 'Defensas fuertes (datos, alianzas exclusivas)', 'Foso muy fuerte (efectos de red, escala, costos de cambio)']
  },
  walls_2: {
    question: '¿Qué evita que alguien con capital te adelante?',
    helper: 'Si una gran empresa viera tu éxito, ¿podría aplastarte?',
    options: ['Podría aplastarme fácilmente con capital', 'Probablemente ganaría si lo intentara', 'Sería difícil, pero posible', 'Le sería difícil competir (efectos de red, marca)', 'Casi imposible (ventaja realmente defendible)']
  }
};

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
