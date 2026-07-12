import { authenticateRequest } from './auth';
import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { PaidTestIntake, PaidTestOrder, PaidTestReport, ReportClaim, TruthLabel } from '../types/paidTest';
import { extractJSONFromText } from '../lib/verdictValidator';

const VERSION = '1.0' as const;
const json = (body: unknown, status = 200, extra: HeadersInit = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });
const orderKey = (id: string) => `paid_test_order_${id}`;
const reportKey = (id: string) => `paid_test_report_${id}`;
const DEFAULT_ACTION_PLAN_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

function id(prefix: string): string { return `${prefix}_${crypto.randomUUID()}`; }
function claim(label: TruthLabel, text: string): ReportClaim { return { label, text }; }

function validIntake(value: Partial<PaidTestIntake>): value is PaidTestIntake {
  return Boolean(value.verdictId?.trim() && value.targetBuyer?.trim() && value.problem?.trim() && value.currentWorkaround?.trim());
}

async function savedVerdict(env: Env, verdictId: string): Promise<EvaluationResult | null> {
  const raw = await env.KV.get(`verdict_${verdictId}`) ?? await env.KV.get(`verdict:${verdictId}`);
  return raw ? JSON.parse(raw) as EvaluationResult : null;
}

export async function handlePaidTestCheckout(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const intake = await request.json<Partial<PaidTestIntake>>();
  if (!validIntake(intake)) return json({ error: 'verdictId, targetBuyer, problem, and currentWorkaround are required' }, 400);
  const verdict = await savedVerdict(env, intake.verdictId);
  if (!verdict) return json({ error: 'The source LIT verdict was not found' }, 404);
  const now = new Date().toISOString();
  const order: PaidTestOrder = { orderId: id('gtt'), email: auth.email, verdictId: intake.verdictId, status: 'pending', reportVersion: VERSION, intake: { ...intake, competitorLinks: intake.competitorLinks?.filter(Boolean) }, createdAt: now, updatedAt: now };
  await env.KV.put(orderKey(order.orderId), JSON.stringify(order));
  const fields = new URLSearchParams({
    'line_items[0][price]': env.STRIPE_PAID_TEST_PRICE_ID,
    'line_items[0][quantity]': '1', 'mode': 'payment', 'customer_email': auth.email,
    'client_reference_id': order.orderId,
    'metadata[paid_test_order_id]': order.orderId,
    'success_url': `${env.FRONTEND_URL?.replace(/\/$/, '') || new URL(request.url).origin}/paid-test/success?order_id=${encodeURIComponent(order.orderId)}`,
    'cancel_url': `${env.FRONTEND_URL?.replace(/\/$/, '') || new URL(request.url).origin}/`
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: fields.toString() });
  if (!response.ok) { await env.KV.delete(orderKey(order.orderId)); return json({ error: 'Checkout is unavailable' }, 502); }
  const session = await response.json() as { id: string; url: string };
  order.stripeCheckoutSessionId = session.id; order.updatedAt = new Date().toISOString();
  await env.KV.put(orderKey(order.orderId), JSON.stringify(order));
  return json({ sessionUrl: session.url });
}

