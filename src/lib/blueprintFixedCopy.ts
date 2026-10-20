import type { Locale } from './locale';
import { blueprintLanguageStatement, type BlueprintLanguages } from './blueprintLanguage';
import type {
  AdaptiveCheckpoint,
  BusinessModelExecutionLane,
  CustomerInterviewGuide,
  EvidenceHierarchy,
  FoundingCustomerPilotBrief,
  OfferConversationGuide
} from '../types/launchBlueprintV21';
import type { BlueprintDecision, WeeklyMilestone } from '../types/launchBlueprint';
import type { TruthLabel } from '../types/paidTest';

// Fixed text that code (not AI) writes into the paid Blueprint and its files.
// Founder-facing text follows `languages.founder`; text the founder sends to
// buyers follows `languages.buyer`. See AGENTS.md, "Languages".
//
// English is the contract: every English value here is byte-identical to the
// text the generators wrote before this module existed, so Blueprints for
// English (or unspecified) orders do not change. Machine keys (IDs, slugs,
// enum values, CSV column keys, validator-matched phrases) stay in English and
// are never read from this module.

/* ------------------------------------------------------------------------ */
/* V2.1 generator: founder-facing                                            */
/* ------------------------------------------------------------------------ */

interface LaneCopy {
  rationale: string;
  firstMeaningfulTest: string;
  intentionallyDeferred: string[];
}

interface CriticalTestCopy {
  assumptionId: string;
  assumption: string;
  failureConsequence: string;
  evidenceRequired: string;
}

export interface BlueprintGeneratorFounderCopy {
  lanes: Record<BusinessModelExecutionLane, LaneCopy>;
  laneLabel: Record<BusinessModelExecutionLane, string>;
  audit: {
    priceHypothesis: (price: string) => string;
    landingPageFact: (url: string) => string;
    currentStageMissing: string;
    existingOfferMissing: string;
    noLandingPage: string;
    customerNotes: (notes: string) => string;
    previousOutreachMissing: string;
    audienceIdentified: (signals: string) => string;
    audienceMissing: string;
    noOfferAsset: string;
    landingAsset: (url: string) => string;
    noLandingAsset: string;
    seedDomains: (count: number) => string;
    seedDomainsMissing: string;
    hoursMissing: string;
    budgetMissing: string;
    geographyMissing: string;
    languageStatement: (languages: BlueprintLanguages, supplied: boolean) => string;
    technicalMissing: string;
    manualReadiness: (lane: string) => string;
    priorSignals: string;
    priorNoSignals: string;
    recommendsCustomer: (customer: string) => string;
    recommendedLane: (lane: string) => string;
    criticalTests: CriticalTestCopy[];
  };
  evidenceHierarchy: EvidenceHierarchy;
  revenue: {
    firstChannelFallback: string;
    requiredProof: string[];
    commitmentMethod: string;
    followUpSequence: string[];
    successThreshold: string;
  };
  fulfillment: {
    onboardingSteps: string[];
    toolsRequired: string[];
    customerCommunicationPoints: string[];
    successfulDeliveryDefinition: string;
    qualityChecklist: string[];
    estimatedVariableCost: string;
    founderHoursHeavy: string;
    founderHoursLight: string;
    grossMarginGuardrail: string;
    intentionallyManual: string[];
  };
  checkpoints: AdaptiveCheckpoint[];
  defaultBranches: Array<{ condition: string; action: string }>;
  offerGuide: {
    opening: (price: string) => string;
    problemConfirmation: string[];
    objectionCapture: string[];
    followUpAgreement: string;
  };
  launchCardFirstOffer: (offerName: string, price: string) => string;
}

const GENERATOR_FOUNDER_EN: BlueprintGeneratorFounderCopy = {
  lanes: {
    service_or_consulting: {
      rationale: 'The first useful result can be delivered manually through a bounded professional engagement.',
      firstMeaningfulTest: 'Ask a qualified buyer to purchase a paid diagnostic, fixed-scope pilot, or manually delivered engagement.',
      intentionallyDeferred: ['Broad service catalog', 'Long-term retainer', 'Automation before repeatable delivery', 'Hiring before paid demand']
    },
    saas: {
      rationale: 'The workflow can be validated before a full software product exists.',
      firstMeaningfulTest: 'Offer a concierge workflow, working demonstration, paid design-partner pilot, or deposit tied to one narrow process.',
      intentionallyDeferred: ['Full multi-tenant product', 'Large integration surface', 'Self-service onboarding', 'Feature expansion without workflow evidence']
    },
    digital_product: {
      rationale: 'A complete early edition can be sold and used before a larger content catalog is produced.',
      firstMeaningfulTest: 'Request a presale, paid workshop registration, founding-member purchase, or preorder for a complete initial resource.',
      intentionallyDeferred: ['Large course library', 'Membership platform', 'Affiliate program', 'Content expansion before purchase evidence']
    },
    physical_product: {
      rationale: 'A small-batch or manually assembled version can test purchase and use before inventory is scaled.',
      firstMeaningfulTest: 'Request a preorder, deposit, prototype evaluation, or retailer conversation with written delivery boundaries.',
      intentionallyDeferred: ['Large production run', 'Broad inventory', 'Retail expansion', 'Unsupported safety or performance claims']
    },
    marketplace: {
      rationale: 'The transaction can be tested by manually matching one narrow buyer and provider segment.',
      firstMeaningfulTest: 'Complete one manually qualified match and request a concierge fee, transaction commitment, or explicit access from both sides.',
      intentionallyDeferred: ['Self-service marketplace', 'Mass provider acquisition', 'Automated matching', 'Multiple market sides at once']
    },
    local_business: {
      rationale: 'Demand can be tested through a real appointment, estimate, reservation, deposit, or paid service.',
      firstMeaningfulTest: 'Ask a qualified local buyer for an appointment, estimate approval, reservation, deposit, or fixed-scope paid service.',
      intentionallyDeferred: ['New location', 'Large equipment purchase', 'Staff expansion', 'Broad service area before local conversion evidence']
    },
    creator_or_media: {
      rationale: 'Audience quality is better tested through a qualified subscriber action, sponsor conversation, or paid product than through views alone.',
      firstMeaningfulTest: 'Request a qualified subscriber action, sponsor conversation, paid workshop, or purchase connected to one audience problem.',
      intentionallyDeferred: ['High-volume publishing', 'Multiple channels', 'Large production spend', 'Treating views or likes as demand']
    }
  },
  laneLabel: {
    service_or_consulting: 'service or consulting',
    saas: 'saas',
    digital_product: 'digital product',
    physical_product: 'physical product',
    marketplace: 'marketplace',
    local_business: 'local business',
    creator_or_media: 'creator or media'
  },
  audit: {
    priceHypothesis: price => `Founder-entered price hypothesis: ${price}.`,
    landingPageFact: url => `Founder supplied an existing landing page: ${url}.`,
    currentStageMissing: 'Current business stage was not supplied; confirm it before increasing investment.',
    existingOfferMissing: 'No existing offer was supplied; the generated founding-customer offer remains a test.',
    noLandingPage: 'No existing landing page was supplied.',
    customerNotes: notes => `Customer notes supplied for review: ${notes}`,
    previousOutreachMissing: 'Previous outreach attempts and results were not supplied.',
    audienceIdentified: signals => `Founder identified these audience or ecosystem starting points: ${signals}.`,
    audienceMissing: 'Existing customers, audience, contacts, and partners were not supplied.',
    noOfferAsset: 'No founder-authored offer asset was supplied.',
    landingAsset: url => `Existing landing-page asset: ${url}.`,
    noLandingAsset: 'No existing landing-page asset was supplied.',
    seedDomains: count => `${count} confirmed commercial seed domains are available for research.`,
    seedDomainsMissing: 'Confirmed commercial seed domains are not yet available.',
    hoursMissing: 'Founder hours per week were not supplied; use the Blueprint time ceiling until confirmed.',
    budgetMissing: 'Founder test budget was not supplied; use the Blueprint cash-risk ceiling until confirmed.',
    geographyMissing: 'Geographic constraints were not supplied.',
    languageStatement: blueprintLanguageStatement,
    technicalMissing: 'Technical capability was not supplied and must not be assumed.',
    manualReadiness: lane => `The ${lane} lane appears manually testable, but the founder must confirm tools, capacity, permissions, and delivery competence before the first paid ask.`,
    priorSignals: 'Customer notes may contain prior market signals; separate exact behavior from interpretation during Day 1.',
    priorNoSignals: 'Customer notes may contain failed attempts; record the exact audience, message, quantity, and response before repeating them.',
    recommendsCustomer: customer => `GhostTown recommends the initial customer: ${customer}.`,
    recommendedLane: lane => `The recommended execution lane is ${lane}.`,
    criticalTests: [
      { assumptionId: 'critical-test-problem', assumption: 'Qualified buyers experienced the problem recently and consider it meaningful.', failureConsequence: 'Narrow, pivot, or stop the customer/problem pair.', evidenceRequired: 'Recent concrete examples, consequences, and current workarounds from qualified buyers.' },
      { assumptionId: 'critical-test-access', assumption: 'The first customer can be reached through at least one repeatable channel.', failureConsequence: 'Change the access plan before increasing outreach volume.', evidenceRequired: 'Qualified replies, interviews, introductions, or direct buyer access from a tracked channel.' },
      { assumptionId: 'critical-test-offer', assumption: 'The fixed-scope offer can earn a meaningful commitment.', failureConsequence: 'Revise customer, urgency, trust, scope, or proof before building more.', evidenceRequired: 'Payment, deposit, accepted pilot scope, access, referral, or another explicit buying action.' },
      { assumptionId: 'critical-test-price', assumption: 'The test price is credible for the buyer and sustainable for delivery.', failureConsequence: 'Separate price objections from fit, trust, timing, and scope before changing price.', evidenceRequired: 'Real purchase behavior and exact objections from qualified buyers.' },
      { assumptionId: 'critical-test-fulfillment', assumption: 'The founder can deliver within the time, cost, quality, and risk boundaries.', failureConsequence: 'Revise delivery before acquiring more customers.', evidenceRequired: 'A fulfillment rehearsal or paid pilot with founder hours, direct cost, defects, and buyer outcome.' }
    ]
  },
  evidenceHierarchy: {
    strong: ['Payment', 'Deposit', 'Paid pilot', 'Accepted pilot scope', 'Access to data, systems, staff, or facilities', 'Meaningful time commitment', 'Introduction to a decision maker'],
    moderate: ['Qualified sales conversation', 'Proposal request', 'Trial or demonstration request', 'Specific buying-process objection', 'Referral to another qualified buyer'],
    early: ['Qualified reply', 'Customer interview', 'Landing-page lead', 'Relevant question or direct inquiry'],
    weak: ['Likes', 'Generic compliments', 'Unqualified waitlist entries', 'Friends saying they would use it', 'Traffic without a meaningful action'],
    rankingRule: 'Prefer observed behavior over stated interest. Never treat weak evidence as proof of demand when stronger evidence can be requested ethically.'
  },
  revenue: {
    firstChannelFallback: 'Highest-priority verified customer-access channel',
    requiredProof: ['Written fixed scope', 'Explicit deliverables and exclusions', 'Validation-stage proof boundary', 'First-result timeline', 'Payment or commitment method'],
    commitmentMethod: 'Use a real payment link, deposit, accepted written scope, booked paid appointment, preorder, or another lane-appropriate commitment. Do not count compliments.',
    followUpSequence: ['Send the first ask to a qualified buyer.', 'Follow up once after at least three business days when appropriate.', 'Record the exact objection or commitment.', 'Stop after a clear rejection or the stated no-response limit.'],
    successThreshold: 'At least one qualified buyer makes a strong commitment, or multiple qualified buyers provide specific buying-process evidence that identifies one correctable constraint.'
  },
  fulfillment: {
    onboardingSteps: ['Confirm buyer qualification and the recent problem.', 'Review scope, exclusions, price, timeline, and responsibilities.', 'Collect only required inputs.', 'Confirm payment or commitment before unbounded work.'],
    toolsRequired: ['Email and calendar', 'Payment or commitment method', 'Written scope and checklist', 'Evidence and time tracker', 'Only tools required for the fixed-scope pilot'],
    customerCommunicationPoints: ['Fit confirmation', 'Scope and payment confirmation', 'Delivery start', 'First useful result', 'Evidence review and next decision'],
    successfulDeliveryDefinition: 'Every promised deliverable is complete, exclusions were respected, and time, direct cost, defects, and buyer feedback were recorded.',
    qualityChecklist: ['Buyer and problem match the qualification criteria.', 'Scope, price, timeline, responsibilities, and exclusions are written.', 'No unsupported guarantee or fabricated proof appears.', 'The first useful result is documented.', 'Founder hours and variable costs are recorded before deciding to repeat.'],
    estimatedVariableCost: 'Record the real direct cost before the first ask. Do not use a guessed margin as evidence.',
    founderHoursHeavy: 'Initial guardrail: no more than 8 founder hours per pilot.',
    founderHoursLight: 'Initial guardrail: no more than 6 founder hours per pilot.',
    grossMarginGuardrail: 'Do not scale acquisition when direct variable cost plus founder labor at the chosen internal hourly rate exceeds 70% of collected pilot revenue.',
    intentionallyManual: ['Qualification', 'Onboarding', 'Core delivery', 'Buyer communication', 'Evidence capture', 'Post-pilot review']
  },
  checkpoints: [
    { checkpointId: 'day-7', dayNumber: 7, title: 'Customer, problem, and access review', questions: ['Is the customer definition coherent?', 'Can qualified people be reached?', 'Which assumptions remain unsupported?', 'Should the offer or customer change before more outreach?'], evidenceRequired: ['Completed first actions', 'Qualified target list', 'Exact replies or non-response counts', 'Updated critical-test register'], branches: [{ condition: 'Ten qualified messages produce no replies.', action: 'Stop increasing volume. Review customer fit, channel relevance, and the opening message.' }, { condition: 'Qualified people cannot be identified or reached.', action: 'Revise the access path or customer segment before continuing.' }] },
    { checkpointId: 'day-14', dayNumber: 14, title: 'Conversation and problem-evidence review', questions: ['Are qualified conversations occurring?', 'Is the problem recent and meaningful?', 'Which alternatives recur?', 'Has a transparent commercial ask been made?'], evidenceRequired: ['Interview notes', 'Exact customer language', 'Current alternatives', 'Commercial asks and responses'], branches: [{ condition: 'Prospects reply but refuse calls.', action: 'Reduce the requested commitment and test a smaller next step.' }, { condition: 'The problem is not recent or costly.', action: 'Narrow or pivot the problem before revising copy.' }] },
    { checkpointId: 'day-21', dayNumber: 21, title: 'Commitment and fulfillment review', questions: ['Is there meaningful commitment?', 'Which channel produces the strongest signal?', 'What is the main conversion constraint?', 'Is fulfillment practical and sustainable?'], evidenceRequired: ['Payments or commitments', 'Objection categories', 'Channel comparison', 'Founder hours and direct cost'], branches: [{ condition: 'Calls occur but nobody accepts the offer.', action: 'Examine urgency, trust, scope, price, and proof; change only the strongest supported constraint.' }, { condition: 'Customers accept but fulfillment is unprofitable or unsafe.', action: 'Revise delivery before acquiring more customers.' }] },
    { checkpointId: 'day-30', dayNumber: 30, title: 'Evidence-led business decision', questions: ['What is the strongest behavioral evidence?', 'Which critical assumption failed?', 'Is the acquisition path repeatable?', 'Is delivery viable within the risk boundaries?'], evidenceRequired: ['Evidence ledger', 'Commitment and revenue record', 'Fulfillment economics', 'Decision memo with missing evidence'], branches: [{ condition: 'Strong demand and viable fulfillment exist.', action: 'Continue with one bounded next test before broad automation.' }, { condition: 'One correctable constraint blocks credible evidence.', action: 'Continue with revision and test one variable.' }, { condition: 'Customer, problem, or offer evidence points elsewhere.', action: 'Issue an explicit pivot and preserve the evidence chain.' }, { condition: 'Critical evidence remains missing.', action: 'Pause rather than manufacture confidence.' }, { condition: 'Qualified buyers show no meaningful problem or commitment.', action: 'Stop and archive the evidence.' }] }
  ],
  defaultBranches: [
    { condition: 'Required evidence is missing.', action: 'Mark the item unsupported and collect the evidence before treating the action as complete.' },
    { condition: 'New evidence contradicts the recommendation.', action: 'Preserve the original recommendation, record the contradiction, and route it to the next checkpoint.' }
  ],
  offerGuide: {
    opening: price => `Confirm the recent problem and scope before discussing the ${price} test price.`,
    problemConfirmation: ['Confirm the recent problem and consequence.', 'Confirm the buyer and decision maker.', 'Confirm the current workaround.'],
    objectionCapture: ['Record the objection exactly.', 'Classify it as fit, urgency, access, trust, scope, fulfillment, price, or message.', 'Do not discount before identifying the constraint.'],
    followUpAgreement: 'Agree on one dated next step or close the opportunity respectfully.'
  },
  launchCardFirstOffer: (offerName, price) => `${offerName} at ${price}`
};

