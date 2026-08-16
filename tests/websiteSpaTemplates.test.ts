import { describe, expect, it } from 'vitest';
import {
  WEBSITE_SPA_TEMPLATE_REGISTRY,
  selectWebsiteTemplateId,
  websiteSpaTemplate,
  websiteSpaTemplateIds
} from '../src/api/websiteTemplateRegistry';

describe('custom website SPA templates', () => {
  it('keeps exactly the two approved reference-product templates', () => {
    expect(websiteSpaTemplateIds()).toEqual([
      'ghosttown_conversion',
      'memories_story_editorial'
    ]);
    expect(WEBSITE_SPA_TEMPLATE_REGISTRY).toHaveLength(2);
    expect(websiteSpaTemplate('ghosttown_conversion')).toMatchObject({
      referenceProduct: 'GhostTown',
      referenceRepository: 'sanlorenzoprx/ghosttowntest'
    });
    expect(websiteSpaTemplate('memories_story_editorial')).toMatchObject({
      referenceProduct: 'MemoriesMyStory',
      referenceRepository: 'sanlorenzoprx/memoriesmystory'
    });
  });

  it('encodes distinct narrative structures rather than two color skins', () => {
    const ghosttown = websiteSpaTemplate('ghosttown_conversion');
    const memories = websiteSpaTemplate('memories_story_editorial');

    expect(ghosttown.componentOrder.slice(0, 4)).toEqual([
      'hero', 'problem', 'solution', 'comparison'
    ]);
    expect(memories.componentOrder.slice(0, 4)).toEqual([
      'hero', 'problem', 'proof', 'solution'
    ]);
    expect(ghosttown.componentOrder).not.toEqual(memories.componentOrder);
    expect(ghosttown.tokens.dark).not.toBe(memories.tokens.dark);
    expect(ghosttown.designPrinciples.join(' ')).toContain('High-contrast hero');
    expect(memories.designPrinciples.join(' ')).toContain('Editorial pacing');
  });

  it('maps commercial styles to GhostTown and editorial/premium styles to MemoriesMyStory when the model does not choose explicitly', () => {
    expect(selectWebsiteTemplateId(undefined, 'clean_saas')).toBe('ghosttown_conversion');
    expect(selectWebsiteTemplateId(undefined, 'bold_validation')).toBe('ghosttown_conversion');
    expect(selectWebsiteTemplateId(undefined, 'warm_editorial')).toBe('memories_story_editorial');
    expect(selectWebsiteTemplateId(undefined, 'premium_service')).toBe('memories_story_editorial');
  });

  it('honors an explicit approved template selection independently from the style preset', () => {
    expect(selectWebsiteTemplateId('memories_story_editorial', 'clean_saas')).toBe('memories_story_editorial');
    expect(selectWebsiteTemplateId('ghosttown_conversion', 'warm_editorial')).toBe('ghosttown_conversion');
  });
});
