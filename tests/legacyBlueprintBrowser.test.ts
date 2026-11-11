import { build } from 'esbuild';
import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

// Historical generated plan content stays as stored; navigation and controls use the reader's language.
describe('legacy Blueprint in Spanish', () => {
  it('opens every section and publishes the existing site without changing the saved plan', async () => {
    const bundle = await build({
      stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import View from './src/components/LaunchBlueprintView'; createRoot(document.getElementById('root')).render(<View orderId="legacy" locale="es" onBack={()=>{}} />);`, resolveDir: process.cwd(), loader: 'tsx' },
      bundle: true, write: false, format: 'iife', define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"test"' }, jsx: 'automatic'
    });
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let published = false;
    const fixture = launchBlueprintFixture();
    await page.route('http://legacy.test/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' });
      if (path.endsWith('/blueprint')) return route.fulfill({ json: {
        blueprint: fixture, progress: { completedDays: [], evidenceNotes: {}, metrics: { outreachSent: 0, replies: 0, interviews: 0, qualifiedConversations: 0, commitments: 0, revenueCents: 0 }, updatedAt: '2026-11-11T12:00:00Z' },
        research: { provider: 'fixture', model: 'fixture', completedAt: '2026-11-11T12:00:00Z', webSearchQueries: [], attemptedSourceCount: 0, successfulSourceCount: 0, sourceTypeCount: 0, verifiedChannelCount: 0, rejectedUrlCount: 0, failedSourceCount: 0 }
      } });
      if (path.endsWith('/launch-site/publish')) published = true;
      if (path.includes('/launch-site')) return route.fulfill({ json: { site: published ? { status: 'published', publicSlug: 'legacy' } : null, canonicalBlueprintId: 'legacy-blueprint', publicUrl: 'https://example.com/legacy', publishFailures: [], leads: [] } });
      return route.fulfill({ json: {} });
    });
    try {
      await page.goto('http://legacy.test/');
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page.getByText('Decisión sobre el lanzamiento', { exact: true }).waitFor();
      for (const [button, heading] of [
        ['Oferta', 'Oferta lista para probar'], ['Red de medios', 'Red de medios y difusión'],
        ['Textos de lanzamiento', 'Vista previa de la página de lanzamiento'], ['Calendario de 30 días', 'Calendario de ejecución de 30 días'],
        ['Decisión', 'Registro de evidencia'], ['Sitio de lanzamiento', 'Listo cuando decidas publicar.']
      ]) {
        await page.getByRole('button', { name: button, exact: true }).click();
        await page.getByText(heading, { exact: true }).waitFor();
      }
      await page.getByRole('button', { name: 'Publicar sitio de lanzamiento', exact: true }).click();
      await page.getByRole('heading', { name: 'Publica la oferta que ya aprobaste.' }).waitFor();
      expect(published).toBe(true);
      expect(await page.getByRole('button', { name: 'Retirar publicación', exact: true }).count()).toBe(1);
      expect(errors).toEqual([]);
    } finally { await browser.close(); }
  }, 60000);
});