export function createPaidTestReport(order: PaidTestOrder, verdict: EvaluationResult): PaidTestReport {
  const buyer = order.intake.targetBuyer;
  const problem = order.intake.problem;
  const workaround = order.intake.currentWorkaround;
  const price = order.intake.expectedPrice?.trim() || '$29';
  const headline = `${buyer} can address ${problem} without relying on ${workaround}.`;
  const sections: PaidTestReport['sections'] = [
    { title: 'Idea Summary', claims: [claim('Inferred', `${verdict.idea.ideaName}: ${verdict.idea.description}`), claim('Inferred', `LIT recommends: ${verdict.deterministicScores.recommendedNextTest}`)] },
    { title: 'LIT Verdict Summary', claims: [claim('Inferred', `Verdict: ${verdict.deterministicScores.verdictHeadline}`), claim('Inferred', verdict.deterministicScores.oneSentenceAdvice)] },
    { title: 'Buyer Segment', claims: [claim('Inferred', `Start with one narrow segment: ${buyer}.`), claim('Test', `Confirm this segment can name a recent instance of ${problem} and has authority or access to the decision maker.`)] },
    { title: 'Buyer Interview Kit', claims: [
      claim('Test', 'Tell me about the last time this happened.'), claim('Test', 'What triggered you to solve it, and what did you try first?'), claim('Test', `What are you using today instead of a better way to handle ${problem}?`), claim('Test', `What is frustrating or costly about ${workaround}?`), claim('Test', 'Who approves spending for this?'), claim('Test', 'Have you paid for a solution before?'), claim('Test', 'What would need to be true for you to switch?'), claim('Test', `Would you test a paid pilot at ${price}? Why or why not?`),
      claim('Test', `Outreach: “I am researching how ${buyer} handle ${problem}. I am not selling anything; could I ask about the last time you dealt with it?”`),
      claim('Test', 'Recruit people who experienced the problem recently; disqualify people who cannot describe a real past workflow.')
    ] },
    { title: 'Alternatives and Workarounds', claims: [claim('Inferred', `Current workaround supplied in intake: ${workaround}.`), claim('Test', 'Direct competitors: record only products or services named by buyers or supplied links.'), claim('Test', 'Indirect alternatives: record tools that solve only part of the job.'), claim('Test', 'Do nothing: document the consequence buyers describe if nothing changes.'), claim('Test', 'Switching friction: test cost, trust, time, migration, training, habit, and approval friction.'), claim('Test', 'Differentiation: confirm why a buyer would choose this offer over the named alternative.') ] },
    { title: 'Landing-Page Test Copy', claims: [claim('Inferred', `Headline: ${headline}`), claim('Inferred', `Subheadline: A focused offer for ${buyer} tired of ${problem}.`), claim('Inferred', `Offer: Get a clearer path through ${problem} with a focused pilot instead of ${workaround}.`), claim('Inferred', `Price: Founding pilot ${price}.`), claim('Test', 'CTA: Apply for a pilot. Track landing page viewed, CTA clicked, email captured, pilot requested, checkout started, and deposit paid.') ] },
    { title: 'Offer and Price Hypothesis', claims: [claim('Inferred', `Buyer: ${buyer}. Pain: ${problem}.`), claim('Inferred', `Starter promise: reduce the uncertainty or burden of ${problem} through a narrowly scoped pilot.`), claim('Inferred', `Launch price: ${price}. Define three to five deliverables and what is not included before asking.`), claim('Test', `Ask five qualified buyers for ${price} and five for a higher price. Record objections verbatim; count deposits, pilots, or scheduled serious sales calls—not compliments.`) ] },
    { title: 'Seven-Day Validation Plan', claims: [
      claim('Test', 'Day 0: choose one buyer, problem, offer, and price; write a one-page test brief.'), claim('Test', 'Day 1: list 25 qualified prospects and send 10 outreach messages; pass is 3 replies or 2 booked conversations.'), claim('Test', 'Day 2: run 2 interviews; capture exact language and current workaround.'), claim('Test', 'Day 3: publish the paid offer with tracking; fix clarity before buying traffic.'), claim('Test', 'Day 4: ask 5 qualified buyers for a paid pilot, deposit, or commitment.'), claim('Test', 'Day 5: run 3 more interviews; summarize repeating job, urgency, alternative, and objection.'), claim('Test', 'Day 6: follow up and ask for a commitment; count access, deposit, pilot agreement, or scheduled next step.'), claim('Test', 'Day 7: Continue for repeated pain plus meaningful commitment; Pivot if pain exists but segment, offer, price, or channel is wrong; Stop if there is no urgent problem, buyer access, or commitment.')
    ] },
    { title: 'Evidence Scoreboard and Limitations', claims: [claim('Test', 'Strong evidence: paid deposit, paid pilot, signed agreement, access/data/time, or an introduction to a decision maker.'), claim('Test', 'Medium evidence: serious sales call, buying-process objection, proposal, or trial request.'), claim('Test', 'Weak evidence: likes, compliments, generic waitlist signups, or friends saying they would use it.'), claim('Verified', 'This report contains no customer quotes, competitor features, market size, search demand, sales evidence, or citations unless supplied and independently verified.'), claim('Inferred', 'This is a validation experiment, not a promise of product-market fit, revenue, investor readiness, or certainty.') ] }
  ];
  const report: PaidTestReport = { reportId: id('report'), orderId: order.orderId, reportVersion: VERSION, createdAt: new Date().toISOString(), verdict: { resultId: verdict.resultId, idea: verdict.idea, deterministicScores: verdict.deterministicScores, generatedAt: verdict.generatedAt }, sections, qualityGate: { passed: false, failures: [] }, generationReceipt: { sourceVerdictId: verdict.resultId, generatedAt: new Date().toISOString(), reportVersion: VERSION } };
  report.qualityGate = qualityGate(report);
  return report;
}