const GENERATOR_FOUNDER_ES: BlueprintGeneratorFounderCopy = {
  lanes: {
    service_or_consulting: {
      rationale: 'Puedes entregar el primer resultado útil a mano, con un servicio profesional de alcance limitado.',
      firstMeaningfulTest: 'Pídele a un comprador calificado que pague un diagnóstico, un piloto de alcance fijo o un servicio que entregas a mano.',
      intentionallyDeferred: ['Catálogo amplio de servicios', 'Contrato fijo a largo plazo', 'Automatizar antes de que la entrega se pueda repetir', 'Contratar gente antes de tener demanda pagada']
    },
    saas: {
      rationale: 'Puedes validar el proceso antes de que exista un software completo.',
      firstMeaningfulTest: 'Ofrece el proceso hecho a mano, una demostración que funcione, un piloto pagado con un cliente que diseña contigo, o un depósito atado a un solo proceso específico.',
      intentionallyDeferred: ['Producto completo para muchos clientes a la vez', 'Muchas integraciones', 'Registro y arranque por cuenta propia', 'Añadir funciones sin evidencia del proceso']
    },
    digital_product: {
      rationale: 'Puedes vender y usar una primera edición completa antes de producir un catálogo grande de contenido.',
      firstMeaningfulTest: 'Pide una preventa, una inscripción pagada a un taller, una compra de miembro fundador o un pedido por adelantado de un primer recurso completo.',
      intentionallyDeferred: ['Biblioteca grande de cursos', 'Plataforma de membresía', 'Programa de afiliados', 'Más contenido antes de tener evidencia de compra']
    },
    physical_product: {
      rationale: 'Una versión en lote pequeño o armada a mano puede probar la compra y el uso antes de aumentar el inventario.',
      firstMeaningfulTest: 'Pide un pedido por adelantado, un depósito, una evaluación del prototipo o una conversación con una tienda, con límites de entrega por escrito.',
      intentionallyDeferred: ['Producción grande', 'Inventario amplio', 'Expansión a tiendas', 'Promesas de seguridad o rendimiento sin respaldo']
    },
    marketplace: {
      rationale: 'Puedes probar la transacción conectando a mano un grupo específico de compradores con un grupo específico de proveedores.',
      firstMeaningfulTest: 'Completa una conexión calificada a mano y pide una tarifa por el servicio, un compromiso de compra o acceso claro de ambos lados.',
      intentionallyDeferred: ['Marketplace de autoservicio', 'Conseguir proveedores en masa', 'Conexiones automáticas', 'Varios lados del mercado a la vez']
    },
    local_business: {
      rationale: 'Puedes probar la demanda con una cita real, un estimado, una reservación, un depósito o un servicio pagado.',
      firstMeaningfulTest: 'Pídele a un comprador local calificado una cita, que apruebe un estimado, una reservación, un depósito o un servicio pagado de alcance fijo.',
      intentionallyDeferred: ['Nuevo local', 'Compra grande de equipo', 'Más empleados', 'Zona de servicio amplia antes de tener ventas locales']
    },
    creator_or_media: {
      rationale: 'La calidad de tu audiencia se prueba mejor con una acción de un suscriptor calificado, una conversación con un patrocinador o un producto pagado que solo con vistas.',
      firstMeaningfulTest: 'Pide una acción de un suscriptor calificado, una conversación con un patrocinador, un taller pagado o una compra ligada a un problema de tu audiencia.',
      intentionallyDeferred: ['Publicar en gran volumen', 'Varios canales', 'Gastar mucho en producción', 'Tomar vistas o likes como demanda']
    }
  },
  laneLabel: {
    service_or_consulting: 'servicio o consultoría',
    saas: 'software (SaaS)',
    digital_product: 'producto digital',
    physical_product: 'producto físico',
    marketplace: 'marketplace',
    local_business: 'negocio local',
    creator_or_media: 'creador o medio'
  },
  audit: {
    priceHypothesis: price => `Precio que propusiste para probar: ${price}.`,
    landingPageFact: url => `Ya tienes una página de aterrizaje: ${url}.`,
    currentStageMissing: 'No indicaste en qué etapa está tu negocio; confírmalo antes de invertir más.',
    existingOfferMissing: 'No indicaste una oferta que ya tengas; la oferta para clientes fundadores que preparamos sigue siendo una prueba.',
    noLandingPage: 'No indicaste una página de aterrizaje que ya tengas.',
    customerNotes: notes => `Notas de clientes que compartiste para revisar: ${notes}`,
    previousOutreachMissing: 'No indicaste intentos anteriores de contactar clientes ni sus resultados.',
    audienceIdentified: signals => `Señalaste estos puntos de partida de audiencia o de tu ecosistema: ${signals}.`,
    audienceMissing: 'No indicaste clientes, audiencia, contactos ni socios que ya tengas.',
    noOfferAsset: 'No compartiste una oferta escrita por ti.',
    landingAsset: url => `Página de aterrizaje que ya tienes: ${url}.`,
    noLandingAsset: 'No compartiste una página de aterrizaje que ya tengas.',
    seedDomains: count => `Hay ${count} dominios comerciales confirmados listos para investigar.`,
    seedDomainsMissing: 'Todavía no hay dominios comerciales confirmados.',
    hoursMissing: 'No indicaste cuántas horas por semana tienes; usa el límite de tiempo del Blueprint hasta que lo confirmes.',
    budgetMissing: 'No indicaste tu presupuesto para la prueba; usa el límite de dinero en riesgo del Blueprint hasta que lo confirmes.',
    geographyMissing: 'No indicaste límites de lugar o zona.',
    // Kept in English on purpose: the AI stages read this statement as an
    // instruction, and tests/blueprintLanguage.test.tsx pins its wording.
    languageStatement: blueprintLanguageStatement,
    technicalMissing: 'No indicaste tu capacidad técnica, así que no la damos por hecha.',
    manualReadiness: lane => `El modelo de ${lane} parece que se puede probar a mano, pero tienes que confirmar herramientas, capacidad, permisos y que sabes entregar antes de pedir el primer pago.`,
    priorSignals: 'Tus notas de clientes podrían tener señales del mercado; el Día 1, separa lo que la gente hizo de cómo tú lo interpretas.',
    priorNoSignals: 'Tus notas de clientes podrían tener intentos que no funcionaron; anota la audiencia, el mensaje, la cantidad y la respuesta exactos antes de repetirlos.',
    recommendsCustomer: customer => `GhostTown recomienda este cliente inicial: ${customer}.`,
    recommendedLane: lane => `El modelo de ejecución recomendado es ${lane}.`,
    criticalTests: [
      { assumptionId: 'critical-test-problem', assumption: 'Los compradores calificados vivieron el problema hace poco y les importa.', failureConsequence: 'Enfoca más, cambia de rumbo o detén la pareja de cliente y problema.', evidenceRequired: 'Ejemplos recientes y concretos, consecuencias y soluciones que usan hoy, de compradores calificados.' },
      { assumptionId: 'critical-test-access', assumption: 'Puedes llegar al primer cliente por al menos un canal que se pueda repetir.', failureConsequence: 'Cambia el plan de acceso antes de enviar más mensajes.', evidenceRequired: 'Respuestas calificadas, entrevistas, presentaciones o acceso directo a compradores desde un canal que estás midiendo.' },
      { assumptionId: 'critical-test-offer', assumption: 'La oferta de alcance fijo puede lograr un compromiso real.', failureConsequence: 'Ajusta el cliente, la urgencia, la confianza, el alcance o la prueba antes de construir más.', evidenceRequired: 'Pago, depósito, alcance de piloto aceptado, acceso, referido u otra acción clara de compra.' },
      { assumptionId: 'critical-test-price', assumption: 'El precio de prueba es creíble para el comprador y sostenible para entregar.', failureConsequence: 'Separa las objeciones de precio de las de encaje, confianza, momento y alcance antes de cambiar el precio.', evidenceRequired: 'Compras reales y objeciones exactas de compradores calificados.' },
      { assumptionId: 'critical-test-fulfillment', assumption: 'Puedes entregar dentro de los límites de tiempo, costo, calidad y riesgo.', failureConsequence: 'Ajusta la entrega antes de buscar más clientes.', evidenceRequired: 'Un ensayo de entrega o un piloto pagado con tus horas, el costo directo, los errores y el resultado del comprador.' }
    ]
  },
  evidenceHierarchy: {
    strong: ['Pago', 'Depósito', 'Piloto pagado', 'Alcance de piloto aceptado', 'Acceso a datos, sistemas, personal o instalaciones', 'Compromiso real de tiempo', 'Presentación a la persona que decide'],
    moderate: ['Conversación de venta calificada', 'Pedido de propuesta', 'Pedido de prueba o demostración', 'Objeción específica sobre cómo compran', 'Referido a otro comprador calificado'],
    early: ['Respuesta calificada', 'Entrevista con un cliente', 'Contacto desde la página de aterrizaje', 'Pregunta relevante o consulta directa'],
    weak: ['Likes', 'Halagos generales', 'Inscripciones a lista de espera sin calificar', 'Amigos que dicen que lo usarían', 'Tráfico sin una acción real'],
    rankingRule: 'Lo que la gente hace pesa más que lo que dice que le interesa. Nunca tomes evidencia débil como prueba de demanda cuando puedes pedir, de forma ética, una evidencia más fuerte.'
  },
  revenue: {
    firstChannelFallback: 'El canal verificado de acceso a clientes con más prioridad',
    requiredProof: ['Alcance fijo por escrito', 'Entregables y exclusiones claros', 'Límite de lo que puedes prometer en etapa de validación', 'Fecha del primer resultado', 'Forma de pago o compromiso'],
    commitmentMethod: 'Usa un enlace de pago real, un depósito, un alcance por escrito aceptado, una cita pagada, un pedido por adelantado u otro compromiso que encaje con tu modelo. No cuentes halagos.',
    followUpSequence: ['Envía la primera petición a un comprador calificado.', 'Da seguimiento una vez, después de al menos tres días laborables, si es apropiado.', 'Anota la objeción o el compromiso exacto.', 'Para después de un “no” claro o al llegar al límite de mensajes sin respuesta que definiste.'],
    successThreshold: 'Al menos un comprador calificado hace un compromiso fuerte, o varios compradores calificados te dan evidencia concreta de cómo compran que señala un solo obstáculo que puedes corregir.'
  },
  fulfillment: {
    onboardingSteps: ['Confirma que el comprador califica y que tuvo el problema hace poco.', 'Revisa alcance, exclusiones, precio, fechas y responsabilidades.', 'Pide solo la información necesaria.', 'Confirma el pago o compromiso antes de hacer trabajo sin límite.'],
    toolsRequired: ['Email y calendario', 'Forma de pago o compromiso', 'Alcance y lista de cotejo por escrito', 'Registro de evidencia y de tiempo', 'Solo las herramientas que necesita el piloto de alcance fijo'],
    customerCommunicationPoints: ['Confirmar que encaja', 'Confirmar alcance y pago', 'Inicio de la entrega', 'Primer resultado útil', 'Revisión de evidencia y próxima decisión'],
    successfulDeliveryDefinition: 'Todo lo prometido está completo, se respetaron las exclusiones, y anotaste el tiempo, el costo directo, los errores y lo que dijo el comprador.',
    qualityChecklist: ['El comprador y el problema cumplen los criterios para calificar.', 'Alcance, precio, fechas, responsabilidades y exclusiones están por escrito.', 'No hay garantías sin respaldo ni pruebas inventadas.', 'El primer resultado útil está documentado.', 'Anotaste tus horas y costos variables antes de decidir repetir.'],
    estimatedVariableCost: 'Anota el costo directo real antes de la primera petición. No uses un margen adivinado como evidencia.',
    founderHoursHeavy: 'Límite inicial: no más de 8 horas tuyas por piloto.',
    founderHoursLight: 'Límite inicial: no más de 6 horas tuyas por piloto.',
    grossMarginGuardrail: 'No inviertas en conseguir más clientes si el costo variable directo, más tu trabajo a la tarifa por hora que escogiste, pasa del 70% de lo que cobraste por el piloto.',
    intentionallyManual: ['Calificar', 'Arranque del cliente', 'Entrega principal', 'Comunicación con el comprador', 'Registro de evidencia', 'Revisión después del piloto']
  },
  checkpoints: [
    { checkpointId: 'day-7', dayNumber: 7, title: 'Revisión de cliente, problema y acceso', questions: ['¿La definición del cliente tiene sentido?', '¿Puedes llegar a personas calificadas?', '¿Qué suposiciones siguen sin respaldo?', '¿Debes cambiar la oferta o el cliente antes de enviar más mensajes?'], evidenceRequired: ['Primeras acciones completadas', 'Lista de personas calificadas', 'Respuestas exactas o conteo de quienes no respondieron', 'Registro de pruebas críticas al día'], branches: [{ condition: 'Diez mensajes calificados no reciben respuesta.', action: 'No aumentes el volumen. Revisa si el cliente encaja, si el canal es relevante y el mensaje inicial.' }, { condition: 'No puedes identificar o llegar a personas calificadas.', action: 'Ajusta el camino de acceso o el grupo de clientes antes de seguir.' }] },
    { checkpointId: 'day-14', dayNumber: 14, title: 'Revisión de conversaciones y evidencia del problema', questions: ['¿Estás teniendo conversaciones calificadas?', '¿El problema es reciente e importante?', '¿Qué alternativas se repiten?', '¿Ya hiciste una petición comercial clara?'], evidenceRequired: ['Notas de entrevistas', 'Palabras exactas de los clientes', 'Alternativas que usan hoy', 'Peticiones comerciales y respuestas'], branches: [{ condition: 'La gente responde pero no acepta llamadas.', action: 'Pide un compromiso más pequeño y prueba un próximo paso más sencillo.' }, { condition: 'El problema no es reciente ni costoso.', action: 'Enfoca o cambia el problema antes de reescribir los textos.' }] },
    { checkpointId: 'day-21', dayNumber: 21, title: 'Revisión de compromisos y entrega', questions: ['¿Hay compromisos reales?', '¿Qué canal da la señal más fuerte?', '¿Cuál es el obstáculo principal para cerrar ventas?', '¿La entrega es práctica y sostenible?'], evidenceRequired: ['Pagos o compromisos', 'Tipos de objeción', 'Comparación de canales', 'Tus horas y el costo directo'], branches: [{ condition: 'Hay llamadas pero nadie acepta la oferta.', action: 'Revisa la urgencia, la confianza, el alcance, el precio y la prueba; cambia solo el obstáculo con más respaldo.' }, { condition: 'Los clientes aceptan pero la entrega no deja ganancia o no es segura.', action: 'Ajusta la entrega antes de buscar más clientes.' }] },
    { checkpointId: 'day-30', dayNumber: 30, title: 'Decisión de negocio basada en evidencia', questions: ['¿Cuál es la evidencia más fuerte de lo que la gente hizo?', '¿Qué suposición crítica falló?', '¿El camino para conseguir clientes se puede repetir?', '¿La entrega es viable dentro de los límites de riesgo?'], evidenceRequired: ['Registro de evidencia', 'Registro de compromisos e ingresos', 'Números de la entrega', 'Memo de decisión con la evidencia que falta'], branches: [{ condition: 'Hay demanda fuerte y la entrega es viable.', action: 'Sigue con una próxima prueba limitada antes de automatizar en grande.' }, { condition: 'Un obstáculo que se puede corregir bloquea evidencia creíble.', action: 'Sigue con un ajuste y prueba una sola variable.' }, { condition: 'La evidencia del cliente, el problema o la oferta apunta a otro lado.', action: 'Declara un cambio de rumbo claro y guarda la cadena de evidencia.' }, { condition: 'Todavía falta evidencia crítica.', action: 'Haz una pausa en vez de inventarte confianza.' }, { condition: 'Los compradores calificados no muestran un problema real ni compromiso.', action: 'Detente y archiva la evidencia.' }] }
  ],
  defaultBranches: [
    { condition: 'Falta la evidencia requerida.', action: 'Marca el punto como sin respaldo y consigue la evidencia antes de dar la acción por completada.' },
    { condition: 'Evidencia nueva contradice la recomendación.', action: 'Guarda la recomendación original, anota la contradicción y llévala al próximo punto de control.' }
  ],
  offerGuide: {
    opening: price => `Confirma el problema reciente y el alcance antes de hablar del precio de prueba de ${price}.`,
    problemConfirmation: ['Confirma el problema reciente y su consecuencia.', 'Confirma quién compra y quién decide.', 'Confirma la solución que usan hoy.'],
    objectionCapture: ['Anota la objeción palabra por palabra.', 'Clasifícala como encaje, urgencia, acceso, confianza, alcance, entrega, precio o mensaje.', 'No des descuento antes de identificar el obstáculo.'],
    followUpAgreement: 'Acuerden un próximo paso con fecha, o cierra la oportunidad con respeto.'
  },
  launchCardFirstOffer: (offerName, price) => `${offerName} a ${price}`
};

export const BLUEPRINT_GENERATOR_FOUNDER_COPY: Record<Locale, BlueprintGeneratorFounderCopy> = {
  en: GENERATOR_FOUNDER_EN,
  es: GENERATOR_FOUNDER_ES
};

/* ------------------------------------------------------------------------ */
/* V2.1 generator: buyer-facing (the founder sends or reads this to buyers)   */
/* ------------------------------------------------------------------------ */

export interface BlueprintGeneratorBuyerCopy {
  firstAskFallback: (offerName: string, price: string) => string;
  interviewGuide: (problem: string) => CustomerInterviewGuide;
  offerExplanation: (promise: string) => string;
  notIncluded: (item: string) => string;
  pricePresentation: (price: string) => string;
  commitmentRequest: string;
  proofBoundary: string;
}

export const BLUEPRINT_GENERATOR_BUYER_COPY: Record<Locale, BlueprintGeneratorBuyerCopy> = {
  en: {
    firstAskFallback: (offerName, price) => `Review the written scope for ${offerName} and decide whether the ${price} founding-customer pilot fits.`,
    interviewGuide: problem => ({
      opening: `I am researching how people currently handle ${problem}. This is not a sales call.`,
      problemHistoryQuestions: ['When did this first become a problem?', 'How often has it happened?', 'Who experiences the consequence most directly?'],
      lastOccurrenceQuestions: ['Tell me about the most recent occurrence.', 'What triggered it?', 'What did you do first?', 'What happened after that?'],
      currentWorkaroundQuestions: ['What do you use today?', 'Why did you choose it?', 'Where does it fail or create extra work?'],
      costAndConsequenceQuestions: ['What did the last occurrence cost?', 'What happens when nothing changes?'],
      buyingProcessQuestions: ['Who decides whether to spend money?', 'Who can block the decision?', 'What must be true before approval?'],
      existingSpendingQuestions: ['Have you paid for an alternative?', 'How much and how recently?', 'What made that purchase acceptable?'],
      switchingFrictionQuestions: ['What would make switching risky?', 'What data, access, training, habit, or trust would slow adoption?'],
      closingAndReferralQuestions: ['What did I fail to ask?', 'May I follow up with the findings?', 'Who else has dealt with this recently?']
    }),
    offerExplanation: promise => `${promise} The pilot is fixed-scope and validation-stage.`,
    notIncluded: item => `Not included: ${item}`,
    pricePresentation: price => `The founding-customer test price is ${price}; final pricing remains unproven.`,
    commitmentRequest: 'Would you like to approve the written scope and take the lane-appropriate payment or commitment step?',
    proofBoundary: 'Validation-stage offer. No fabricated testimonial, guaranteed result, invented scarcity, or unsupported performance claim is permitted.'
  },
  es: {
    firstAskFallback: (offerName, price) => `Revisa el alcance por escrito de ${offerName} y decide si el piloto para clientes fundadores de ${price} te sirve.`,
    interviewGuide: problem => ({
      opening: `Estoy investigando cómo la gente maneja hoy esto: ${problem}. Esto no es una llamada de ventas.`,
      problemHistoryQuestions: ['¿Cuándo empezó a ser un problema?', '¿Cuántas veces ha pasado?', '¿Quién sufre la consecuencia más de cerca?'],
      lastOccurrenceQuestions: ['Cuéntame de la última vez que pasó.', '¿Qué lo provocó?', '¿Qué fue lo primero que hiciste?', '¿Qué pasó después?'],
      currentWorkaroundQuestions: ['¿Qué usas hoy?', '¿Por qué lo escogiste?', '¿Dónde falla o te da trabajo extra?'],
      costAndConsequenceQuestions: ['¿Cuánto te costó la última vez?', '¿Qué pasa si nada cambia?'],
      buyingProcessQuestions: ['¿Quién decide si se gasta dinero?', '¿Quién puede frenar la decisión?', '¿Qué tiene que pasar antes de aprobarlo?'],
      existingSpendingQuestions: ['¿Has pagado por otra alternativa?', '¿Cuánto y hace cuánto?', '¿Qué hizo que esa compra valiera la pena?'],
      switchingFrictionQuestions: ['¿Qué haría que cambiar fuera arriesgado?', '¿Qué datos, acceso, entrenamiento, costumbre o confianza harían más lento empezar a usarlo?'],
      closingAndReferralQuestions: ['¿Qué se me olvidó preguntarte?', '¿Te puedo escribir luego con lo que aprendí?', '¿Quién más ha pasado por esto hace poco?']
    }),
    offerExplanation: promise => `${promise} El piloto tiene un alcance fijo y está en etapa de validación.`,
    notIncluded: item => `No incluye: ${item}`,
    pricePresentation: price => `El precio de prueba para clientes fundadores es ${price}; el precio final todavía no está probado.`,
    commitmentRequest: '¿Quieres aprobar el alcance por escrito y dar el paso de pago o compromiso que acordamos?',
    proofBoundary: 'Oferta en etapa de validación. No se permiten testimonios inventados, resultados garantizados, escasez falsa ni promesas de rendimiento sin respaldo.'
  }
};

