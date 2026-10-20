import { describe, expect, it } from 'vitest';
import { BLUEPRINT_ASSET_FILENAMES, buildBlueprintAssetFiles } from '../src/api/blueprintAssets';
import { composeBlueprintDocumentModel, validateBlueprintDocumentAgainstCanonical } from '../src/api/blueprintDocumentModel';
import { renderBlueprintDocumentHtml } from '../src/api/blueprintDocumentHtml';
import { renderLaunchBlueprintPdfV21 } from '../src/api/blueprintPdfV21';
import { type CustomerAccessResearchInput } from '../src/api/launchBlueprintGenerator';
import { createGhostTownLaunchBlueprintV21, validateGhostTownLaunchBlueprintV21 } from '../src/api/launchBlueprintGeneratorV21';
import {
  BLUEPRINT_DAILY_BUYER_COPY,
  BLUEPRINT_DAILY_FOUNDER_COPY
} from '../src/lib/blueprintFixedCopy';
import type { EvaluationResult } from '../src/types/lit';
import type { GhostTownLaunchBlueprintV21 } from '../src/types/launchBlueprintV21';
import type { PaidTestOrder } from '../src/types/paidTest';

const verdictTemplate = {
  resultId: 'fixture-verdict-spanish', generatedAt: '2026-07-31T12:00:00.000Z',
  idea: { ideaName: 'Family Game Night', description: 'Curated family game nights.', targetUser: 'Families with children', painfulProblem: 'Choosing games is difficult.', currentAlternative: 'Buying random games', motivation: 'Firsthand experience' },
  deterministicScores: { ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'subscription', businessDnaTrap: 'Inventory risk', businessDnaWinStrategy: 'Concierge pilot', finalVerdict: 'test_first', verdictHeadline: 'Test first', verdictExplanation: 'Demand is not yet proven.', recommendedNextTest: 'Sell a pilot.', doNotBuildUntil: 'A family pays.', oneSentenceAdvice: 'Sell before stocking.' }, usedAI: false, cacheHit: false, answers: {}
};

const researchDate = '2026-07-31';
const research: CustomerAccessResearchInput = {
  status: 'complete', researchDate,
  sources: Array.from({ length: 10 }, (_, index) => ({ sourceId: `source-${index}`, title: `Source ${index}`, url: `https://example.com/source-${index}`, publisher: 'Fixture', accessedAt: `${researchDate}T12:00:00.000Z`, evidenceDate: '2026-07-25T12:00:00.000Z', evidenceDateSource: 'provider_activity', evidenceRecency: 'current', supports: [`channel-${index}`] })),
  channels: Array.from({ length: 10 }, (_, index) => ({ channelId: `channel-${index}`, community: `Community ${index}`, platform: index < 5 ? 'Community' : 'Review site', publicUrl: `https://example.com/channel-${index}`, relevance: 'Families discuss game selection.', activity: 'active', participationRules: 'Read current rules.', recommendedApproach: 'Contribute before pitching.', usefulTopic: 'Choosing a family game.', risk: 'Rules can change.', firstAction: 'Read recent discussions.', confidence: 'high', researchDate, evidenceDate: '2026-07-25T12:00:00.000Z', evidenceDateSource: 'provider_activity', evidenceRecency: 'current', currentActivityStatus: 'verified_current', currentActivityVerifiedAt: `${researchDate}T12:00:00.000Z`, currentActivityEvidence: 'Fixture provider observed current public activity.', sourceIds: [`source-${index}`], targetType: index < 5 ? 'community' : 'review_site', evidenceRole: index < 5 ? 'customer_access' : 'market_evidence' })) as CustomerAccessResearchInput['channels'],
  publicExpertsAndPartners: []
};

const baseIntake = {
  verdictId: 'fixture-verdict-spanish', targetBuyer: 'Families with children', problem: 'Choosing games is difficult.', currentWorkaround: 'Buying random games',
  offerHypothesis: 'A curated first month.', expectedPrice: '$49', currentStage: 'Idea', geography: 'Puerto Rico', customerNotes: 'Parents described unused purchases.'
};

