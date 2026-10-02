import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  loadGetMeLiveBySprint: vi.fn(),
  getGetMeLiveActivity: vi.fn(),
  listGetMeLiveLeads: vi.fn(),
}));

vi.mock('../src/api/auth', () => ({
  authenticateRequest: mocks.authenticateRequest,
}));

vi.mock('../src/api/getMeLiveStore', () => ({
  loadGetMeLiveBySprint: mocks.loadGetMeLiveBySprint,
  getGetMeLiveActivity: mocks.getGetMeLiveActivity,
  listGetMeLiveLeads: mocks.listGetMeLiveLeads,
}));

import { handleLaunchBlueprintWebsiteEvidence } from '../src/api/blueprintApi';

function envFor(ownerEmail = 'owner@example.com') {
  return {
    KV: {
      get: vi.fn(async (key: string) => key === 'paid_test_order_sprint_1'
        ? JSON.stringify({
            orderId: 'sprint_1',
            email: ownerEmail,
            status: 'ready',
            artifactType: 'launch_blueprint_v2',
          })
        : null),
    },
  } as any;
}

describe('Sprint website evidence bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ email: 'owner@example.com' });
  });

  it('keeps the Sprint valid when the owner has not purchased Get Me Live', async () => {
    mocks.loadGetMeLiveBySprint.mockResolvedValue(null);

    const response = await handleLaunchBlueprintWebsiteEvidence(
      new Request('https://ghost.test/api/paid-test/orders/sprint_1/blueprint/website-evidence'),
      envFor(),
      'sprint_1',
    );
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.websiteEvidence).toMatchObject({
      available: false,
      separateProduct: true,
    });
    expect(mocks.getGetMeLiveActivity).not.toHaveBeenCalled();
  });

  it('returns only the linked owner website activity and anonymous recent feedback', async () => {
    mocks.loadGetMeLiveBySprint.mockResolvedValue({
      orderId: 'gml_1',
      ownerId: 'owner@example.com',
      sourceSprintOrderId: 'sprint_1',
      status: 'live',
      publicUrl: 'https://example.pages.dev',
      hosting: { pagesUrl: 'https://example.pages.dev' },
      customDomainState: { status: 'active', name: 'example.test' },
    });
    mocks.getGetMeLiveActivity.mockResolvedValue({
      visits: 41,
      shares: 6,
      sales: 2,
      revenueCents: 12500,
    });
    mocks.listGetMeLiveLeads.mockResolvedValue([
      {
        leadId: 'lead_1',
        name: 'Private Person',
        email: 'private@example.test',
        message: 'Can you deliver this by Friday?',
        consentText: 'yes',
        sourcePath: '/',
        createdAt: '2026-10-02T12:00:00.000Z',
      },
      {
        leadId: 'lead_2',
        name: 'No Message',
        email: 'nomessage@example.test',
        consentText: 'yes',
        sourcePath: '/',
        createdAt: '2026-10-02T11:00:00.000Z',
      },
    ]);

    const response = await handleLaunchBlueprintWebsiteEvidence(
      new Request('https://ghost.test/api/paid-test/orders/sprint_1/blueprint/website-evidence'),
      envFor(),
      'sprint_1',
    );
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.websiteEvidence).toMatchObject({
      available: true,
      separateProduct: true,
      getMeLiveOrderId: 'gml_1',
      liveUrl: 'https://example.test',
      activity: {
        visits: 41,
        leads: 2,
        shares: 6,
        sales: 2,
        revenueCents: 12500,
      },
      recentFeedback: [{
        createdAt: '2026-10-02T12:00:00.000Z',
        message: 'Can you deliver this by Friday?',
        sourcePath: '/',
      }],
    });
    expect(JSON.stringify(body)).not.toContain('private@example.test');
    expect(JSON.stringify(body)).not.toContain('Private Person');
  });

  it('does not expose another owner Sprint or Get Me Live activity', async () => {
    mocks.authenticateRequest.mockResolvedValue({ email: 'intruder@example.com' });

    const response = await handleLaunchBlueprintWebsiteEvidence(
      new Request('https://ghost.test/api/paid-test/orders/sprint_1/blueprint/website-evidence'),
      envFor('owner@example.com'),
      'sprint_1',
    );
    expect(response.status).toBe(404);
    expect(mocks.loadGetMeLiveBySprint).not.toHaveBeenCalled();
  });
});