/* ------------------------------------------------------------------------ */
/* Base (v2.0) generator text that the V2.1 Blueprint shows the founder       */
/* ------------------------------------------------------------------------ */

export interface BlueprintBaseFounderCopy {
  biggestRiskFallback: (customer: string) => string;
  validationObjectiveFallback: (customer: string, offerName: string) => string;
  continueEvidence: string[];
  stopEvidence: string[];
  weeklyMilestones: WeeklyMilestone[];
  finalDecisionCriteria: Array<{ decision: BlueprintDecision; condition: string; nextAction: string }>;
}

export const BLUEPRINT_BASE_FOUNDER_COPY: Record<Locale, BlueprintBaseFounderCopy> = {
  en: {
    biggestRiskFallback: customer => `Do not scale until qualified ${customer} take a meaningful action.`,
    validationObjectiveFallback: (customer, offerName) => `Within 30 days, determine whether qualified ${customer} will engage with, discuss, and make a meaningful commitment to ${offerName}.`,
    continueEvidence: ['Repeated qualified buyers describe a recent painful problem.', 'At least one buyer pays, deposits, signs, or takes another serious buying action.', 'The first result can be delivered within the planned effort and cost.', 'At least one acquisition path can be repeated.'],
    stopEvidence: ['Qualified buyers cannot be reached after honest channel testing.', 'Buyers do not describe a recent meaningful problem.', 'The transparent paid ask produces no commitment and no sharper learning.', 'Delivery requires unrealistic cost, time, risk, or unsupported capability.'],
    weeklyMilestones: [
      {
        weekNumber: 1,
        objective: 'Activate the Launch Site Starter and verify the initial customer, problem, offer, price, and customer-access priorities.',
        priorities: ['Review the populated site.', 'Verify assumptions against public customer conversations.', 'Select five priority customer channels.', 'Prepare the first outreach batch.'],
        milestone: 'A coherent, visible offer with one customer, one problem, one pilot, one price hypothesis, and five prioritized access channels.',
        successMetrics: ['Launch Site Starter version 1 saved.', 'One target-customer definition.', 'One primary problem.', 'One initial offer.', 'Five priority channels selected.']
      },
      {
        weekNumber: 2,
        objective: 'Publish the site, contribute useful material, and begin qualified customer conversations.',
        priorities: ['Publish or privately share the site.', 'Use the prepared scripts.', 'Publish helpful posts one and two.', 'Record exact buyer language and objections.'],
        milestone: 'The offer is visible and qualified customer conversations have begun.',
        successMetrics: ['Landing page published or privately shared.', 'Tracking active.', 'Outreach batch completed.', 'Qualified conversations booked.', 'Two helpful posts published.']
      },
      {
        weekNumber: 3,
        objective: 'Ask qualified buyers for a meaningful commitment and identify the largest conversion constraint.',
        priorities: ['Send transparent pilot invitations.', 'Test the initial price.', 'Contact complementary partners.', 'Compare channel results.', 'Record commitment behavior.'],
        milestone: 'The founder has behavioral evidence rather than compliments.',
        successMetrics: ['Qualified replies.', 'Buying conversations.', 'Deposits, payments, or serious commitments.', 'Objections grouped by frequency.', 'Channel-by-channel evidence.']
      },
      {
        weekNumber: 4,
        objective: 'Correct one primary constraint, run a focused second test, and make a disciplined decision.',
        priorities: ['Select the largest constraint.', 'Make one evidence-backed revision.', 'Run a second acquisition test.', 'Compile the evidence.', 'Choose continue, revise, pivot, or stop.'],
        milestone: 'A documented decision supported by observable evidence.',
        successMetrics: ['Commitment rate.', 'Qualified conversations.', 'Acquisition effort per prospect.', 'Expected delivery cost and gross margin.', 'Final decision recorded.']
      }
    ],
    finalDecisionCriteria: [
      { decision: 'continue', condition: 'Repeated qualified buyers show recent pain, at least one meaningful commitment exists, and delivery appears repeatable within the risk limits.', nextAction: 'Run another focused paid-pilot batch before broad automation.' },
      { decision: 'revise', condition: 'The buyer and problem remain credible, but one constraint—offer, trust, channel, copy, delivery, or price—blocks action.', nextAction: 'Change one constraint and run a smaller controlled test.' },
      { decision: 'pivot', condition: 'Evidence supports a related problem or customer, but the current buyer/problem pair or business model does not produce commitment.', nextAction: 'Preserve the evidence, define the new hypothesis, and issue a separate bounded test.' },
      { decision: 'stop', condition: 'Qualified buyers cannot be reached, do not report recent pain, reject the transparent paid ask, and show no credible workaround budget.', nextAction: 'Archive the evidence and redirect effort to a sharper opportunity.' }
    ]
  },
  es: {
    biggestRiskFallback: customer => `No crezcas hasta que ${customer} calificados tomen una acción real.`,
    validationObjectiveFallback: (customer, offerName) => `En 30 días, descubre si ${customer} calificados van a interesarse, conversar y hacer un compromiso real con ${offerName}.`,
    continueEvidence: ['Varios compradores calificados describen un problema reciente que les duele.', 'Al menos un comprador paga, deja un depósito, firma o toma otra acción seria de compra.', 'Puedes entregar el primer resultado con el esfuerzo y el costo que planificaste.', 'Al menos un camino para conseguir clientes se puede repetir.'],
    stopEvidence: ['No puedes llegar a compradores calificados después de probar los canales con honestidad.', 'Los compradores no describen un problema reciente que les importe.', 'La petición de pago clara no logra compromisos ni te enseña algo más claro.', 'La entrega requiere un costo, tiempo, riesgo o capacidad que no es realista o que no tienes.'],
    weeklyMilestones: [
      {
        weekNumber: 1,
        objective: 'Activa el Launch Site Starter y verifica el cliente inicial, el problema, la oferta, el precio y las prioridades para llegar a clientes.',
        priorities: ['Revisa el sitio que ya preparamos.', 'Compara tus suposiciones con conversaciones públicas de clientes.', 'Escoge cinco canales de clientes prioritarios.', 'Prepara el primer grupo de mensajes.'],
        milestone: 'Una oferta clara y visible con un cliente, un problema, un piloto, una idea de precio y cinco canales de acceso en orden de prioridad.',
        successMetrics: ['Versión 1 del Launch Site Starter guardada.', 'Una definición del cliente.', 'Un problema principal.', 'Una oferta inicial.', 'Cinco canales prioritarios escogidos.']
      },
      {
        weekNumber: 2,
        objective: 'Publica el sitio, comparte material útil y empieza conversaciones con clientes calificados.',
        priorities: ['Publica el sitio o compártelo en privado.', 'Usa los mensajes que ya preparamos.', 'Publica los posts útiles uno y dos.', 'Anota las palabras exactas y las objeciones de los compradores.'],
        milestone: 'La oferta está visible y empezaron las conversaciones con clientes calificados.',
        successMetrics: ['Página publicada o compartida en privado.', 'Medición activa.', 'Grupo de mensajes completado.', 'Conversaciones calificadas agendadas.', 'Dos posts útiles publicados.']
      },
      {
        weekNumber: 3,
        objective: 'Pídeles a compradores calificados un compromiso real e identifica el obstáculo más grande para cerrar ventas.',
        priorities: ['Envía invitaciones claras al piloto.', 'Prueba el precio inicial.', 'Contacta socios que complementan tu oferta.', 'Compara resultados por canal.', 'Anota los compromisos.'],
        milestone: 'Tienes evidencia de lo que la gente hace, no halagos.',
        successMetrics: ['Respuestas calificadas.', 'Conversaciones de compra.', 'Depósitos, pagos o compromisos serios.', 'Objeciones agrupadas por frecuencia.', 'Evidencia canal por canal.']
      },
      {
        weekNumber: 4,
        objective: 'Corrige un obstáculo principal, haz una segunda prueba enfocada y toma una decisión con disciplina.',
        priorities: ['Escoge el obstáculo más grande.', 'Haz un ajuste con respaldo de evidencia.', 'Haz una segunda prueba para conseguir clientes.', 'Junta la evidencia.', 'Escoge seguir, ajustar, cambiar de rumbo o parar.'],
        milestone: 'Una decisión documentada con evidencia que se puede observar.',
        successMetrics: ['Tasa de compromiso.', 'Conversaciones calificadas.', 'Esfuerzo para conseguir cada prospecto.', 'Costo de entrega esperado y margen bruto.', 'Decisión final anotada.']
      }
    ],
    finalDecisionCriteria: [
      { decision: 'continue', condition: 'Varios compradores calificados muestran un dolor reciente, hay al menos un compromiso real y la entrega parece repetible dentro de los límites de riesgo.', nextAction: 'Haz otro grupo enfocado de pilotos pagados antes de automatizar en grande.' },
      { decision: 'revise', condition: 'El comprador y el problema siguen siendo creíbles, pero un obstáculo (oferta, confianza, canal, texto, entrega o precio) frena la acción.', nextAction: 'Cambia un obstáculo y haz una prueba más pequeña y controlada.' },
      { decision: 'pivot', condition: 'La evidencia apunta a un problema o cliente relacionado, pero la pareja actual de comprador y problema, o el modelo de negocio, no logra compromisos.', nextAction: 'Guarda la evidencia, define la nueva idea a probar y haz una prueba aparte y limitada.' },
      { decision: 'stop', condition: 'No puedes llegar a compradores calificados, no reportan un dolor reciente, rechazan la petición de pago clara y no muestran un presupuesto creíble para lo que usan hoy.', nextAction: 'Archiva la evidencia y enfoca tu esfuerzo en una oportunidad más clara.' }
    ]
  }
};

/* ------------------------------------------------------------------------ */
/* Daily Execution Packets (launchBlueprintDailyExecution.ts)                */
/* ------------------------------------------------------------------------ */

export interface DailyContentContext {
  customer: string;
  problem: string | undefined;
  q1Offer: string | undefined;
  canonicalOffer: string;
  commitment: string;
  firstAction: string;
  price: string;
  offerName: string;
  interview: CustomerInterviewGuide;
  brief: FoundingCustomerPilotBrief;
  offerGuide: OfferConversationGuide;
  landing: {
    headline: string;
    subheadline: string;
    problemSection: string;
    offerDescription: string;
    pricePresentation: string;
    primaryCallToAction: string;
  };
}

/** Messages and documents the founder sends to buyers: written in the buyer language. */
export interface DailyBuyerCopy {
  discovery: (customer: string, problem: string | undefined) => string;
  discoveryFollowUp: string;
  replyTransition: string;
  pilotBrief: (brief: FoundingCustomerPilotBrief) => string;
  paidInvitation: (input: { offerName: string; problem: string | undefined; q1Offer: string | undefined; price: string; deliverables: string[]; proofBoundary: string }) => string;
  valueFollowUp: (problem: string | undefined) => string;
  deliveryCoverNote: (offerName: string) => string;
  feedback: string;
  secondTest: (problem: string | undefined) => string;
}

export interface DailyFounderCopy {
  titles: string[];
  assetNames: string[];
  dayContent: (c: DailyContentContext, m: DailyBuyerCopy) => Record<number, string>;
  canonicalContext: (input: { customer: string; problem: string | undefined; offerName: string; promise: string; price: string }) => string;
  actionContracts: (input: { customer: string; problem: string | undefined; offer: string; price: string; requested: string; batchSize: number }) => Array<[string, string, string[]]>;
  rationale: (customer: string, problem: string, offer: string, price: string, objective: string) => string;
  branch: {
    checkpointCondition: (failure: string) => string;
    checkpointAction: (threshold: string) => string;
    checkpointEvidence: string[];
    condition: (failure: string) => string;
    action: (nextDay: number) => string;
    evidence: string[];
  };
  targets: {
    offerRule: string;
    offerExcluded: string[];
    buyerRule: string;
    buyerExcluded: string[];
    evidenceName: string;
    evidenceRule: string;
    evidenceExcluded: string[];
    launchSiteRule: string;
    launchSiteExcluded: string[];
    fulfillmentName: (offerName: string) => string;
    fulfillmentRule: string;
    fulfillmentExcluded: string[];
    deliveredName: string;
    deliveredRule: string;
    deliveredExcluded: string[];
  };
  objectives: (input: { customer: string; problem: string | undefined; batchSize: number; offerName: string }) => string[];
  thresholds: (input: { successThreshold: string; batchSize: number }) => string[];
  personalizationDescription: (field: string) => string;
  usageInstructions: string;
  initialActionInstruction: (assetTitle: string) => string;
  initialQuantity: (batchDay: boolean) => string;
  expectedOutcome: (assetTitle: string) => string;
  failureDay1: string;
  failureDay4: string;
  failureDefault: (day: number) => string;
  branchFailureDefault: (threshold: string) => string;
  initialCompletion: (day: number, assetTitle: string) => string;
  completion: (day: number, quantity: string, assetTitle: string) => string;
}

const bullets = (items: string[]) => items.map(q => `- ${q}`).join('\n');

export const BLUEPRINT_DAILY_BUYER_COPY: Record<Locale, DailyBuyerCopy> = {
  en: {
    discovery: (customer, problem) => `Hi {{firstName}} — I’m researching how ${customer} handle ${problem}. When did this last affect your work, and what did your team use to catch it? I’m not pitching on this message; a two-sentence reply is useful.`,
    discoveryFollowUp: 'Hi {{firstName}} — a quick “not relevant” or the current alternative your team uses would still help the research. I will not follow up again after this.',
    replyTransition: 'Thanks. Would a 15-minute comparison be useful? I can do {{timeOptionOne}} or {{timeOptionTwo}}.',
    pilotBrief: brief => `# Founding Customer Pilot Brief\n\nProblem: ${brief.problem}\nScope: ${brief.scope}\nDeliverables:\n${brief.deliverables.map(x => `- ${x}`).join('\n')}\nTimeline: ${brief.timeline}\nPrice: ${brief.price}\nProof boundary: ${brief.proofBoundary}\nNext step: ${brief.nextStep}`,
    paidInvitation: i => `Subject: a bounded ${i.offerName} pilot\n\nHi {{firstName}} — based on what you described about ${i.problem}, I can offer this fixed-scope validation-stage pilot: ${i.q1Offer}. The test price is ${i.price}.\n\nIncluded deliverables:\n${i.deliverables.map(item => `- ${item}`).join('\n')}\n\nExplicit boundary: ${i.proofBoundary}\n\nWould you like the one-page brief and a 15-minute scope check? I can do {{timeOptionOne}} or {{timeOptionTwo}}.\n\nIf it is not relevant, a short no or current alternative is useful and I will close the loop.`,
    valueFollowUp: problem => `Hi {{firstName}} — following up on the specific issue you named: ${problem}. The useful next step is to compare the current alternative against the fixed-scope pilot, not to make a broad promise. Would {{timeOptionOne}} or {{timeOptionTwo}} work for a short scope check?`,
    deliveryCoverNote: offerName => `Subject: Your ${offerName} is ready\n\nThe agreed scope is attached. Findings are separated from recommendations; no result is guaranteed. Which finding is most useful, what is missing, and is there a next paid step, referral, or respectful stop?`,
    feedback: 'Hi {{firstName}} — thank you for the pilot. Which result was useful, what was missing, and would a bounded next step be valuable? If not, is there one person with the same recent problem who would be appropriate to ask? A no is useful evidence too.',
    secondTest: problem => `Hi {{firstName}} — I’m testing one narrower approach to ${problem}. Is this a recent issue for your team, and what do you use today?`
  },
  es: {
    discovery: (customer, problem) => `Hola, {{firstName}}. Estoy investigando cómo ${customer} manejan esto: ${problem}. ¿Cuándo fue la última vez que te afectó y qué usaron para resolverlo? No te estoy vendiendo nada con este mensaje; una respuesta de dos oraciones me ayuda mucho.`,
    discoveryFollowUp: 'Hola, {{firstName}}. Un “no aplica” rápido, o decirme qué usan hoy, me ayudaría igual con la investigación. No te vuelvo a escribir después de esto.',
    replyTransition: 'Gracias. ¿Te serviría una comparación de 15 minutos? Puedo {{timeOptionOne}} o {{timeOptionTwo}}.',
    pilotBrief: brief => `# Resumen del piloto para clientes fundadores\n\nProblema: ${brief.problem}\nAlcance: ${brief.scope}\nLo que recibes:\n${brief.deliverables.map(x => `- ${x}`).join('\n')}\nFechas: ${brief.timeline}\nPrecio: ${brief.price}\nLímite de lo que prometemos: ${brief.proofBoundary}\nPróximo paso: ${brief.nextStep}`,
    paidInvitation: i => `Asunto: un piloto limitado de ${i.offerName}\n\nHola, {{firstName}}. Por lo que me contaste sobre ${i.problem}, te puedo ofrecer este piloto de alcance fijo, en etapa de validación: ${i.q1Offer}. El precio de prueba es ${i.price}.\n\nIncluye:\n${i.deliverables.map(item => `- ${item}`).join('\n')}\n\nLímite claro: ${i.proofBoundary}\n\n¿Quieres el resumen de una página y una llamada de 15 minutos para revisar el alcance? Puedo {{timeOptionOne}} o {{timeOptionTwo}}.\n\nSi no te aplica, un “no” corto o decirme qué usas hoy me ayuda, y cierro el tema.`,
    valueFollowUp: problem => `Hola, {{firstName}}. Te escribo sobre el problema específico que mencionaste: ${problem}. El próximo paso útil es comparar lo que usas hoy con el piloto de alcance fijo, no hacer una promesa grande. ¿Te funciona {{timeOptionOne}} o {{timeOptionTwo}} para una llamada corta sobre el alcance?`,
    deliveryCoverNote: offerName => `Asunto: Tu ${offerName} está listo\n\nTe envío el alcance acordado. Los hallazgos están separados de las recomendaciones; no se garantiza ningún resultado. ¿Cuál hallazgo te sirve más, qué falta, y te interesa un próximo paso pagado, recomendar a alguien, o lo dejamos aquí?`,
    feedback: 'Hola, {{firstName}}. Gracias por participar en el piloto. ¿Qué resultado te sirvió, qué faltó y te serviría un próximo paso limitado? Si no, ¿hay alguna persona con el mismo problema reciente a quien sería bueno preguntarle? Un “no” también me ayuda.',
    secondTest: problem => `Hola, {{firstName}}. Estoy probando una forma más específica de resolver esto: ${problem}. ¿Te ha pasado hace poco y qué usas hoy?`
  }
};