export function qualityGate(report: PaidTestReport): { passed: boolean; failures: string[] } {
  const required = ['Buyer Interview Kit', 'Alternatives and Workarounds', 'Landing-Page Test Copy', 'Offer and Price Hypothesis', 'Seven-Day Validation Plan', 'Evidence Scoreboard and Limitations'];
  const failures = required.filter(title => !report.sections.some(section => section.title === title && section.claims.length > 0)).map(title => `Missing ${title}`);
  if (!report.sections.flatMap(section => section.claims).some(item => item.label === 'Test')) failures.push('No test-labelled claims');
  if (!report.generationReceipt.sourceVerdictId) failures.push('Missing source verdict receipt');
  return { passed: failures.length === 0, failures };
}

export async function fulfillPaidTestOrder(env: Env, orderId: string, session: Record<string, unknown>): Promise<void> {
  const raw = await env.KV.get(orderKey(orderId)); if (!raw) throw new Error('Paid test order not found');
  const order = JSON.parse(raw) as PaidTestOrder;
  if (order.status === 'ready') return;
  const verdict = await savedVerdict(env, order.verdictId); if (!verdict) throw new Error('Source verdict not found');
  order.status = 'generating'; order.stripeCheckoutSessionId = String(session.id || order.stripeCheckoutSessionId || ''); order.stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined; order.stripeCustomerId = typeof session.customer === 'string' ? session.customer : undefined; order.updatedAt = new Date().toISOString(); await env.KV.put(orderKey(orderId), JSON.stringify(order));
  const report = createPaidTestReport(order, verdict);
  try {
    const enhancedSections = await generateEnhancedSections(order, verdict, env);
    if (enhancedSections) report.sections = enhancedSections;
  } catch (error) {
    console.warn('Larger-model action plan failed; using verified fallback:', error);
  }
  report.qualityGate = qualityGate(report);
  if (!report.qualityGate.passed) { order.status = 'failed'; order.updatedAt = new Date().toISOString(); await env.KV.put(orderKey(orderId), JSON.stringify(order)); throw new Error(report.qualityGate.failures.join(', ')); }
  await env.KV.put(reportKey(orderId), JSON.stringify(report)); order.status = 'ready'; order.updatedAt = new Date().toISOString(); await env.KV.put(orderKey(orderId), JSON.stringify(order));
}

async function generateEnhancedSections(order: PaidTestOrder, verdict: EvaluationResult, env: Env): Promise<PaidTestReport['sections'] | null> {
  const prompt = `You are a rigorous startup validation strategist. Create a specific, practical action plan from the supplied evidence.
Never invent market facts, customer quotes, competitor claims, demand, or revenue. Label every claim exactly Verified, Inferred, or Test.
Return JSON only as {"sections":[{"title":"...","claims":[{"label":"Test","text":"..."}]}]}.
Required section titles: Idea Summary; LIT Verdict Summary; Buyer Segment; Buyer Interview Kit; Alternatives and Workarounds; Landing-Page Test Copy; Offer and Price Hypothesis; Seven-Day Validation Plan; Evidence Scoreboard and Limitations.
The Seven-Day Validation Plan must include Day 0 through Day 7, concrete quantities, pass/fail thresholds, and the next decision.
Make outreach, interview questions, landing-page copy, offer, pricing test, and evidence thresholds specific to this buyer and problem.

SOURCE VERDICT:
${JSON.stringify({ idea: verdict.idea, scores: verdict.deterministicScores, analysis: verdict.analysis, aiVerdict: verdict.verdict })}

BUYER INPUT:
${JSON.stringify(order.intake)}`;
  const model = env.ACTION_PLAN_AI_MODEL?.trim() || DEFAULT_ACTION_PLAN_MODEL;
  const response = await (env.AI as unknown as {
    run(model: string, input: { prompt: string; max_tokens: number; temperature: number }): Promise<unknown>
  }).run(model, { prompt, max_tokens: 4000, temperature: 0.25 });
  const text = response && typeof response === 'object' && typeof (response as { response?: unknown }).response === 'string'
    ? (response as { response: string }).response
    : '';
  const parsed = extractJSONFromText(text) as { sections?: unknown } | null;
  if (!parsed || !Array.isArray(parsed.sections)) return null;
  const sections = parsed.sections.filter(isReportSection);
  const candidate: PaidTestReport = { ...createPaidTestReport(order, verdict), sections };
  return qualityGate(candidate).passed ? sections : null;
}

