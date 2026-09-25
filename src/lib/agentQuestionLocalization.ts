import type { EvaluationQuestion } from '../types/lit';

export type AgentLocale = 'en' | 'es';

export function normalizeAgentLocale(value?: string): AgentLocale {
  return value?.trim().toLowerCase().startsWith('es') ? 'es' : 'en';
}

const IDEA_ES: Record<string, string> = {
  ideaName: '¿Qué nombre corto debemos usar para esta idea?',
  description: 'Describe la idea en una o dos oraciones claras.',
  targetUser: '¿Quién es el primer cliente o usuario específico que esperas que compre o adopte esto?',
  painfulProblem: '¿Qué problema doloroso tiene este cliente?',
  currentAlternative: '¿Cómo resuelve este cliente el problema hoy?',
  motivation: '¿Por qué estás considerando esta idea ahora?'
};

export function localizedIdeaPrompt(field: string, english: string, locale: AgentLocale): string {
  return locale === 'es' ? IDEA_ES[field] || english : english;
}

export function publicContentPrompt(locale: AgentLocale): string {
  return locale === 'es'
    ? 'Confirma que el contenido enviado sobre tu idea de negocio puede ser procesado por GhostTown como entrada para un veredicto potencialmente público.'
    : 'Confirm that the submitted business-idea content may be processed by GhostTown as public-facing verdict input.';
}