const DAILY_FOUNDER_EN: DailyFounderCopy = {
  titles: [
    'Start with the riskiest commitment', 'Qualify the first customer', 'Build the prospect tracker', 'Run the discovery sequence', 'Conduct the interview', 'Score urgency', 'Make the Week 1 decision', 'Map alternatives', 'Prepare the Pilot Brief', 'Prepare price and objections',
    'Run the offer conversation', 'Open the validation site', 'Set the evidence ledger', 'Make the Week 2 review', 'Dry-run purchase to delivery', 'Send the paid invitation', 'Record sales outcomes', 'Send the value follow-up', 'Score open opportunities', 'Confirm onboarding and scope',
    'Deliver and review commitment', 'Request feedback, renewal, or referral', 'Read the truth-labeled scoreboard', 'Revise one constraint', 'Check the delivery economics', 'Plan one-variable second test', 'Run the second-test sequence', 'Calculate unit economics', 'Write the evidence decision', 'Choose the bounded next sprint'
  ],
  assetNames: [
    '48-Hour Evidence Brief', 'Qualification Checklist', 'Prospect Tracker', 'Discovery Sequence', 'Customer Interview Worksheet', 'Urgency Scorecard', 'Week 1 Decision Memo', 'Current Alternatives Map', 'Founding Customer Pilot Brief', 'Pricing and Objection Sheet',
    'Offer Conversation and Follow-up', 'Launch Site Activation Checklist', 'Evidence Capture Checklist', 'Week 2 Offer and Fulfillment Review', 'Purchase-to-Delivery Dry Run', 'Paid Pilot Invitation', 'Sales Outcome Sheet', 'Value Follow-up', 'Close Scorecard', 'Onboarding and Scope Form',
    'Delivery Cover Note and Quality Checklist', 'Feedback, Renewal, and Referral Message', 'Truth-Labeled Scoreboard', 'One-Constraint Revision Worksheet', 'Delivery SOP and Economics Worksheet', 'One-Variable Second Test Plan', 'Second-Test Sequence', 'Unit Economics CSV', 'Evidence Decision Memo', 'Final Decision and Bounded Next Sprint'
  ],
  dayContent: (c, m) => ({
    1: `# 48-Hour Evidence Brief\n\n**Customer:** ${c.customer}\n\n**Problem:** ${c.problem}\n\n**Offer:** ${c.q1Offer}\n\n**Canonical offer:** ${c.canonicalOffer}\n\n**Commitment requested:** ${c.commitment}\n\n## Do this first\n${c.firstAction}\n\nPASS: at least 3 qualified commitments or conversations from the first 10 contacts within 5 business days.\nFAIL: 0 qualified commitments or conversations after the full batch.\nINCONCLUSIVE: 1–2 signals; change one supported constraint.\n\nDo not build broad monitoring, integrations, or automation before commitment evidence.`,
    2: `# Qualification Checklist\n\nA target qualifies only when it matches **${c.customer}**, has experienced **${c.problem}** recently, can describe a current alternative, and can take or influence the requested commitment. Exclude friends, broad audiences, and targets without a recent concrete problem.\n\nRecord: name, role, recent trigger, current alternative, decision authority, and next step.`,
    3: `target_name,role,recent_trigger,current_alternative,qualification_status,source_or_channel,next_step,follow_up_date\n,,,,,,,`,
    4: `# Discovery Sequence\n\n${m.discovery(c.customer, c.problem)}\n\n## Follow-up — after 3 business days\n${m.discoveryFollowUp}\n\n## Reply transition\n${m.replyTransition}\n\n## Stop rule\nAfter this follow-up, do not contact this person again without a new, relevant reason.`,
    5: `# Customer Interview Worksheet\n\nOpening: ${c.interview.opening}\n\n## Problem history\n${bullets(c.interview.problemHistoryQuestions)}\n\n## Last occurrence\n${bullets(c.interview.lastOccurrenceQuestions)}\n\n## Current workaround\n${bullets(c.interview.currentWorkaroundQuestions)}\n\n## Cost and consequence\n${bullets(c.interview.costAndConsequenceQuestions)}\n\n## Buying process\n${bullets(c.interview.buyingProcessQuestions)}\n\n## Existing spending and switching friction\n${bullets(c.interview.existingSpendingQuestions.concat(c.interview.switchingFrictionQuestions))}\n\n## Close\n${bullets(c.interview.closingAndReferralQuestions)}\n\nCapture exact words, incident, alternative, consequence, authority, and referral. Do not present the offer until the problem is understood.`,
    6: `# Urgency Scorecard\n\nScore each conversation 0–2 for: recent occurrence, consequence, existing spend, decision authority, access, and willingness to change.\n\n12–9: qualified, make a transparent ask. 8–5: learn more. 4–0: do not increase outreach volume.`,
    7: `# Week 1 Decision Memo\n\nQualified targets: \nReplies: \nInterviews: \nRecent incidents: \nNamed alternatives: \nExact quote: \nMain constraint: \n\nDecision: CONTINUE | NARROW | REVISE | PAUSE\n\nEvidence reason: \nOwner and due action: \n\nIf 10 qualified messages produce 0 replies, stop volume and revise access, customer, or opening. If replies show no recent pain, revise the problem before more copy.`,
    8: `# Current Alternatives Map\n\nFor each qualified buyer: current alternative, what it costs, where it fails, switching friction, and the exact language they use.\n\nDo not call an alternative weak without customer evidence.`,
    9: m.pilotBrief(c.brief),
    10: `# Pricing and Objection Sheet\n\nPrice hypothesis: ${c.price}\n\n| Objection | Truthful response | Evidence to record | Next action |\n|---|---|---|---|\n| Price | Compare the bounded scope and customer consequence; do not discount before diagnosis. | Exact price words | Test scope only if price is the dominant recorded constraint. |\n| Trust | State the validation-stage proof boundary; do not invent results. | Proof requested | Offer the Pilot Brief. |\n| Scope | Restate inclusions and exclusions. | Missing deliverable | Revise one scope variable. |\n| Timing | Ask for the recent trigger and dated next step. | Trigger/date | Follow up once. |\n| Fit | Confirm buyer, problem, and authority. | Qualification gap | Stop or refer. |\n\nFor every objection record exact words, category, evidence strength, and one next experiment.`,
    11: `# Offer Conversation and Follow-up\n\nOpening: ${c.offerGuide.opening}\n\nProblem confirmation:\n${c.offerGuide.problemConfirmation.map(x => `- ${x}`).join('\n')}\n\nOffer: ${c.offerGuide.offerExplanation}\n\nScope:\n${c.offerGuide.scopeConfirmation.map(x => `- ${x}`).join('\n')}\n\nPrice: ${c.offerGuide.pricePresentation}\n\nObjections:\n${c.offerGuide.objectionCapture.map(x => `- ${x}`).join('\n')}\n\nCommitment request: ${c.offerGuide.commitmentRequest}\n\nFollow-up: ${c.offerGuide.followUpAgreement}`,
    12: `# Launch Site Activation Checklist\n\n## Canonical page copy\nHeadline: ${c.landing.headline}\n\nSubheadline: ${c.landing.subheadline}\n\nProblem: ${c.landing.problemSection}\n\nOffer: ${c.landing.offerDescription}\n\nPrice: ${c.landing.pricePresentation}\n\nCTA: ${c.landing.primaryCallToAction}\n\nOpen the existing validation-stage Launch Site from the Blueprint account. Confirm every field above matches; record the URL, source code, and any changed claim. Publish or share privately only after claims match recorded evidence.`,
    13: `# Evidence Capture Checklist\n\nFor each action record: contact or channel, date, action, exact response, customer language, alternative, objection, commitment requested/received, revenue, founder minutes, direct cost, follow-up, and evidence strength.`,
    14: `# Week 2 Offer and Fulfillment Review\n\nConversations: \nTransparent asks: \nAlternatives: \nObjections: \nScope understood: \nFounder hours (must be <= 6 unless lane guardrail says otherwise): \nDirect cost: \nPrice response: \n\nDecision: MAKE ASK | REDUCE COMMITMENT | REVISE SCOPE | PAUSE\n\nMake one variable change only, tied to named evidence.`,
    15: `# Purchase-to-Delivery Dry Run\n\nWalk one qualified scenario through: qualification → written scope → payment/commitment → required buyer inputs → delivery start → first useful result → evidence review. Stop if scope, permissions, capacity, or direct cost is unknown.`,
    16: `# Paid Pilot Invitation\n\n${m.paidInvitation({ offerName: c.offerName, problem: c.problem, q1Offer: c.q1Offer, price: c.price, deliverables: c.brief.deliverables, proofBoundary: c.brief.proofBoundary })}`,
    17: `# Sales Outcome Sheet\n\nProspect: \nQualified: yes/no\nAsk made: \nOutcome: accepted | declined | delayed | referral | no response\nExact objection: \nCommitment: \nRevenue: \nNext action and date:`,
    18: `# Value Follow-up\n\n${m.valueFollowUp(c.problem)}`,
    19: `# Close Scorecard\n\nCount qualified opportunities, asks, accepts, declines, delays, referrals, and no responses. Name the dominant constraint using exact evidence. Do not call a lead “lost” without recording the outcome.`,
    20: `# Onboarding and Scope Form\n\nBuyer: \nRecent problem: \nAgreed scope: \nExclusions: \nPrice/commitment: \nRequired inputs: \nTimeline: \nFirst useful result: \nApproval contact: \nEvidence to capture:`,
    21: `# Delivery Cover Note and Quality Checklist\n\n${m.deliveryCoverNote(c.offerName)}\n\nQuality check: scope complete; customer inputs received; findings labeled; founder hours and direct cost recorded; no unsupported claim.`,
    22: `# Feedback, Renewal, and Referral Message\n\n${m.feedback}`,
    23: `# Truth-Labeled Scoreboard\n\nVERIFIED: payments, deposits, accepted scope, exact buyer quotes.\nINFERRED: likely constraint or channel fit.\nTEST: next assumption.\n\nNever convert an inferred explanation into a verified claim without evidence.`,
    24: `# One-Constraint Revision Worksheet\n\nConstraint: customer | urgency | access | trust | offer | fulfillment | price | message\nEvidence: \nSingle variable to change: \nWhat remains unchanged: \nSuccess threshold: \nFailure threshold: \nNext test date:`,
    25: `# Delivery SOP and Economics Worksheet\n\nStep,owner,minutes,direct_cost,quality_check\nQualification,,,\nScope confirmation,,,\nDelivery,,,\nReview,,,\n\nDo not scale acquisition if direct cost plus founder labor exceeds the Blueprint guardrail.`,
    26: `# One-Variable Second Test Plan\n\nHypothesis: \nChange only: \nKeep constant: customer, problem, evidence method\nBatch size: 10 qualified targets\nMessage: \nSuccess: \nFailure: \nStop rule:`,
    27: `# Second-Test Sequence\n\nMessage: ${m.secondTest(c.problem)}\n\nFollow-up after 3 business days: a current alternative or “not relevant” is enough; no more follow-up after this.\n\nRecord results before changing another variable.`,
    28: `metric,value,evidence\nqualified_conversations,,\ntransparent_asks,,\ncommitments,,\nrevenue_cents,,\nfounder_minutes,,\nvariable_cost_cents,,`,
    29: `# Evidence Decision Memo\n\nBehavioral evidence: \nConversations: \nAsks: \nCommitments: \nRevenue: \nFounder hours: \nDirect cost: \nLargest unknown: \nMain constraint: \n\nDecision: CONTINUE | REVISE | PIVOT | PAUSE | STOP\n\nReason and next bounded test:`,
    30: `# Final Decision and Bounded Next Sprint\n\nAllowed decision: CONTINUE | CONTINUE WITH REVISION | PIVOT CUSTOMER | PIVOT PROBLEM | PIVOT OFFER | PAUSE FOR MISSING EVIDENCE | STOP\n\nBehavioral evidence: \nUnknown: \nConstraint: \nOne next objective: \nThree milestones: \nFive actions: \nObservable stop rule: \n\nThe next irreversible build decision is not justified until the selected commitment evidence exists.`
  }),
  canonicalContext: i => `Canonical commercial context\nCustomer: ${i.customer}\nProblem: ${i.problem}\nOffer: ${i.offerName} — ${i.promise}\nPrice boundary: ${i.price}`,
  actionContracts: ({ customer, problem, offer, price, requested, batchSize }) => [
    ['Send the exact Q1 discovery message to each selected buyer before changing the offer.', `${batchSize} qualified targets matching ${customer}; record all ${batchSize}; PASS requires the Q1 commitment threshold within the validation window.`, [`Buyer name and qualification fields for all ${batchSize}`, 'Dated first-message record for the full batch', 'Qualified conversation or commitment count']],
    ['Apply every qualification field before a prospect enters the active batch.', `${batchSize} candidate targets matching ${customer} reviewed; each must show a recent instance of ${problem}, a current alternative, and decision authority.`, [`${batchSize} completed qualification records`, 'Recent incident and current alternative per buyer', 'Authority or influence note per buyer']],
    ['Create the working prospect tracker from the qualified buyers only.', `${batchSize} qualified buyer records with owner, next step, and follow-up date.`, ['Tracker export or screenshot', `${batchSize} dated buyer rows`, 'Qualification source for each row']],
    ['Send the finished discovery message and one permitted follow-up to the qualified batch.', `${batchSize} qualified buyers; one first message each and one follow-up only after 3 business days.`, [`Send dates for all ${batchSize}`, 'Reply text or no-response outcome', 'Follow-up date and stop-rule compliance']],
    ['Run problem interviews without presenting the pilot before the problem is understood.', '2 qualified buyer interviews of 15 minutes each.', ['Dated interview notes', 'Last incident and current alternative', 'Exact buyer language and authority signal']],
    ['Score urgency from observed interview evidence before making a price ask.', '2 scored buyers; identify any buyer scoring 9/12 or higher.', ['Completed scorecards', 'Component scores and rationale', 'Named high-urgency buyer or no-ask decision']],
    ['Write the Week 1 decision from the recorded batch rather than optimism.', `One memo using all ${batchSize} outreach outcomes and the two interview records.`, ['Counts for messages, replies, and interviews', 'One exact buyer quote', 'Named constraint, decision, owner, and due date']],
    ['Map the alternatives buyers actually name and the friction to switching.', '2 qualified buyers with a named alternative and barrier each.', ['Alternative names', 'Exact cost or consequence language', 'Switching barrier by buyer']],
    ['Turn the evidence into one bounded pilot brief before any price presentation.', `1 buyer-ready ${offer} brief with scope, exclusions, ${price} price boundary, and next step.`, ['Completed pilot brief', 'Scope and exclusion confirmation', 'Price boundary and buyer-ready next step']],
    ['Ask qualified buyers about the canonical offer and price boundary; do not ask generic respondents.', `3 qualified buyer price conversations matching ${customer}; one transparent ${offer} and ${price} presentation in each.`, ['Three qualified buyer identities', 'Exact price words and objection category', 'Offer/price presentation and dated next step']],
    ['Use the completed conversation guide to make one transparent commitment request.', '1 qualified buyer receives the canonical scope, price boundary, and commitment request.', ['Buyer qualification record', 'Exact scope and price presented', 'Commitment response and follow-up date']],
    ['Compare the existing validation Launch Site to the canonical commercial ledger before sharing it.', '1 URL and source-code review; every customer, problem, offer, price, and CTA claim matches or is logged as changed.', ['Validation-site URL', 'Source-code or rendered-copy capture', 'Each changed claim and correction decision']],
    ['Record every observed action in the evidence ledger before interpreting results.', 'All completed actions from Days 1-12 have a dated ledger entry.', ['Ledger rows for each action', 'Exact response or observed behavior', 'Evidence source and next action']],
    ['Choose one Week 2 change from behavior, not multiple simultaneous edits.', '1 review with 3 qualified conversations, 1 transparent ask, and founder plan at or below 6 hours.', ['Conversation and ask counts', 'Founder-hours plan', 'One variable, evidence, owner, and date']],
    ['Walk a qualified buyer scenario through payment to first useful result manually.', '1 dry run covering scope, permission, capacity, direct cost, and delivery handoff.', ['Dry-run timestamp and scenario', 'Unknowns found or explicit none', 'Owner for each resolved gap']],
    ['Send the paid pilot invitation only to qualified buyers with the canonical scope and price.', `3 qualified prospects matching ${customer} receive one ${offer} invitation at ${price} with the requested commitment: ${requested}.`, ['Three qualified recipient records', 'Invitation send dates and exact price', 'Accept, decline, delay, or no-response outcome']],
    ['Classify each paid ask without inflating pipeline status.', 'Every paid invitation sent has one dated outcome classification.', ['Prospect and qualification status', 'Outcome and exact objection', 'Commitment/revenue field and next date']],
    ['Send one value-specific follow-up only where a qualified buyer has an open next step.', 'One follow-up for each interested qualified prospect; no repeated chase sequence.', ['Interested buyer identity', 'Specific prior problem referenced', 'Follow-up date and reply or stop result']],
    ['Close, continue, refer, or stop each open qualified opportunity using the evidence ledger.', 'Every open qualified opportunity has one status and dated next action.', ['Opportunity status list', 'Dominant constraint with exact evidence', 'Owner and date for every continuation']],
    ['Confirm written scope and buyer responsibilities before any manual delivery begins.', '1 accepted-scope record with buyer, exclusions, price, inputs, timeline, and approval contact.', ['Accepted scope record', 'Buyer inputs and approval contact', 'Price/commitment and delivery date']],
    [`Deliver the bounded ${offer} and review the buyer commitment without unsupported outcome claims.`, '1 fulfillment run with completed scope, feedback request, founder hours, and direct cost.', ['Delivery checklist', 'Buyer feedback or delivery receipt', 'Founder labor and direct-cost fields']],
    ['Ask a delivered buyer for useful feedback, renewal, referral, or a respectful no.', '1 delivered buyer receives one feedback request.', ['Delivered buyer identity', 'Feedback/referral/renewal response', 'Respectful stop or next-step date']],
    ['Separate verified behavior, inference, and the next test in the scoreboard.', '1 scoreboard with at least one item in VERIFIED, INFERRED, and TEST.', ['Verified source references', 'Inference label and rationale', 'Next test and owner']],
    ['Revise only the constraint supported by the evidence scoreboard.', '1 documented constraint and exactly 1 changed variable.', ['Constraint and supporting evidence', 'Unchanged controls', 'Success and failure thresholds with test date']],
    ['Calculate whether manual fulfillment can support the canonical price before acquiring more buyers.', '1 SOP with labor minutes, direct cost, price, and gross-margin result.', ['Labor minutes by step', 'Direct-cost field by step', 'Price, margin calculation, and scale/stop decision']],
    ['Design the next test so exactly one variable changes against the same customer and problem.', `1 plan with ${batchSize} qualified buyers, one changed variable, constants, and stop rule.`, ['Hypothesis and changed variable', `${batchSize}-buyer batch definition`, 'Success, failure, and stop rule']],
    ['Run the second-test message sequence without changing a second variable mid-batch.', `${batchSize} qualified buyers receive the controlled message and permitted follow-up.`, [`${batchSize} send records`, 'Controlled message version', 'Reply/outcome ledger and stop-rule result']],
    ['Calculate revenue, founder time, and direct cost from dated ledger entries.', '1 complete unit-economics row using actual commitments, revenue, minutes, and costs.', ['Revenue or zero-revenue evidence', 'Founder-minute total', 'Direct-cost total and calculation source']],
    ['Choose the allowed commercial decision from the full evidence ledger.', '1 decision memo naming behavior, unknown, constraint, and next bounded test.', ['Behavioral count and evidence references', 'Largest remaining unknown', 'Allowed decision and rationale']],
    ['Write the next sprint or a stop record without treating inference as proof.', '1 bounded sprint with 3 milestones, 5 actions, and one observable stop rule.', ['Decision evidence references', 'Three milestones and five actions', 'Observable stop rule and owner']]
  ],
  rationale: (customer, problem, offer, price, objective) => `For ${customer} facing ${problem}, use ${offer} at ${price}; ${objective}`,
  branch: {
    checkpointCondition: failure => `FAIL when ${failure}`,
    checkpointAction: threshold => `Do not increase activity volume. Compare the recorded result with “${threshold}”, name one constraint, and revise only that constraint.`,
    checkpointEvidence: ['Dated outcome count', 'Exact buyer or delivery evidence', 'Named owner and next date'],
    condition: failure => `IF ${failure}`,
    action: nextDay => `Keep the original asset visible, record the contradiction, and route one bounded revision to Day ${nextDay}.`,
    evidence: ['Named target or internal record', 'Exact observed outcome', 'Dated next action']
  },
  targets: {
    offerRule: 'Use the canonical offer, scope, price boundary, and proof boundary only.',
    offerExcluded: ['Unapproved discounts', 'Unsupported guarantees'],
    buyerRule: 'Select 10 people with a recent concrete problem, current alternative, and potential decision authority.',
    buyerExcluded: ['Friends giving hypothetical feedback', 'Broad or anonymous traffic'],
    evidenceName: 'Recorded execution evidence',
    evidenceRule: 'Use only dated ledger entries, exact buyer language, commitments, revenue, hours, and costs.',
    evidenceExcluded: ['Hypothetical interest', 'Unrecorded activity'],
    launchSiteRule: 'Open the founder-owned validation Launch Site and compare only the canonical offer, price, CTA, and recorded claims.',
    launchSiteExcluded: ['A new public site', 'Unrecorded claims'],
    fulfillmentName: offerName => `${offerName} manual fulfillment`,
    fulfillmentRule: 'Use an accepted written scope, buyer inputs, price boundary, and the manual fulfillment plan only.',
    fulfillmentExcluded: ['Unaccepted scope', 'Unsupported guarantee', 'Unrecorded direct cost'],
    deliveredName: 'Delivered qualified pilot buyer',
    deliveredRule: 'Use only a buyer who received the bounded pilot or record a respectful stop when no delivery occurred.',
    deliveredExcluded: ['Unqualified contact', 'Undelivered prospect']
  },
  objectives: ({ customer, problem, batchSize, offerName }) => [
    'Use the Q1 first action to create the first commitment evidence.', `Select only buyers matching ${customer} with recent evidence of ${problem} and decision authority.`, `Create a trackable batch of ${batchSize} qualified prospects.`, 'Send a finished discovery sequence to the qualified batch.', 'Learn recent problem behavior without pitching.', 'Rank urgency before making the paid ask.', 'Decide whether access, customer, or opening is the largest Week 1 constraint.', 'Compare named current alternatives and switching friction.', `Prepare a bounded ${offerName} pilot brief before presenting price.`, 'Capture price, trust, scope, and timing objections verbatim.',
    'Make a transparent scope-and-price conversation possible.', 'Verify the existing validation site carries the canonical offer and CTA.', 'Make every outreach and conversation observable in the ledger.', 'Choose the one evidence-backed Week 2 offer or fulfillment change.', 'Prove the founder can take a payment through first useful result manually.', 'Ask qualified prospects to buy the bounded pilot.', 'Classify every paid ask outcome without inventing pipeline status.', 'Follow up with a specific useful reason and dated next step.', 'Choose whether to close, continue, refer, or stop each open opportunity.', 'Confirm written scope and buyer responsibilities before delivery.',
    `Deliver the bounded ${offerName} and review commitment plus economics.`, 'Ask for evidence-backed feedback, renewal, referral, or a respectful no.', 'Separate verified behavior from inference and next tests.', 'Change exactly one supported constraint.', 'Check whether manual fulfillment is viable before acquiring more buyers.', 'Design a controlled second test with one changed variable.', 'Run the second-test batch without changing another variable.', 'Calculate revenue, time, and direct-cost evidence.', 'Select the allowed decision from accumulated behavioral evidence.', 'Write the bounded next sprint or an explicit stop record.'
  ],
  thresholds: ({ successThreshold, batchSize }) => [
    successThreshold, `${batchSize} targets meet all qualification fields.`, `${batchSize} dated prospect records with qualification evidence.`, '3 qualified replies or 2 interviews after the full batch and follow-up.', '2 interviews with recent incident, alternative, and exact language.', 'At least 2 targets score 9/12 or higher for urgency.', 'A CONTINUE, NARROW, REVISE, or PAUSE memo names counts and one owner.', 'Two recurring alternatives and switching barriers recorded.', 'One buyer-ready brief with scope, exclusions, price, and next step.', 'Every objection is classified from at least 3 conversations.',
    'One qualified prospect receives a transparent scope, price, and commitment request.', 'Site copy, offer, price boundary, and CTA exactly match canonical fields.', 'All activity has an evidence-ledger entry with exact outcome.', '3 qualified conversations, 1 transparent ask, and <=6 founder hours planned.', 'One completed dry run reveals no unknown scope, permissions, capacity, or cost.', 'At least 3 transparent paid invitations sent to qualified prospects.', 'Every paid invitation has one classified outcome and dated next action.', 'All interested prospects receive one value-specific follow-up.', 'Every open opportunity is closed, continued, referred, or stopped with evidence.', 'One accepted scope has buyer inputs, owner, timeline, and exclusions.',
    'Delivery is complete with buyer feedback, founder hours, and direct cost recorded.', 'One feedback request is sent after delivery or a respectful stop is recorded.', 'Scoreboard has verified, inferred, and test items with sources.', 'One constraint and one changed variable are documented.', 'Founder labor plus direct cost remains within the gross-margin guardrail.', `Second test names one hypothesis, constant fields, a ${batchSize}-buyer batch, and stop rule.`, 'Second batch has a complete message, follow-up, and results.', 'Revenue, founder minutes, and direct cost are calculated from ledger entries.', 'Decision memo names behavioral evidence, unknown, and next bounded test.', 'Next sprint has 3 milestones, 5 actions, and an observable stop rule.'
  ],
  personalizationDescription: field => `Founder-supplied ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`,
  usageInstructions: 'Open the finished asset, use it only with its declared canonical target, record the listed evidence, and save the working copy without changing the canonical Blueprint.',
  initialActionInstruction: title => `Use “${title}” with the named target and record the result before interpreting it.`,
  initialQuantity: batchDay => batchDay ? '10 qualified targets' : '1 completed operating action',
  expectedOutcome: title => `${title} is used and an evidence record exists.`,
  failureDay1: '0 qualified conversations or commitments after the full batch.',
  failureDay4: 'Zero qualified replies after the full batch and follow-up.',
  failureDefault: day => `The stated Day ${day} threshold is not met with dated evidence.`,
  branchFailureDefault: threshold => `no dated evidence satisfies ${threshold}`,
  initialCompletion: (day, title) => `Day ${day} is complete only when “${title}” is used with its named target and the evidence ledger contains the exact outcome, count, source, and next action.`,
  completion: (day, quantity, title) => `Day ${day} is complete only when ${quantity.toLowerCase()} is completed, the finished “${title}” is used, and the day-specific evidence is recorded in the evidence ledger.`
};

