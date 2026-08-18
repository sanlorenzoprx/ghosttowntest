import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const json = (path: string) => JSON.parse(read(path));

const q5Keys = [
  'source_to_session_attribution',
  'test_started',
  'verdict_completed',
  'checkout_started',
  'purchase_and_revenue',
  'blueprint_opened',
  'daily_packet_opened',
  'day_completed',
  'evidence_recorded',
  'repair_routing_supported',
  'tests_pass'
];

describe('Q5 first-party commercial measurement acceptance adapter', () => {
  it('matches the exact governing Q5 acceptance contract', () => {
    const config = json('config/commercial-quality-roadmap-v1.json');
    const q5 = config.quality_gates.find((gate: { id: string }) => gate.id === 'Q5');
    expect(q5).toBeTruthy();
    expect(q5.purpose).toBe('measurement');
    expect(q5.requires).toEqual(['Q4']);
    expect(q5.acceptance).toEqual(q5Keys);
  });

  it('is the sanctioned default Q5 hook in the stable roadmap wrapper', () => {
    const wrapper = read('scripts/roadmap-autopilot-wrapper.mjs');
    expect(wrapper).toContain("const QUALITY_Q5_ADAPTER = join(ROOT, 'scripts', 'roadmap-quality-q5-commercial-measurement.mjs')");
    expect(wrapper).toContain('process.env.ROADMAP_QUALITY_Q5_COMMAND?.trim()');
    expect(wrapper).toContain('ROADMAP_QUALITY_Q5_COMMAND: sanctionedQualityQ5Command');
  });

  it('writes a local fail-closed receipt without purchase replay or production deployment', () => {
    const adapter = read('scripts/roadmap-quality-q5-commercial-measurement.mjs');
    expect(adapter).toContain('q5-commercial-measurement-receipt.json');
    expect(adapter).toContain("schema_version: 'ghosttown-quality-q5-commercial-measurement-receipt-v1'");
    expect(adapter).toContain("decision: failedChecks.length === 0 ? 'PASS' : 'FAIL'");
    expect(adapter).toContain('purchase_replayed: false');
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).toContain('secret_values_recorded: false');
    expect(adapter).toContain('process.exit(1)');
    for (const key of q5Keys) expect(adapter).toContain(key);
  });

  it('requires source-to-Stripe lineage and all post-purchase behavioral events', () => {
    const adapter = read('scripts/roadmap-quality-q5-commercial-measurement.mjs');
    for (const metadata of [
      'metadata[attribution_token]',
      'metadata[experiment_id]',
      'metadata[source_verdict_id]',
      'metadata[creative_id]',
      'metadata[publication_id]',
      'metadata[platform]',
      'metadata[source]',
      'metadata[visitor_id]',
      'metadata[ghosttown_session_id]'
    ]) expect(adapter).toContain(metadata);
    for (const event of [
      'verdict_started',
      'verdict_completed',
      'checkout_started',
      'blueprint_opened',
      'daily_packet_opened',
      'day_completed',
      'evidence_recorded',
      'blueprint_retry_requested'
    ]) expect(adapter).toContain(event);
  });

  it('preserves Stripe webhook revenue authority and the manual production-release boundary', () => {
    const adapter = read('scripts/roadmap-quality-q5-commercial-measurement.mjs');
    expect(adapter).toContain('recordVerifiedPurchase');
    expect(adapter).toContain("authority: 'stripe_webhook'");
    expect(adapter).toContain("purpose: 'measurement'");
    expect(adapter).toContain('gate_36_remains_manual: true');
    expect(adapter).toContain('new_architecture: false');
    expect(adapter).toContain('new_provider: false');
  });
});
