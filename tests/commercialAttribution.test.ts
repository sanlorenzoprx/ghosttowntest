import { describe, expect, it } from 'vitest';
import {
  appendStripeAttributionMetadata,
  commercialEventAttribution,
  sanitizeCommercialAttribution
} from '../src/api/commercialAttribution';

describe('Q5 commercial attribution trust boundary', () => {
  it('rejects incomplete client attribution rather than manufacturing lineage', () => {
    expect(sanitizeCommercialAttribution(null, 'verdict-1')).toBeUndefined();
    expect(sanitizeCommercialAttribution({
      schemaVersion: 'ghosttown-commercial-attribution-v1',
      attributionToken: 'gta-1',
      visitorId: 'gtv-1'
    }, 'verdict-1')).toBeUndefined();
  });

  it('sanitizes and bounds the persisted envelope at the Worker boundary', () => {
    const attribution = sanitizeCommercialAttribution({
      schemaVersion: 'ghosttown-commercial-attribution-v1',
      attributionToken: `  gta_${'x'.repeat(300)}  `,
      visitorId: '  gtv_123  ',
      ghosttownSessionId: '  gts_456  ',
      firstTouchAt: '2026-08-18T08:00:00.000Z',
      lastTouchAt: '2026-08-18T08:05:00.000Z',
      experimentId: ' exp-1 ',
      creativeId: ' creative-7 ',
      publicationId: ' pub-9 ',
      platform: ` youtube-${'p'.repeat(80)} `,
      accountId: ' burner-1 ',
      campaign: ' launch-1 ',
      source: ' youtube ',
      shareType: 'factory',
      verdictId: ' verdict-client '
    }, 'verdict-server');

    expect(attribution).toBeTruthy();
    expect(attribution?.attributionToken.length).toBeLessThanOrEqual(160);
    expect(attribution).toMatchObject({
      visitorId: 'gtv_123',
      ghosttownSessionId: 'gts_456',
      experimentId: 'exp-1',
      sourceVerdictId: 'verdict-server',
      creativeId: 'creative-7',
      publicationId: 'pub-9',
      accountId: 'burner-1',
      campaign: 'launch-1',
      source: 'youtube',
      shareType: 'factory',
      verdictId: 'verdict-client'
    });
    expect(attribution?.platform.length).toBeLessThanOrEqual(40);
  });

  it('carries sanitized lineage into Stripe metadata and event attribution', () => {
    const attribution = sanitizeCommercialAttribution({
      schemaVersion: 'ghosttown-commercial-attribution-v1',
      attributionToken: 'gta-terminal',
      visitorId: 'gtv-terminal',
      ghosttownSessionId: 'gts-terminal',
      firstTouchAt: '2026-08-18T08:00:00.000Z',
      lastTouchAt: '2026-08-18T08:05:00.000Z',
      experimentId: 'baseline-001',
      sourceVerdictId: 'source-verdict-3',
      creativeId: 'creative-10',
      publicationId: 'publication-22',
      platform: 'youtube',
      accountId: 'distribution-1',
      campaign: 'ghosttown-launch',
      source: 'shorts-factory',
      shareType: 'factory',
      verdictId: 'ghosttown-verdict-4'
    }, 'ghosttown-verdict-4');

    const fields = new URLSearchParams();
    appendStripeAttributionMetadata(fields, attribution, 'ghosttown-verdict-4');

    expect(Object.fromEntries(fields.entries())).toMatchObject({
      'metadata[attribution_token]': 'gta-terminal',
      'metadata[experiment_id]': 'baseline-001',
      'metadata[source_verdict_id]': 'source-verdict-3',
      'metadata[creative_id]': 'creative-10',
      'metadata[publication_id]': 'publication-22',
      'metadata[platform]': 'youtube',
      'metadata[distribution_account_id]': 'distribution-1',
      'metadata[campaign]': 'ghosttown-launch',
      'metadata[source]': 'shorts-factory',
      'metadata[share_type]': 'factory',
      'metadata[visitor_id]': 'gtv-terminal',
      'metadata[ghosttown_session_id]': 'gts-terminal'
    });
    expect(commercialEventAttribution(attribution)).toMatchObject({
      attributionToken: 'gta-terminal',
      visitorId: 'gtv-terminal',
      ghosttownSessionId: 'gts-terminal',
      publicationId: 'publication-22'
    });
  });
});