function build(languages: Partial<Pick<PaidTestOrder['intake'], 'founderLanguage' | 'buyerLanguage'>> = {}): GhostTownLaunchBlueprintV21 {
  const verdict = JSON.parse(JSON.stringify(verdictTemplate)) as EvaluationResult;
  const order = {
    orderId: 'gtt_spanish_12345678', email: 'founder@fixture.test', verdictId: verdict.resultId, status: 'generating', artifactType: 'launch_blueprint_v2', reportVersion: '1.0', planVersion: '2.1',
    intake: { ...baseIntake, ...languages }, createdAt: verdict.generatedAt, updatedAt: verdict.generatedAt
  } as PaidTestOrder;
  return createGhostTownLaunchBlueprintV21(order, verdict, research);
}

const day = (blueprint: GhostTownLaunchBlueprintV21, n: number) => blueprint.dailyCalendar[n - 1].executionPacket!;
const fileText = (files: Array<{ name: string; data: Uint8Array }>, name: string) => new TextDecoder().decode(files.find(file => file.name.endsWith(name))!.data);
const pdfText = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes)
  .replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)))
  .replace(/\\\(/g, '(').replace(/\\\)/g, ')');

describe('Spanish Blueprint fixed text', () => {
  it('writes founder text in Spanish and keeps buyer text in the buyer language', () => {
    const english = build();
    const spanish = build({ founderLanguage: 'es', buyerLanguage: 'en' });

    expect(spanish.languages).toEqual({ founder: 'es', buyer: 'en' });
    expect(english.languages).toBeUndefined();

    // Founder-facing: Spanish.
    expect(spanish.adaptiveCheckpoints.map(item => item.title)).toEqual(['Revisión de cliente, problema y acceso', 'Revisión de conversaciones y evidencia del problema', 'Revisión de compromisos y entrega', 'Decisión de negocio basada en evidencia']);
    expect(spanish.evidenceHierarchy.strong).toContain('Pago');
    expect(spanish.manualFulfillmentPlan.grossMarginGuardrail).toContain('70%');
    expect(spanish.manualFulfillmentPlan.estimatedFounderHours).toMatch(/horas tuyas/);
    expect(spanish.firstRevenuePath.commitmentMethod).toMatch(/^Usa un enlace de pago real/);
    expect(spanish.launchCard48Hour.firstOffer).toBe(`${spanish.offer.offerName} a ${spanish.offer.initialTestPrice}`);
    expect(spanish.startingStateAudit.criticalTests[0]).toMatchObject({ assumptionId: 'critical-test-problem', assumption: 'Los compradores calificados vivieron el problema hace poco y les importa.' });
    expect(spanish.offerConversationGuide.opening).toMatch(/^Confirma el problema reciente/);
    expect(spanish.weeklyMilestones[0].objective).toMatch(/^Activa el Launch Site Starter/);
    expect(spanish.finalDecision.criteria.map(item => item.decision)).toEqual(['continue', 'revise', 'pivot', 'stop']);
    expect(spanish.finalDecision.criteria[0].condition).toMatch(/^Varios compradores calificados/);
    expect(day(spanish, 1).title).toBe('Empieza con el compromiso más arriesgado');
    expect(day(spanish, 1).assets[0].title).toBe('Resumen de evidencia de 48 horas');
    expect(day(spanish, 1).assets[0].finishedContent).toContain('Contexto comercial del plan');
    expect(day(spanish, 1).completionDefinition).toMatch(/^El Día 1 está completo solo cuando/);
    expect(day(spanish, 7).branchRules[0].condition).toMatch(/^FALLA si/);
    expect(day(spanish, 4).assets[0].personalizationFields.map(field => field.description)).toContain('Lo escribes tú: el nombre de la persona.');

    // Buyer-facing: English, because the buyers read English.
    expect(spanish.customerInterviewGuide).toEqual(english.customerInterviewGuide);
    expect(spanish.offerConversationGuide.commitmentRequest).toBe(english.offerConversationGuide.commitmentRequest);
    expect(spanish.offerConversationGuide.offerExplanation).toBe(english.offerConversationGuide.offerExplanation);
    expect(spanish.foundingCustomerPilotBrief.proofBoundary).toBe(english.foundingCustomerPilotBrief.proofBoundary);
    const discovery = day(spanish, 4).assets[0].finishedContent;
    expect(discovery).toContain('# Secuencia de descubrimiento');
    expect(discovery).toContain('Hi {{firstName}} — I’m researching how');
    expect(discovery).toContain('## Regla para parar');
    expect(day(spanish, 16).assets[0].finishedContent).toContain('# Invitación al piloto pagado\n\nSubject: a bounded');

    // Machine keys stay the same in every language.
    const ids = (blueprint: GhostTownLaunchBlueprintV21) => blueprint.dailyCalendar.map(item => [item.completionKey, ...item.executionPacket!.assets.map(asset => asset.assetId), ...item.executionPacket!.assets.flatMap(asset => asset.lineage.sourceAssetIds), ...item.executionPacket!.targets.map(target => target.targetId)]);
    expect(ids(spanish)).toEqual(ids(english));
    expect(spanish.firstRevenuePath.firstChannel).toBe(english.firstRevenuePath.firstChannel);
    // The release gate recognises these three statements by their English phrases.
    const facts = spanish.startingStateAudit.verifiedFacts.map(item => item.statement);
    for (const prefix of ['Target buyer supplied by the founder:', 'Problem supplied by the founder:', 'Current workaround supplied by the founder:']) {
      expect(facts.some(fact => fact.startsWith(prefix)), prefix).toBe(true);
    }

    // The Spanish Blueprint passes the same quality gate as the English one.
    expect(validateGhostTownLaunchBlueprintV21(spanish).failures).toEqual(validateGhostTownLaunchBlueprintV21(english).failures);
  });

  it('writes buyer text in Spanish when the buyers read Spanish, even if the founder reads English', () => {
    const blueprint = build({ founderLanguage: 'en', buyerLanguage: 'es' });
    expect(blueprint.adaptiveCheckpoints[0].title).toBe('Customer, problem, and access review');
    expect(blueprint.customerInterviewGuide.opening).toMatch(/^Estoy investigando cómo la gente maneja hoy/);
    expect(blueprint.customerInterviewGuide.lastOccurrenceQuestions[0]).toBe('Cuéntame de la última vez que pasó.');
    expect(blueprint.offerConversationGuide.commitmentRequest).toMatch(/^¿Quieres aprobar el alcance/);
    expect(blueprint.offerConversationGuide.opening).toMatch(/^Confirm the recent problem/);
    expect(blueprint.foundingCustomerPilotBrief.proofBoundary).toMatch(/^Oferta en etapa de validación/);
    const discovery = day(blueprint, 4).assets[0].finishedContent;
    expect(discovery).toContain('# Discovery Sequence');
    expect(discovery).toContain('Hola, {{firstName}}. Estoy investigando');
    expect(day(blueprint, 9).assets[0].finishedContent).toContain('# Resumen del piloto para clientes fundadores');
    expect(validateGhostTownLaunchBlueprintV21(blueprint).failures).toEqual(validateGhostTownLaunchBlueprintV21(build()).failures);
  });

  it('keeps every daily list complete and every message using the same personalization fields in both languages', () => {
    for (const locale of ['en', 'es'] as const) {
      expect(BLUEPRINT_DAILY_FOUNDER_COPY[locale].titles).toHaveLength(30);
      expect(BLUEPRINT_DAILY_FOUNDER_COPY[locale].assetNames).toHaveLength(30);
    }
    const fields = (text: string) => [...text.matchAll(/{{([A-Za-z]+)}}/g)].map(match => match[1]).sort();
    const sample = (locale: 'en' | 'es') => {
      const m = BLUEPRINT_DAILY_BUYER_COPY[locale];
      return [m.discovery('c', 'p'), m.discoveryFollowUp, m.replyTransition, m.paidInvitation({ offerName: 'o', problem: 'p', q1Offer: 'q', price: '$1', deliverables: ['d'], proofBoundary: 'b' }), m.valueFollowUp('p'), m.deliveryCoverNote('o'), m.feedback, m.secondTest('p')].map(fields);
    };
    expect(sample('es')).toEqual(sample('en'));
  });
});

