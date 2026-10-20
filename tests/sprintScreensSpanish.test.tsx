import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import type { BlueprintV21Payload } from '../src/components/LaunchBlueprintViewV21';
import type { StrategicUncertaintySprint } from '../src/types/paidTest';
import type { GetMeLiveShareDraft } from '../src/types/getMeLive';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

// Server rendering runs no effects, so screens that load data would only show
// their loading state. Tests can seed a component's useState calls, in order,
// to render the loaded screen. `undefined` keeps the component's own value.
const seeded = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  const useState = ((initial: unknown) => {
    const position = seeded.index++;
    const value = seeded.values[position];
    return actual.useState(value === undefined ? initial : value);
  }) as typeof actual.useState;
  return { ...actual, default: { ...actual, useState }, useState };
});

const { default: UserDashboard } = await import('../src/components/UserDashboard');
const { default: LaunchBlueprintRouter } = await import('../src/components/LaunchBlueprintRouter');
const { default: LaunchBlueprintExecutionHomeV21 } = await import('../src/components/LaunchBlueprintExecutionHomeV21');
const { default: LaunchBlueprintCopilotV21 } = await import('../src/components/LaunchBlueprintCopilotV21');
const { default: StrategicUncertaintySprintPanel } = await import('../src/components/StrategicUncertaintySprintPanel');
const { default: SprintWebsiteEvidence } = await import('../src/components/SprintWebsiteEvidence');
const { default: SprintShareMoment } = await import('../src/components/SprintShareMoment');

function render(element: ReactElement, values: unknown[] = []) {
  seeded.values = values;
  seeded.index = 0;
  const html = renderToStaticMarkup(element);
  seeded.values = [];
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

function expectSpanish(html: string, spanish: string[], english: string[]) {
  for (const label of spanish) expect(html, label).toContain(label);
  for (const label of english) expect(html, label).not.toContain(label);
}

const noop = () => undefined;

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'https://ghosttowntest.test' }, setTimeout, clearTimeout, setInterval, clearInterval } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: noop, removeItem: noop } });
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const blueprint = launchBlueprintFixture();
const payload: BlueprintV21Payload = {
  blueprint,
  progress: {
    completedDays: [],
    evidenceNotes: {},
    evidenceLedger: [],
    checkpointReviews: [],
    metrics: { outreachSent: 0, replies: 0, interviews: 0, qualifiedConversations: 0, commitments: 0, revenueCents: 0, founderMinutes: 0, variableCostCents: 0, leads: 0 },
    updatedAt: '2026-08-19T00:00:00.000Z'
  },
  research: {
    provider: 'fixture', model: 'deterministic', completedAt: '2026-08-19T00:00:00.000Z',
    attemptedSourceCount: 6, successfulSourceCount: 6, sourceTypeCount: 3, verifiedChannelCount: 3
  }
};

