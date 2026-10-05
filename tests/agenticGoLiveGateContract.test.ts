import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sprintPath = fileURLToPath(new URL('../tests/e2e/30-day-sprint-acceptance.mjs', import.meta.url));
const reportPath = fileURLToPath(new URL('../scripts/acceptance-go-live-gate-report.mjs', import.meta.url));
const sprintWithoutGmlPath = fileURLToPath(new URL('../tests/e2e/sprint-without-gml-acceptance.mjs', import.meta.url));
const stripeProofPath = fileURLToPath(new URL('../scripts/acceptance-stripe-payment-proof.mjs', import.meta.url));
const cloudflareOAuthProofPath = fileURLToPath(new URL('../scripts/acceptance-cloudflare-oauth-proof.mjs', import.meta.url));
const workflow = readFileSync(new URL('../.github/workflows/acceptance.yml', import.meta.url), 'utf8');
const sprint = readFileSync(sprintPath, 'utf8');
const report = readFileSync(reportPath, 'utf8');
const stripeProof = readFileSync(stripeProofPath, 'utf8');
const cloudflareOAuthProof = readFileSync(cloudflareOAuthProofPath, 'utf8');

describe('agentic go-live gate contract', () => {
  it('keeps both orchestration scripts syntactically valid', () => {
    for (const path of [sprintPath, sprintWithoutGmlPath, stripeProofPath, cloudflareOAuthProofPath, reportPath]) {
      const checked = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
      expect(checked.status, checked.stderr).toBe(0);
    }
  });

  it('runs the Learning Coach after recorded results, keeps automatic guidance inside the Sprint, and gates outside research by Sprint relevance', () => {
    expect(sprint).toContain("const agentic = process.env.GHOSTTOWN_E2E_AGENTIC === '1';");
    expect(sprint).toContain("phase = 'review'");
    expect(sprint).toContain('Review the recorded results for Day');
    expect(sprint).toContain('Use only this Sprint’s Blueprint, recorded evidence, saved Sprint research, and prior Sprint learning');
    expect(sprint).toContain('QA simulation only; not real customer or market evidence.');
    expect(sprint).toContain('coachMemory.reviewCount !== 30');
    expect(sprint).toContain("cachedReview.cache?.hit !== true");
    expect(sprint).toContain('verifySprintResearchGate');
    expect(sprint).toContain('Unrelated external research was not blocked before AI/web execution.');
    expect(sprint).toContain('Sprint-relevant external research did not pass the deterministic relevance gate.');
    expect(report).toContain("'sprint.agentic.no_automatic_research'");
    expect(report).toContain("'sprint.agentic.research_boundary'");
    expect(report).toContain("'sprint.agentic.relevant_research'");
    expect(report).toContain("'sprint.agentic.memory'");
    expect(report).toContain("'sprint.agentic.cache'");
  });

  it('treats missing provider proof as a blocker instead of assuming success', () => {
    expect(report).toContain("'payments.full_webhook'");
    expect(report).toContain("'gml.cloudflare_oauth'");
    expect(report).toContain("'sprint.without_gml'");
    expect(report).toContain("jsonFile('sprint-without-gml-proof.json')");
    expect(report).toContain("jsonFile('stripe-payment-webhook-proof.json')");
    expect(report).toContain("jsonFile('cloudflare-oauth-proof.json')");
    expect(report).toContain("stripePayment.signedWebhookAccepted === true");
    expect(report).toContain("stripePayment.duplicateReplayRejectedAsDuplicate === true");
    expect(report).toContain("sprintWithoutGml.progress?.writeRoundTrip === true");
    expect(report).toContain("sprintWithoutGml.coachMemory?.reviewCount === 30");
    expect(report).toContain("const result = blockers.length === 0 ? 'PASS' : 'BLOCKED';");
  });

  it('proves one recent real Stripe test payment through the signed webhook and duplicate replay boundary', () => {
    expect(stripeProof).toContain("!customerEmail.endsWith('@example.invalid')");
    expect(stripeProof).toContain("session.payment_status === 'paid'");
    expect(stripeProof).toContain("session.amount_total === GHOSTTOWN_30_DAY_PLAN_V1.amountCents");
    expect(stripeProof).toContain("env.KV.get('stripe_event_' + order.stripeEventId)");
    expect(stripeProof).toContain("successfulCharges.length !== 1");
    expect(stripeProof).toContain("replayResult?.duplicate !== true");
    expect(stripeProof).toContain("matchingAfterReplay.length !== 1");
    expect(stripeProof).toContain("secretValuesRecorded: false");
  });

  it('proves real Cloudflare consent, token persistence, account access, and refresh without injected credentials', () => {
    expect(cloudflareOAuthProof).toContain("acceptance_cloudflare_oauth_fixture_v1");
    expect(cloudflareOAuthProof).toContain("provider?.cloudflareConnected !== true");
    expect(cloudflareOAuthProof).toContain("!before?.accessToken || !before?.refreshToken");
    expect(cloudflareOAuthProof).toContain("configuredScopes.includes('memberships.read')");
    expect(cloudflareOAuthProof).toContain("configuredScopes.includes('page.write')");
    expect(cloudflareOAuthProof).toContain("expiresAt: new Date(Date.now() - 60_000).toISOString()");
    expect(cloudflareOAuthProof).toContain("accountsAfter = await listCloudflareAccounts");
    expect(cloudflareOAuthProof).toContain("refreshSucceeded: true");
    expect(cloudflareOAuthProof).toContain("secretValuesRecorded: false");
    expect(report).toContain("cloudflareOAuth.consentCallbackPersisted === true");
    expect(report).toContain("cloudflareOAuth.refreshSucceeded === true");
  });

  it('wires the gate into acceptance and preserves its evidence even when blocked', () => {
    expect(workflow).toContain('GHOSTTOWN_E2E_AGENTIC: "1"');
    expect(workflow).toContain('npx wrangler d1 migrations apply DB --env acceptance --remote');
    expect(workflow).toContain('timeout --foreground 35m node tests/e2e/30-day-sprint-acceptance.mjs');
    expect(workflow).toContain('timeout --foreground 6m node tests/e2e/sprint-without-gml-acceptance.mjs');
    expect(workflow).toContain('timeout --foreground 6m node scripts/acceptance-stripe-payment-proof.mjs');
    expect(workflow).toContain('timeout --foreground 6m node scripts/acceptance-cloudflare-oauth-proof.mjs');
    expect(workflow).toContain('SPRINT_WITHOUT_GML_OUTCOME');
    expect(workflow).toContain('STRIPE_PAYMENT_OUTCOME');
    expect(workflow).toContain('CLOUDFLARE_OAUTH_OUTCOME');
    expect(workflow).toContain('node scripts/acceptance-go-live-gate-report.mjs');
    expect(workflow).toContain('GO_LIVE_GATE_OUTCOME');
    expect(workflow).toContain('Upload acceptance execution evidence');
  });
});
