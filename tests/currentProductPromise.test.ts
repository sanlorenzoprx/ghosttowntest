import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_GET_ME_LIVE_DISPLAY_PRICE, GHOSTTOWN_GET_ME_LIVE_V1 } from '../src/lib/getMeLiveOffer';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../src/lib/ghosttownOffer';

const read = (path: string) => readFileSync(path, 'utf8');

describe('current GhostTown commercial promise', () => {
  it('locks the active ladder to Free Verdict -> $97 Sprint -> $297 Get Me Live', () => {
    expect(GHOSTTOWN_30_DAY_PLAN_V1.amountCents).toBe(9700);
    expect(GHOSTTOWN_GET_ME_LIVE_V1.referenceAmountCents).toBe(29700);
    expect(DEFAULT_GET_ME_LIVE_DISPLAY_PRICE).toBe('$297.00');
    expect(GHOSTTOWN_GET_ME_LIVE_V1.active).toBe(true);
  });

  it('keeps active customer and product surfaces free of the retired $119/Get My Test Live promise', () => {
    const active = [
      read('README.md'),
      read('docs/GHOSTTOWN_CUSTOMER_JOURNEY_LAW_V1.md'),
      read('docs/COMMERCIAL_LANDING_PAGE_BUILD_GUIDE.md'),
      read('src/components/LandingCommercial.tsx'),
      read('src/lib/getMeLiveOffer.ts'),
      read('src/lib/ghosttownOffer.ts')
    ].join('\n');

    expect(active).not.toMatch(/\$119\b/);
    expect(active).not.toContain('Get My Test Live');
    expect(active).toContain('$297');
    expect(active).toContain('Get Me Live');
  });

  it('does not sell a live website as part of the $97 Sprint', () => {
    const landing = read('src/components/LandingCommercial.tsx');
    const offer = read('src/lib/ghosttownOffer.ts');
    const blueprintView = read('src/components/LaunchBlueprintViewV21.tsx');
    const blueprintAssets = read('src/api/blueprintAssets.ts');
    const documentModel = read('src/api/blueprintDocumentModel.ts');
    expect(offer).toContain('The Sprint does not include a live website, domain, publishing, or payment setup.');
    expect(landing).toContain('A live website is not included; Get Me Live is a separate $297 one-time product.');
    expect(landing).not.toContain('a real website to use');
    expect(landing).not.toContain('A real website built around your idea');
    expect(landing).not.toContain('Un sitio web real para lanzar tu idea');
    expect(blueprintView).not.toContain('Open Launch Site');
    expect(blueprintView).not.toContain('{ id: "site", label: "Launch Site" }');
    expect(blueprintAssets).not.toContain('launch-site-config.json');
    expect(blueprintAssets).toContain('get-me-live-handoff.md');
    expect(documentModel).not.toContain("sectionId: 'launch_site'");
    expect(documentModel).toContain("sectionId: 'get_me_live_handoff'");
  });

  it('marks non-governed legacy Launch Site documents as commercially superseded', () => {
    for (const path of [
      'docs/CUSTOM_WEBSITE_CREATION_CAPABILITY_CONTRACT.md',
      'docs/GHOSTTOWN_ENVIRONMENT_ACCEPTANCE_CURSOR_CODEX_HANDOFF.md',
      'docs/LAUNCH_BLUEPRINT_V2.md',
      'docs/launch-blueprint-v2-acceptance.md'
    ]) {
      const text = read(path);
      expect(text, path).toContain('CURRENT COMMERCIAL SCOPE');
      expect(text, path).toContain('Free Verdict → $97 30-Day Sprint → $297 Get Me Live');
      expect(text, path).toContain('does **not** include a live website, domain, publishing, or payment setup');
    }
  });
});