function isReportSection(value: unknown): value is PaidTestReport['sections'][number] {
  if (!value || typeof value !== 'object') return false;
  const section = value as { title?: unknown; claims?: unknown };
  return typeof section.title === 'string'
    && Array.isArray(section.claims)
    && section.claims.length > 0
    && section.claims.every(item => {
      if (!item || typeof item !== 'object') return false;
      const claimValue = item as { label?: unknown; text?: unknown };
      return ['Verified', 'Inferred', 'Test'].includes(String(claimValue.label))
        && typeof claimValue.text === 'string'
        && claimValue.text.trim().length > 0;
    });
}

export async function handlePaidTestReport(request: Request, env: Env, orderId: string): Promise<Response> {
  const auth = await authenticateRequest(request, env); if (!auth) return json({ error: 'Authentication required' }, 401);
  const rawOrder = await env.KV.get(orderKey(orderId)); if (!rawOrder) return json({ error: 'Report not found' }, 404);
  const order = JSON.parse(rawOrder) as PaidTestOrder; if (order.email !== auth.email || order.status !== 'ready') return json({ error: 'Report is not available' }, 403);
  const report = await env.KV.get(reportKey(orderId)); return report ? new Response(report, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="ghosttown-test-${orderId}.json"` } }) : json({ error: 'Report not found' }, 404);
}

/** A dependency-free, printable PDF so delivery does not depend on a browser redirect or a third-party renderer. */
function pdfEscape(text: string): string { return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7e]/g, ''); }
function wrap(text: string, width = 92): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' '); const lines: string[] = []; let line = '';
  for (const word of words) { if (`${line} ${word}`.trim().length > width && line) { lines.push(line); line = word; } else line = `${line} ${word}`.trim(); }
  if (line) lines.push(line); return lines;
}
function renderPdf(report: PaidTestReport): Uint8Array {
  const lines = ['GhostTown Test — 7-Day Validation Plan', `Report version ${report.reportVersion} | Source verdict ${report.generationReceipt.sourceVerdictId}`, ''];
  for (const section of report.sections) { lines.push(section.title); for (const item of section.claims) lines.push(...wrap(`[${item.label}] ${item.text}`)); lines.push(''); }
  const pageLines = 46; const pages = Array.from({ length: Math.ceil(lines.length / pageLines) }, (_, i) => lines.slice(i * pageLines, (i + 1) * pageLines));
  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`];
  pages.forEach((page, index) => { const pageId = 3 + index * 2; const contentId = pageId + 1; const stream = `BT /F1 9 Tf 48 760 Td 12 TL ${page.map(line => `(${pdfEscape(line)}) Tj T*`).join('\n')} ET`; objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`); });
  let pdf = '%PDF-1.4\n'; const offsets = [0]; objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }); const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export async function handlePaidTestPdf(request: Request, env: Env, orderId: string): Promise<Response> {
  const auth = await authenticateRequest(request, env); if (!auth) return json({ error: 'Authentication required' }, 401);
  const rawOrder = await env.KV.get(orderKey(orderId)); if (!rawOrder) return json({ error: 'Report not found' }, 404);
  const order = JSON.parse(rawOrder) as PaidTestOrder; if (order.email !== auth.email || order.status !== 'ready') return json({ error: 'Report is not available' }, 403);
  const rawReport = await env.KV.get(reportKey(orderId)); if (!rawReport) return json({ error: 'Report not found' }, 404);
  const bytes = renderPdf(JSON.parse(rawReport) as PaidTestReport);
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Response(body, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="ghosttown-test-${orderId}.pdf"` } });
}