describe('paid Sprint screens in Spanish', () => {
  it('UserDashboard shows Spanish labels for a loaded account', () => {
    const user = { email: 'founder@fixture.test', createdAt: '2026-08-01T12:00:00.000Z', testsUsed: 1, testsPurchased: 1, shareCredits: 0, sharesGiven: 2 };
    const plans = [{ orderId: 'order-1', ideaName: 'Pilot idea', status: 'uncertainty', createdAt: '2026-08-02T12:00:00.000Z', updatedAt: '2026-08-02T12:00:00.000Z', artifactType: 'launch_blueprint_v2', planVersion: '2.1' }];
    const live = [{ orderId: 'gml-1', sourceSprintOrderId: 'order-1', status: 'live', leadCount: 0, emailStatus: 'ready', paymentStatus: 'ready', salesCount: 0, cloudflareConnected: true, createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z' }];
    // user, loading, error, results, openingResultId, paidPlans, ..., getMeLiveOrders
    const state = [user, false, undefined, undefined, undefined, plans, undefined, undefined, undefined, undefined, undefined, undefined, live];
    const props = { hasDraft: true, onLogout: noop, onResume: noop, onStart: noop, onOpenResult: noop };

    const es = render(<UserDashboard {...props} locale="es" />, state);
    expectSpanish(es,
      ['Tu panel', 'Seguir con tu veredicto guardado', 'Cerrar sesión', '¿Listo para probar otra idea?', 'Tienes 1 veredicto disponible.', 'Empezar otro veredicto', 'Miembro desde', 'Evaluaciones anteriores', 'Lo que compraste', 'Faltan respuestas', 'Comprado el', 'Contestar preguntas', 'Tus negocios en vivo', 'En vivo', 'Hacer cambios', 'Personas interesadas', 'Premios por compartir'],
      ['Your Dashboard', 'Resume Saved Verdict', 'Log Out', 'Start Another Verdict', 'Member since', 'Previous Assessments', 'Purchased products', 'Needs answers', 'Answer questions', 'Your live businesses', 'Make Changes', 'Share Rewards']);

    const en = render(<UserDashboard {...props} />, state);
    for (const label of ['Your Dashboard', 'Resume Saved Verdict', '1 verdict available.', 'Member since', 'Needs answers', 'Purchased ', 'Answer questions', 'Share Rewards']) expect(en).toContain(label);

    expect(render(<UserDashboard {...props} locale="es" />)).toContain('Cargando tu panel...');
  });

  it('LaunchBlueprintRouter shows Spanish loading and error states', () => {
    expectSpanish(render(<LaunchBlueprintRouter orderId="order-1" onBack={noop} locale="es" />), ['Abriendo tu Launch Blueprint...'], ['Opening your Launch Blueprint']);
    // payload, legacy, loading, error
    const failed = render(<LaunchBlueprintRouter orderId="order-1" onBack={noop} locale="es" />, [undefined, undefined, false, 'boom']);
    expectSpanish(failed, ['Volver a tu panel'], ['Return to Dashboard']);
    expect(render(<LaunchBlueprintRouter orderId="order-1" onBack={noop} />)).toContain('Opening your Launch Blueprint...');
  });

  it('LaunchBlueprintExecutionHomeV21 shows the calendar and day in Spanish', () => {
    const es = render(<LaunchBlueprintExecutionHomeV21 orderId="order-1" onBack={noop} initialPayload={payload} locale="es" />);
    expectSpanish(es,
      ['← Mi panel', 'Calendario de 30 días', 'Biblioteca de materiales', 'Abre el día. Usa los materiales listos.', 'Abrir el Día 1 →', 'Descargar el Blueprint en PDF', 'Progreso', 'Próximo día', 'Cada día es una puerta al trabajo.', 'Hoy · Día 1', 'Por qué existe este día', 'Pasos exactos', 'Cómo decidir', 'Éxito:', 'Pruebas para anotar', 'Tu nota del día', 'Completar el Día 1', 'Buscando datos de tu página web de Get Me Live...'],
      ['← Dashboard', '30-Day Calendar', 'Asset Library', 'Open the day.', 'Download Blueprint PDF', 'Next scheduled day', 'Every day is a doorway', 'Today · Day', 'Why this day exists', 'Exact actions', 'Decision context', 'Evidence to record', 'Execution note', 'Complete Day 1', 'Checking for linked Get Me Live']);

    const en = render(<LaunchBlueprintExecutionHomeV21 orderId="order-1" onBack={noop} initialPayload={payload} />);
    for (const label of ['← Dashboard', '30-Day Calendar', 'Today · Day 1', 'Exact actions', 'Complete Day 1', 'Checking for linked Get Me Live website evidence...']) expect(en).toContain(label);
  });

  it('LaunchBlueprintCopilotV21 shows Spanish controls and guardrails', () => {
    expectSpanish(render(<LaunchBlueprintCopilotV21 orderId="order-1" dayNumber={3} lane="saas" locale="es" />), ['Pregúntale a GhostTown · Día 3'], ['Ask GhostTown · Day 3']);

    const latest = { recommendedAction: 'Send two follow-ups.', guardrails: { route: 'continue', mustKeep: ['offer'] }, evidenceToRecord: ['Reply count'] };
    // open, mode, question, messages, latest
    const state = [true, undefined, undefined, [{ role: 'user', content: 'Hola' }, { role: 'assistant', content: 'Respuesta' }], latest];
    const es = render(<LaunchBlueprintCopilotV21 orderId="order-1" dayNumber={3} lane="saas" locale="es" />, state);
    expectSpanish(es,
      ['Execution Copilot · Día 3', 'Experimento: SaaS', 'Cerrar', 'Prueba de venta:', 'Experimento actual', 'Sala de estrategia', 'Tú', 'Próximo paso recomendado', 'Límites del experimento', 'Puedes cambiar:', 'nada todavía', 'No cambies:', 'Anota ahora', 'Pregúntale a GhostTown', 'Pega la respuesta de un cliente', 'Preguntar'],
      ['Execution Copilot · Day', 'SaaS experiment', 'Commercial proof', 'Current Experiment', 'Strategy Room', 'Recommended bounded action', 'Experiment guardrails', 'May change', 'Keep fixed', 'Record next', 'Paste a customer response']);

    const empty = render(<LaunchBlueprintCopilotV21 orderId="order-1" dayNumber={3} lane="saas" locale="es" />, [true]);
    expectSpanish(empty, ['Revisar los resultados que anoté hoy', '¿Qué exactamente debo hacer hoy?'], ['Review today’s recorded results', 'What exactly should I do today?']);

    const en = render(<LaunchBlueprintCopilotV21 orderId="order-1" dayNumber={3} lane="saas" />, state);
    for (const label of ['Execution Copilot · Day 3', 'SaaS experiment', 'Current Experiment', 'Experiment guardrails', 'May change:', 'nothing yet']) expect(en).toContain(label);
  });

  it('StrategicUncertaintySprintPanel asks its questions in Spanish', () => {
    const sprint: StrategicUncertaintySprint = {
      schemaVersion: 'strategic-uncertainty-sprint-v1', orderId: 'order-1', sourceVerdictId: 'v1', createdAt: '2026-08-01T00:00:00.000Z',
      horizonDays: 3, status: 'open', chainSummary: 'Chain summary from server.', unresolvedLinks: ['buyer_payer'], blockers: [],
      questions: [{ questionId: 'q1', link: 'buyer_payer', question: '¿Quién paga?', whyItMatters: 'Porque sí.', requiredEvidence: 'Un correo' }],
      unlockCondition: 'Answer all.'
    };
    const props = { orderId: 'order-1', onBack: noop, onSubmitted: noop };
    expectSpanish(render(<StrategicUncertaintySprintPanel {...props} locale="es" />), ['← Volver', 'Cargando tus preguntas…'], ['← Back', 'Loading your questions']);

    const es = render(<StrategicUncertaintySprintPanel {...props} locale="es" />, [sprint]);
    expectSpanish(es,
      ['Sprint de claridad de 3 días', 'Antes de armar tus 30 días, necesito unas respuestas.', 'Tu Sprint de $97 sigue activo', 'Por qué GhostTown se detuvo', 'Pregunta 1 · quién compra y quién paga', 'Prueba que ayuda:', 'Escribe aquí tu respuesta concreta.', 'Guardar respuestas y rehacer mi Sprint'],
      ['3-day clarity Sprint', 'Before I build your 30 days', 'Why GhostTown stopped', 'Question 1', 'Useful proof', 'Type the concrete answer here.', 'Save answers and rebuild my Sprint']);

    const en = render(<StrategicUncertaintySprintPanel {...props} />, [sprint]);
    for (const label of ['3-day clarity Sprint', 'Question 1 · buyer payer', 'Useful proof: Un correo', 'Save answers and rebuild my Sprint']) expect(en).toContain(label);
  });

  it('SprintWebsiteEvidence shows website signals in Spanish', () => {
    expectSpanish(render(<SprintWebsiteEvidence orderId="order-1" dayNumber={4} locale="es" />), ['Buscando datos de tu página web de Get Me Live...', 'aria-label="Lo que muestra tu página web de Get Me Live"'], ['Checking for linked', 'Website evidence from Get Me Live']);

    const evidence = {
      available: true, separateProduct: true, liveUrl: 'https://example.test',
      activity: { visits: 12, leads: 2, shares: 1, sales: 1, revenueCents: 4500 },
      recentFeedback: [{ createdAt: '2026-08-04T15:00:00.000Z', message: 'Me encanta', sourcePath: '/' }],
      capturedAt: '2026-08-05T15:00:00.000Z'
    };
    const es = render(<SprintWebsiteEvidence orderId="order-1" dayNumber={4} locale="es" />, [evidence, 'ready']);
    expectSpanish(es,
      ['Tu página web - Get Me Live', 'Lo que tu página web está mostrando ahora mismo.', 'Actualizar datos de la página', 'Visitas', 'Contactos', 'Ventas', 'Valor de ventas', '$45.00', 'En el Día 4 puedes usar', 'Comentarios recientes de visitantes', 'Abrir tu página web', 'Revisado'],
      ['Website evidence - Get Me Live', 'What your live website', 'Refresh website evidence', 'Visits', 'Leads', 'Sales value', 'Day 4 can use', 'Recent visitor feedback', 'Open linked website', 'Checked']);

    const checkpoint = render(<SprintWebsiteEvidence orderId="order-1" checkpointDay={7} locale="es" />, [evidence, 'ready']);
    expect(checkpoint).toContain('la revisión del Día 7');

    const en = render(<SprintWebsiteEvidence orderId="order-1" dayNumber={4} />, [evidence, 'ready']);
    for (const label of ['Website evidence - Get Me Live', 'Visits', 'Day 4 can use these live-site signals', 'Open linked website', 'Checked ']) expect(en).toContain(label);
  });

  it('SprintShareMoment offers the post in Spanish', () => {
    const draft: GetMeLiveShareDraft = {
      draftId: 'd1', ownerId: 'o1', sourceSprintOrderId: 'order-1', draftType: 'sprint', position: 0,
      generatedText: 'Texto', editedText: 'Texto', createdAt: '2026-08-01T00:00:00.000Z'
    };
    const es = render(<SprintShareMoment sourceSprintOrderId="order-1" locale="es" />, [draft]);
    expectSpanish(es,
      ['Comparte tu progreso', 'Tu post está casi listo.', 'No se publica nada hasta que tú lo compartas.', '>Copiar<', '>Compartir<', '>Ahora no<'],
      ['Share your progress', 'Your post is almost ready.', '>Copy<', '>Share<', '>Skip<']);

    const en = render(<SprintShareMoment sourceSprintOrderId="order-1" />, [draft]);
    for (const label of ['Share your progress', 'Your post is almost ready.', '>Copy<', '>Share<', '>Skip<']) expect(en).toContain(label);
  });
});
