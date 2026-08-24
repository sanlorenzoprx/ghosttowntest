import type {
  WebsiteComponentId,
  WebsiteStylePreset,
  WebsiteTemplateId
} from '../types/customWebsite';

export interface WebsiteSpaTemplateDefinition {
  id: WebsiteTemplateId;
  referenceProduct: 'GhostTown' | 'MemoriesMyStory';
  referenceRepository: string;
  purpose: string;
  designPrinciples: readonly string[];
  preferredStylePresets: readonly WebsiteStylePreset[];
  componentOrder: readonly WebsiteComponentId[];
  tokens: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentText: string;
    dark: string;
    line: string;
    headingFont: string;
    bodyFont: string;
    radius: string;
  };
}

export const WEBSITE_SPA_TEMPLATE_REGISTRY: readonly WebsiteSpaTemplateDefinition[] = [
  {
    id: 'ghosttown_conversion',
    referenceProduct: 'GhostTown',
    referenceRepository: 'sanlorenzoprx/ghosttowntest',
    purpose: 'Conversion-first launch site for a concrete offer where speed, clarity, proof boundaries, price, and a strong next action matter most.',
    designPrinciples: [
      'High-contrast hero with one dominant promise and one dominant action.',
      'Direct commercial language, strong visual hierarchy, and short decision-oriented sections.',
      'Dark/light section contrast used to pace problem, proof, offer, and conversion moments.',
      'Evidence and validation-stage truth remain visually explicit rather than hidden in fine print.',
      'Large readable type, mobile-first action hierarchy, and restrained motion-ready surfaces.'
    ],
    preferredStylePresets: ['clean_saas', 'local_trust', 'bold_validation'],
    componentOrder: [
      'hero',
      'problem',
      'solution',
      'comparison',
      'how_it_works',
      'proof',
      'pricing',
      'faq',
      'lead_capture',
      'footer'
    ],
    tokens: {
      background: '#F6F3ED',
      surface: '#FFFFFF',
      text: '#17201C',
      muted: '#4B5550',
      accent: '#D96F3D',
      accentText: '#FFFFFF',
      dark: '#101A17',
      line: '#D7D0C5',
      headingFont: 'Georgia, ui-serif, serif',
      bodyFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
      radius: '28px'
    }
  },
  {
    id: 'memories_story_editorial',
    referenceProduct: 'MemoriesMyStory',
    referenceRepository: 'sanlorenzoprx/memoriesmystory',
    purpose: 'Warm editorial launch site for trust-heavy, emotional, family, health, legacy, care, premium service, or story-led offers.',
    designPrinciples: [
      'Editorial pacing with generous whitespace and a calm narrative progression.',
      'Trust is part of the product experience: identity, privacy, proof limits, and next steps stay visible.',
      'Serif-led headings paired with highly readable body text and warm neutral surfaces.',
      'Human imagery or provenance-bearing assets may carry emotional context without becoming proof claims.',
      'Primary conversion remains clear, but urgency is created through meaning and relevance rather than visual pressure.'
    ],
    preferredStylePresets: ['warm_editorial', 'premium_service'],
    componentOrder: [
      'hero',
      'problem',
      'proof',
      'solution',
      'how_it_works',
      'comparison',
      'pricing',
      'faq',
      'lead_capture',
      'footer'
    ],
    tokens: {
      background: '#F7F1E8',
      surface: '#FFFDF8',
      text: '#173047',
      muted: '#526778',
      accent: '#B28A45',
      accentText: '#13283A',
      dark: '#142B3D',
      line: '#DDD1C0',
      headingFont: 'Georgia, "Times New Roman", serif',
      bodyFont: 'ui-sans-serif, system-ui, sans-serif',
      radius: '22px'
    }
  }
] as const;

const TEMPLATE_BY_ID = new Map<WebsiteTemplateId, WebsiteSpaTemplateDefinition>(
  WEBSITE_SPA_TEMPLATE_REGISTRY.map(template => [template.id, template])
);

export function websiteSpaTemplateIds(): WebsiteTemplateId[] {
  return WEBSITE_SPA_TEMPLATE_REGISTRY.map(template => template.id);
}

export function websiteSpaTemplate(id: WebsiteTemplateId): WebsiteSpaTemplateDefinition {
  const template = TEMPLATE_BY_ID.get(id);
  if (!template) throw new Error(`Unknown website SPA template: ${id}`);
  return template;
}

export function selectWebsiteTemplateId(
  requested: WebsiteTemplateId | undefined,
  stylePreset: WebsiteStylePreset
): WebsiteTemplateId {
  if (requested && TEMPLATE_BY_ID.has(requested)) return requested;
  return stylePreset === 'warm_editorial' || stylePreset === 'premium_service'
    ? 'memories_story_editorial'
    : 'ghosttown_conversion';
}