describe('Spanish Blueprint document, PDF and ZIP', () => {
  it('renders the document model and HTML headings in the founder language', () => {
    const blueprint = build({ founderLanguage: 'es', buyerLanguage: 'en' });
    const model = composeBlueprintDocumentModel(blueprint);
    expect(validateBlueprintDocumentAgainstCanonical(model, blueprint)).toEqual([]);
    expect(model.languages).toEqual({ founder: 'es', buyer: 'en' });
    expect(model.prioritySections.map(section => section.title).slice(0, 5)).toEqual(['Tarjeta de lanzamiento de 48 horas', 'Primer cliente', 'Primera oferta', 'Camino al primer ingreso', 'Investigación y acceso a clientes']);
    expect(model.prioritySections[5].title).toBe('Hoy: Día 1 — Empieza con el compromiso más arriesgado');
    expect(model.supportingSections.find(section => section.sectionId === 'get_me_live_handoff')?.content[0]).toContain('Get Me Live es un producto separado de $297, pago único.');
    expect(model.supportingSections.find(section => section.sectionId === 'full_30_day_plan')?.content[0]).toMatch(/^Día 1: El Día 1 está completo/);
    expect(model.prioritySections.find(section => section.sectionId === 'customer_access_network')?.accessGroups?.map(group => group.groupId)).toEqual(['customer_access', 'market_evidence', 'media_pr', 'partnership']);

    const html = renderBlueprintDocumentHtml(model);
    expect(html).toContain('<html lang="es">');
    expect(html).toContain('<h3>Decisión</h3>');
    expect(html).toContain('<h3>Materiales listos para usar</h3>');
    expect(html).toContain('<h3>Regla para ajustar</h3>');
    expect(html).toContain('SI ');
    expect(html).not.toContain('<h3>Ready-to-use assets</h3>');
  });

  it('keeps Spanish accents in the PDF', () => {
    const spanish = renderLaunchBlueprintPdfV21(build({ founderLanguage: 'es', buyerLanguage: 'es' }));
    const raw = new TextDecoder('latin1').decode(spanish);
    expect(raw).toContain('/BaseFont /Helvetica /Encoding /WinAnsiEncoding');
    expect(raw).toContain('Decisi\\363n');
    expect(raw).toContain('P\\301GINA');
    // The content streams stay 7-bit, so the declared stream lengths stay exact.
    expect([...spanish].every(byte => byte < 0x80)).toBe(true);
    const text = pdfText(spanish);
    for (const phrase of ['DECISIÓN', 'POR QUÉ', 'Tarjeta de lanzamiento de 48 horas', 'PÁGINA 2', '¿Quieres aprobar el alcance por escrito', 'Revisión de cliente, problema y acceso', 'Día 7', 'ABRE EL BLUEPRINT']) expect(text).toContain(phrase);

    const english = new TextDecoder('latin1').decode(renderLaunchBlueprintPdfV21(build()));
    expect(english).not.toContain('WinAnsiEncoding');
    expect(english).toContain('48-Hour Launch Card');
  });

  it('writes ZIP headings in Spanish and keeps file names and CSV column keys', () => {
    const blueprint = build({ founderLanguage: 'es', buyerLanguage: 'en' });
    const files = buildBlueprintAssetFiles(blueprint, new Uint8Array([37, 80, 68, 70]));
    expect(files.map(file => file.name.replace('ghosttown-launch-blueprint/', ''))).toEqual([...BLUEPRINT_ASSET_FILENAMES]);
    expect(fileText(files, 'README.md')).toContain('Get Me Live es un producto separado de $297, pago único');
    expect(fileText(files, 'executive-summary.md')).toContain('## Tarjeta de lanzamiento de 48 horas');
    expect(fileText(files, 'executive-summary.md')).toContain('[Verificado]');
    expect(fileText(files, 'offer-and-pricing.md')).toContain('**Modelo:** ');
    expect(fileText(files, 'offer-and-pricing.md')).toContain('## Camino al primer ingreso');
    expect(fileText(files, 'weekly-milestones.md')).toContain('## Puntos de control de evidencia');
    expect(fileText(files, 'weekly-milestones.md')).toContain('### Día 7: Revisión de cliente, problema y acceso');
    expect(fileText(files, 'weekly-milestones.md')).toContain('## Semana 1: Activa el Launch Site Starter');
    expect(fileText(files, 'decision-rules.md')).toContain('## SEGUIR');
    expect(fileText(files, 'decision-rules.md')).toContain('## Niveles de evidencia');
    expect(fileText(files, 'outreach-scripts.md')).toContain('# Guía de entrevista con clientes\n\nI am researching how people currently handle');
    expect(fileText(files, 'get-me-live-handoff.md')).toMatch(/^# Get Me Live — próximo paso opcional/);
    expect(fileText(files, 'metrics-template.csv').split('\r\n')[0]).toBe('"metric","value","evidence_to_record","evidence_strength"');
    expect(fileText(files, 'metrics-template.csv')).toContain('"outreach_sent","0","Destinatario, canal, fecha","solo actividad"');
    expect(fileText(files, 'thirty-day-calendar.csv').split('\r\n')[0]).toContain('"day","title","objective"');
    expect(fileText(files, 'thirty-day-calendar.csv')).toContain('SI FALLA si');
  });

  it('produces exactly the same output for an English intake as for an intake with no language', () => {
    const none = build();
    const english = build({ founderLanguage: 'en', buyerLanguage: 'en' });
    expect(english.languages).toEqual({ founder: 'en', buyer: 'en' });
    const comparable = (blueprint: GhostTownLaunchBlueprintV21) => {
      const copy = JSON.parse(JSON.stringify(blueprint)) as GhostTownLaunchBlueprintV21;
      delete copy.languages;
      // The language constraint records whether the order supplied a language; it predates this change.
      delete (copy.startingStateAudit.founderConstraints as Partial<typeof copy.startingStateAudit.founderConstraints>).language;
      return copy;
    };
    expect(comparable(english)).toEqual(comparable(none));
    const noneModel = composeBlueprintDocumentModel(none);
    const englishModel = composeBlueprintDocumentModel(english);
    expect(JSON.stringify(englishModel)).toBe(JSON.stringify(noneModel));
    expect(renderBlueprintDocumentHtml(englishModel)).toBe(renderBlueprintDocumentHtml(noneModel));
    const nonePdf = renderLaunchBlueprintPdfV21(none);
    const englishPdf = renderLaunchBlueprintPdfV21(english);
    expect(Buffer.from(englishPdf).equals(Buffer.from(nonePdf))).toBe(true);
    const noneFiles = buildBlueprintAssetFiles(none, nonePdf);
    const englishFiles = buildBlueprintAssetFiles(english, englishPdf);
    for (const [index, file] of englishFiles.entries()) {
      if (file.name.endsWith('blueprint.json')) continue;
      expect(Buffer.from(file.data).equals(Buffer.from(noneFiles[index].data)), file.name).toBe(true);
    }
  });
});
