import type {
  CustomWebsiteSpec,
  WebsiteAsset,
  WebsiteBuildFile,
  WebsiteBuildResult
} from '../types/customWebsite';
import { assertWebsiteComponentContract } from './websiteComponentRegistry';
import { assertWebsiteAssets } from './websiteAssetGenerator';
import { websiteSpaTemplate } from './websiteTemplateRegistry';

function safeHref(value: string): string {
  const source = value.trim();
  if (!source) return '#contact';
  if (source.startsWith('#')) return source.replace(/[^#a-zA-Z0-9_-]/g, '');
  try {
    const url = new URL(source);
    if (['https:', 'mailto:', 'tel:'].includes(url.protocol)) return url.toString();
    if (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return url.toString();
    return '#contact';
  } catch {
    return '#contact';
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || 'launch-site';
}

function jsLiteral(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function indexHtml(spec: CustomWebsiteSpec): string {
  const title = spec.metadataTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const description = spec.metadataDescription
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${description}" />
    <meta name="theme-color" content="#101A17" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
}

function packageJson(spec: CustomWebsiteSpec): string {
  return `${JSON.stringify({
    name: `ghosttown-site-${slug(spec.businessName)}`,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
      'cloudflare:dry-run': 'npm run build && wrangler deploy --dry-run'
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0'
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.2.0',
      vite: '^6.4.3',
      wrangler: '^4.119.0'
    }
  }, null, 2)}\n`;
}

function viteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false
  }
});
`;
}

function wranglerConfig(spec: CustomWebsiteSpec): string {
  return `${JSON.stringify({
    name: `site-${slug(spec.businessName)}`.slice(0, 63),
    compatibility_date: '2026-08-15',
    assets: {
      directory: './dist',
      not_found_handling: 'single-page-application'
    }
  }, null, 2)}\n`;
}

function siteModule(
  spec: CustomWebsiteSpec,
  assets: WebsiteAsset[],
  primaryActionUrl: string,
  secondaryActionUrl: string
): string {
  return `export const site = ${jsLiteral(spec)};

export const assets = ${jsLiteral(assets)};

export const actions = ${jsLiteral({
    primary: safeHref(primaryActionUrl),
    secondary: safeHref(secondaryActionUrl || primaryActionUrl)
  })};
`;
}

function mainSource(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function appSource(): string {
  return `import { actions, assets, site } from './site.js';

function Ctas({ section }) {
  if (!section.primaryCtaLabel && !section.secondaryCtaLabel) return null;
  return (
    <div className="actions">
      {section.primaryCtaLabel ? <a className="button primary" href={actions.primary}>{section.primaryCtaLabel}</a> : null}
      {section.secondaryCtaLabel ? <a className="button secondary" href={actions.secondary}>{section.secondaryCtaLabel}</a> : null}
    </div>
  );
}

function Items({ section }) {
  if (!section.items?.length) return null;
  if (section.component === 'faq') {
    return (
      <div className="faq-list">
        {section.items.map((item, index) => (
          <details key={index}>
            <summary>{item.title}</summary>
            <p>{item.body}</p>
          </details>
        ))}
      </div>
    );
  }
  return (
    <div className="item-grid">
      {section.items.map((item, index) => (
        <article key={index}>
          <h3>{item.title}</h3>
          {item.body ? <p>{item.body}</p> : null}
        </article>
      ))}
    </div>
  );
}

function Hero({ section }) {
  const logo = assets.find(asset => asset.role === 'logo');
  const hero = assets.find(asset => asset.role === 'hero_image');
  return (
    <section id={section.sectionId} className="hero-section" data-component="hero">
      <div className="section-inner hero-grid">
        <div className="hero-copy">
          {logo ? <img className="brand-logo" src={logo.publicUrl} alt={logo.altText} /> : <p className="brand-name">{site.businessName}</p>}
          {section.eyebrow ? <p className="eyebrow">{section.eyebrow}</p> : null}
          <h1>{section.heading}</h1>
          {section.body ? <p className="lede hero-lede">{section.body}</p> : null}
          <Ctas section={section} />
          <p className="truth-line">Validation-stage offer · Claims remain evidence-bound.</p>
        </div>
        <div className="hero-visual" aria-hidden={!hero}>
          {hero ? <img src={hero.publicUrl} alt={hero.altText} /> : (
            <div className="hero-proof-card">
              <span>Built from a validated Launch Blueprint</span>
              <strong>{site.businessName}</strong>
              <small>Offer · Positioning · Price · Proof boundaries · Next action</small>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Section({ section, index }) {
  if (section.component === 'hero') return <Hero section={section} />;
  if (section.component === 'footer') {
    return (
      <footer id={section.sectionId} data-component="footer">
        <div className="section-inner footer-grid">
          <div>
            <p className="eyebrow">{section.eyebrow}</p>
            <h2>{section.heading}</h2>
            <p className="lede">{section.body}</p>
          </div>
          <Items section={section} />
        </div>
      </footer>
    );
  }
  return (
    <section
      id={section.sectionId}
      data-component={section.component}
      className={index % 2 === 0 ? 'content-section alternate' : 'content-section'}
    >
      <div className="section-inner section-grid">
        <div className="section-copy">
          {section.eyebrow ? <p className="eyebrow">{section.eyebrow}</p> : null}
          <h2>{section.heading}</h2>
          {section.body ? <p className="lede">{section.body}</p> : null}
          <Ctas section={section} />
        </div>
        <Items section={section} />
      </div>
    </section>
  );
}

export default function App() {
  const navSections = site.sections.filter(section => ['solution', 'how_it_works', 'pricing', 'faq'].includes(section.component));
  return (
    <div className={'site-shell template-' + site.templateId} data-style-preset={site.stylePreset}>
      <a className="skip-link" href="#hero">Skip to content</a>
      <header className="site-header">
        <a className="site-wordmark" href="#hero">{site.businessName}</a>
        <nav aria-label="Primary navigation">
          {navSections.map(section => <a key={section.sectionId} href={'#' + section.sectionId}>{section.eyebrow || section.heading}</a>)}
        </nav>
        <a className="header-cta" href={actions.primary}>Get started</a>
      </header>
      <main>
        {site.sections.map((section, index) => <Section key={section.sectionId} section={section} index={index} />)}
      </main>
    </div>
  );
}
`;
}

function cssSource(spec: CustomWebsiteSpec): string {
  const template = websiteSpaTemplate(spec.templateId);
  const t = template.tokens;
  const ghosttown = spec.templateId === 'ghosttown_conversion';
  return `:root {
  --bg: ${t.background};
  --surface: ${t.surface};
  --text: ${t.text};
  --muted: ${t.muted};
  --accent: ${(spec as CustomWebsiteSpec & { primaryColor?: string }).primaryColor || t.accent};
  --accent-text: ${t.accentText};
  --dark: ${t.dark};
  --line: ${t.line};
  --radius: ${t.radius};
  --heading-font: ${t.headingFont};
  --body-font: ${t.bodyFont};
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 82px; }
body { margin: 0; background: var(--bg); color: var(--text); font: 17px/1.62 var(--body-font); }
a { color: inherit; }
img { max-width: 100%; }
button, a { -webkit-tap-highlight-color: transparent; }
.skip-link { position: fixed; left: 12px; top: -80px; z-index: 100; padding: 12px 16px; background: var(--surface); border-radius: 10px; font-weight: 800; }
.skip-link:focus { top: 12px; }
.site-header { position: sticky; top: 0; z-index: 50; min-height: 70px; display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 28px; padding: 14px max(20px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid color-mix(in srgb, var(--line) 75%, transparent); background: color-mix(in srgb, var(--surface) 94%, transparent); backdrop-filter: blur(18px) saturate(150%); }
.site-wordmark { text-decoration: none; font: 700 1.15rem/1 var(--heading-font); letter-spacing: -0.02em; }
.site-header nav { display: flex; gap: 18px; align-items: center; }
.site-header nav a { text-decoration: none; color: var(--muted); font-size: .92rem; font-weight: 750; }
.header-cta, .button { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; border-radius: 999px; text-decoration: none; font-weight: 850; padding: 12px 20px; transition: transform .18s ease, filter .18s ease; }
.header-cta, .button.primary { background: var(--accent); color: var(--accent-text); }
.button.secondary { border: 1px solid var(--line); background: var(--surface); color: var(--text); }
.header-cta:hover, .button:hover { transform: translateY(-1px); filter: brightness(1.03); }
.header-cta:focus-visible, .button:focus-visible, .site-header a:focus-visible, summary:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.section-inner { width: min(1180px, calc(100% - 40px)); margin: 0 auto; }
.hero-section { min-height: min(780px, calc(100vh - 70px)); display: grid; align-items: center; padding: clamp(72px, 9vw, 132px) 0; ${ghosttown ? 'background: var(--dark); color: #fff;' : 'background: linear-gradient(145deg, var(--surface), var(--bg));'} }
.hero-grid { display: grid; grid-template-columns: minmax(0, .92fr) minmax(320px, 1.08fr); gap: clamp(42px, 7vw, 92px); align-items: center; }
.brand-logo { display: block; max-width: 220px; max-height: 76px; object-fit: contain; margin-bottom: 34px; }
.brand-name { margin: 0 0 34px; font-weight: 850; letter-spacing: .02em; }
.eyebrow { margin: 0 0 16px; text-transform: uppercase; letter-spacing: .16em; font-size: .78rem; font-weight: 900; color: var(--accent); }
h1, h2, h3 { font-family: var(--heading-font); }
h1 { margin: 0; max-width: 13ch; font-size: clamp(3.4rem, 7.6vw, 7rem); line-height: .92; letter-spacing: -.055em; }
h2 { margin: 0; max-width: 16ch; font-size: clamp(2.25rem, 5vw, 4.5rem); line-height: 1; letter-spacing: -.04em; }
h3 { margin: 0; font-size: 1.18rem; line-height: 1.2; }
.lede { max-width: 68ch; margin: 22px 0 0; color: var(--muted); font-size: 1.12rem; }
.hero-lede { max-width: 38rem; font-size: clamp(1.16rem, 2vw, 1.42rem); line-height: 1.55; ${ghosttown ? 'color: rgba(255,255,255,.82);' : ''} }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
.truth-line { margin: 20px 0 0; font-size: .9rem; ${ghosttown ? 'color: rgba(255,255,255,.66);' : 'color: var(--muted);'} }
.hero-visual { min-height: 430px; display: grid; place-items: center; border-radius: calc(var(--radius) + 10px); overflow: hidden; ${ghosttown ? 'background: radial-gradient(circle at 20% 15%, rgba(217,111,61,.25), transparent 35%), radial-gradient(circle at 80% 80%, rgba(70,130,105,.3), transparent 38%), #17251F;' : 'background: radial-gradient(circle at 22% 18%, rgba(178,138,69,.20), transparent 35%), #F0E4D4;'} border: 1px solid ${ghosttown ? 'rgba(255,255,255,.12)' : 'var(--line)'}; }
.hero-visual > img { width: 100%; height: 100%; min-height: 430px; object-fit: cover; }
.hero-proof-card { width: min(82%, 540px); padding: clamp(26px, 5vw, 54px); border-radius: var(--radius); background: ${ghosttown ? '#FFFDF9' : 'var(--surface)'}; color: var(--text); box-shadow: 0 28px 90px rgba(0,0,0,.18); }
.hero-proof-card span, .hero-proof-card small { display: block; color: var(--muted); }
.hero-proof-card strong { display: block; margin: 14px 0; font: 700 clamp(2rem, 5vw, 4rem)/1 var(--heading-font); }
.content-section { padding: clamp(76px, 9vw, 128px) 0; border-bottom: 1px solid var(--line); background: var(--surface); }
.content-section.alternate { background: var(--bg); }
.section-grid { display: grid; grid-template-columns: minmax(0, .86fr) minmax(360px, 1.14fr); gap: clamp(42px, 7vw, 88px); align-items: start; }
.item-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.item-grid article, .faq-list details { padding: 22px; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); box-shadow: 0 12px 34px rgba(23,32,28,.045); }
.item-grid p, .faq-list p { margin: 10px 0 0; color: var(--muted); }
[data-component='pricing'] { ${ghosttown ? 'background: var(--dark); color: #fff;' : 'background: var(--dark); color: #fff;'} }
[data-component='pricing'] .lede, [data-component='pricing'] .item-grid p { color: rgba(255,255,255,.76); }
[data-component='pricing'] .item-grid article { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.16); }
[data-component='proof'] .item-grid article { border-style: dashed; }
.faq-list { display: grid; gap: 12px; }
.faq-list summary { cursor: pointer; font-weight: 850; }
footer { padding: 64px 0; background: var(--dark); color: #fff; }
footer .lede, footer .item-grid p { color: rgba(255,255,255,.72); }
footer .item-grid article { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
.footer-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 54px; }

.template-memories_story_editorial .hero-section { min-height: 700px; }
.template-memories_story_editorial h1 { max-width: 14ch; font-size: clamp(3.1rem, 6.8vw, 6.4rem); line-height: .98; }
.template-memories_story_editorial .content-section { padding: clamp(88px, 10vw, 144px) 0; }
.template-memories_story_editorial .section-grid { grid-template-columns: minmax(0, 1fr) minmax(320px, .9fr); }
.template-memories_story_editorial [data-component='problem'], .template-memories_story_editorial [data-component='proof'] { background: #F1E7D8; }
.template-memories_story_editorial .item-grid article { box-shadow: none; }

@media (max-width: 900px) {
  .site-header { grid-template-columns: 1fr auto; }
  .site-header nav { display: none; }
  .hero-grid, .section-grid, .footer-grid { grid-template-columns: 1fr; }
  .hero-visual { min-height: 320px; }
  .hero-visual > img { min-height: 320px; }
  .section-copy h2 { max-width: 20ch; }
}

@media (max-width: 620px) {
  html { scroll-padding-top: 68px; }
  .site-header { min-height: 64px; padding: 10px 14px; gap: 12px; }
  .site-wordmark { max-width: 46vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .header-cta { min-height: 44px; padding: 10px 15px; font-size: .9rem; }
  .section-inner { width: min(100% - 28px, 1180px); }
  .hero-section { padding: 64px 0 58px; }
  h1 { font-size: clamp(3rem, 15vw, 4.6rem); }
  .item-grid { grid-template-columns: 1fr; }
  .button { width: 100%; }
}
`;
}

function readme(spec: CustomWebsiteSpec): string {
  const template = websiteSpaTemplate(spec.templateId);
  return `# ${spec.businessName} — generated Cloudflare SPA\n\nThis project was manufactured from a validated GhostTown Launch Blueprint.\n\n- Runtime: React + Vite single-page application\n- Cloudflare target: Workers Static Assets\n- SPA fallback: \`assets.not_found_handling = single-page-application\`\n- Template: \`${template.id}\` modeled on ${template.referenceProduct}\n- Source model: ${template.referenceRepository}\n- Production auto-deploy: disabled\n\n## Local verification\n\n\`\`\`bash\nnpm install\nnpm run build\nnpm run cloudflare:dry-run\n\`\`\`\n\nDeployment is intentionally not scripted into the generated project. A GhostTown DeploymentAdapter must explicitly deploy a browser-tested build.\n`;
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
  websiteSpaTemplate(spec.templateId);
  const assets = options.assets || [];
  assertWebsiteAssets(assets);
  const primaryActionUrl = options.primaryActionUrl || '#contact';
  const secondaryActionUrl = options.secondaryActionUrl || primaryActionUrl;
  const specJson = `${JSON.stringify(spec, null, 2)}\n`;
  const specSha256 = await sha256(specJson);
  const createdAt = new Date().toISOString();
  const buildId = `website_${specSha256.slice(0, 20)}`;
  const generatedFiles = [
    ['package.json', 'application/json; charset=utf-8', packageJson(spec)],
    ['index.html', 'text/html; charset=utf-8', indexHtml(spec)],
    ['vite.config.js', 'text/javascript; charset=utf-8', viteConfig()],
    ['wrangler.jsonc', 'application/json; charset=utf-8', wranglerConfig(spec)],
    ['src/main.jsx', 'text/javascript; charset=utf-8', mainSource()],
    ['src/App.jsx', 'text/javascript; charset=utf-8', appSource()],
    ['src/site.js', 'text/javascript; charset=utf-8', siteModule(spec, assets, primaryActionUrl, secondaryActionUrl)],
    ['src/styles.css', 'text/css; charset=utf-8', cssSource(spec)],
    ['site-spec.json', 'application/json; charset=utf-8', specJson],
    ['README.md', 'text/markdown; charset=utf-8', readme(spec)]
  ] as const;
  const manifest = `${JSON.stringify({
    schemaVersion: 'custom-website-build-manifest-v2',
    runtime: 'cloudflare_spa',
    templateId: spec.templateId,
    buildId,
    createdAt,
    specSha256,
    assets,
    files: [...generatedFiles.map(([path]) => path), 'build-manifest.json']
  }, null, 2)}\n`;
  const files = await Promise.all([
    ...generatedFiles.map(([path, contentType, content]) => file(path, contentType, content)),
    file('build-manifest.json', 'application/json; charset=utf-8', manifest)
  ]);
  return {
    schemaVersion: 'custom-website-build-v1',
    runtime: 'cloudflare_spa',
    templateId: spec.templateId,
    buildId,
    createdAt,
    specSha256,
    assets,
    files
  };
}


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function staticItems(section: CustomWebsiteSpec['sections'][number]): string {
  if (!section.items?.length) return '';
  if (section.component === 'faq') {
    return `<div class="faq-list">${section.items.map(item => `<details><summary>${escapeHtml(item.title)}</summary><p>${escapeHtml(item.body)}</p></details>`).join('')}</div>`;
  }
  return `<div class="item-grid">${section.items.map(item => `<article><h3>${escapeHtml(item.title)}</h3>${item.body ? `<p>${escapeHtml(item.body)}</p>` : ''}</article>`).join('')}</div>`;
}

function staticCtas(section: CustomWebsiteSpec['sections'][number], primaryActionUrl: string, secondaryActionUrl: string): string {
  if (!section.primaryCtaLabel && !section.secondaryCtaLabel) return '';
  return `<div class="actions">${section.primaryCtaLabel ? `<a class="button primary" href="${escapeHtml(safeHref(primaryActionUrl))}">${escapeHtml(section.primaryCtaLabel)}</a>` : ''}${section.secondaryCtaLabel ? `<a class="button secondary" href="${escapeHtml(safeHref(secondaryActionUrl || primaryActionUrl))}">${escapeHtml(section.secondaryCtaLabel)}</a>` : ''}</div>`;
}
function renderCustomWebsiteStaticHtmlBase(
  spec: CustomWebsiteSpec,
  options: {
    assets?: WebsiteAsset[];
    primaryActionUrl?: string;
    secondaryActionUrl?: string;
    leadActionUrl?: string;
    leadMagnet?: { title: string; url: string };
    canonicalUrl?: string;
    socialImageUrl?: string;
    attributionUrl?: string;
    showFriendShare?: boolean;
    activityUrl?: string;
  } = {}
): string {
  assertWebsiteComponentContract(spec);
  const assets = options.assets || [];
  assertWebsiteAssets(assets);
  const primaryActionUrl = options.primaryActionUrl || '#contact';
  const secondaryActionUrl = options.secondaryActionUrl || primaryActionUrl;
  const logo = assets.find(asset => asset.role === 'logo');
  const hero = assets.find(asset => asset.role === 'hero_image');

  const sections = spec.sections.map((section, index) => {
    if (section.component === 'hero') {
      return `<section id="${escapeHtml(section.sectionId)}" class="hero-section" data-component="hero"><div class="section-inner hero-grid"><div class="hero-copy">${logo ? `<img class="brand-logo" src="${escapeHtml(logo.publicUrl)}" alt="${escapeHtml(logo.altText)}">` : `<p class="brand-name">${escapeHtml(spec.businessName)}</p>`}${section.eyebrow ? `<p class="eyebrow">${escapeHtml(section.eyebrow)}</p>` : ''}<h1>${escapeHtml(section.heading)}</h1>${section.body ? `<p class="lede hero-lede">${escapeHtml(section.body)}</p>` : ''}${staticCtas(section, primaryActionUrl, secondaryActionUrl)}<p class="truth-line">Validation-stage offer · Claims remain evidence-bound.</p></div><div class="hero-visual">${hero ? `<img src="${escapeHtml(hero.publicUrl)}" alt="${escapeHtml(hero.altText)}">` : `<div class="hero-proof-card"><span>Built from evidence gathered before launch</span><strong>${escapeHtml(spec.businessName)}</strong><small>Offer · Positioning · Price · Proof boundaries · Next action</small></div>`}</div></div></section>`;
    }
    if (section.component === 'lead_capture' && options.leadActionUrl) {
      return `<section id="${escapeHtml(section.sectionId)}" class="content-section" data-component="lead_capture"><div class="section-inner section-grid"><div class="section-copy"><p class="eyebrow">${escapeHtml(section.eyebrow || 'Next step')}</p><h2>${escapeHtml(section.heading)}</h2><p class="lede">${escapeHtml(section.body)}</p></div><form class="lead-form" method="post" action="${escapeHtml(options.leadActionUrl)}"><label>Name<input name="name" autocomplete="name" required maxlength="120"></label><label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Message<textarea name="message" rows="4" maxlength="2000"></textarea></label><label class="consent"><input name="consent" type="checkbox" value="yes" required> I agree to be contacted about this offer.</label><button class="button primary" type="submit">${escapeHtml(section.primaryCtaLabel || 'I am interested')}</button></form></div></section>`;
    }
    if (section.component === 'footer') {
      return `<footer id="${escapeHtml(section.sectionId)}" data-component="footer"><div class="section-inner footer-grid"><div><p class="eyebrow">${escapeHtml(section.eyebrow)}</p><h2>${escapeHtml(section.heading)}</h2><p class="lede">${escapeHtml(section.body)}</p></div>${staticItems(section)}</div></footer>`;
    }
    return `<section id="${escapeHtml(section.sectionId)}" data-component="${escapeHtml(section.component)}" class="${index % 2 === 0 ? 'content-section alternate' : 'content-section'}"><div class="section-inner section-grid"><div class="section-copy">${section.eyebrow ? `<p class="eyebrow">${escapeHtml(section.eyebrow)}</p>` : ''}<h2>${escapeHtml(section.heading)}</h2>${section.body ? `<p class="lede">${escapeHtml(section.body)}</p>` : ''}${staticCtas(section, primaryActionUrl, secondaryActionUrl)}</div>${staticItems(section)}</div></section>`;
  }).join('');

  const nav = spec.sections
    .filter(section => ['solution', 'how_it_works', 'pricing', 'faq'].includes(section.component))
    .map(section => `<a href="#${escapeHtml(section.sectionId)}">${escapeHtml(section.eyebrow || section.heading)}</a>`)
    .join('');

  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="${escapeHtml(spec.metadataDescription)}"><title>${escapeHtml(spec.metadataTitle)}</title><style>${cssSource(spec)}.lead-form{display:grid;gap:16px}.lead-form label{display:grid;gap:7px;font-weight:800}.lead-form input,.lead-form textarea{width:100%;border:1px solid var(--line);border-radius:12px;padding:13px 14px;font:inherit;background:var(--surface);color:var(--text)}.lead-form .consent{grid-template-columns:auto 1fr;align-items:start;font-weight:600}.lead-form .consent input{width:auto;margin-top:6px}</style></head><body><div class="site-shell template-${escapeHtml(spec.templateId)}" data-style-preset="${escapeHtml(spec.stylePreset)}"><a class="skip-link" href="#hero">Skip to content</a><header class="site-header"><a class="site-wordmark" href="#hero">${escapeHtml(spec.businessName)}</a><nav aria-label="Primary navigation">${nav}</nav><a class="header-cta" href="${escapeHtml(safeHref(primaryActionUrl))}">Get started</a></header><main>${sections}</main></div></body></html>`;
}

export function renderCustomWebsiteStaticHtml(
  spec: CustomWebsiteSpec,
  options: {
    assets?: WebsiteAsset[];
    primaryActionUrl?: string;
    secondaryActionUrl?: string;
    leadActionUrl?: string;
    leadMagnet?: { title: string; url: string };
    canonicalUrl?: string;
    socialImageUrl?: string;
    attributionUrl?: string;
    showFriendShare?: boolean;
    activityUrl?: string;
    /** Unique per publish attempt; served so verification can prove this exact release is live. */
    releaseId?: string;
  } = {}
): string {
  let html = renderCustomWebsiteStaticHtmlBase(spec, options);
  if (options.releaseId) html = html.replace('<title>', `<meta name="ghosttown-release-id" content="${escapeHtml(options.releaseId)}"><title>`);
  const canonical = options.canonicalUrl
    ? `<link rel="canonical" href="${escapeHtml(options.canonicalUrl)}"><meta property="og:url" content="${escapeHtml(options.canonicalUrl)}">`
    : '';
  const social = options.socialImageUrl
    ? `<meta property="og:image" content="${escapeHtml(options.socialImageUrl)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapeHtml(options.socialImageUrl)}">`
    : '<meta name="twitter:card" content="summary">';
  html = html.replace('<title>', `<meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(spec.metadataTitle)}"><meta property="og:description" content="${escapeHtml(spec.metadataDescription)}">${canonical}${social}<title>`);
  html = html.replace('.lead-form input,.lead-form textarea{width:100%;border:1px solid var(--line);', '.lead-form input,.lead-form textarea{width:100%;border:2px solid var(--text);');
  if (options.leadMagnet) {
    html = html.replace('<form class="lead-form"', `<a class="lead-magnet" href="${escapeHtml(options.leadMagnet.url)}" download>${escapeHtml(options.leadMagnet.title)}</a><form class="lead-form"`);
  }
  if (options.attributionUrl) {
    html = html.replace('</footer>', `<a class="ghosttown-credit" href="${escapeHtml(options.attributionUrl)}">Built with GhostTown</a></footer>`);
  }
  const extraCss = '<style>.lead-magnet,.ghosttown-credit{display:inline-block;margin-top:20px;font-weight:800}.ghosttown-credit{margin-left:20px;font-size:.78rem;color:rgba(255,255,255,.7)}.friend-share{position:fixed;right:18px;bottom:18px;z-index:80;display:grid;gap:8px;max-width:330px;padding:18px;border-radius:16px;background:var(--surface);color:var(--text);box-shadow:0 18px 60px rgba(0,0,0,.22)}.friend-share[hidden]{display:none}.friend-share button{min-height:44px;border:0;border-radius:999px;background:var(--accent);color:var(--accent-text);font-weight:850}</style>';
  html = html.replace('</head>', `${extraCss}</head>`);
  if (options.showFriendShare) {
    const activity = options.activityUrl ? `fetch('${escapeHtml(options.activityUrl)}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'share'}),keepalive:true}).catch(()=>{});` : '';
    const share = `<aside id="friend-share" class="friend-share" hidden><strong>Thanks. Your message was sent.</strong><span>Know someone who might like this?</span><button type="button" id="friend-share-button">Share this page</button></aside><script>(()=>{const p=new URLSearchParams(location.search);if(p.get('lead')!=='received')return;const box=document.getElementById('friend-share');const button=document.getElementById('friend-share-button');if(!box||!button)return;box.hidden=false;button.addEventListener('click',async()=>{${activity}const data={title:document.title,text:'Thought you might like this.',url:location.origin+location.pathname};if(navigator.share){try{await navigator.share(data);return}catch{}}try{await navigator.clipboard.writeText(data.url);button.textContent='Link copied'}catch{}})})()</script>`;
    html = html.replace('</body>', `${share}</body>`);
  }
  if (options.activityUrl) {
    html = html.replace('</body>', `<script>fetch('${escapeHtml(options.activityUrl)}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'visit'}),keepalive:true}).catch(()=>{})</script></body>`);
  }
  return html
    .replace(/Validation-stage offer[^<]*Claims remain evidence-bound\./g, 'A clear offer with a simple next step.')
    .replace(/Built from evidence gathered before launch/g, 'Ready for real customers')
    .replace(/Offer[^<]*Positioning[^<]*Price[^<]*Proof boundaries[^<]*Next action/g, 'Offer · Price · What happens next');
}
