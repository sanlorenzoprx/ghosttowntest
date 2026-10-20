import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { BlueprintV21Payload } from '../src/components/LaunchBlueprintViewV21';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

// Server rendering cannot click tabs, so the test picks the opening tab by
// swapping the component's initial "overview" state for the tab under test.
const selected = vi.hoisted(() => ({ tab: 'overview' }));
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  const useState = ((initial: unknown) => actual.useState(initial === 'overview' ? selected.tab : initial)) as typeof actual.useState;
  return { ...actual, default: { ...actual, useState }, useState };
});

const { default: LaunchBlueprintViewV21, describeReminderReference } = await import('../src/components/LaunchBlueprintViewV21');

const TABS = ['overview', 'today', 'record', 'followups', 'evidence', 'review', 'reminders', 'audit', 'research', 'revenue', 'fulfillment', 'calendar'] as const;

const blueprint = launchBlueprintFixture();
const payload: BlueprintV21Payload = {
  blueprint,
  progress: {
    completedDays: [1],
    evidenceNotes: {},
    evidenceLedger: [{
      entryId: 'fixture-evidence-1',
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      actionId: 'day-1',
      createdAt: '2026-08-19T00:00:00.000Z',
      contactOrChannel: 'Qualified buyer interview',
      date: '2026-08-19',
      action: 'Asked for a paid pilot commitment',
      response: 'Requested a concrete delivery example',
      customerLanguage: 'Show me what I receive in 48 hours',
      alternativeMentioned: 'Internal QA checklist',
      objection: 'Needs proof of turnaround time',
      commitmentOffered: '$300 pilot',
      commitmentReceived: 'Follow-up requested',
      revenueCents: 0,
      founderMinutes: 20,
      variableCostCents: 0,
      followUpDate: '2026-08-20',
      evidenceStrength: 'moderate',
      sourceNote: 'Deterministic fixture'
    }],
    checkpointReviews: [],
    reminderPreferences: { dailyAction: true, followUps: true, checkpoints: true, preferredHourLocal: 9 },
    scheduledReminders: [{
      reminderId: 'reminder-1',
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      kind: 'daily_action',
      dueAt: '2026-08-20T13:00:00.000Z',
      actionId: 'day-2',
      status: 'pending'
    }],
    metrics: {
      outreachSent: 1, replies: 1, interviews: 1, qualifiedConversations: 1, commitments: 0,
      revenueCents: 0, founderMinutes: 20, variableCostCents: 0, leads: 0
    },
    updatedAt: '2026-08-19T00:00:00.000Z'
  },
  research: {
    provider: 'fixture', model: 'deterministic', completedAt: '2026-08-19T00:00:00.000Z',
    attemptedSourceCount: 6, successfulSourceCount: 6, sourceTypeCount: 3, verifiedChannelCount: 3
  }
};

function render(tab: (typeof TABS)[number], locale?: 'en' | 'es') {
  selected.tab = tab;
  return renderToStaticMarkup(<LaunchBlueprintViewV21 orderId="fixture-order" onBack={() => undefined} initialPayload={payload} locale={locale} />);
}

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

describe('Sprint Blueprint workspace in Spanish', () => {
  it('shows Spanish tabs, headings and labels with locale="es"', () => {
    const overview = render('overview', 'es');
    for (const label of ['Resumen', 'Hoy', 'Anotar resultados', 'Seguimientos', 'Evidencia', 'Repaso semanal', 'Recordatorios', 'Punto de partida', 'Investigación y acceso', 'Primeros ingresos', 'Entrega', 'Calendario de 30 días']) {
      expect(overview).toContain(`>${label}</button>`);
    }
    expect(overview).toContain('Tarjeta de lanzamiento de 48 horas');
    expect(overview).toContain('Primer mensaje exacto');
    expect(overview).toContain('Copiar mensaje');
    expect(overview).toContain('Get Me Live');
    expect(overview).toContain('$297');
    for (const english of ['>Overview<', '>Record Results<', '>Weekly Review<', '48-hour Launch Card', 'Exact first message', 'Copy message', 'First measurable commitment']) {
      expect(overview).not.toContain(english);
    }

    const today = text(render('today', 'es'));
    expect(today).toContain('Por qué importa');
    expect(today).toContain('Marcar como hecho');
    expect(today).toContain('Anotar lo que pasó');
    expect(today).not.toContain('Why it matters');
    expect(today).not.toContain('Mark complete');

    const record = text(render('record', 'es'));
    expect(record).toContain('Anota resultados, no impresiones.');
    expect(record).toContain('Guardar evidencia');
    expect(record).not.toContain('Save evidence entry');

    const research = text(render('research', 'es'));
    expect(research).toContain('Acceso a clientes');
    expect(research).toContain('Evidencia del mercado');
    expect(research).not.toContain('Research roles');
    expect(research).not.toContain('Market evidence');

    const review = text(render('review', 'es'));
    expect(review).toContain('Guardar repaso del día 7');
    expect(review).not.toContain('Canonical review questions');

    const reminders = text(render('reminders', 'es'));
    expect(reminders).toContain('Recordatorios programados');
    expect(reminders).toContain('Acción del día 2');
    expect(reminders).not.toContain('Scheduled reminders');

    const calendar = render('calendar', 'es');
    expect(calendar).toContain('<strong>SI</strong>');
    expect(calendar).toContain('<strong>ENTONCES</strong>');
    expect(calendar).not.toContain('<strong>IF</strong>');
  });

  it('keeps the English workspace unchanged by default and with locale="en"', () => {
    for (const tab of TABS) expect(render(tab, 'en')).toBe(render(tab));
    const overview = render('overview');
    for (const label of ['Overview', 'Today', 'Record Results', 'Follow-ups', 'Evidence', 'Weekly Review', 'Reminders', 'Starting State', 'Research &amp; Access', 'First Revenue', 'Fulfillment', '30-Day Calendar']) {
      expect(overview).toContain(`>${label}</button>`);
    }
    expect(overview).toContain('48-hour Launch Card');
    expect(overview).toContain('Exact first message');
    expect(text(render('today'))).toContain('Why it matters');
    expect(text(render('research'))).toContain('Know which evidence can actually reach a buyer.');
    expect(render('calendar')).toContain('<strong>IF</strong>');
  });

  it('describes reminder references in both languages', () => {
    const reminder = { reminderId: 'r', blueprintId: 'b', blueprintVersion: '2.1', kind: 'checkpoint' as const, dueAt: '', checkpointId: 'day-14', status: 'pending' as const };
    expect(describeReminderReference(reminder)).toBe('Day 14 checkpoint review');
    expect(describeReminderReference(reminder, 'es')).toBe('Repaso del día 14');
  });
});
