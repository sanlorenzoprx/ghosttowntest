import { build } from 'esbuild';
import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';

// Mount the real workspace; only the HTTP boundary is replaced with a customer fixture.
describe('Get Me Live workspace languages', () => {
  it('walks every Spanish step, preserves provider choices, and saves an edited business name', async () => {
    const bundle = await build({
      stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Workspace from './src/components/GetMeLiveWorkspace'; createRoot(document.getElementById('root')).render(<Workspace orderId="gml-language" locale="es" onBack={()=>{}} />);`, resolveDir: process.cwd(), loader: 'tsx' },
      bundle: true, write: false, format: 'iife', define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"test"' }, jsx: 'automatic'
    });
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const configuration = {
      schemaVersion: 'get-me-live-config-v1',
      brand: { businessName: 'Proof Path', stylePreset: 'clean_saas', primaryColor: '#12372A' },
      offer: { intent: 'interest', headline: 'An offer', offer: 'A pilot', price: '$49', ctaLabel: 'Ask me' },
      contact: { leadDestinationEmail: 'owner@example.com', contactEmail: 'owner@example.com' },
      domain: { cloudflareAccountId: 'acct_1' }, payments: { enabled: false }
    };
    let savedName = '';
    let logoChoice = '';
    await page.route('http://workspace.test/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' });
      if (path.endsWith('/preview')) return route.fulfill({ contentType: 'text/html', body: '<h1>Customer preview</h1>' });
      if (path.endsWith('/config')) {
        savedName = route.request().postDataJSON().brand.businessName;
        return route.fulfill({ json: { configuration: route.request().postDataJSON() } });
      }
      if (path.endsWith('/assets') && route.request().method() === 'POST') {
        logoChoice = route.request().postDataJSON().choice;
        return route.fulfill({ status: 400, json: { error: 'Provider fixture response' } });
      }
      if (path.endsWith('/cloudflare/accounts')) return route.fulfill({ json: { accounts: [{ id: 'acct_1', name: 'My account' }] } });
      if (path.endsWith('/orders/gml-language')) return route.fulfill({ json: { order: { orderId: 'gml-language', status: 'configuring', providerState: { cloudflareConnected: true, stripeConnected: false, businessEmailVerified: false } }, configuration, assets: [], leads: [], activity: { visits: 0, shares: 0, sales: 0, revenueCents: 0 } } });
      return route.fulfill({ json: {} });
    });
    try {
      await page.goto('http://workspace.test/');
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page.getByRole('heading', { name: 'Tu página ya está casi lista.' }).waitFor();
      expect(await page.getByRole('navigation', { name: 'Lista para publicar' }).getByRole('button').count()).toBe(10);
      const steps = [
        ['Dónde vive tu página', 'Pon la página en una cuenta tuya.'],
        ['Nombre del negocio', 'Elige el nombre de tu negocio.'],
        ['Estilo y logo', 'Elige el estilo.'], ['Fotos', 'Añade fotos.'],
        ['Oferta y botón', '¿Qué ofreces?'], ['PDF gratis', 'Dales un PDF gratis a tus visitantes.'],
        ['Dónde llegan los contactos', '¿Dónde quieres recibir los nuevos contactos?'],
        ['Pagos', 'Permite que la gente pague.'], ['Revisar y publicar', 'Revisa antes de publicar.']
      ];
      for (const [label, heading] of steps) {
        await page.getByRole('navigation').getByRole('button', { name: label, exact: false }).click();
        await page.getByRole('heading', { name: heading, exact: true }).waitFor();
      }
      expect(await page.getByRole('button', { name: 'Publicar', exact: true }).isEnabled()).toBe(true);
      await page.getByRole('navigation').getByRole('button', { name: 'Estilo y logo' }).click();
      await page.getByRole('button', { name: 'bosque', exact: true }).click();
      await page.getByRole('alert').waitFor();
      expect(logoChoice).toBe('forest');
      expect(await page.getByRole('alert').textContent()).toBe('Provider fixture response');
      await page.getByRole('navigation').getByRole('button', { name: 'Nombre del negocio' }).click();
      await page.getByLabel('Nombre del negocio', { exact: true }).fill('Mi negocio');
      await page.getByText('Guardando…', { exact: true }).waitFor();
      await page.getByText('Guardado', { exact: true }).waitFor();
      expect(savedName).toBe('Mi negocio');
      expect(errors).toEqual([]);
    } finally { await browser.close(); }
  }, 60000);
});