const ES_FIELD_LABELS: Record<string, string> = {
  firstName: 'el nombre de la persona',
  timeOptionOne: 'la primera opción de horario',
  timeOptionTwo: 'la segunda opción de horario'
};

const DAILY_FOUNDER_ES: DailyFounderCopy = {
  titles: [
    'Empieza con el compromiso más arriesgado', 'Califica al primer cliente', 'Arma tu lista de prospectos', 'Envía la secuencia de descubrimiento', 'Haz la entrevista', 'Mide la urgencia', 'Toma la decisión de la Semana 1', 'Mapea las alternativas', 'Prepara el resumen del piloto', 'Prepara el precio y las objeciones',
    'Ten la conversación de la oferta', 'Abre el sitio de validación', 'Prepara tu registro de evidencia', 'Haz la revisión de la Semana 2', 'Ensaya de la compra a la entrega', 'Envía la invitación pagada', 'Anota los resultados de venta', 'Envía el seguimiento de valor', 'Evalúa las oportunidades abiertas', 'Confirma el arranque y el alcance',
    'Entrega y revisa el compromiso', 'Pide comentarios, renovación o referidos', 'Lee el marcador con etiquetas de verdad', 'Ajusta un solo obstáculo', 'Revisa los números de la entrega', 'Planifica una segunda prueba de una variable', 'Envía la secuencia de la segunda prueba', 'Calcula los números por cliente', 'Escribe la decisión con evidencia', 'Escoge el próximo sprint limitado'
  ],
  assetNames: [
    'Resumen de evidencia de 48 horas', 'Lista para calificar', 'Lista de prospectos', 'Secuencia de descubrimiento', 'Hoja de entrevista con clientes', 'Tabla de urgencia', 'Memo de decisión de la Semana 1', 'Mapa de alternativas actuales', 'Resumen del piloto para clientes fundadores', 'Hoja de precio y objeciones',
    'Conversación de la oferta y seguimiento', 'Lista para activar el Launch Site', 'Lista para registrar evidencia', 'Revisión de oferta y entrega de la Semana 2', 'Ensayo de la compra a la entrega', 'Invitación al piloto pagado', 'Hoja de resultados de venta', 'Seguimiento de valor', 'Tabla de cierre', 'Formulario de arranque y alcance',
    'Nota de entrega y lista de calidad', 'Mensaje de comentarios, renovación y referidos', 'Marcador con etiquetas de verdad', 'Hoja para ajustar un obstáculo', 'Pasos de entrega y hoja de números', 'Plan de segunda prueba de una variable', 'Secuencia de la segunda prueba', 'CSV de números por cliente', 'Memo de decisión con evidencia', 'Decisión final y próximo sprint limitado'
  ],
  dayContent: (c, m) => ({
    1: `# Resumen de evidencia de 48 horas\n\n**Cliente:** ${c.customer}\n\n**Problema:** ${c.problem}\n\n**Oferta:** ${c.q1Offer}\n\n**Oferta oficial del plan:** ${c.canonicalOffer}\n\n**Compromiso que pides:** ${c.commitment}\n\n## Haz esto primero\n${c.firstAction}\n\nPASA: al menos 3 compromisos o conversaciones calificadas de los primeros 10 contactos en 5 días laborables.\nFALLA: 0 compromisos o conversaciones calificadas después de todo el grupo.\nNO CONCLUYENTE: 1–2 señales; cambia un solo obstáculo que tenga respaldo.\n\nNo construyas monitoreo amplio, integraciones ni automatización antes de tener evidencia de compromiso.`,
    2: `# Lista para calificar\n\nUna persona califica solo si encaja con **${c.customer}**, vivió esto hace poco: **${c.problem}**, puede describir lo que usa hoy y puede tomar o influir en el compromiso que pides. Deja fuera a amigos, audiencias amplias y personas sin un problema concreto reciente.\n\nAnota: nombre, rol, qué lo provocó hace poco, lo que usa hoy, quién decide y próximo paso.`,
    3: `target_name,role,recent_trigger,current_alternative,qualification_status,source_or_channel,next_step,follow_up_date\n,,,,,,,`,
    4: `# Secuencia de descubrimiento\n\n${m.discovery(c.customer, c.problem)}\n\n## Seguimiento — después de 3 días laborables\n${m.discoveryFollowUp}\n\n## Si te responden\n${m.replyTransition}\n\n## Regla para parar\nDespués de este seguimiento, no vuelvas a contactar a esta persona sin una razón nueva y relevante.`,
    5: `# Hoja de entrevista con clientes\n\nCómo empezar: ${c.interview.opening}\n\n## Historia del problema\n${bullets(c.interview.problemHistoryQuestions)}\n\n## La última vez\n${bullets(c.interview.lastOccurrenceQuestions)}\n\n## Lo que usan hoy\n${bullets(c.interview.currentWorkaroundQuestions)}\n\n## Costo y consecuencia\n${bullets(c.interview.costAndConsequenceQuestions)}\n\n## Cómo compran\n${bullets(c.interview.buyingProcessQuestions)}\n\n## Lo que ya gastan y lo que frena el cambio\n${bullets(c.interview.existingSpendingQuestions.concat(c.interview.switchingFrictionQuestions))}\n\n## Cierre\n${bullets(c.interview.closingAndReferralQuestions)}\n\nAnota las palabras exactas, lo que pasó, la alternativa, la consecuencia, quién decide y el referido. No presentes la oferta hasta entender el problema.`,
    6: `# Tabla de urgencia\n\nDale a cada conversación de 0 a 2 puntos en: pasó hace poco, consecuencia, gasto actual, poder de decisión, acceso y ganas de cambiar.\n\n12–9: califica, haz una petición clara. 8–5: aprende más. 4–0: no aumentes la cantidad de mensajes.`,
    7: `# Memo de decisión de la Semana 1\n\nPersonas calificadas: \nRespuestas: \nEntrevistas: \nCasos recientes: \nAlternativas que mencionaron: \nCita exacta: \nObstáculo principal: \n\nDecisión: SEGUIR | ENFOCAR | AJUSTAR | PAUSAR\n\nRazón con evidencia: \nResponsable y acción con fecha: \n\nSi 10 mensajes calificados reciben 0 respuestas, no envíes más y ajusta el acceso, el cliente o el mensaje inicial. Si las respuestas no muestran un dolor reciente, ajusta el problema antes de escribir más textos.`,
    8: `# Mapa de alternativas actuales\n\nPara cada comprador calificado: lo que usa hoy, cuánto le cuesta, dónde falla, qué le frena para cambiar y las palabras exactas que usa.\n\nNo digas que una alternativa es débil sin evidencia de los clientes.`,
    9: m.pilotBrief(c.brief),
    10: `# Hoja de precio y objeciones\n\nPrecio que vas a probar: ${c.price}\n\n| Objeción | Respuesta honesta | Evidencia a anotar | Próxima acción |\n|---|---|---|---|\n| Precio | Compara el alcance limitado con la consecuencia para el cliente; no des descuento antes de entender el problema. | Palabras exactas sobre el precio | Prueba otro alcance solo si el precio es el obstáculo principal que anotaste. |\n| Confianza | Explica el límite de lo que puedes prometer en etapa de validación; no inventes resultados. | Prueba que pidieron | Ofrece el resumen del piloto. |\n| Alcance | Repite lo que incluye y lo que no. | Lo que echan de menos | Ajusta una sola parte del alcance. |\n| Momento | Pregunta qué lo provocó hace poco y acuerda un próximo paso con fecha. | Detonante/fecha | Da seguimiento una vez. |\n| Encaje | Confirma comprador, problema y quién decide. | Lo que falta para calificar | Para o refiere. |\n\nPara cada objeción anota las palabras exactas, el tipo, qué tan fuerte es la evidencia y un próximo experimento.`,
    11: `# Conversación de la oferta y seguimiento\n\nCómo empezar: ${c.offerGuide.opening}\n\nConfirma el problema:\n${c.offerGuide.problemConfirmation.map(x => `- ${x}`).join('\n')}\n\nOferta: ${c.offerGuide.offerExplanation}\n\nAlcance:\n${c.offerGuide.scopeConfirmation.map(x => `- ${x}`).join('\n')}\n\nPrecio: ${c.offerGuide.pricePresentation}\n\nObjeciones:\n${c.offerGuide.objectionCapture.map(x => `- ${x}`).join('\n')}\n\nPetición de compromiso: ${c.offerGuide.commitmentRequest}\n\nSeguimiento: ${c.offerGuide.followUpAgreement}`,
    12: `# Lista para activar el Launch Site\n\n## Texto oficial de la página\nTítulo: ${c.landing.headline}\n\nSubtítulo: ${c.landing.subheadline}\n\nProblema: ${c.landing.problemSection}\n\nOferta: ${c.landing.offerDescription}\n\nPrecio: ${c.landing.pricePresentation}\n\nBotón: ${c.landing.primaryCallToAction}\n\nAbre desde tu cuenta del Blueprint el Launch Site de validación que ya existe. Confirma que cada campo de arriba coincide; anota el URL, el código fuente y cualquier promesa que cambió. Publícalo o compártelo en privado solo cuando las promesas coincidan con la evidencia anotada.`,
    13: `# Lista para registrar evidencia\n\nPara cada acción anota: contacto o canal, fecha, acción, respuesta exacta, palabras del cliente, alternativa, objeción, compromiso pedido/recibido, ingresos, tus minutos, costo directo, seguimiento y qué tan fuerte es la evidencia.`,
    14: `# Revisión de oferta y entrega de la Semana 2\n\nConversaciones: \nPeticiones claras: \nAlternativas: \nObjeciones: \nEntendieron el alcance: \nTus horas (deben ser <= 6, a menos que el límite de tu modelo diga otra cosa): \nCosto directo: \nRespuesta al precio: \n\nDecisión: HACER LA PETICIÓN | PEDIR MENOS COMPROMISO | AJUSTAR EL ALCANCE | PAUSAR\n\nCambia una sola cosa, ligada a evidencia concreta.`,
    15: `# Ensayo de la compra a la entrega\n\nRecorre un caso calificado por: calificar → alcance por escrito → pago/compromiso → información que necesitas del comprador → inicio de la entrega → primer resultado útil → revisión de evidencia. Para si no sabes el alcance, los permisos, la capacidad o el costo directo.`,
    16: `# Invitación al piloto pagado\n\n${m.paidInvitation({ offerName: c.offerName, problem: c.problem, q1Offer: c.q1Offer, price: c.price, deliverables: c.brief.deliverables, proofBoundary: c.brief.proofBoundary })}`,
    17: `# Hoja de resultados de venta\n\nProspecto: \nCalificado: sí/no\nPetición hecha: \nResultado: aceptó | rechazó | pospuso | referido | sin respuesta\nObjeción exacta: \nCompromiso: \nIngresos: \nPróxima acción y fecha:`,
    18: `# Seguimiento de valor\n\n${m.valueFollowUp(c.problem)}`,
    19: `# Tabla de cierre\n\nCuenta oportunidades calificadas, peticiones, aceptaciones, rechazos, posposiciones, referidos y quienes no respondieron. Nombra el obstáculo principal con evidencia exacta. No digas que un prospecto se “perdió” sin anotar el resultado.`,
    20: `# Formulario de arranque y alcance\n\nComprador: \nProblema reciente: \nAlcance acordado: \nExclusiones: \nPrecio/compromiso: \nInformación necesaria: \nFechas: \nPrimer resultado útil: \nContacto que aprueba: \nEvidencia a registrar:`,
    21: `# Nota de entrega y lista de calidad\n\n${m.deliveryCoverNote(c.offerName)}\n\nRevisión de calidad: alcance completo; información del cliente recibida; hallazgos marcados; tus horas y el costo directo anotados; ninguna promesa sin respaldo.`,
    22: `# Mensaje de comentarios, renovación y referidos\n\n${m.feedback}`,
    23: `# Marcador con etiquetas de verdad\n\nVERIFICADO: pagos, depósitos, alcance aceptado, citas exactas de compradores.\nINFERIDO: obstáculo o canal que probablemente encaja.\nPRUEBA: próxima suposición.\n\nNunca conviertas una explicación inferida en un hecho verificado sin evidencia.`,
    24: `# Hoja para ajustar un obstáculo\n\nObstáculo: cliente | urgencia | acceso | confianza | oferta | entrega | precio | mensaje\nEvidencia: \nLa única cosa que vas a cambiar: \nLo que no cambia: \nMeta de éxito: \nLímite de fracaso: \nFecha de la próxima prueba:`,
    25: `# Pasos de entrega y hoja de números\n\nPaso,responsable,minutos,costo_directo,revision_de_calidad\nCalificar,,,\nConfirmar el alcance,,,\nEntrega,,,\nRevisión,,,\n\nNo inviertas en conseguir más clientes si el costo directo más tu trabajo pasan del límite del Blueprint.`,
    26: `# Plan de segunda prueba de una variable\n\nIdea a probar: \nCambia solo: \nMantén igual: cliente, problema, forma de medir la evidencia\nTamaño del grupo: 10 personas calificadas\nMensaje: \nÉxito: \nFracaso: \nRegla para parar:`,
    27: `# Secuencia de la segunda prueba\n\nMensaje: ${m.secondTest(c.problem)}\n\nSeguimiento después de 3 días laborables: basta con que te digan qué usan hoy o “no aplica”; no hay más seguimiento después de esto.\n\nAnota los resultados antes de cambiar otra cosa.`,
    28: `metric,value,evidence\nqualified_conversations,,\ntransparent_asks,,\ncommitments,,\nrevenue_cents,,\nfounder_minutes,,\nvariable_cost_cents,,`,
    29: `# Memo de decisión con evidencia\n\nEvidencia de lo que la gente hizo: \nConversaciones: \nPeticiones: \nCompromisos: \nIngresos: \nTus horas: \nCosto directo: \nLo que más falta saber: \nObstáculo principal: \n\nDecisión: SEGUIR | AJUSTAR | CAMBIAR DE RUMBO | PAUSAR | PARAR\n\nRazón y próxima prueba limitada:`,
    30: `# Decisión final y próximo sprint limitado\n\nDecisiones permitidas: SEGUIR | SEGUIR CON AJUSTES | CAMBIAR DE CLIENTE | CAMBIAR DE PROBLEMA | CAMBIAR DE OFERTA | PAUSAR POR FALTA DE EVIDENCIA | PARAR\n\nEvidencia de lo que la gente hizo: \nLo que no sabes: \nObstáculo: \nUn próximo objetivo: \nTres metas intermedias: \nCinco acciones: \nRegla para parar que se pueda observar: \n\nTodavía no se justifica una decisión de construir algo que no puedas deshacer, hasta que tengas la evidencia de compromiso que escogiste.`
  }),
  canonicalContext: i => `Contexto comercial del plan\nCliente: ${i.customer}\nProblema: ${i.problem}\nOferta: ${i.offerName} — ${i.promise}\nLímite de precio: ${i.price}`,
  actionContracts: ({ customer, problem, offer, price, requested, batchSize }) => [
    ['Envía el mensaje de descubrimiento exacto a cada comprador escogido antes de cambiar la oferta.', `${batchSize} personas calificadas que encajan con ${customer}; anota las ${batchSize}; PASA si logras la meta de compromiso de tu primera acción dentro del periodo de validación.`, [`Nombre y datos para calificar de los ${batchSize} compradores`, 'Registro con fecha del primer mensaje a todo el grupo', 'Conteo de conversaciones o compromisos calificados']],
    ['Aplica cada criterio para calificar antes de que un prospecto entre al grupo activo.', `${batchSize} posibles compradores que encajan con ${customer} revisados; cada uno debe mostrar un caso reciente de esto: ${problem}, una alternativa que usa hoy y poder de decisión.`, [`${batchSize} registros para calificar completos`, 'Caso reciente y alternativa actual de cada comprador', 'Nota de poder o influencia de cada comprador']],
    ['Crea tu lista de prospectos solo con los compradores calificados.', `${batchSize} registros de compradores calificados con responsable, próximo paso y fecha de seguimiento.`, ['Exportación o captura de pantalla de la lista', `${batchSize} filas de compradores con fecha`, 'De dónde salió la calificación de cada fila']],
    ['Envía el mensaje de descubrimiento listo y un solo seguimiento permitido al grupo calificado.', `${batchSize} compradores calificados; un primer mensaje a cada uno y un solo seguimiento después de 3 días laborables.`, [`Fechas de envío de los ${batchSize}`, 'Texto de la respuesta o resultado sin respuesta', 'Fecha del seguimiento y cumplimiento de la regla para parar']],
    ['Haz entrevistas sobre el problema sin presentar el piloto antes de entender el problema.', '2 entrevistas de 15 minutos con compradores calificados.', ['Notas de entrevista con fecha', 'Último caso y alternativa que usan hoy', 'Palabras exactas del comprador y señal de quién decide']],
    ['Mide la urgencia con lo que viste en las entrevistas antes de pedir un precio.', '2 compradores evaluados; identifica a cualquiera con 9/12 o más.', ['Tablas completadas', 'Puntos por criterio y razón', 'Comprador con urgencia alta, o decisión de no pedir todavía']],
    ['Escribe la decisión de la Semana 1 con el grupo anotado, no con optimismo.', `Un memo con los ${batchSize} resultados de los mensajes y las dos entrevistas.`, ['Conteo de mensajes, respuestas y entrevistas', 'Una cita exacta de un comprador', 'Obstáculo, decisión, responsable y fecha']],
    ['Mapea las alternativas que los compradores de verdad mencionan y lo que les frena para cambiar.', '2 compradores calificados con una alternativa y una barrera cada uno.', ['Nombres de las alternativas', 'Palabras exactas sobre costo o consecuencia', 'Barrera para cambiar de cada comprador']],
    ['Convierte la evidencia en un resumen de piloto limitado antes de presentar un precio.', `1 resumen de ${offer} listo para el comprador, con alcance, exclusiones, límite de precio de ${price} y próximo paso.`, ['Resumen del piloto completo', 'Confirmación de alcance y exclusiones', 'Límite de precio y próximo paso listo para el comprador']],
    ['Pregúntales a compradores calificados sobre la oferta oficial y el límite de precio; no le preguntes a cualquiera.', `3 conversaciones de precio con compradores calificados que encajan con ${customer}; una presentación clara de ${offer} y ${price} en cada una.`, ['Identidad de tres compradores calificados', 'Palabras exactas sobre el precio y tipo de objeción', 'Presentación de oferta/precio y próximo paso con fecha']],
    ['Usa la guía de conversación completa para hacer una petición de compromiso clara.', '1 comprador calificado recibe el alcance oficial, el límite de precio y la petición de compromiso.', ['Registro para calificar al comprador', 'Alcance y precio exactos que presentaste', 'Respuesta al compromiso y fecha de seguimiento']],
    ['Compara el Launch Site de validación que ya existe con el registro comercial oficial antes de compartirlo.', '1 revisión del URL y del código; cada promesa sobre cliente, problema, oferta, precio y botón coincide o queda anotada como cambiada.', ['URL del sitio de validación', 'Captura del código o del texto que se ve', 'Cada promesa cambiada y la corrección que decidiste']],
    ['Anota cada acción observada en el registro de evidencia antes de interpretar resultados.', 'Todas las acciones completadas de los Días 1-12 tienen una entrada con fecha en el registro.', ['Filas del registro para cada acción', 'Respuesta exacta o comportamiento observado', 'Fuente de la evidencia y próxima acción']],
    ['Escoge un solo cambio para la Semana 2 basado en lo que la gente hizo, no varios cambios a la vez.', '1 revisión con 3 conversaciones calificadas, 1 petición clara y tu plan en 6 horas o menos.', ['Conteo de conversaciones y peticiones', 'Plan de tus horas', 'Una sola cosa a cambiar, evidencia, responsable y fecha']],
    ['Recorre a mano un caso de comprador calificado desde el pago hasta el primer resultado útil.', '1 ensayo que cubre alcance, permisos, capacidad, costo directo y entrega.', ['Hora y caso del ensayo', 'Lo desconocido que encontraste, o “nada”', 'Responsable de cada problema resuelto']],
    ['Envía la invitación al piloto pagado solo a compradores calificados, con el alcance y el precio oficiales.', `3 prospectos calificados que encajan con ${customer} reciben una invitación a ${offer} por ${price} con el compromiso que pides: ${requested}.`, ['Registro de tres destinatarios calificados', 'Fechas de envío y precio exacto', 'Resultado: aceptó, rechazó, pospuso o no respondió']],
    ['Clasifica cada petición de pago sin inflar cómo van tus ventas.', 'Cada invitación pagada que enviaste tiene un resultado clasificado con fecha.', ['Prospecto y si califica', 'Resultado y objeción exacta', 'Campo de compromiso/ingreso y próxima fecha']],
    ['Envía un solo seguimiento de valor, y solo donde un comprador calificado tiene un próximo paso abierto.', 'Un seguimiento por cada prospecto calificado interesado; sin perseguir con mensajes repetidos.', ['Identidad del comprador interesado', 'Problema específico que mencionó antes', 'Fecha del seguimiento y respuesta, o cierre']],
    ['Cierra, sigue, refiere o para cada oportunidad calificada abierta usando el registro de evidencia.', 'Cada oportunidad calificada abierta tiene un estado y una próxima acción con fecha.', ['Lista de estados de las oportunidades', 'Obstáculo principal con evidencia exacta', 'Responsable y fecha de cada oportunidad que sigue']],
    ['Confirma el alcance por escrito y las responsabilidades del comprador antes de empezar cualquier entrega a mano.', '1 registro de alcance aceptado con comprador, exclusiones, precio, información necesaria, fechas y contacto que aprueba.', ['Registro de alcance aceptado', 'Información del comprador y contacto que aprueba', 'Precio/compromiso y fecha de entrega']],
    [`Entrega la versión limitada de ${offer} y revisa el compromiso del comprador sin prometer resultados sin respaldo.`, '1 entrega con alcance completo, pedido de comentarios, tus horas y el costo directo.', ['Lista de la entrega', 'Comentarios del comprador o recibo de entrega', 'Campos de tu trabajo y del costo directo']],
    ['Pídele a un comprador que ya recibió la entrega comentarios útiles, renovar, un referido o un “no” respetuoso.', '1 comprador que recibió la entrega recibe un pedido de comentarios.', ['Identidad del comprador que recibió la entrega', 'Respuesta de comentarios/referido/renovación', 'Cierre respetuoso o fecha del próximo paso']],
    ['Separa en el marcador lo verificado, lo inferido y la próxima prueba.', '1 marcador con al menos un punto en VERIFICADO, INFERIDO y PRUEBA.', ['Referencias de las fuentes verificadas', 'Etiqueta de lo inferido y la razón', 'Próxima prueba y responsable']],
    ['Ajusta solo el obstáculo que tiene respaldo en el marcador de evidencia.', '1 obstáculo documentado y exactamente 1 cosa cambiada.', ['Obstáculo y evidencia que lo respalda', 'Lo que se mantiene igual', 'Metas de éxito y de fracaso con fecha de prueba']],
    ['Calcula si la entrega a mano puede sostener el precio oficial antes de buscar más compradores.', '1 lista de pasos con minutos de trabajo, costo directo, precio y margen bruto.', ['Minutos de trabajo por paso', 'Costo directo por paso', 'Precio, cálculo del margen y decisión de crecer o parar']],
    ['Diseña la próxima prueba para que cambie exactamente una cosa, con el mismo cliente y el mismo problema.', `1 plan con ${batchSize} compradores calificados, una cosa cambiada, lo que se mantiene igual y una regla para parar.`, ['Idea a probar y lo que cambia', `Definición del grupo de ${batchSize} compradores`, 'Éxito, fracaso y regla para parar']],
    ['Envía la secuencia de mensajes de la segunda prueba sin cambiar otra cosa a mitad del grupo.', `${batchSize} compradores calificados reciben el mensaje controlado y el seguimiento permitido.`, [`${batchSize} registros de envío`, 'Versión del mensaje controlado', 'Registro de respuestas/resultados y resultado de la regla para parar']],
    ['Calcula los ingresos, tu tiempo y el costo directo con las entradas del registro que tienen fecha.', '1 fila completa de números por cliente con compromisos, ingresos, minutos y costos reales.', ['Ingresos, o evidencia de cero ingresos', 'Total de tus minutos', 'Total del costo directo y de dónde sale el cálculo']],
    ['Escoge la decisión comercial permitida con todo el registro de evidencia.', '1 memo de decisión que nombra lo que la gente hizo, lo que no sabes, el obstáculo y la próxima prueba limitada.', ['Conteo de lo que la gente hizo y referencias de evidencia', 'Lo que más falta saber', 'Decisión permitida y razón']],
    ['Escribe el próximo sprint o un registro de parada sin tratar lo inferido como prueba.', '1 sprint limitado con 3 metas intermedias, 5 acciones y una regla para parar que se pueda observar.', ['Referencias de evidencia de la decisión', 'Tres metas intermedias y cinco acciones', 'Regla para parar observable y responsable']]
  ],
  rationale: (customer, problem, offer, price, objective) => `Cliente: ${customer}. Problema: ${problem}. Oferta: ${offer.replace(/[.!?]+$/, '')}. Precio: ${price}. Por qué este día: ${objective}`,
  branch: {
    checkpointCondition: failure => `FALLA si: ${failure}`,
    checkpointAction: threshold => `No aumentes la actividad. Compara el resultado anotado con “${threshold}”, nombra un obstáculo y ajusta solo ese obstáculo.`,
    checkpointEvidence: ['Conteo de resultados con fecha', 'Evidencia exacta del comprador o de la entrega', 'Responsable y próxima fecha'],
    condition: failure => `SI: ${failure}`,
    action: nextDay => `Deja visible el material original, anota la contradicción y lleva un ajuste limitado al Día ${nextDay}.`,
    evidence: ['Persona o registro interno', 'Resultado exacto que observaste', 'Próxima acción con fecha']
  },
  targets: {
    offerRule: 'Usa solo la oferta, el alcance, el límite de precio y el límite de lo que prometes que son oficiales.',
    offerExcluded: ['Descuentos no aprobados', 'Garantías sin respaldo'],
    buyerRule: 'Escoge 10 personas con un problema concreto reciente, una alternativa que usan hoy y posible poder de decisión.',
    buyerExcluded: ['Amigos que dan opiniones hipotéticas', 'Tráfico amplio o anónimo'],
    evidenceName: 'Evidencia de ejecución anotada',
    evidenceRule: 'Usa solo entradas con fecha del registro, palabras exactas de compradores, compromisos, ingresos, horas y costos.',
    evidenceExcluded: ['Interés hipotético', 'Actividad sin anotar'],
    launchSiteRule: 'Abre tu Launch Site de validación y compara solo la oferta, el precio, el botón y las promesas anotadas que son oficiales.',
    launchSiteExcluded: ['Un sitio público nuevo', 'Promesas sin anotar'],
    fulfillmentName: offerName => `${offerName}: entrega a mano`,
    fulfillmentRule: 'Usa solo un alcance aceptado por escrito, la información del comprador, el límite de precio y el plan de entrega a mano.',
    fulfillmentExcluded: ['Alcance no aceptado', 'Garantía sin respaldo', 'Costo directo sin anotar'],
    deliveredName: 'Comprador calificado que recibió el piloto',
    deliveredRule: 'Usa solo un comprador que recibió el piloto limitado, o anota un cierre respetuoso si no hubo entrega.',
    deliveredExcluded: ['Contacto que no califica', 'Prospecto sin entrega']
  },
  objectives: ({ customer, problem, batchSize, offerName }) => [
    'Usa la primera acción de tu veredicto para crear la primera evidencia de compromiso.', `Escoge solo compradores que encajan con ${customer}, con evidencia reciente de esto: ${problem}, y con poder de decisión.`, `Crea un grupo de ${batchSize} prospectos calificados al que le puedas dar seguimiento.`, 'Envía una secuencia de descubrimiento lista al grupo calificado.', 'Aprende cómo vive la gente el problema hoy, sin vender.', 'Ordena por urgencia antes de pedir un pago.', 'Decide si el acceso, el cliente o el mensaje inicial es el obstáculo más grande de la Semana 1.', 'Compara las alternativas que mencionan y lo que les frena para cambiar.', `Prepara un resumen de piloto limitado de ${offerName} antes de presentar el precio.`, 'Anota palabra por palabra las objeciones de precio, confianza, alcance y momento.',
    'Haz posible una conversación clara de alcance y precio.', 'Verifica que el sitio de validación que ya existe tenga la oferta y el botón oficiales.', 'Haz que cada mensaje y cada conversación se puedan ver en el registro.', 'Escoge el único cambio de oferta o de entrega de la Semana 2 que tiene respaldo de evidencia.', 'Demuestra que puedes cobrar un pago y llegar a mano al primer resultado útil.', 'Pídeles a prospectos calificados que compren el piloto limitado.', 'Clasifica el resultado de cada petición de pago sin inventar cómo van tus ventas.', 'Da seguimiento con una razón útil y específica, y un próximo paso con fecha.', 'Decide si cierras, sigues, refieres o paras cada oportunidad abierta.', 'Confirma el alcance por escrito y las responsabilidades del comprador antes de entregar.',
    `Entrega la versión limitada de ${offerName} y revisa el compromiso y los números.`, 'Pide comentarios con evidencia, renovar, un referido o un “no” respetuoso.', 'Separa lo que la gente hizo de lo que infieres y de las próximas pruebas.', 'Cambia exactamente un obstáculo que tenga respaldo.', 'Revisa si la entrega a mano es viable antes de buscar más compradores.', 'Diseña una segunda prueba controlada en la que cambie una sola cosa.', 'Haz el grupo de la segunda prueba sin cambiar otra cosa.', 'Calcula la evidencia de ingresos, tiempo y costo directo.', 'Escoge la decisión permitida según toda la evidencia de lo que la gente hizo.', 'Escribe el próximo sprint limitado o un registro claro de parada.'
  ],
  thresholds: ({ successThreshold, batchSize }) => [
    successThreshold, `${batchSize} personas cumplen todos los criterios para calificar.`, `${batchSize} registros de prospectos con fecha y evidencia de que califican.`, '3 respuestas calificadas o 2 entrevistas después de todo el grupo y el seguimiento.', '2 entrevistas con un caso reciente, la alternativa y palabras exactas.', 'Al menos 2 personas con 9/12 o más de urgencia.', 'Un memo de SEGUIR, ENFOCAR, AJUSTAR o PAUSAR con conteos y un responsable.', 'Dos alternativas que se repiten y sus barreras para cambiar, anotadas.', 'Un resumen listo para el comprador con alcance, exclusiones, precio y próximo paso.', 'Cada objeción está clasificada, de al menos 3 conversaciones.',
    'Un prospecto calificado recibe un alcance, un precio y una petición de compromiso claros.', 'El texto del sitio, la oferta, el límite de precio y el botón coinciden exactamente con los campos oficiales.', 'Toda la actividad tiene una entrada en el registro de evidencia con el resultado exacto.', '3 conversaciones calificadas, 1 petición clara y <=6 horas tuyas planificadas.', 'Un ensayo completo sin nada desconocido en alcance, permisos, capacidad o costo.', 'Al menos 3 invitaciones pagadas claras enviadas a prospectos calificados.', 'Cada invitación pagada tiene un resultado clasificado y una próxima acción con fecha.', 'Todos los prospectos interesados reciben un seguimiento de valor específico.', 'Cada oportunidad abierta se cerró, sigue, se refirió o se paró, con evidencia.', 'Un alcance aceptado tiene la información del comprador, responsable, fechas y exclusiones.',
    'La entrega está completa con los comentarios del comprador, tus horas y el costo directo anotados.', 'Se envía un pedido de comentarios después de la entrega, o se anota un cierre respetuoso.', 'El marcador tiene puntos verificados, inferidos y de prueba, con fuentes.', 'Un obstáculo y una cosa cambiada están documentados.', 'Tu trabajo más el costo directo se mantienen dentro del límite de margen bruto.', `La segunda prueba nombra una idea a probar, lo que se mantiene igual, un grupo de ${batchSize} compradores y una regla para parar.`, 'El segundo grupo tiene mensaje, seguimiento y resultados completos.', 'Los ingresos, tus minutos y el costo directo están calculados con las entradas del registro.', 'El memo de decisión nombra la evidencia de lo que la gente hizo, lo que no sabes y la próxima prueba limitada.', 'El próximo sprint tiene 3 metas intermedias, 5 acciones y una regla para parar que se puede observar.'
  ],
  personalizationDescription: field => `Lo escribes tú: ${ES_FIELD_LABELS[field] || field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`,
  usageInstructions: 'Abre el material listo, úsalo solo con la persona o meta oficial que indica, anota la evidencia de la lista y guarda tu copia de trabajo sin cambiar el Blueprint oficial.',
  initialActionInstruction: title => `Usa “${title}” con la persona o meta indicada y anota el resultado antes de interpretarlo.`,
  initialQuantity: batchDay => batchDay ? '10 personas calificadas' : '1 acción completada',
  expectedOutcome: title => `Usaste “${title}” y existe un registro de evidencia.`,
  failureDay1: '0 conversaciones o compromisos calificados después de todo el grupo.',
  failureDay4: 'Cero respuestas calificadas después de todo el grupo y el seguimiento.',
  failureDefault: day => `No se cumple la meta del Día ${day} con evidencia con fecha.`,
  branchFailureDefault: threshold => `no hay evidencia con fecha que cumpla esto: ${threshold}`,
  initialCompletion: (day, title) => `El Día ${day} está completo solo cuando usas “${title}” con su persona o meta indicada y el registro de evidencia tiene el resultado, el conteo, la fuente y la próxima acción exactos.`,
  completion: (day, quantity, title) => `El Día ${day} está completo solo cuando cumples esto: ${quantity.charAt(0).toLowerCase()}${quantity.slice(1)} Además, usaste “${title}” y anotaste la evidencia del día en el registro de evidencia.`
};

