import type { WebsiteStylePreset } from '../types/customWebsite';

export interface WebsiteBrandTokens {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  radius: string;
  font: string;
}

const WEBSITE_BRAND_SYSTEM: Readonly<Record<WebsiteStylePreset, WebsiteBrandTokens>> = Object.freeze({
  warm_editorial: { background: '#f7f2e8', surface: '#fffdf8', text: '#17231d', muted: '#5f675f', accent: '#a8472a', border: '#ddd5c8', radius: '18px', font: 'Georgia, ui-serif, serif' },
  clean_saas: { background: '#f4f7fb', surface: '#ffffff', text: '#101828', muted: '#667085', accent: '#3157d5', border: '#d9e0ea', radius: '14px', font: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  local_trust: { background: '#f7f8f4', surface: '#ffffff', text: '#18231b', muted: '#667268', accent: '#256b4a', border: '#d9e1d9', radius: '12px', font: 'ui-sans-serif, system-ui, sans-serif' },
  premium_service: { background: '#f4f2ef', surface: '#ffffff', text: '#171717', muted: '#68635e', accent: '#755737', border: '#ded9d2', radius: '10px', font: 'ui-serif, Georgia, serif' },
  bold_validation: { background: '#fff8ef', surface: '#ffffff', text: '#20160e', muted: '#6e6258', accent: '#c13d22', border: '#ead7c8', radius: '16px', font: 'ui-sans-serif, system-ui, sans-serif' }
});

export function websiteStylePresets(): WebsiteStylePreset[] {
  return Object.keys(WEBSITE_BRAND_SYSTEM) as WebsiteStylePreset[];
}

export function websiteBrandTokens(preset: WebsiteStylePreset): WebsiteBrandTokens {
  const tokens = WEBSITE_BRAND_SYSTEM[preset];
  if (!tokens) throw new Error(`Unknown website style preset: ${preset}`);
  return tokens;
}
