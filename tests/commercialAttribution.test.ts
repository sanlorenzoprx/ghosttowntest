import { describe, expect, it } from 'vitest';
import {
  appendStripeAttributionMetadata,
  commercialEventAttribution,
  sanitizeCommercialAttribution
} from '../src/api/commercialAttribution';

describe('Q5 commercial attribution trust boundary', () => {
  it('rejects incomplete client attribution rather than manufacturing lineage', () => {
    expect(sanitizeCommercialAttribution(null, 'verdict-1')).toBeUndefined();
    expect(sanitizeCommercialAttribution({ schemaVersion: 'ghosttown-commercial-attribution-v1', attributionToken: 'gta-1', visitorId: 'gtv-1' }, 'verdict-1')).toBeUndefined();
  });

  it('sanitizes legacy envelopes into first and last touch without breaking existing joins', () => {
    const attribution = sanitizeCommercialAttribution({
      schemaVersion: 'ghosttown-commercial-attribution-v1',
      attributionToken: `  gta_${'x'.repeat(300)}  `,
      visitorId: '  gtv_123  ', ghosttownSessionId: '  gts_456  ',
      firstTouchAt: '2026-08-18T08:00:00.000Z', lastTouchAt: '2026-08-18T08:05:00.000Z',
      experimentId: ' exp-1 ', creativeId: ' creative-7 ', publicationId: ' pub-9 ',
      platform: ` youtube-${'p'.repeat(80)} `, accountId: ' burner-1 ', campaign: ' launch-1 ',
      source: ' youtube ', shareType: 'factory', verdictId: ' verdict-client '
    }, 'verdict-server');

    expect(attribution?.attributionToken.length).toBeLessThanOrEqual(160);
    expect(attribution).toMatchObject({
      visitorId: 'gtv_123', ghosttownSessionId: 'gts_456', experimentId: 'exp-1',
      sourceVerdictId: 'verdict-server', creativeId: 'creative-7', publicationId: 'pub-9',
      accountId: 'burner-1', campaign: 'launch-1', source: 'youtube', shareType: 'factory', verdictId: 'verdict-client',
      firstTouch: { experimentId: 'exp-1', publicationId: 'pub-9', sourceVerdictId: 'verdict-server' },
      lastTouch: { experimentId: 'exp-1', publicationId: 'pub-9', sourceVerdictId: 'verdict-server' }
    });
    expect(attribution?.platform.length).toBeLessThanOrEqual(40);
  });

  it('carries distinct first and last touch lineage into Stripe metadata and events', () => {
    const attribution = sanitizeCommercialAttribution({
      schemaVersion: 'ghosttown-commercial-attribution-v1', attributionToken: 'gta-terminal',
      visitorId: 'gtv-terminal', ghosttownSessionId: 'gts-terminal',
      firstTouchAt: '2026-08-18T08:00:00.000Z', lastTouchAt: '2026-08-18T09:00:00.000Z',
      firstTouch: {
        capturedAt: '2026-08-18T08:00:00.000Z', experimentId: 'baseline-001', sourceVerdictId: 'source-verdict-3',
        creativeId: 'creative-A', publicationId: 'publication-A', platform: 'youtube', accountId: 'distribution-1',
        campaign: 'ghosttown-launch', source: 'shorts-factory', shareType: 'factory'
      },
      lastTouch: {
        capturedAt: '2026-08-18T09:00:00.000Z', experimentId: 'baseline-001', sourceVerdictId: 'source-verdict-3',
        creativeId: 'creative-B', publicationId: 'publication-B', platform: 'facebook', accountId: 'distribution-2',
        campaign: 'retarget-1', source: 'customer-share', shareType: 'earned'
      },
      verdictId: 'ghosttown-verdict-4'
    }, 'ghosttown-verdict-4');

    const fields = new URLSearchParams();
    appendStripeAttributionMetadata(fields, attribution, 'ghosttown-verdict-4');
    expect(Object.fromEntries(fields.entries())).toMatchObject({
      'metadata[attribution_token]': 'gta-terminal',
      'metadata[publication_id]': 'publication-A',
      'metadata[visitor_id]': 'gtv-terminal', 'metadata[ghosttown_session_id]': 'gts-terminal',
      'metadata[first_touch_creative_id]': 'creative-A', 'metadata[first_touch_publication_id]': 'publication-A',
      'metadata[first_touch_platform]': 'youtube', 'metadata[first_touch_account_id]': 'distribution-1',
      'metadata[last_touch_creative_id]': 'creative-B', 'metadata[last_touch_publication_id]': 'publication-B',
      'metadata[last_touch_platform]': 'facebook', 'metadata[last_touch_account_id]': 'distribution-2',
      'metadata[last_touch_campaign]': 'retarget-1', 'metadata[last_touch_source]': 'customer-share'
    });
    expect(commercialEventAttribution(attribution)).toMatchObject({
      attributionToken: 'gta-terminal', visitorId: 'gtv-terminal', ghosttownSessionId: 'gts-terminal',
      publicationId: 'publication-A', firstTouch: { creativeId: 'creative-A' }, lastTouch: { creativeId: 'creative-B' }
    });
  });
});
