import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import First30PurchasePanel from '../src/components/First30PurchasePanel';
import First30WebsiteIncluded from '../src/components/First30WebsiteIncluded';
import ActionPlanModal from '../src/components/ActionPlanModal';
import { isFirst30OrderId } from '../src/lib/first30Order';
import type { IdeaIntake } from '../src/types/lit';

const idea = { ideaName: 'Game night', description: 'A monthly game box', targetUser: 'Parents', painfulProblem: 'Boring nights', currentAlternative: 'Random games', motivation: 'Mine' } as IdeaIntake;

describe('First 30 screens', () => {
  it('sells First 30 with its price, what it includes, why it matters and the refund rule', () => {
    const html = renderToStaticMarkup(<First30PurchasePanel loading={false} error="" onStart={() => {}} />);
    expect(html).toContain('First 30 — $297, paid once');
    expect(html).toContain('A customer-acquisition website branded for your business');
    expect(html).toContain('Why this matters:');
    expect(html).toContain('Full refund until your website build starts; no refund after it starts.');
    expect(html).toContain('the first time you ask GhostTown to build your website preview');
    expect(html).toContain('It does not promise sales or income.');
  });

  it('sells First 30 in Spanish', () => {
    const html = renderToStaticMarkup(<First30PurchasePanel locale="es" loading={false} error="" onStart={() => {}} />);
    for (const text of ['First 30 — $297, un solo pago', 'Por qué importa:', 'Reembolso completo hasta que empiece la construcción de tu sitio web', 'Empezar First 30 — $297', 'No promete ventas ni ingresos.']) {
      expect(html, text).toContain(text);
    }
    expect(html).not.toContain('Start First 30');
  });

  it('asks for the First 30 intake in Spanish, without the $97 Sprint wording', () => {
    const html = renderToStaticMarkup(<ActionPlanModal idea={idea} verdictId="v1" loading={false} error="" onClose={() => {}} onSubmit={() => {}} locale="es" offer="first30" />);
    for (const text of ['Empieza First 30', '¿A quién quieres ayudar primero?', '¿En qué idioma quieres tu plan?', 'Un solo pago cubre el plan de 30 días y tu sitio web.', 'Empezar First 30 — $297']) {
      expect(html, text).toContain(text);
    }
    expect(html).not.toMatch(/Evidence Sprint|\$97|does not include a live website/);
  });

  it('keeps the dormant Sprint intake exactly as before in English', () => {
    const html = renderToStaticMarkup(<ActionPlanModal idea={idea} verdictId="v1" loading={false} error="" onClose={() => {}} onSubmit={() => {}} />);
    expect(html).toContain('You tested your idea. Now let’s help you make it real.');
    expect(html).toContain('Start My 30-Day Evidence Sprint');
  });

  it('tells First 30 buyers their website is included instead of selling it again', () => {
    expect(renderToStaticMarkup(<First30WebsiteIncluded />)).toContain('Your customer-acquisition website is included');
    expect(renderToStaticMarkup(<First30WebsiteIncluded locale="es" />)).toContain('Tu sitio web para conseguir clientes está incluido');
    expect(isFirst30OrderId('gtf_123')).toBe(true);
    expect(isFirst30OrderId('gtt_123')).toBe(false);
  });
});
