import type {
  CustomWebsiteSpec,
  WebsiteAsset,
  WebsiteBuildFile,
  WebsiteBuildResult,
  WebsiteSectionSpec,
  WebsiteStylePreset
} from '../types/customWebsite';
import { assertWebsiteComponentContract } from './websiteComponentRegistry';
import { websiteBrandTokens } from './websiteBrandSystem';
import { assertWebsiteAssets } from './websiteAssetGenerator';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char] || char);
}

function safeHref(value: string): string {
  const source = value.trim();
  if (!source) return '#contact';
  if (source.startsWith('#')) return source.replace(/[^#a-zA-Z0-9_-]/g, '');
  try {
    const url = new URL(source);
    return ['https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.toString() : '#contact';
  } catch {
    return '#contact';
  }
}

function list(items: WebsiteSectionSpec['items']): string {
  if (!items.length) return '';
  return `<div class="items">${items.map(item => `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></article>`).join('')}</div>`;
}

function ctas(section: WebsiteSectionSpec, primaryActionUrl: string, secondaryActionUrl: string): string {
  const primary = section.primaryCtaLabel.trim()
    ? `<a class="button primary" href="${escapeHtml(safeHref(primaryActionUrl))}">${escapeHtml(section.primaryCtaLabel)}</a>`
    : '';
  const secondary = section.secondaryCtaLabel.trim()
    ? `<a class="button secondary" href="${escapeHtml(safeHref(secondaryActionUrl || primaryActionUrl))}">${escapeHtml(section.secondaryCtaLabel)}</a>`
    : '';
  return primary || secondary ? `<div class="actions">${primary}${secondary}</div>` : '';
}

function heroAsset(assets: WebsiteAsset[]): string {
  const logo = assets.find(asset => asset.role === 'logo');
  if (!logo) return '';
  return `<img class="brand-logo" src="${escapeHtml(logo.publicUrl)}" alt="${escapeHtml(logo.altText)}">`;
}

function renderSection(section: WebsiteSectionSpec, primaryActionUrl: string, secondaryActionUrl: string, assets: WebsiteAsset[]): string {
  const content = `${section.eyebrow ? `<p class="eyebrow">${escapeHtml(section.eyebrow)}</p>` : ''}<h2>${escapeHtml(section.heading)}</h2>${section.body ? `<p class="lede">${escapeHtml(section.body)}</p>` : ''}${list(section.items)}${ctas(section, primaryActionUrl, secondaryActionUrl)}`;
  if (section.component === 'hero') {
    return `<header id="${escapeHtml(section.sectionId)}" class="hero"><div class="wrap">${heroAsset(assets)}${section.eyebrow ? `<p class="eyebrow">${escapeHtml(section.eyebrow)}</p>` : ''}<h1>${escapeHtml(section.heading)}</h1>${section.body ? `<p class="lede">${escapeHtml(section.body)}</p>` : ''}${ctas(section, primaryActionUrl, secondaryActionUrl)}</div></header>`;
  }
  if (section.component === 'faq') {
    const faq = section.items.map(item => `<details><summary>${escapeHtml(item.title)}</summary><p>${escapeHtml(item.body)}</p></details>`).join('');
    return `<section id="${escapeHtml(section.sectionId)}" data-component="faq"><div class="wrap">${section.eyebrow ? `<p class="eyebrow">${escapeHtml(section.eyebrow)}</p>` : ''}<h2>${escapeHtml(section.heading)}</h2>${section.body ? `<p class="lede">${escapeHtml(section.body)}</p>` : ''}<div class="faq">${faq}</div></div></section>`;
  }
  if (section.component === 'footer') {
    return `<footer id="${escapeHtml(section.sectionId)}"><div class="wrap">${content}</div></footer>`;
  }
  return `<section id="${escapeHtml(section.sectionId)}" data-component="${escapeHtml(section.component)}"><div class="wrap">${content}</div></section>`;
}

function css(preset: WebsiteStylePreset): string {
  const theme = websiteBrandTokens(preset);
  return `:root{--bg:${theme.background};--surface:${theme.surface};--text:${theme.text};--muted:${theme.muted};--accent:${theme.accent};--border:${theme.border};--radius:${theme.radius};--font:${theme.font}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 var(--font)}.wrap{width:min(1120px,calc(100% - 40px));margin:auto}.hero{padding:clamp(72px,12vw,150px) 0 76px;background:var(--surface);border-bottom:1px solid var(--border)}.brand-logo{display:block;max-width:min(220px,55vw);max-height:80px;object-fit:contain;margin:0 0 36px}section{padding:72px 0;border-bottom:1px solid var(--border)}footer{padding:48px 0;background:var(--surface)}h1,h2,h3{line-height:1.08;margin:0 0 18px}h1{font-size:clamp(2.7rem,8vw,6rem);max-width:14ch}h2{font-size:clamp(2rem,5vw,3.6rem);max-width:18ch}h3{font-size:1.15rem}.lede{max-width:70ch;font-size:1.12rem;color:var(--muted)}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.78rem;font-weight:800;color:var(--accent)}.items{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:28px}.items article,.faq details{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px}.items p,.faq p{color:var(--muted)}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:800}.primary{background:var(--accent);color:#fff}.secondary{border:1px solid var(--border);color:var(--text);background:var(--surface)}.faq{display:grid;gap:12px;margin-top:28px}.faq summary{cursor:pointer;font-weight:800}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}@media(max-width:600px){.wrap{width:min(1120px,calc(100% - 28px))}section{padding:54px 0}.hero{padding:72px 0 56px}.button{width:100%}}`;
}

async function sha256(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function file(path: string, contentType: string, content: string): Promise<WebsiteBuildFile> {
  return { path, contentType, content, sha256: await sha256(content) };
}

export async function buildCustomWebsite(
  spec: CustomWebsiteSpec,
  options: { primaryActionUrl?: string; secondaryActionUrl?: string; assets?: WebsiteAsset[] } = {}
): Promise<WebsiteBuildResult> {
  assertWebsiteComponentContract(spec);
  const assets = options.assets || [];
  assertWebsiteAssets(assets);
  const primaryActionUrl = options.primaryActionUrl || '#contact';
  const secondaryActionUrl = options.secondaryActionUrl || primaryActionUrl;
  const body = spec.sections.map(section => renderSection(section, primaryActionUrl, secondaryActionUrl, assets)).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(spec.metadataTitle)}</title><meta name="description" content="${escapeHtml(spec.metadataDescription)}"><style>${css(spec.stylePreset)}</style></head><body>${body}</body></html>`;
  const specJson = `${JSON.stringify(spec, null, 2)}\n`;
  const specSha256 = await sha256(specJson);
  const createdAt = new Date().toISOString();
  const buildId = `website_${specSha256.slice(0, 20)}`;
  const manifest = `${JSON.stringify({
    schemaVersion: 'custom-website-build-manifest-v1',
    buildId,
    createdAt,
    specSha256,
    assets,
    files: ['index.html', 'site-spec.json', 'build-manifest.json']
  }, null, 2)}\n`;
  return {
    schemaVersion: 'custom-website-build-v1',
    buildId,
    createdAt,
    specSha256,
    assets,
    files: [
      await file('index.html', 'text/html; charset=utf-8', html),
      await file('site-spec.json', 'application/json; charset=utf-8', specJson),
      await file('build-manifest.json', 'application/json; charset=utf-8', manifest)
    ]
  };
}
