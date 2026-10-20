import type { BusinessDnaType, EvaluationResult, RiskLevel, ScoreBand } from '../types/lit';
import type { GhostTownEvidenceScanV1 } from '../types/evidence';
import type { VerdictDecision, VerdictDecisionV2 } from '../verdict/verdictDecisionV2';
import { intakeSpecificity, missingIntakeFields } from '../verdict/verdictDecisionV2';
import type { VerdictDecisionV3 } from '../verdict/verdictDecisionV3';
import type { Locale } from './locale';
import { GHOSTTOWN_FIRST_30_V1 } from './ghosttownOffer';

// Everything the free verdict page says, in plain words, in English and
// Spanish. The stored decision stays the canonical record that the paid
// Sprint, the API and the MCP server read; this module only decides how the
// founder sees it. Text is rebuilt from structured facts (the decision, the
// scores, the idea and the evidence counts), never translated from stored
// sentences. The founder's own words are shown as they wrote them.

type Field = 'customer' | 'problem' | 'alternative' | 'offer';
type Uncertainty = 'urgency' | 'reach' | 'commitment' | 'missing';
type TruthLabel = 'VERIFIED' | 'INFERRED' | 'UNKNOWN';

export interface EvidenceCounts {
  market: number;
  customer: number;
  commercial: number;
  pricing: number;
  premium: number;
}

export interface VerdictPresentation {
  labels: typeof COPY.en.labels;
  decisionLabel: string;
  confidenceLevel: string;
  confidenceText: string;
  disclaimer: string;
  biggestUnknown: { question: string; why: string };
  test: { text: string; who: string; good: string; stop: string; limit: string };
  firstAction: string;
  testing: { target: string; customer: string; problem: string; offer: string; commitment: string };
  reasonsFor: string[];
  reasonsAgainst: string[];
  wouldChange: string[];
  evidenceLabels: Array<{ label: string; statement: string }>;
  scores: { names: Record<'ghostTownRisk' | 'lit' | 'leverage' | 'insight' | 'timing' | 'highWalls', string>; risk: string; litBand: string; highWallsBand: string };
  dna: { type: string; trap: string; win: string };
  footer: { madeAt: string; cached: string; boundary: string };
}

const list = (items: string[], and: string) =>
  items.length < 2 ? items[0] || '' : `${items.slice(0, -1).join(', ')} ${and} ${items.at(-1)}`;