export const BLUEPRINT_DAILY_FOUNDER_COPY: Record<Locale, DailyFounderCopy> = {
  en: DAILY_FOUNDER_EN,
  es: DAILY_FOUNDER_ES
};

/* ------------------------------------------------------------------------ */
/* Document model, HTML, PDF and ZIP headings (founder language)              */
/* ------------------------------------------------------------------------ */

export interface BlueprintDocumentCopy {
  truthLabel: Record<TruthLabel, string>;
  route: (route: string) => string;
  decision: (decision: string) => string;
  model: {
    currentActivityMissing: string;
    accessGroups: { customer_access: string; market_evidence: string; media_pr: string; partnership: string };
    launchCardTitle: string;
    launchCardWhy: (customer: string) => string;
    firstCustomerTitle: string;
    firstOfferTitle: string;
    firstOfferWhy: (rationale: string, proofBoundary: string) => string;
    firstRevenueTitle: string;
    firstRevenueWhy: (format: string, asks: number, day: number) => string;
    accessTitle: string;
    accessDecision: string;
    accessWhy: string;
    accessEvidence: (input: { community: string; url: string; evidenceDate: string; recency: string; researchDate: string; activity: string; verifiedAt?: string; confidence: string; access: string; risk: string; firstAction: string }) => string;
    todayTitle: (day: number, title: string) => string;
    startingStateTitle: string;
    fulfillmentTitle: string;
    firstRevenueLegacyTitle: string;
    preparedContentTitle: string;
    getMeLiveTitle: string;
    getMeLiveBoundary: (price: string) => string;
    getMeLiveBoundaryToken: string;
    customerLine: (value: string) => string;
    offerLine: (value: string) => string;
    firstCommitmentLine: (value: string) => string;
    fullPlanTitle: string;
    fullPlanDay: (day: number, value: string) => string;
    checkpointsTitle: string;
    sourcesTitle: string;
    canonicalHash: (sha: string) => string;
    revalidateHash: string;
    customerProblemsTitle: string;
    noQuoteYet: string;
    problemLine: (input: { title: string; who: string; when: string; workaround: string }) => string;
    whyThisMatters: (value: string) => string;
    against: (value: string) => string;
    askNext: (value: string) => string;
    changePlan: (value: string) => string;
    researchGap: (input: { community: string; url: string; reason: string }) => string;
  };
  html: {
    lang: string;
    priorityTargets: string;
    targetUrl: string;
    evidenceAndAccess: string;
    riskFirstAction: string;
    sources: string;
    evidenceDated: string;
    unknown: string;
    researched: string;
    currentActivity: string;
    verified: string;
    evidenceConfidence: string;
    path: string;
    resource: string;
    risk: string;
    firstAction: string;
    decision: string;
    why: string;
    evidence: string;
    sourcesSuffix: (refs: string) => string;
    readyAssets: string;
    measurement: string;
    success: string;
    failure: string;
    completeWhen: string;
    capture: string;
    adaptationRule: string;
    adaptation: (condition: string, action: string, route: string, evidence: string) => string;
    for: string;
    customerActions: string;
    footer: string;
  };
  pdf: {
    contract: (version: string) => string;
    page: (n: number) => string;
    continued: string;
    canonical: string;
    for: (customer: string) => string;
    openDownload: string;
    tagline: string;
    priorityDecision: string;
    decision: string;
    why: string;
    evidence: string;
    readyAssets: (title: string) => string;
    useIt: string;
    measurement: string;
    measurementBody: (success: string, failure: string, complete: string, capture: string) => string;
    researchRoles: string;
    researchRolesKicker: string;
    accessTarget: (input: { name: string; role: string; type: string; url: string; evidenceDate: string; recency: string; researchDate: string; activity: string; verifiedAt?: string; confidence: string; access: string; resource: string; risk: string; firstAction: string }) => string;
    adaptationRule: string;
    adaptation: (condition: string, action: string, route: string, evidence: string) => string;
    supportingDetail: string;
    hierarchyTitle: string;
    hierarchyBody: string;
    checkpointsTitle: string;
    checkpointsBody: string;
  };
  zip: {
    readme: (input: { blueprintId: string; schemaVersion: string; contractVersion?: string; sha?: string }) => string;
    initialCustomer: string;
    strongestOpportunity: string;
    biggestRisk: string;
    validationObjective: string;
    launchCard: string;
    firstCustomer: string;
    firstOffer: string;
    firstCommitmentRequest: string;
    firstThreeApproaches: string;
    exactFirstMessage: string;
    startingState: string;
    currentStage: string;
    existingOffer: string;
    existingLandingPage: string;
    previousOutreach: string;
    criticalTests: string;
    failureConsequence: string;
    contractReceipt: string;
    contractVersion: string;
    canonicalSha: string;
    source: string;
    changeRecord: string;
    evidenceManifest: string;
    laneHeading: string;
    lane: string;
    firstMeaningfulTest: string;
    earliestAsk: string;
    day: (n: number) => string;
    revenueHeading: string;
    firstBuyer: string;
    firstChannel: string;
    firstPrice: string;
    targetDay: string;
    minimumAsks: string;
    successThreshold: string;
    firstAsk: string;
    requiredProof: string;
    followUpSequence: string;
    fulfillmentHeading: string;
    expectedDeliveryTime: string;
    capacityPerWeek: string;
    founderHours: string;
    variableCost: string;
    grossMargin: string;
    qualityChecklist: string;
    intentionallyManual: string;
    pilotBrief: string;
    problem: string;
    scope: string;
    timeline: string;
    price: string;
    proofBoundary: string;
    nextStep: string;
    checkpointsHeading: string;
    questions: string;
    evidenceRequired: string;
    branches: string;
    branchLine: (condition: string, action: string) => string;
    hierarchyHeading: string;
    strong: string;
    moderate: string;
    early: string;
    weak: string;
    rankingRule: string;
    testPrice: string;
    deliverables: string;
    positioning: string;
    differentiator: string;
    notFor: string;
    excluded: string;
    purpose: string;
    useWhen: string;
    interviewGuide: string;
    lastOccurrence: string;
    currentWorkaround: string;
    buyingProcess: string;
    offerGuide: string;
    commitmentRequest: string;
    followUpAgreement: string;
    objective: string;
    landingProblem: string;
    landingOffer: string;
    landingPrice: string;
    cta: string;
    landingProofBoundary: string;
    getMeLive: (input: { price: string; customer: string; offer: string; promise: string; firstCommitment: string }) => string;
    ifThen: (condition: string, action: string) => string;
    week: (n: number, objective: string) => string;
    milestone: string;
    metricsEvidence: string[];
    metricsStrength: string[];
    nextAction: string;
    community: {
      whyThisMatters: string;
      who: string;
      when: string;
      workaround: string;
      against: string;
      askNext: string;
      changePlan: string;
      gaps: string;
      title: string;
      noQuote: string;
      helpfulPosts: string;
    };
    currentActivityMissing: string;
  };
}