type SpanishQuestion = { question: string; helper: string; options: string[] };
const ES: Record<string, SpanishQuestion> = {
  gt_1:{question:'¿Quién necesita esto con urgencia?',helper:'Sé específico. No "muchas personas", sino un tipo de cliente concreto.',options:['Todavía no estoy seguro','A un grupo amplio podría gustarle','Un grupo específico tiene este problema a veces','Un grupo específico tiene este problema con frecuencia','Un comprador o usuario específico está intentando resolver esto ahora']},
  gt_2:{question:'¿Qué se rompe o empeora si esto no existe?',helper:'Sé sincero. ¿Algo realmente falla, cuesta dinero o causa dolor real?',options:['Realmente no se rompe nada','Sería bueno tenerlo','Ahorra algo de tiempo o molestia','Evita dolor, costo, demora o riesgo real','Resuelve un problema doloroso por el que ya gastan dinero o tiempo']},
  gt_3:{question:'¿Cómo resuelven esto hoy?',helper:'Entiende la alternativa actual. ¿Qué hacen ahora?',options:['No lo sé','Probablemente no hacen nada','Usan una solución improvisada o un proceso manual','Pagan por una solución imperfecta','Pagan, se quejan y todavía tienen dificultades']},
  gt_4:{question:'¿Puedes llegar a los primeros 10 usuarios o compradores?',helper:'Sé realista. ¿Sabes dónde están o cómo contactarlos?',options:['No tengo un camino claro','Tal vez con contacto en frío o redes sociales','Sé dónde se reúnen: comunidades, foros o eventos','Puedo contactarlos directamente por email o LinkedIn','Ya tengo acceso o relaciones con ellos']},
  pg_1:{question:'¿Estás creando esto por demanda o principalmente porque te encanta la idea?',helper:'La pasión es combustible, no brújula. ¿Los clientes están empujando esto hacia adelante?',options:['Principalmente pasión o fantasía, sin demanda real','Pasión con evidencia débil de demanda','Algo de evidencia y algo de pasión','Dolor claro del cliente más motivación personal','La demanda del cliente está empujando esto hacia adelante']},
  lev_1:{question:'¿Qué ventaja difícil de copiar tienes?',helper:'¿Qué puedes hacer que los competidores no puedan copiar fácilmente: red, experiencia, datos o relaciones?',options:['No tengo una ventaja clara','Tengo alguna ventaja pero es fácil de replicar','Ventaja moderada por experiencia o relaciones','Ventaja fuerte por red profunda o experiencia única','Ventaja duradera y defendible por datos o relaciones exclusivas']},
  lev_2:{question:'¿Ya tienes distribución o audiencia?',helper:'¿Puedes llegar a clientes sin depender solo de contacto en frío?',options:['No tengo distribución existente','Audiencia pequeña, menos de 100','Audiencia moderada, entre 100 y 1,000','Buena audiencia, entre 1,000 y 10,000','Audiencia grande y activa, más de 10,000']},
  lev_3:{question:'¿Has hecho esto antes o algo parecido?',helper:'¿Has creado o lanzado con éxito algo en este espacio?',options:['Es mi primera vez y no tengo experiencia relevante','Tengo experiencia indirectamente relacionada','Tengo experiencia relevante en un campo relacionado','Tengo experiencia directa creando productos similares','Tengo un historial de éxito en este dominio exacto']},
  ins_1:{question:'¿Sabes algo del mercado que otros no están viendo?',helper:'¿Qué conocimiento impulsa tu convicción y por qué crees que esto funcionará?',options:['No tengo un conocimiento especial, solo parece buena idea','Tengo una observación menor del mercado','Tengo una comprensión moderada de una tendencia o brecha','Tengo una comprensión fuerte del dolor del cliente o del momento','Tengo una comprensión profunda porque clientes me lo dijeron o viví el problema']},
  ins_2:{question:'¿Has hablado con clientes potenciales?',helper:'Conversaciones reales, no solo encuestas. ¿Confirman tu comprensión?',options:['Nunca he hablado con clientes','Conversaciones casuales sin validación real','He hablado con 3 a 5 clientes potenciales','He tenido 5 a 10 conversaciones y aparecen patrones','He hablado con más de 10 clientes y confirmaron el problema']},
  ins_3:{question:'¿Otra persona podría crear esto igual de bien?',helper:'¿Tu conocimiento es defendible o cualquier persona inteligente con capital podría replicarlo?',options:['Cualquiera con capital podría crearlo','Muchas personas podrían crearlo','Algunas personas podrían crearlo, pero no fácilmente','Pocas personas tienen la comprensión para hacerlo bien','Solo yo o muy pocas personas entendemos realmente este problema']},
  tim_1:{question:'¿El mercado está listo para esto AHORA?',helper:'¿Existe un viento a favor como tecnología, regulación o cambio de comportamiento?',options:['El mercado no está listo; estamos 3 a 5 años adelantados','El mercado todavía no está listo; quizá falten 2 años','El mercado está emergiendo o es incierto','El mercado está claramente listo y hay vientos a favor','El mercado necesita esta solución con urgencia AHORA']},
  tim_2:{question:'¿Hay vientos a favor fuertes de tecnología, regulación o comportamiento?',helper:'¿La tecnología lo permite? ¿Cambian las reglas? ¿Los consumidores están listos?',options:['Hay vientos en contra; regulación o tecnología bloquean','No hay vientos claros a favor ni en contra','Hay vientos a favor emergentes','Hay vientos a favor fuertes por una tendencia clara','Hay una combinación excepcional de varias fuerzas a favor']},
  tim_3:{question:'¿Por qué ahora y no después?',helper:'¿Qué cambia en los próximos 12 meses que hace esto urgente?',options:['No hay urgencia; podría esperar indefinidamente','Hay una razón menor para hacerlo ahora','Hay una buena razón porque el mercado está cambiando','Hay una razón fuerte por cambios importantes en 12 meses','Hay una razón urgente; esperar 6 meses podría cerrar la oportunidad']},
  dna_1:{question:'¿Qué tipo de negocio es este?',helper:'¿Qué vendes: tiempo o talento, bienes físicos, software, conexiones, atención, dinero o activos?',options:['Servicio: vendes tu tiempo o talento','Producto físico','Producto digital o software','Marketplace que conecta oferta y demanda','Medios o atención humana','Capital, dinero o rendimiento','Activo como propiedad, equipo o regalías']},
  walls_1:{question:'¿Qué tan defendible es este negocio a largo plazo?',helper:'¿Puedes crear ventajas competitivas duraderas?',options:['Es fácil de copiar y no tiene barrera','Tiene algunas barreras pero defensas débiles','Defensa moderada por marca o posibles efectos de red','Defensas fuertes por datos o alianzas exclusivas','Barrera muy fuerte por red, escala o costos de cambio']},
  walls_2:{question:'¿Qué impide que alguien con capital te supere?',helper:'Si una empresa grande viera tu éxito, ¿podría desplazarte fácilmente?',options:['Podrían superarme fácilmente con capital','Probablemente ganarían si lo intentaran','Sería difícil pero posible para ellos','Les costaría competir por red, marca u otras barreras','Sería casi imposible por una ventaja realmente defendible']}
};

export function localizeAssessmentQuestion(question: EvaluationQuestion, locale: AgentLocale): EvaluationQuestion {
  if (locale !== 'es') return question;
  const translated = ES[question.id];
  if (!translated) return question;
  return {
    ...question,
    question: translated.question,
    helper: translated.helper,
    options: question.options.map((option, index) => ({ ...option, label: translated.options[index] || option.label }))
  };
}