const COPY = {
  en: {
    labels: {
      decision: 'Decision', biggestUnknown: 'Biggest unknown', fastestTest: 'Fastest test', who: 'Who to ask', good: 'Good result',
      stop: 'Stop or change', limit: 'Limit', doFirst: 'Do this first', testing: 'What we are testing', customer: 'Customer',
      problem: 'Problem', offer: 'Offer', commitment: 'What you ask for', confidence: 'How sure we are', mayWork: 'Why this may work',
      mayFail: 'Why this may fail', wouldChange: 'What would change this verdict', evidenceLabels: 'What we know and what we assume',
      detailed: 'Detailed analysis', detailedSub: 'Scores and notes on your type of business', detailedIntro: 'These scores help explain the decision. They do not predict whether the business will succeed.',
      businessType: 'Business type', trap: 'The trap', win: 'How to win', video: 'Your public short', videoPreparing: 'Shorts Factory is preparing the video.',
      videoReady: 'Your report is ready now. This panel updates on its own.', videoPublic: 'Public content. It may be reused and shared after a media check.',
      videoUnsupported: 'Your browser cannot play this video.', testAnother: 'Test another idea', stickyFirst30: 'First 30 opens soon: join the list', stickyFirst30Buy: `Start First 30 — ${GHOSTTOWN_FIRST_30_V1.displayPrice}`
    },
    decisions: {
      WORTH_TESTING: 'Worth testing', REVISE_BEFORE_TESTING: 'Fix one thing, then test', WEAK_EVIDENCE: 'Weak signs so far',
      DO_NOT_PURSUE_YET: 'Not yet', MISSING: 'Needs more detail'
    } as Record<VerdictDecision | 'MISSING', string>,
    confidence: { LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High' } as Record<string, string>,
    fields: { customer: 'who your customer is', problem: 'the problem they had recently', alternative: 'what they use today', offer: 'exactly what you will offer' } as Record<Field, string>,
    and: 'and',
    confidenceText: {
      missing: (fields: string) => `We cannot be sure yet: you still need to describe ${fields}.`,
      moderate: 'You described a clear customer, problem and offer. What we do not know yet is whether buyers will commit.',
      other: 'Some key facts are still unconfirmed: how urgent the problem is, how you will reach buyers, or whether they will commit.',
      categoryBehavior: 'Outside data shows people already use or pay for similar solutions. Whether they will want yours is still untested.',
      marketOnly: 'We found signs that this market exists, but not yet that people buy similar solutions.',
      noScan: 'Our quick online scan did not find useful market data. That is a gap, not proof there are no buyers.'
    },
    disclaimer: 'This tells you what to test next. It does not predict whether the whole business will succeed.',
    unknown: {
      urgency: 'Is this problem painful enough that people will change what they do today?',
      reach: 'Can you reach these buyers again and again?',
      commitment: 'Will real buyers commit before the full product exists?',
      missing: (fields: string) => `The details still missing: ${fields}.`,
      why: 'A real problem is only worth building for if people will act on it soon. Find that out before you invest.'
    },
    test: {
      ready: (customer: string, price: string) => `Write a short offer for a small paid trial and send it to 10 ${customer}. Ask about the last time the problem happened and what they use today. Then ask if they will sign up for the trial${price ? ` at ${price}` : '; set a price or a deposit first'}.`,
      readyWho: (customer: string) => `10 ${customer}`,
      readyGood: '3 or more of the 10 say yes within 5 business days.',
      readyStop: 'Nobody says yes: rethink the customer, the problem or the offer. 1 or 2 say yes: write down their doubts, change one thing and try again.',
      missing: (fields: string) => `Do not send offers yet. First write one page that describes ${fields}, then run this verdict again.`,
      missingWho: 'You',
      missingGood: (fields: string) => `You can describe ${fields} specifically, not in broad terms.`,
      missingStop: 'Still missing or vague: make it more specific before you contact buyers.',
      limit: '5 business days · No ad spending: just your time and direct messages'
    },
    firstAction: {
      ready: (customer: string, alternative: string) => `Today: write the short trial offer, list 10 ${customer} who use ${alternative} today, and send it.`,
      missing: (fields: string) => `Write one page that describes ${fields}. Do not send offers yet.`
    },
    testing: {
      ready: (customer: string) => `Will ${customer} make a real commitment, such as paying for a small trial, during the test?`,
      missing: 'First we need a specific buyer. Until then, we cannot test whether anyone will commit.',
      commitmentReady: (price: string) => `One paid trial with a clear scope and a decision date${price ? ` (${price})` : ''}`,
      commitmentMissing: (fields: string) => `Nothing yet: first describe ${fields}.`,
      notGiven: 'Not given yet'
    },
    mayWork: {
      market: (n: number) => `We found ${n} sign${n === 1 ? '' : 's'} online that this market exists.`,
      customer: (n: number) => `${n} similar product${n === 1 ? ' has' : 's have'} public ratings or reviews, so people use solutions like this.`,
      commercial: (n: number) => `We found ${n} sign${n === 1 ? '' : 's'} that people pay for similar solutions.`,
      premium: (n: number) => `${n} similar product${n === 1 ? ' sells' : 's sell'} at premium prices.`,
      connected: 'Your offer connects a specific customer to a real problem, not a vague audience.',
      notConnected: (fields: string) => `Before you can claim demand, describe ${fields}.`,
      alternative: (alt: string) => `You named what people use today (${alt}), so the test has something concrete to beat.`,
      noAlternative: 'Name what people use today before you compare your offer to it.',
      trial: 'A small hands-on trial can test demand before you build much.'
    },
    mayFail: {
      opinion: 'What you told us is your view, not proof from buyers.',
      commit: (customer: string) => `We do not know yet if ${customer} will pay for a trial before the full product exists.`,
      reach: 'You still need to show you can reach enough of the right buyers.',
      category: 'Reviews and prices for similar products show the market is real, not that buyers will choose yours.',
      prices: 'The prices we found describe the market. They are not a price recommendation.'
    },
    wouldChange: [
      'Buyers describing the problem from recent experience.',
      'Paid trials, deposits or signed commitments.',
      'Proof that one way of reaching buyers works again and again.',
      'Buyers saying no for the same reason, which shows the customer, problem or offer is wrong.'
    ],
    truth: { VERIFIED: 'Confirmed', INFERRED: 'Our reading', UNKNOWN: 'Unknown' } as Record<TruthLabel, string>,
    evidence: {
      idea: (name: string) => `You named the idea "${name}".`,
      customer: (value: string) => `Your first customer looks like: ${value}.`,
      noCustomer: 'Your first customer: not given, or too broad to test.',
      problem: (value: string) => `The problem: ${value}.`,
      noProblem: 'The problem: not given, or too broad to test.',
      alternative: (value: string) => `What people use today: ${value}.`,
      noAlternative: 'What people use today: not given.',
      offer: (value: string) => `Your offer: ${value}.`,
      noOffer: 'Your offer: not clear enough yet.',
      commit: 'Whether buyers will commit: unknown until you run the test.'
    },
    scoreNames: { ghostTownRisk: 'Ghost Town risk', lit: 'LIT score', leverage: 'Leverage', insight: 'Insight', timing: 'Timing', highWalls: 'High walls' },
    risk: { low: 'low risk', medium: 'medium risk', high: 'high risk' } as Record<RiskLevel, string>,
    band: { weak: 'weak', unclear: 'unclear', promising: 'promising', strong: 'strong' } as Record<ScoreBand, string>,
    dna: {
      service: { type: 'Service', trap: 'You earn by the hour, so your income stops when you stop working.', win: 'Turn what you repeat into a package, checklist or tool that works without you.' },
      physical_product: { type: 'Physical product', trap: 'Your cash gets stuck in stock: you pay suppliers before customers pay you.', win: 'Pre-sell, or get customer deposits, before you buy a lot of stock.' },
      digital_product: { type: 'Digital product', trap: 'You can spend months building before anyone pays, and it may be the wrong thing.', win: 'Build the smallest version first and prove people want it before you spend more.' },
      marketplace: { type: 'Marketplace', trap: 'Buyers will not come without sellers, and sellers will not come without buyers.', win: 'Win one small niche first: enough buyers and sellers in one place, then grow.' },
      media: { type: 'Media', trap: 'Attention fades as soon as you stop publishing.', win: 'Move your audience to channels you own, like an email list or community.' },
      capital: { type: 'Capital', trap: 'One bad bet or market drop can wipe out a lot of money.', win: 'Spread the risk across many small bets and earn steady fees.' },
      asset: { type: 'Real assets', trap: 'Your money is tied up in property or equipment, and returns take time.', win: 'Create steady income, like rent or royalties, while you hold the asset.' }
    } as Record<BusinessDnaType, { type: string; trap: string; win: string }>,
    footer: { madeAt: 'GhostTown verdict made', cached: ' (saved report)', boundary: 'This helps you decide what to test next. It does not guarantee success.' }
  },
  es: {
    labels: {
      decision: 'Decisión', biggestUnknown: 'La mayor duda', fastestTest: 'La prueba más rápida', who: 'A quién preguntar', good: 'Buen resultado',
      stop: 'Para o cambia', limit: 'Límite', doFirst: 'Haz esto primero', testing: 'Lo que estamos probando', customer: 'Cliente',
      problem: 'Problema', offer: 'Oferta', commitment: 'Lo que pides', confidence: 'Qué tan seguros estamos', mayWork: 'Por qué podría funcionar',
      mayFail: 'Por qué podría fallar', wouldChange: 'Qué cambiaría este veredicto', evidenceLabels: 'Lo que sabemos y lo que suponemos',
      detailed: 'Análisis detallado', detailedSub: 'Puntuaciones y notas sobre tu tipo de negocio', detailedIntro: 'Estas puntuaciones ayudan a explicar la decisión. No predicen si el negocio tendrá éxito.',
      businessType: 'Tipo de negocio', trap: 'La trampa', win: 'Cómo ganar', video: 'Tu video corto público', videoPreparing: 'Shorts Factory está preparando el video.',
      videoReady: 'Tu informe ya está listo. Este panel se actualiza solo.', videoPublic: 'Contenido público. Puede reutilizarse y compartirse después de una revisión.',
      videoUnsupported: 'Tu navegador no puede reproducir este video.', testAnother: 'Probar otra idea', stickyFirst30: 'First 30 abre pronto: únete a la lista', stickyFirst30Buy: `Empezar First 30 — ${GHOSTTOWN_FIRST_30_V1.displayPrice}`
    },
    decisions: {
      WORTH_TESTING: 'Vale la pena probarla', REVISE_BEFORE_TESTING: 'Ajusta una cosa y luego prueba', WEAK_EVIDENCE: 'Pocas señales por ahora',
      DO_NOT_PURSUE_YET: 'Todavía no', MISSING: 'Faltan detalles'
    } as Record<VerdictDecision | 'MISSING', string>,
    confidence: { LOW: 'Baja', MODERATE: 'Moderada', HIGH: 'Alta' } as Record<string, string>,
    fields: { customer: 'quién es tu cliente', problem: 'el problema que tuvo hace poco', alternative: 'qué usa hoy', offer: 'qué vas a ofrecer exactamente' } as Record<Field, string>,
    and: 'y',
    confidenceText: {
      missing: (fields: string) => `Todavía no podemos estar seguros: falta describir ${fields}.`,
      moderate: 'Describiste un cliente, un problema y una oferta claros. Lo que aún no sabemos es si los compradores se van a comprometer.',
      other: 'Algunos datos clave siguen sin confirmar: qué tan urgente es el problema, cómo llegarás a los compradores o si se van a comprometer.',
      categoryBehavior: 'Los datos de afuera muestran que la gente ya usa o paga por soluciones parecidas. Si querrán la tuya todavía no se ha probado.',
      marketOnly: 'Encontramos señales de que este mercado existe, pero todavía no de que la gente compre soluciones parecidas.',
      noScan: 'Nuestra búsqueda rápida en internet no encontró datos útiles del mercado. Es un vacío, no prueba de que no haya compradores.'
    },
    disclaimer: 'Esto te dice qué probar ahora. No predice si todo el negocio va a tener éxito.',
    unknown: {
      urgency: '¿Este problema duele lo suficiente como para que la gente cambie lo que hace hoy?',
      reach: '¿Puedes llegar a estos compradores una y otra vez?',
      commitment: '¿Los compradores reales se van a comprometer antes de que exista el producto completo?',
      missing: (fields: string) => `Los detalles que faltan: ${fields}.`,
      why: 'Un problema real solo vale la pena si la gente va a actuar pronto. Averígualo antes de invertir.'
    },
    test: {
      ready: (customer: string, price: string) => `Escribe una oferta corta para una prueba pagada pequeña y envíala a 10 ${customer}. Pregunta por la última vez que tuvieron el problema y qué usan hoy. Luego pregunta si se apuntan a la prueba${price ? ` por ${price}` : '; antes pon un precio o un depósito'}.`,
      readyWho: (customer: string) => `10 ${customer}`,
      readyGood: '3 o más de los 10 dicen que sí en 5 días laborables.',
      readyStop: 'Nadie dice que sí: replantea el cliente, el problema o la oferta. 1 o 2 dicen que sí: anota sus dudas, cambia una cosa y vuelve a probar.',
      missing: (fields: string) => `No envíes ofertas todavía. Primero escribe una página que describa ${fields} y luego vuelve a pedir este veredicto.`,
      missingWho: 'Tú',
      missingGood: (fields: string) => `Puedes describir ${fields} de forma específica, no general.`,
      missingStop: 'Sigue faltando o es muy general: hazlo más específico antes de contactar compradores.',
      limit: '5 días laborables · Sin gastar en anuncios: solo tu tiempo y mensajes directos'
    },
    firstAction: {
      ready: (customer: string, alternative: string) => `Hoy: escribe la oferta corta de prueba, haz una lista de 10 ${customer} que hoy usan ${alternative}, y envíala.`,
      missing: (fields: string) => `Escribe una página que describa ${fields}. No envíes ofertas todavía.`
    },
    testing: {
      ready: (customer: string) => `¿${customer.charAt(0).toUpperCase()}${customer.slice(1)} se comprometerá de verdad, por ejemplo pagando una prueba pequeña, durante la prueba?`,
      missing: 'Primero necesitamos un comprador específico. Hasta entonces no podemos probar si alguien se va a comprometer.',
      commitmentReady: (price: string) => `Una prueba pagada con un alcance claro y una fecha para decidir${price ? ` (${price})` : ''}`,
      commitmentMissing: (fields: string) => `Nada todavía: primero describe ${fields}.`,
      notGiven: 'Todavía no lo has dado'
    },
    mayWork: {
      market: (n: number) => `Encontramos ${n} ${n === 1 ? 'señal' : 'señales'} en internet de que este mercado existe.`,
      customer: (n: number) => `${n} ${n === 1 ? 'producto parecido tiene' : 'productos parecidos tienen'} calificaciones o reseñas públicas, así que la gente usa soluciones como esta.`,
      commercial: (n: number) => `Encontramos ${n} ${n === 1 ? 'señal' : 'señales'} de que la gente paga por soluciones parecidas.`,
      premium: (n: number) => `${n} ${n === 1 ? 'producto parecido se vende' : 'productos parecidos se venden'} a precios altos.`,
      connected: 'Tu oferta conecta un cliente específico con un problema real, no con un público vago.',
      notConnected: (fields: string) => `Antes de hablar de demanda, describe ${fields}.`,
      alternative: (alt: string) => `Dijiste qué usa la gente hoy (${alt}), así que la prueba tiene algo concreto que superar.`,
      noAlternative: 'Di qué usa la gente hoy antes de comparar tu oferta.',
      trial: 'Una prueba pequeña y práctica puede medir la demanda antes de construir mucho.'
    },
    mayFail: {
      opinion: 'Lo que nos dijiste es tu punto de vista, no prueba de los compradores.',
      commit: (customer: string) => `Todavía no sabemos si ${customer} pagará una prueba antes de que exista el producto completo.`,
      reach: 'Todavía tienes que demostrar que puedes llegar a suficientes compradores correctos.',
      category: 'Las reseñas y los precios de productos parecidos muestran que el mercado es real, no que los compradores elegirán el tuyo.',
      prices: 'Los precios que encontramos describen el mercado. No son una recomendación de precio.'
    },
    wouldChange: [
      'Compradores que describan el problema por experiencia reciente.',
      'Pruebas pagadas, depósitos o compromisos firmados.',
      'Pruebas de que una forma de llegar a los compradores funciona una y otra vez.',
      'Compradores que dicen que no por la misma razón, lo que muestra que el cliente, el problema o la oferta están mal.'
    ],
    truth: { VERIFIED: 'Confirmado', INFERRED: 'Nuestra lectura', UNKNOWN: 'Desconocido' } as Record<TruthLabel, string>,
    evidence: {
      idea: (name: string) => `Llamaste a la idea "${name}".`,
      customer: (value: string) => `Tu primer cliente parece ser: ${value}.`,
      noCustomer: 'Tu primer cliente: no lo diste, o es demasiado general para probarlo.',
      problem: (value: string) => `El problema: ${value}.`,
      noProblem: 'El problema: no lo diste, o es demasiado general para probarlo.',
      alternative: (value: string) => `Lo que la gente usa hoy: ${value}.`,
      noAlternative: 'Lo que la gente usa hoy: no lo diste.',
      offer: (value: string) => `Tu oferta: ${value}.`,
      noOffer: 'Tu oferta: todavía no está clara.',
      commit: 'Si los compradores se van a comprometer: no se sabe hasta que hagas la prueba.'
    },
    scoreNames: { ghostTownRisk: 'Riesgo Ghost Town', lit: 'Puntuación LIT', leverage: 'Alcance', insight: 'Entendimiento', timing: 'Momento', highWalls: 'Barreras' },
    risk: { low: 'riesgo bajo', medium: 'riesgo medio', high: 'riesgo alto' } as Record<RiskLevel, string>,
    band: { weak: 'débil', unclear: 'poco claro', promising: 'prometedor', strong: 'fuerte' } as Record<ScoreBand, string>,
    dna: {
      service: { type: 'Servicio', trap: 'Ganas por hora, así que tus ingresos paran cuando paras de trabajar.', win: 'Convierte lo que repites en un paquete, una lista o una herramienta que funcione sin ti.' },
      physical_product: { type: 'Producto físico', trap: 'Tu dinero se queda atrapado en inventario: pagas a los suplidores antes de que te paguen los clientes.', win: 'Prevende, o pide depósitos a los clientes, antes de comprar mucho inventario.' },
      digital_product: { type: 'Producto digital', trap: 'Puedes pasar meses construyendo antes de que alguien pague, y puede que sea lo equivocado.', win: 'Construye primero la versión más pequeña y prueba que la gente la quiere antes de gastar más.' },
      marketplace: { type: 'Mercado de compradores y vendedores', trap: 'Los compradores no llegan sin vendedores, y los vendedores no llegan sin compradores.', win: 'Gana primero un nicho pequeño: suficientes compradores y vendedores en un lugar, y luego crece.' },
      media: { type: 'Medios', trap: 'La atención se pierde en cuanto dejas de publicar.', win: 'Lleva a tu público a canales tuyos, como una lista de email o una comunidad.' },
      capital: { type: 'Capital', trap: 'Una mala apuesta o una caída del mercado puede borrar mucho dinero.', win: 'Reparte el riesgo en muchas apuestas pequeñas y gana comisiones estables.' },
      asset: { type: 'Bienes físicos', trap: 'Tu dinero queda amarrado en propiedades o equipos, y el retorno toma tiempo.', win: 'Crea ingresos estables, como renta o regalías, mientras tienes el bien.' }
    } as Record<BusinessDnaType, { type: string; trap: string; win: string }>,
    footer: { madeAt: 'Veredicto de GhostTown hecho el', cached: ' (informe guardado)', boundary: 'Esto te ayuda a decidir qué probar ahora. No garantiza el éxito.' }
  }
} satisfies Record<Locale, unknown>;

export function evidenceCounts(scan: GhostTownEvidenceScanV1 | undefined): EvidenceCounts | undefined {
  if (!scan) return undefined;
  return {
    market: scan.competition.length + scan.demand.length + scan.access.length
      + scan.currentAlternatives.filter(item => item.provider !== 'founder_input').length,
    customer: (scan.customerConsumption ?? []).length,
    commercial: (scan.commercialConsumption ?? []).length,
    pricing: (scan.pricingLandscape ?? []).length,
    premium: (scan.premiumPrecedent ?? []).length
  };
}

const clean = (value: string | undefined) => (value || '').replace(/\s+/g, ' ').trim().replace(/[.;:,]+$/, '');

export function presentVerdict(
  result: Pick<EvaluationResult, 'idea' | 'deterministicScores' | 'evidenceScan' | 'generatedAt' | 'cacheHit'>,
  decision: VerdictDecisionV2 | VerdictDecisionV3,
  locale: Locale = 'en'
): VerdictPresentation {
  const t = COPY[locale];
  const { idea, deterministicScores: scores } = result;
  const specificity = intakeSpecificity(idea);
  const missingKeys = (['customer', 'problem', 'alternative', 'offer'] as const).filter(key => !specificity[key]);
  // Keep the same rule as the decision builder: it asks for details when any are missing.
  const missing = missingIntakeFields(specificity).length > 0;
  const fields = list(missingKeys.map(key => t.fields[key]), t.and);
  const customer = clean(idea.targetUser);
  const alternative = clean(idea.currentAlternative);
  const price = clean(decision.offerHypothesis.priceOrCommitmentRange);
  const counts = 'evidenceLayers' in decision ? evidenceCounts(result.evidenceScan) : undefined;
  const categoryBehavior = Boolean(counts && (counts.customer || counts.commercial));

  const uncertainty: Uncertainty = missing ? 'missing'
    : scores.insightScore < 3 ? 'urgency'
      : scores.leverageScore < 3 ? 'reach'
        : 'commitment';

  const confidenceText = [
    missing ? t.confidenceText.missing(fields) : decision.confidence.level === 'MODERATE' ? t.confidenceText.moderate : t.confidenceText.other,
    counts ? (categoryBehavior ? t.confidenceText.categoryBehavior : counts.market ? t.confidenceText.marketOnly : t.confidenceText.noScan) : ''
  ].filter(Boolean).join(' ');

  const reasonsFor = [
    ...(counts ? [
      counts.market ? t.mayWork.market(counts.market) : '',
      counts.customer ? t.mayWork.customer(counts.customer) : '',
      counts.commercial ? t.mayWork.commercial(counts.commercial) : '',
      counts.premium ? t.mayWork.premium(counts.premium) : ''
    ] : []),
    specificity.offer && specificity.customer && specificity.problem ? t.mayWork.connected : t.mayWork.notConnected(fields),
    specificity.alternative ? t.mayWork.alternative(alternative) : t.mayWork.noAlternative,
    t.mayWork.trial
  ].filter(Boolean);

  const reasonsAgainst = [
    t.mayFail.opinion,
    t.mayFail.commit(customer || t.testing.notGiven),
    t.mayFail.reach,
    ...(counts ? [t.mayFail.category, t.mayFail.prices] : [])
  ];

  const truth = (label: TruthLabel, statement: string) => ({ label: t.truth[label], statement });
  const evidenceLabels = [
    truth('VERIFIED', t.evidence.idea(clean(idea.ideaName))),
    specificity.customer ? truth('INFERRED', t.evidence.customer(customer)) : truth('UNKNOWN', t.evidence.noCustomer),
    specificity.problem ? truth('INFERRED', t.evidence.problem(clean(idea.painfulProblem))) : truth('UNKNOWN', t.evidence.noProblem),
    specificity.alternative ? truth('INFERRED', t.evidence.alternative(alternative)) : truth('UNKNOWN', t.evidence.noAlternative),
    specificity.offer ? truth('INFERRED', t.evidence.offer(clean(idea.description))) : truth('UNKNOWN', t.evidence.noOffer),
    truth('UNKNOWN', t.evidence.commit)
  ];

  const dna = t.dna[scores.businessDnaType] ?? t.dna.digital_product;
  return {
    labels: t.labels,
    decisionLabel: t.decisions[missing ? 'MISSING' : decision.decision],
    confidenceLevel: t.confidence[decision.confidence.level] ?? decision.confidence.level,
    confidenceText,
    disclaimer: t.disclaimer,
    biggestUnknown: {
      question: uncertainty === 'missing' ? t.unknown.missing(fields) : t.unknown[uncertainty],
      why: t.unknown.why
    },
    test: missing
      ? { text: t.test.missing(fields), who: t.test.missingWho, good: t.test.missingGood(fields), stop: t.test.missingStop, limit: t.test.limit }
      : { text: t.test.ready(customer, price), who: t.test.readyWho(customer), good: t.test.readyGood, stop: t.test.readyStop, limit: t.test.limit },
    firstAction: missing ? t.firstAction.missing(fields) : t.firstAction.ready(customer, alternative),
    testing: {
      target: missing ? t.testing.missing : t.testing.ready(customer),
      customer: customer || t.testing.notGiven,
      problem: clean(idea.painfulProblem) || t.testing.notGiven,
      offer: clean(idea.description) || t.testing.notGiven,
      commitment: missing ? t.testing.commitmentMissing(fields) : t.testing.commitmentReady(price)
    },
    reasonsFor,
    reasonsAgainst,
    wouldChange: [...t.wouldChange],
    evidenceLabels,
    scores: {
      names: t.scoreNames,
      risk: t.risk[scores.ghostTownRisk] ?? scores.ghostTownRisk,
      litBand: t.band[scores.litBand] ?? scores.litBand,
      highWallsBand: t.band[scores.highWallsBand] ?? scores.highWallsBand
    },
    dna,
    footer: { ...t.footer, cached: result.cacheHit ? t.footer.cached : '' }
  };
}
