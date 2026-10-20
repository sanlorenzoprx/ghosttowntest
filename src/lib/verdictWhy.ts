import type { VerdictDecision, VerdictDecisionV2 } from '../verdict/verdictDecisionV2';
import type { Locale } from './locale';
import { LEGAL_POLICY } from './businessPolicy';

// The "why" for each part of the free verdict, in plain words for a founder
// who is new to this. Derived from the deterministic decision, so it also
// works for verdicts saved before it existed. See AGENTS.md, "Explain why it
// matters".

export type VerdictScoreKey = 'ghostTownRisk' | 'lit' | 'leverage' | 'insight' | 'timing' | 'highWalls';

export interface VerdictWhy {
  label: string;
  decision: string;
  test: string;
  firstAction: string;
  scoresIntro: string;
  scores: Record<VerdictScoreKey, string>;
  askMore: { before: string; email: string; after: string };
}

type DecisionKey = VerdictDecision | 'MISSING_DETAILS';

interface Copy {
  label: string;
  decision: Record<DecisionKey, string>;
  test: { ready: string; missing: string };
  firstAction: { ready: string; missing: string };
  scoresIntro: string;
  scores: Record<VerdictScoreKey, string>;
  askMore: { before: string; after: string };
}

const COPY: Record<Locale, Copy> = {
  en: {
    label: 'Why this matters',
    decision: {
      WORTH_TESTING: 'Your idea has enough going for it to test with real buyers now. Testing first tells you whether people will pay before you spend months building.',
      REVISE_BEFORE_TESTING: 'One important part is still unclear, so a test now would give you muddy answers. Fix the weak part first and the same test will tell you much more.',
      WEAK_EVIDENCE: 'Right now there is little sign that buyers need this badly enough to pay. That does not mean quit. It means change the customer, the problem or the offer before you spend money.',
      DO_NOT_PURSUE_YET: 'The signals point to a hard road for this version of the idea. Changing who it is for or what you offer could save you months.',
      MISSING_DETAILS: 'We cannot judge the idea yet because key details are missing. Filling them in takes a few minutes and gives you a verdict you can act on.'
    },
    test: {
      ready: 'A small test with real buyers answers the question that matters most: will they commit? A yes means you build with confidence. A no saves you the cost of building the wrong thing.',
      missing: 'A clear definition makes the test fair. Without it, any answer you get would be hard to trust.'
    },
    firstAction: {
      ready: 'Doing it today keeps the idea moving, and the replies you get this week are your first real evidence.',
      missing: 'This one page turns a fuzzy idea into something a buyer can say yes or no to.'
    },
    scoresIntro: 'Each score runs from 1 to 5. Here is what each one means for you:',
    scores: {
      ghostTownRisk: 'How likely you are to launch and find no buyers. Higher means more risk.',
      lit: 'Your overall case, combining leverage, insight and timing. Higher is better.',
      leverage: 'How easily you can reach buyers again and again without doing everything by hand.',
      insight: 'How well you understand a real problem that people want solved.',
      timing: 'Whether buyers are ready for this now, not someday.',
      highWalls: 'How hard it would be for others to copy you once it works.'
    },
    askMore: { before: 'Something not clear? Write to ', after: ' and we will explain it in plain words.' }
  },
  es: {
    label: 'Por qué importa',
    decision: {
      WORTH_TESTING: 'Tu idea tiene lo suficiente para probarla ya con compradores reales. Probar primero te dice si la gente pagará antes de pasar meses construyendo.',
      REVISE_BEFORE_TESTING: 'Una parte importante todavía no está clara, así que una prueba ahora te daría respuestas confusas. Arregla esa parte primero y la misma prueba te dirá mucho más.',
      WEAK_EVIDENCE: 'Por ahora hay pocas señales de que los compradores necesiten esto tanto como para pagar. No significa rendirte. Significa cambiar el cliente, el problema o la oferta antes de gastar dinero.',
      DO_NOT_PURSUE_YET: 'Las señales apuntan a un camino difícil para esta versión de la idea. Cambiar para quién es o qué ofreces podría ahorrarte meses.',
      MISSING_DETAILS: 'Todavía no podemos evaluar la idea porque faltan datos clave. Completarlos toma unos minutos y te da un veredicto que puedes usar.'
    },
    test: {
      ready: 'Una prueba pequeña con compradores reales contesta la pregunta más importante: ¿se van a comprometer? Un sí te deja construir con confianza. Un no te ahorra construir lo que no era.',
      missing: 'Una definición clara hace que la prueba sea justa. Sin ella, cualquier respuesta sería difícil de creer.'
    },
    firstAction: {
      ready: 'Hacerlo hoy mantiene la idea en movimiento, y las respuestas que recibas esta semana son tu primera evidencia real.',
      missing: 'Esta página convierte una idea difusa en algo a lo que un comprador puede decir sí o no.'
    },
    scoresIntro: 'Cada puntuación va del 1 al 5. Esto es lo que significa cada una para ti:',
    scores: {
      ghostTownRisk: 'Qué tan probable es que lances y no lleguen compradores. Más alto significa más riesgo.',
      lit: 'Tu caso en general, combinando alcance, entendimiento del problema y momento. Más alto es mejor.',
      leverage: 'Qué tan fácil puedes llegar a compradores una y otra vez sin hacerlo todo a mano.',
      insight: 'Qué tan bien entiendes un problema real que la gente quiere resolver.',
      timing: 'Si los compradores están listos para esto ahora, no algún día.',
      highWalls: 'Qué tan difícil sería que otros te copien una vez funcione.'
    },
    askMore: { before: '¿Algo no está claro? Escríbenos a ', after: ' y te lo explicamos en palabras sencillas.' }
  }
};

/** The decision builder asks for missing intake details instead of a paid-pilot commitment. */
export function verdictNeedsMoreDetails(decision: Pick<VerdictDecisionV2, 'offerHypothesis'>): boolean {
  return decision.offerHypothesis.commitmentRequested.startsWith('No paid-pilot commitment request until');
}

export function explainVerdict(decision: Pick<VerdictDecisionV2, 'decision' | 'offerHypothesis'>, locale: Locale = 'en'): VerdictWhy {
  const copy = COPY[locale];
  const missing = verdictNeedsMoreDetails(decision);
  return {
    label: copy.label,
    decision: copy.decision[missing ? 'MISSING_DETAILS' : decision.decision],
    test: missing ? copy.test.missing : copy.test.ready,
    firstAction: missing ? copy.firstAction.missing : copy.firstAction.ready,
    scoresIntro: copy.scoresIntro,
    scores: copy.scores,
    askMore: { ...copy.askMore, email: LEGAL_POLICY.supportEmail }
  };
}