const ROUTES_ES: Record<string, string> = { continue: 'seguir', revise: 'ajustar', pivot: 'cambiar de rumbo', pause: 'pausar', stop: 'parar' };
const DECISIONS_ES: Record<string, string> = { continue: 'SEGUIR', revise: 'AJUSTAR', pivot: 'CAMBIAR DE RUMBO', stop: 'PARAR', pause: 'PAUSAR' };

export const BLUEPRINT_DOCUMENT_COPY: Record<Locale, BlueprintDocumentCopy> = {
  en: {
    truthLabel: { Verified: 'Verified', Inferred: 'Inferred', Test: 'Test' },
    route: route => route,
    decision: decision => decision.toUpperCase(),
    model: {
      currentActivityMissing: 'Current activity was not independently verified.',
      accessGroups: { customer_access: 'Direct Customer Access', market_evidence: 'Market Evidence', media_pr: 'Media / PR Opportunities', partnership: 'Partnership Opportunities' },
      launchCardTitle: '48-Hour Launch Card',
      launchCardWhy: customer => `Reach ${customer} before building. The first 48 hours produce commitment evidence.`,
      firstCustomerTitle: 'First Customer',
      firstOfferTitle: 'First Offer',
      firstOfferWhy: (rationale, proofBoundary) => `${rationale} Proof boundary: ${proofBoundary}`,
      firstRevenueTitle: 'First Revenue Path',
      firstRevenueWhy: (format, asks, day) => `${format}; ask ${asks} qualified buyers by Day ${day}.`,
      accessTitle: 'Research and Customer Access',
      accessDecision: 'Use Direct Customer Access for first-revenue work. Keep market evidence, media/PR, and partnerships in their own lanes.',
      accessWhy: 'Each target is public and source-linked, but only targets classified as customer_access are eligible to drive direct buyer acquisition.',
      accessEvidence: i => `${i.community} | ${i.url} | evidence dated: ${i.evidenceDate} (${i.recency}) | researched: ${i.researchDate} | current activity: ${i.activity}${i.verifiedAt ? ` verified ${i.verifiedAt}` : ''} | evidence confidence: ${i.confidence} | access: ${i.access} | risk: ${i.risk} | first action: ${i.firstAction}`,
      todayTitle: (day, title) => `Today: Day ${day} — ${title}`,
      startingStateTitle: 'Starting-State and Evidence Audit',
      fulfillmentTitle: 'Manual Fulfillment and Economics',
      firstRevenueLegacyTitle: 'First-Revenue Path',
      preparedContentTitle: 'Prepared Content and Conversations',
      getMeLiveTitle: 'Optional Next Step: Get Me Live',
      getMeLiveBoundary: price => `The $97 30-Day Sprint does not include a live website, domain, publishing, or payment setup. Get Me Live is a separate ${price} one-time product.`,
      getMeLiveBoundaryToken: 'separate $297 one-time product',
      customerLine: value => `Customer: ${value}`,
      offerLine: value => `Offer: ${value}`,
      firstCommitmentLine: value => `First commitment: ${value}`,
      fullPlanTitle: 'Full 30-Day Plan',
      fullPlanDay: (day, value) => `Day ${day}: ${value}`,
      checkpointsTitle: 'Behavioral Evidence Hierarchy and Adaptive Checkpoint Reviews',
      sourcesTitle: 'Sources and Receipt',
      canonicalHash: sha => `Canonical Git blob SHA-1: ${sha}`,
      revalidateHash: 'Every Factory slice must revalidate its exact hash before execution.',
      customerProblemsTitle: 'What Your Likely Customers Are Struggling With',
      noQuoteYet: 'No quote could be checked word for word yet. Start with the interview guide and record what people tell you.',
      problemLine: i => `${i.title}. Who: ${i.who}. When: ${i.when}. How they handle it now: ${i.workaround}.`,
      whyThisMatters: value => `Why this matters: ${value}`,
      against: value => `Against: ${value}`,
      askNext: value => `What to ask next: ${value}`,
      changePlan: value => `What would change the plan: ${value}`,
      researchGap: i => `Research gap: ${i.community} (${i.url}): ${i.reason}`
    },
    html: {
      lang: 'en',
      priorityTargets: 'Priority access targets',
      targetUrl: 'Target / URL',
      evidenceAndAccess: 'Evidence and access',
      riskFirstAction: 'Risk / first action',
      sources: 'Sources: ',
      evidenceDated: 'Evidence dated: ',
      unknown: 'unknown',
      researched: 'Researched: ',
      currentActivity: 'Current activity: ',
      verified: '; verified ',
      evidenceConfidence: 'Evidence confidence: ',
      path: 'Path: ',
      resource: 'Resource: ',
      risk: 'Risk: ',
      firstAction: 'First action: ',
      decision: 'Decision',
      why: 'Why',
      evidence: 'Evidence',
      sourcesSuffix: refs => ` (sources: ${refs})`,
      readyAssets: 'Ready-to-use assets',
      measurement: 'Measurement',
      success: 'Success: ',
      failure: 'Failure: ',
      completeWhen: 'Complete when: ',
      capture: 'Capture: ',
      adaptationRule: 'Adaptation rule',
      adaptation: (condition, action, route, evidence) => `IF ${condition} THEN ${action} (${route}); capture ${evidence}`,
      for: 'For ',
      customerActions: 'Customer actions: Open Blueprint · PDF',
      footer: 'page counter enabled for print'
    },
    pdf: {
      contract: version => `Contract ${version}`,
      page: n => `PAGE ${n}`,
      continued: 'continued',
      canonical: 'CANONICAL V2.1',
      for: customer => `FOR ${customer}`,
      openDownload: 'OPEN BLUEPRINT  /  DOWNLOAD PDF',
      tagline: 'A 30-day evidence-led plan built for action.',
      priorityDecision: 'Priority decision',
      decision: 'Decision',
      why: 'Why',
      evidence: 'Evidence',
      readyAssets: title => `Ready-to-use assets / ${title}`,
      useIt: 'USE IT: ',
      measurement: 'Measurement',
      measurementBody: (success, failure, complete, capture) => `SUCCESS: ${success}\nFAILURE: ${failure}\nCOMPLETE WHEN: ${complete}\nCAPTURE: ${capture}`,
      researchRoles: 'Research Roles',
      researchRolesKicker: 'Customer access / Market evidence / Media-PR / Partnerships',
      accessTarget: i => `${i.name} [${i.role}] (${i.type}) | ${i.url} | EVIDENCE DATED: ${i.evidenceDate} (${i.recency}) | RESEARCHED: ${i.researchDate} | CURRENT ACTIVITY: ${i.activity}${i.verifiedAt ? ` verified ${i.verifiedAt}` : ''} | EVIDENCE CONFIDENCE: ${i.confidence} | ACCESS: ${i.access} | RESOURCE: ${i.resource} | RISK: ${i.risk} | FIRST ACTION: ${i.firstAction}`,
      adaptationRule: 'Adaptation Rule',
      adaptation: (condition, action, route, evidence) => `IF ${condition} THEN ${action} [${route}]. Capture: ${evidence}`,
      supportingDetail: 'Supporting detail',
      hierarchyTitle: 'Behavioral Evidence Hierarchy',
      hierarchyBody: 'Rank observed behavior above stated interest when deciding what to do next.',
      checkpointsTitle: 'Adaptive Checkpoint Reviews',
      checkpointsBody: 'Adaptive Checkpoint Reviews use the recorded evidence at each checkpoint and follow the declared branch.'
    },
    zip: {
      readme: i => `# GhostTown Launch Blueprint\n\nAll files in this package were derived from canonical Blueprint ${i.blueprintId} (${i.schemaVersion}${i.contractVersion ? `, contract ${i.contractVersion}` : ""}). The $97 Sprint does not include a live website. Get Me Live is a separate $297 one-time product; use the Sprint as the strategy and evidence handoff.${i.sha ? `\n\nCanonical source hash: ${i.sha}. Every Factory slice must verify this exact hash before execution.` : ""}\n`,
      initialCustomer: 'Initial customer',
      strongestOpportunity: 'Strongest opportunity',
      biggestRisk: 'Biggest risk',
      validationObjective: 'Validation objective',
      launchCard: '48-Hour Launch Card',
      firstCustomer: 'First customer',
      firstOffer: 'First offer',
      firstCommitmentRequest: 'First commitment request',
      firstThreeApproaches: 'First three approaches',
      exactFirstMessage: 'Exact first message',
      startingState: 'Starting-State and Evidence Audit',
      currentStage: 'Current stage',
      existingOffer: 'Existing offer',
      existingLandingPage: 'Existing landing page',
      previousOutreach: 'Previous outreach',
      criticalTests: 'Critical tests',
      failureConsequence: 'Failure consequence:',
      contractReceipt: 'Canonical contract receipt',
      contractVersion: 'Contract version',
      canonicalSha: 'Canonical Git blob SHA-1',
      source: 'Source',
      changeRecord: 'Change record',
      evidenceManifest: 'Evidence manifest',
      laneHeading: 'Business-Model Execution Lane',
      lane: 'Lane',
      firstMeaningfulTest: 'First meaningful test',
      earliestAsk: 'Earliest commercial ask',
      day: n => `Day ${n}`,
      revenueHeading: 'First-Revenue Path',
      firstBuyer: 'First buyer',
      firstChannel: 'First channel',
      firstPrice: 'First price',
      targetDay: 'Target day',
      minimumAsks: 'Minimum qualified asks',
      successThreshold: 'Success threshold',
      firstAsk: 'First ask',
      requiredProof: 'Required proof',
      followUpSequence: 'Follow-up sequence',
      fulfillmentHeading: 'Manual Fulfillment and Economics',
      expectedDeliveryTime: 'Expected delivery time',
      capacityPerWeek: 'Capacity per week',
      founderHours: 'Founder-hours guardrail',
      variableCost: 'Variable cost',
      grossMargin: 'Gross-margin guardrail',
      qualityChecklist: 'Quality checklist',
      intentionallyManual: 'Intentionally manual during validation',
      pilotBrief: 'Founding Customer Pilot Brief',
      problem: 'Problem',
      scope: 'Scope',
      timeline: 'Timeline',
      price: 'Price',
      proofBoundary: 'Proof boundary',
      nextStep: 'Next step',
      checkpointsHeading: 'Adaptive Evidence Checkpoints',
      questions: 'Questions',
      evidenceRequired: 'Evidence required',
      branches: 'Branches',
      branchLine: (condition, action) => `- If ${condition} Then ${action}`,
      hierarchyHeading: 'Behavioral Evidence Hierarchy',
      strong: 'Strong evidence',
      moderate: 'Moderate evidence',
      early: 'Early evidence',
      weak: 'Weak evidence',
      rankingRule: 'Ranking rule',
      testPrice: 'Test price',
      deliverables: 'Deliverables',
      positioning: 'Positioning',
      differentiator: 'Differentiator',
      notFor: 'Not for',
      excluded: 'Excluded from the first 30 days',
      purpose: 'Purpose',
      useWhen: 'Use when',
      interviewGuide: 'Customer Interview Guide',
      lastOccurrence: 'Last occurrence',
      currentWorkaround: 'Current workaround',
      buyingProcess: 'Buying process',
      offerGuide: 'Offer Conversation Guide',
      commitmentRequest: 'Commitment request',
      followUpAgreement: 'Follow-up agreement',
      objective: 'Objective',
      landingProblem: 'Problem',
      landingOffer: 'Offer',
      landingPrice: 'Price',
      cta: 'CTA',
      landingProofBoundary: 'Validation-stage proof boundary',
      getMeLive: i => `# Get Me Live — optional next step\n\nThe $97 30-Day Sprint does not include a live website, domain, publishing, or payment setup. **Get Me Live is a separate ${i.price} one-time product.**\n\n## Sprint handoff\n\n**Customer:** ${i.customer}\n\n**Offer:** ${i.offer}\n\n**Promise:** ${i.promise}\n\n**First commitment:** ${i.firstCommitment}\n\nUse this validated strategy and evidence only after you choose Get Me Live.\n`,
      ifThen: (condition, action) => `IF ${condition} THEN ${action}`,
      week: (n, objective) => `Week ${n}: ${objective}`,
      milestone: 'Milestone',
      metricsEvidence: ['Recipient, channel, date', 'Reply and source', 'Buyer fit and notes', 'Problem and urgency evidence', 'Commitment type and date', 'Payment record', 'Time log by fulfillment step', 'Direct-cost receipt'],
      metricsStrength: ['activity only', 'early', 'early', 'moderate', 'strong or moderate', 'strong', 'fulfillment evidence', 'fulfillment evidence'],
      nextAction: 'Next action',
      community: {
        whyThisMatters: 'Why this matters',
        who: 'Who',
        when: 'When',
        workaround: 'How they handle it now',
        against: 'What argues against it',
        askNext: 'What to ask next',
        changePlan: 'What would change the plan',
        gaps: 'Research gaps',
        title: 'What your likely customers are struggling with',
        noQuote: 'No quote could be checked word for word yet. Start with the interview guide in outreach-scripts.md.',
        helpfulPosts: 'Helpful posts'
      },
      currentActivityMissing: 'Current activity was not independently verified.'
    }
  },
  es: {
    truthLabel: { Verified: 'Verificado', Inferred: 'Inferido', Test: 'Por probar' },
    route: route => ROUTES_ES[route] || route,
    decision: decision => DECISIONS_ES[decision] || decision.toUpperCase(),
    model: {
      currentActivityMissing: 'No se verificó la actividad actual por separado.',
      accessGroups: { customer_access: 'Acceso directo a clientes', market_evidence: 'Evidencia del mercado', media_pr: 'Oportunidades de medios / prensa', partnership: 'Oportunidades de alianzas' },
      launchCardTitle: 'Tarjeta de lanzamiento de 48 horas',
      launchCardWhy: customer => `Llega a ${customer} antes de construir. Las primeras 48 horas te dan evidencia de compromiso.`,
      firstCustomerTitle: 'Primer cliente',
      firstOfferTitle: 'Primera oferta',
      firstOfferWhy: (rationale, proofBoundary) => `${rationale} Límite de lo que puedes prometer: ${proofBoundary}`,
      firstRevenueTitle: 'Camino al primer ingreso',
      firstRevenueWhy: (format, asks, day) => `${format}; pregúntales a ${asks} compradores calificados no más tarde del Día ${day}.`,
      accessTitle: 'Investigación y acceso a clientes',
      accessDecision: 'Usa el acceso directo a clientes para buscar tu primer ingreso. Deja la evidencia del mercado, los medios/prensa y las alianzas cada una en su carril.',
      accessWhy: 'Cada lugar es público y tiene su fuente, pero solo los marcados como acceso directo a clientes sirven para conseguir compradores directamente.',
      accessEvidence: i => `${i.community} | ${i.url} | fecha de la evidencia: ${i.evidenceDate} (${i.recency}) | investigado: ${i.researchDate} | actividad actual: ${i.activity}${i.verifiedAt ? ` verificada ${i.verifiedAt}` : ''} | confianza en la evidencia: ${i.confidence} | acceso: ${i.access} | riesgo: ${i.risk} | primera acción: ${i.firstAction}`,
      todayTitle: (day, title) => `Hoy: Día ${day} — ${title}`,
      startingStateTitle: 'Tu punto de partida y la evidencia',
      fulfillmentTitle: 'Entrega a mano y números',
      firstRevenueLegacyTitle: 'Camino al primer ingreso (resumen)',
      preparedContentTitle: 'Contenido y conversaciones listos',
      getMeLiveTitle: 'Próximo paso opcional: Get Me Live',
      getMeLiveBoundary: price => `El Sprint de 30 días de $97 no incluye un sitio web en vivo, dominio, publicación ni configuración de pagos. Get Me Live es un producto separado de ${price}, pago único.`,
      getMeLiveBoundaryToken: 'producto separado de $297, pago único',
      customerLine: value => `Cliente: ${value}`,
      offerLine: value => `Oferta: ${value}`,
      firstCommitmentLine: value => `Primer compromiso: ${value}`,
      fullPlanTitle: 'Plan completo de 30 días',
      fullPlanDay: (day, value) => `Día ${day}: ${value}`,
      checkpointsTitle: 'Niveles de evidencia y puntos de control',
      sourcesTitle: 'Fuentes y recibo',
      canonicalHash: sha => `SHA-1 del contrato oficial (Git blob): ${sha}`,
      revalidateHash: 'Cada parte de la Factory tiene que volver a validar este hash exacto antes de ejecutarse.',
      customerProblemsTitle: 'Con qué están luchando tus posibles clientes',
      noQuoteYet: 'Todavía no pudimos verificar ninguna cita palabra por palabra. Empieza con la guía de entrevista y anota lo que la gente te diga.',
      problemLine: i => `${i.title}. Quién: ${i.who}. Cuándo: ${i.when}. Cómo lo resuelven hoy: ${i.workaround}.`,
      whyThisMatters: value => `Por qué importa: ${value}`,
      against: value => `En contra: ${value}`,
      askNext: value => `Qué preguntar después: ${value}`,
      changePlan: value => `Qué cambiaría el plan: ${value}`,
      researchGap: i => `Hueco en la investigación: ${i.community} (${i.url}): ${i.reason}`
    },
    html: {
      lang: 'es',
      priorityTargets: 'Lugares de acceso prioritarios',
      targetUrl: 'Lugar / URL',
      evidenceAndAccess: 'Evidencia y acceso',
      riskFirstAction: 'Riesgo / primera acción',
      sources: 'Fuentes: ',
      evidenceDated: 'Fecha de la evidencia: ',
      unknown: 'desconocida',
      researched: 'Investigado: ',
      currentActivity: 'Actividad actual: ',
      verified: '; verificada ',
      evidenceConfidence: 'Confianza en la evidencia: ',
      path: 'Camino: ',
      resource: 'Recurso: ',
      risk: 'Riesgo: ',
      firstAction: 'Primera acción: ',
      decision: 'Decisión',
      why: 'Por qué',
      evidence: 'Evidencia',
      sourcesSuffix: refs => ` (fuentes: ${refs})`,
      readyAssets: 'Materiales listos para usar',
      measurement: 'Cómo medirlo',
      success: 'Éxito: ',
      failure: 'Fracaso: ',
      completeWhen: 'Completo cuando: ',
      capture: 'Anota: ',
      adaptationRule: 'Regla para ajustar',
      adaptation: (condition, action, route, evidence) => `SI ${condition} ENTONCES ${action} (${route}); anota ${evidence}`,
      for: 'Para ',
      customerActions: 'Acciones: Abrir el Blueprint · PDF',
      footer: 'numeración de páginas activa para imprimir'
    },
    pdf: {
      contract: version => `Contrato ${version}`,
      page: n => `PÁGINA ${n}`,
      continued: 'continúa',
      canonical: 'V2.1 OFICIAL',
      for: customer => `PARA ${customer}`,
      openDownload: 'ABRE EL BLUEPRINT  /  DESCARGA EL PDF',
      tagline: 'Un plan de 30 días basado en evidencia, hecho para actuar.',
      priorityDecision: 'Decisión prioritaria',
      decision: 'Decisión',
      why: 'Por qué',
      evidence: 'Evidencia',
      readyAssets: title => `Materiales listos para usar / ${title}`,
      useIt: 'CÓMO USARLO: ',
      measurement: 'Cómo medirlo',
      measurementBody: (success, failure, complete, capture) => `ÉXITO: ${success}\nFRACASO: ${failure}\nCOMPLETO CUANDO: ${complete}\nANOTA: ${capture}`,
      researchRoles: 'Tipos de investigación',
      researchRolesKicker: 'Acceso a clientes / Evidencia del mercado / Medios-prensa / Alianzas',
      accessTarget: i => `${i.name} [${i.role}] (${i.type}) | ${i.url} | FECHA DE LA EVIDENCIA: ${i.evidenceDate} (${i.recency}) | INVESTIGADO: ${i.researchDate} | ACTIVIDAD ACTUAL: ${i.activity}${i.verifiedAt ? ` verificada ${i.verifiedAt}` : ''} | CONFIANZA EN LA EVIDENCIA: ${i.confidence} | ACCESO: ${i.access} | RECURSO: ${i.resource} | RIESGO: ${i.risk} | PRIMERA ACCIÓN: ${i.firstAction}`,
      adaptationRule: 'Regla para ajustar',
      adaptation: (condition, action, route, evidence) => `SI ${condition} ENTONCES ${action} [${route}]. Anota: ${evidence}`,
      supportingDetail: 'Detalle de apoyo',
      hierarchyTitle: 'Niveles de evidencia',
      hierarchyBody: 'Lo que la gente hace pesa más que lo que dice que le interesa cuando decides qué hacer después.',
      checkpointsTitle: 'Puntos de control',
      checkpointsBody: 'En cada punto de control usas la evidencia que anotaste y sigues el camino que ya definiste.'
    },
    zip: {
      readme: i => `# GhostTown Launch Blueprint\n\nTodos los archivos de este paquete salen del Blueprint oficial ${i.blueprintId} (${i.schemaVersion}${i.contractVersion ? `, contrato ${i.contractVersion}` : ""}). El Sprint de $97 no incluye un sitio web en vivo. Get Me Live es un producto separado de $297, pago único; usa el Sprint como tu estrategia y tu evidencia para ese paso.${i.sha ? `\n\nHash de la fuente oficial: ${i.sha}. Cada parte de la Factory tiene que verificar este hash exacto antes de ejecutarse.` : ""}\n`,
      initialCustomer: 'Cliente inicial',
      strongestOpportunity: 'Mayor oportunidad',
      biggestRisk: 'Mayor riesgo',
      validationObjective: 'Objetivo de validación',
      launchCard: 'Tarjeta de lanzamiento de 48 horas',
      firstCustomer: 'Primer cliente',
      firstOffer: 'Primera oferta',
      firstCommitmentRequest: 'Primer compromiso que pides',
      firstThreeApproaches: 'Tus primeros tres acercamientos',
      exactFirstMessage: 'Primer mensaje exacto',
      startingState: 'Tu punto de partida y la evidencia',
      currentStage: 'Etapa actual',
      existingOffer: 'Oferta que ya tienes',
      existingLandingPage: 'Página de aterrizaje que ya tienes',
      previousOutreach: 'Contactos anteriores',
      criticalTests: 'Pruebas críticas',
      failureConsequence: 'Si falla:',
      contractReceipt: 'Recibo del contrato oficial',
      contractVersion: 'Versión del contrato',
      canonicalSha: 'SHA-1 del contrato oficial (Git blob)',
      source: 'Fuente',
      changeRecord: 'Registro de cambios',
      evidenceManifest: 'Lista de evidencia',
      laneHeading: 'Modelo de negocio para ejecutar',
      lane: 'Modelo',
      firstMeaningfulTest: 'Primera prueba que cuenta',
      earliestAsk: 'Primera petición comercial',
      day: n => `Día ${n}`,
      revenueHeading: 'Camino al primer ingreso',
      firstBuyer: 'Primer comprador',
      firstChannel: 'Primer canal',
      firstPrice: 'Primer precio',
      targetDay: 'Día meta',
      minimumAsks: 'Mínimo de peticiones calificadas',
      successThreshold: 'Meta de éxito',
      firstAsk: 'Primera petición',
      requiredProof: 'Prueba que necesitas',
      followUpSequence: 'Secuencia de seguimiento',
      fulfillmentHeading: 'Entrega a mano y números',
      expectedDeliveryTime: 'Tiempo de entrega esperado',
      capacityPerWeek: 'Capacidad por semana',
      founderHours: 'Límite de tus horas',
      variableCost: 'Costo variable',
      grossMargin: 'Límite de margen bruto',
      qualityChecklist: 'Lista de calidad',
      intentionallyManual: 'A mano a propósito durante la validación',
      pilotBrief: 'Resumen del piloto para clientes fundadores',
      problem: 'Problema',
      scope: 'Alcance',
      timeline: 'Fechas',
      price: 'Precio',
      proofBoundary: 'Límite de lo que puedes prometer',
      nextStep: 'Próximo paso',
      checkpointsHeading: 'Puntos de control de evidencia',
      questions: 'Preguntas',
      evidenceRequired: 'Evidencia requerida',
      branches: 'Caminos',
      branchLine: (condition, action) => `- Si ${condition} Entonces ${action}`,
      hierarchyHeading: 'Niveles de evidencia',
      strong: 'Evidencia fuerte',
      moderate: 'Evidencia moderada',
      early: 'Evidencia temprana',
      weak: 'Evidencia débil',
      rankingRule: 'Regla para ordenar',
      testPrice: 'Precio de prueba',
      deliverables: 'Lo que entregas',
      positioning: 'Posicionamiento',
      differentiator: 'Lo que te hace diferente',
      notFor: 'No es para',
      excluded: 'Fuera de los primeros 30 días',
      purpose: 'Para qué',
      useWhen: 'Cuándo usarlo',
      interviewGuide: 'Guía de entrevista con clientes',
      lastOccurrence: 'La última vez',
      currentWorkaround: 'Lo que usan hoy',
      buyingProcess: 'Cómo compran',
      offerGuide: 'Guía de conversación de la oferta',
      commitmentRequest: 'Petición de compromiso',
      followUpAgreement: 'Acuerdo de seguimiento',
      objective: 'Objetivo',
      landingProblem: 'Problema',
      landingOffer: 'Oferta',
      landingPrice: 'Precio',
      cta: 'Botón (CTA)',
      landingProofBoundary: 'Límite de lo que puedes prometer en etapa de validación',
      getMeLive: i => `# Get Me Live — próximo paso opcional\n\nEl Sprint de 30 días de $97 no incluye un sitio web en vivo, dominio, publicación ni configuración de pagos. **Get Me Live es un producto separado de ${i.price}, pago único.**\n\n## Lo que pasa del Sprint\n\n**Cliente:** ${i.customer}\n\n**Oferta:** ${i.offer}\n\n**Promesa:** ${i.promise}\n\n**Primer compromiso:** ${i.firstCommitment}\n\nUsa esta estrategia y esta evidencia solo después de escoger Get Me Live.\n`,
      ifThen: (condition, action) => `SI ${condition} ENTONCES ${action}`,
      week: (n, objective) => `Semana ${n}: ${objective}`,
      milestone: 'Meta de la semana',
      metricsEvidence: ['Destinatario, canal, fecha', 'Respuesta y fuente', 'Si el comprador encaja y notas', 'Evidencia del problema y la urgencia', 'Tipo de compromiso y fecha', 'Registro del pago', 'Registro de tiempo por paso de la entrega', 'Recibo del costo directo'],
      metricsStrength: ['solo actividad', 'temprana', 'temprana', 'moderada', 'fuerte o moderada', 'fuerte', 'evidencia de entrega', 'evidencia de entrega'],
      nextAction: 'Próxima acción',
      community: {
        whyThisMatters: 'Por qué importa',
        who: 'Quién',
        when: 'Cuándo',
        workaround: 'Cómo lo resuelven hoy',
        against: 'Lo que va en contra',
        askNext: 'Qué preguntar después',
        changePlan: 'Qué cambiaría el plan',
        gaps: 'Huecos en la investigación',
        title: 'Con qué están luchando tus posibles clientes',
        noQuote: 'Todavía no pudimos verificar ninguna cita palabra por palabra. Empieza con la guía de entrevista en outreach-scripts.md.',
        helpfulPosts: 'Posts útiles'
      },
      currentActivityMissing: 'No se verificó la actividad actual por separado.'
    }
  }
};
