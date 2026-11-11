import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import IdeaIntake from '../src/components/IdeaIntake';
import QuestionCard from '../src/components/QuestionCard';
import ProgressBar from '../src/components/ProgressBar';
import LoginModal from '../src/components/LoginModal';
import PaywallModal from '../src/components/PaywallModal';
import Contact from '../src/components/Contact';
import VerdictUnlockPage from '../src/components/VerdictUnlockPage';
import AgentHandoff from '../src/components/AgentHandoff';
import ActionPlanSuccess from '../src/components/ActionPlanSuccess';
import CompetitorSeedStep from '../src/components/CompetitorSeedStep';
import { litQuestions } from '../src/lib/litQuestions';
import { localizeAssessmentQuestion } from '../src/lib/agentQuestionLocalization';
import { ASSESSMENT_PACK_DISPLAY_PRICE } from '../src/lib/assessmentPack';

// The first screens a visitor sees must work in Spanish (AGENTS.md, "Languages").
const render = (element: ReactElement) => renderToStaticMarkup(element)
  .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const noop = () => undefined;

function expectSpanish(html: string, spanish: string[], english: string[]) {
  for (const label of spanish) expect(html, label).toContain(label);
  for (const label of english) expect(html, label).not.toContain(label);
}

describe('entry screens in Spanish', () => {
  it('IdeaIntake asks for the idea in Spanish', () => {
    expectSpanish(render(<IdeaIntake onSubmit={noop} locale="es" />),
      ['Cuéntanos tu idea', '¿Cómo se llama tu idea?', '¿Para quién es?', '(Opcional)', 'Empezar la evaluación · Unos 5 minutos', 'No necesitas cuenta.'],
      ['Tell us about your idea', "What's your idea called?", '(Optional)', 'Start Assessment', 'No account required']);
    expect(render(<IdeaIntake onSubmit={noop} />)).toContain('Start Assessment · About 5 Minutes');
  });

  it('every assessment question has Spanish text and the card shows it', () => {
    for (const question of litQuestions) {
      const es = localizeAssessmentQuestion(question, 'es');
      expect(es.question, question.id).not.toBe(question.question);
      expect(es.options.map(option => option.value), question.id).toEqual(question.options.map(option => option.value));
    }
    const first = litQuestions[0];
    const html = render(<QuestionCard question={localizeAssessmentQuestion(first, 'es')} onAnswer={noop} locale="es" />);
    expectSpanish(html, ['No hay respuestas malas.', localizeAssessmentQuestion(first, 'es').question], ['There are no wrong answers', first.question]);
  });

  it('ProgressBar names the stages in Spanish', () => {
    expectSpanish(render(<ProgressBar currentIndex={0} locale="es" />),
      ['Etapa 1 de 5', 'Demanda', 'en esta etapa', 'Muros'],
      ['Claim depth', 'in this stage', 'Walls']);
    expect(render(<ProgressBar currentIndex={0} />)).toContain('Claim depth 1 of 5');
  });

  it('LoginModal, PaywallModal and Contact speak Spanish and keep the price', () => {
    expectSpanish(render(<LoginModal onLogin={noop} onClose={noop} initialMode="signup" locale="es" />),
      ['Crear cuenta', 'Correo electrónico', 'Contraseña', '¿Ya tienes cuenta? Entra'],
      ['Create Account', 'Email Address', 'Already have an account']);
    const paywall = render(<PaywallModal isLoggedIn={false} onLoginClick={noop} onClose={noop} locale="es" />);
    expectSpanish(paywall, ['Sigue probando antes de crear', 'Un solo pago. Sin suscripción.', 'Ahora no', ASSESSMENT_PACK_DISPLAY_PRICE], ['Keep testing before you build', 'Not now']);
    expectSpanish(render(<Contact onStart={noop} locale="es" />),
      ['Hacer un veredicto gratis', 'support@ghosttownverdict.app', 'Ayuda con un plan pagado'],
      ['Run Free Verdict', 'Paid plan help']);
  });

  it('the verdict unlock page sells the verdict pack in Spanish at the same price', () => {
    const html = render(<VerdictUnlockPage draft={null} isLoggedIn purchaseReturn={null} onLoginClick={noop} onCreditsReady={noop} locale="es" />);
    expectSpanish(html, ['Se te acabaron los veredictos gratis.', 'Un solo pago. Sin suscripción.', ASSESSMENT_PACK_DISPLAY_PRICE, 'Comprar'], ['You’re out of free verdicts.', 'One-time purchase']);
    expect(render(<VerdictUnlockPage draft={null} isLoggedIn purchaseReturn="cancelled" onLoginClick={noop} onCreditsReady={noop} locale="es" />)).toContain('Cancelaste el pago.');
  });

  it('the screens after payment and the agent handoff open in Spanish', () => {
    expectSpanish(render(<ActionPlanSuccess orderId="order-1" onDone={noop} locale="es" />),
      ['Pago recibido', 'Armando tu red de medios y distribución...', 'Volver al panel'],
      ['Payment received', 'Return to Dashboard']);
    expectSpanish(render(<CompetitorSeedStep orderId="order-1" onStarted={noop} locale="es" />),
      ['Abriendo la investigación de tu Blueprint...'], ['Opening your Blueprint research']);
    expectSpanish(render(<AgentHandoff handoffToken="token" isLoggedIn={false} onLoginClick={noop} onClaimed={noop} onHome={noop} locale="es" />),
      ['Abriendo tu veredicto de GhostTown…'], ['Opening your GhostTown verdict']);
  });
});
