import type { EvidenceScanItem, GhostTownEvidenceScanV1, PricingBandSummary } from '../types/evidence';
import type { IdeaIntake } from '../types/lit';
import type { VerdictDecision } from '../verdict/verdictDecisionV2';
import type { VerdictDecisionV3, VerdictEvidenceState } from '../verdict/verdictDecisionV3';
import type { Locale } from '../lib/locale';
import { evidenceCounts, type EvidenceCounts } from '../lib/verdictPresentation';

interface Props {
  scan: GhostTownEvidenceScanV1;
  decision: VerdictDecisionV3;
  idea: Pick<IdeaIntake, 'targetUser' | 'painfulProblem' | 'currentAlternative'>;
  locale?: Locale;
}

type LayerKey = 'market' | 'customer' | 'commercial' | 'pricing' | 'premium' | 'response' | 'purchase';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const COPY = {
  en: {
    kicker: 'GhostTown evidence scan',
    heading: 'What we found online, and what only your buyers can tell you',
    intro: 'Reviews, ratings and prices for similar products show that people already use and pay for solutions like yours. That is real evidence about the market. It does not show that buyers will choose your offer. Only asking them does that.',
    status: { complete: 'complete', partial: 'partial', unavailable: 'unavailable' } as Record<GhostTownEvidenceScanV1['status'], string>,
    marketHeading: 'Does this market exist?',
    lists: { competition: 'Competitors', demand: 'What people search for', access: 'Where buyers gather', alternatives: 'What people use today' },
    behaviorHeading: 'Do people use and pay for similar solutions?',
    behaviorLists: { customer: 'People using similar solutions', commercial: 'People paying for similar solutions', pricing: 'Prices we found', premium: 'Premium prices' },
    empty: {
      default: 'We did not find anything useful here in our quick scan.',
      customer: 'We found no reviews or ratings for similar solutions. That is a gap in our data, not proof that nobody uses them.',
      commercial: 'We found no clear sign of people paying for similar solutions. A missing price does not count against you.',
      pricing: 'We found no prices. Price is helpful, but the verdict does not depend on it.',
      premium: 'We found no premium-priced products. That does not mean a premium version cannot work.'
    },
    pricingRule: 'About prices:',
    pricingRuleText: 'The prices we found describe the market. They are not a price for you. A high-priced competitor is a clue about what people value, not a number to copy.',
    layersHeading: 'Seven kinds of evidence, from weakest to strongest',
    layers: {
      market: '1 · The market exists', customer: '2 · People use similar solutions', commercial: '3 · People pay for similar solutions',
      pricing: '4 · Prices in the market', premium: '5 · Premium prices', response: '6 · Buyers reply to your offer', purchase: '7 · Buyers pay for your offer'
    } as Record<LayerKey, string>,
    layerText: {
      market: (n: number) => `We found ${plural(n, 'sign', 'signs')} online that this market exists.`,
      customer: (n: number) => `${plural(n, 'similar product has', 'similar products have')} public reviews or ratings.`,
      commercial: (n: number) => `We found ${plural(n, 'sign', 'signs')} that people pay for similar solutions.`,
      pricing: (bands: string, n: number) => bands ? `Prices we found: ${bands}. These describe the market; they do not set your price.` : `We found ${plural(n, 'price', 'prices')}. These describe the market; they do not set your price.`,
      premium: (n: number) => `${plural(n, 'product sells', 'products sell')} well above the usual price.`,
      none: {
        market: 'We did not find useful signs of this market in our quick scan.',
        customer: 'No reviews or ratings found. That is a gap, not proof nobody uses solutions like this.',
        commercial: 'No clear sign of people paying yet. A missing price does not count against you.',
        pricing: 'No prices found. That is not proof buyers will not pay.',
        premium: 'No premium-priced products found. A premium version may still work.'
      },
      response: 'Not asked yet. This free verdict has not shown your offer to buyers, so there are no replies, calls or sign-ups yet.',
      purchase: 'Not asked yet. Nobody has been offered your product to buy, so there are no deposits or payments yet.',
      observedResponse: (n: number) => `${plural(n, 'buyer replied', 'buyers replied')} to your offer.`,
      observedPurchase: (n: number) => `${plural(n, 'buyer paid', 'buyers paid')} or committed.`
    },
    band: (band: PricingBandSummary, value: (n: number) => string) => `${band.currency === 'UNSPECIFIED' ? '' : `${band.currency} `}${value(band.minimum)}–${value(band.maximum)} (middle price ${value(band.median)}, ${band.count} found)`,
    state: { observed: '', not_observed: 'Not found', not_collected: 'Not asked yet' } as Record<VerdictEvidenceState, string>,
    contrast: { founder: 'What you told us', market: 'What we found online', conclusion: 'What GhostTown concludes' },
    founderSays: (who: string, problem: string, alternative: string) => `You say ${who} struggle with ${problem} and use ${alternative} today.`,
    founderDefaults: { who: 'your buyers', problem: 'the problem you described', alternative: 'something you did not name' },
    marketSays: (parts: string[]) => `We found ${parts.join(', ')}. So people use, and sometimes pay for, solutions like this. It does not show they will choose yours.`,
    marketNone: 'Our quick scan did not find useful market data. That is a gap, not proof there are no buyers.',
    marketParts: {
      market: (n: number) => plural(n, 'sign the market exists', 'signs the market exists'),
      customer: (n: number) => plural(n, 'similar product with reviews', 'similar products with reviews'),
      commercial: (n: number) => plural(n, 'sign of people paying', 'signs of people paying'),
      pricing: (n: number) => plural(n, 'price', 'prices'),
      premium: (n: number) => plural(n, 'premium price', 'premium prices')
    },
    conclusion: {
      DO_NOT_PURSUE_YET: { yes: 'There is activity in this market, but the idea is still too broad to test with an offer.', no: 'The idea is still too broad to test with an offer, and we found little market data.' },
      WORTH_TESTING: { yes: 'People already use or buy similar solutions. Now find out if they will reply to and pay for yours.', no: 'The idea is clear enough to test. Now find out if buyers will reply to and pay for your offer.' },
      REVISE_BEFORE_TESTING: { yes: 'People use and pay for similar solutions, so keep going. First make your offer sharper, so a test tells you about your version.', no: 'There is enough here to keep testing. First make your offer clearer before you contact buyers.' },
      WEAK_EVIDENCE: { yes: 'People use similar solutions, but there is little sign yet for your offer. Show buyers a concrete offer and ask for a real commitment.', no: 'The signs are still weak. Show specific buyers a concrete offer and ask for a real commitment.' }
    } as Record<VerdictDecision, { yes: string; no: string }>,
    unknownTitle: 'What we still do not know',
    unknowns: {
      customer: 'Whether people use similar solutions: we found no reviews or ratings.',
      commercial: 'Whether people pay for similar solutions: we found no clear sign.',
      direct: 'Whether buyers will reply to or pay for your specific offer. Only asking them can tell you.'
    },
    reviews: 'reviews',
    providers: { dataforseo: 'web search', podcast_index: 'podcasts', youtube_api: 'YouTube', founder_input: 'you' } as Record<string, string>,
    showNotes: true
  },
  es: {
    kicker: 'Búsqueda de evidencia de GhostTown',
    heading: 'Lo que encontramos en internet, y lo que solo tus compradores pueden decirte',
    intro: 'Las reseñas, calificaciones y precios de productos parecidos muestran que la gente ya usa y paga por soluciones como la tuya. Es evidencia real sobre el mercado. No muestra que los compradores elegirán tu oferta. Eso solo lo sabrás preguntándoles.',
    status: { complete: 'completa', partial: 'parcial', unavailable: 'no disponible' } as Record<GhostTownEvidenceScanV1['status'], string>,
    marketHeading: '¿Existe este mercado?',
    lists: { competition: 'Competidores', demand: 'Lo que la gente busca', access: 'Dónde se reúnen los compradores', alternatives: 'Lo que la gente usa hoy' },
    behaviorHeading: '¿La gente usa y paga por soluciones parecidas?',
    behaviorLists: { customer: 'Gente que usa soluciones parecidas', commercial: 'Gente que paga por soluciones parecidas', pricing: 'Precios que encontramos', premium: 'Precios altos' },
    empty: {
      default: 'No encontramos nada útil aquí en nuestra búsqueda rápida.',
      customer: 'No encontramos reseñas ni calificaciones de soluciones parecidas. Es un vacío en los datos, no prueba de que nadie las use.',
      commercial: 'No encontramos señales claras de que la gente pague por soluciones parecidas. Que falte un precio no cuenta en tu contra.',
      pricing: 'No encontramos precios. El precio ayuda, pero el veredicto no depende de él.',
      premium: 'No encontramos productos de precio alto. Eso no significa que una versión de precio alto no pueda funcionar.'
    },
    pricingRule: 'Sobre los precios:',
    pricingRuleText: 'Los precios que encontramos describen el mercado. No son tu precio. Un competidor caro es una pista de lo que la gente valora, no un número para copiar.',
    layersHeading: 'Siete tipos de evidencia, de la más débil a la más fuerte',
    layers: {
      market: '1 · El mercado existe', customer: '2 · La gente usa soluciones parecidas', commercial: '3 · La gente paga por soluciones parecidas',
      pricing: '4 · Precios en el mercado', premium: '5 · Precios altos', response: '6 · Los compradores responden a tu oferta', purchase: '7 · Los compradores pagan tu oferta'
    } as Record<LayerKey, string>,
    layerText: {
      market: (n: number) => `Encontramos ${plural(n, 'señal', 'señales')} en internet de que este mercado existe.`,
      customer: (n: number) => `${plural(n, 'producto parecido tiene', 'productos parecidos tienen')} reseñas o calificaciones públicas.`,
      commercial: (n: number) => `Encontramos ${plural(n, 'señal', 'señales')} de que la gente paga por soluciones parecidas.`,
      pricing: (bands: string, n: number) => bands ? `Precios que encontramos: ${bands}. Describen el mercado; no fijan tu precio.` : `Encontramos ${plural(n, 'precio', 'precios')}. Describen el mercado; no fijan tu precio.`,
      premium: (n: number) => `${plural(n, 'producto se vende', 'productos se venden')} muy por encima del precio usual.`,
      none: {
        market: 'No encontramos señales útiles de este mercado en nuestra búsqueda rápida.',
        customer: 'No hay reseñas ni calificaciones. Es un vacío, no prueba de que nadie use soluciones así.',
        commercial: 'Todavía no hay señales claras de que la gente pague. Que falte un precio no cuenta en tu contra.',
        pricing: 'No encontramos precios. No es prueba de que los compradores no pagarán.',
        premium: 'No encontramos productos de precio alto. Una versión de precio alto todavía podría funcionar.'
      },
      response: 'Todavía no se ha preguntado. Este veredicto gratis no ha mostrado tu oferta a compradores, así que aún no hay respuestas, llamadas ni registros.',
      purchase: 'Todavía no se ha preguntado. Nadie ha recibido tu producto para comprar, así que aún no hay depósitos ni pagos.',
      observedResponse: (n: number) => `${plural(n, 'comprador respondió', 'compradores respondieron')} a tu oferta.`,
      observedPurchase: (n: number) => `${plural(n, 'comprador pagó o se comprometió', 'compradores pagaron o se comprometieron')}.`
    },
    band: (band: PricingBandSummary, value: (n: number) => string) => `${band.currency === 'UNSPECIFIED' ? '' : `${band.currency} `}${value(band.minimum)}–${value(band.maximum)} (precio del medio ${value(band.median)}, ${band.count} encontrados)`,
    state: { observed: '', not_observed: 'No encontrado', not_collected: 'Todavía no se ha preguntado' } as Record<VerdictEvidenceState, string>,
    contrast: { founder: 'Lo que nos dijiste', market: 'Lo que encontramos en internet', conclusion: 'Lo que concluye GhostTown' },
    founderSays: (who: string, problem: string, alternative: string) => `Dices que ${who} batallan con ${problem} y hoy usan ${alternative}.`,
    founderDefaults: { who: 'tus compradores', problem: 'el problema que describiste', alternative: 'algo que no nombraste' },
    marketSays: (parts: string[]) => `Encontramos ${parts.join(', ')}. O sea, la gente usa, y a veces paga por, soluciones como esta. No muestra que elegirán la tuya.`,
    marketNone: 'Nuestra búsqueda rápida no encontró datos útiles del mercado. Es un vacío, no prueba de que no haya compradores.',
    marketParts: {
      market: (n: number) => plural(n, 'señal de que el mercado existe', 'señales de que el mercado existe'),
      customer: (n: number) => plural(n, 'producto parecido con reseñas', 'productos parecidos con reseñas'),
      commercial: (n: number) => plural(n, 'señal de gente pagando', 'señales de gente pagando'),
      pricing: (n: number) => plural(n, 'precio', 'precios'),
      premium: (n: number) => plural(n, 'precio alto', 'precios altos')
    },
    conclusion: {
      DO_NOT_PURSUE_YET: { yes: 'Hay actividad en este mercado, pero la idea todavía es muy general para probarla con una oferta.', no: 'La idea todavía es muy general para probarla con una oferta, y encontramos pocos datos del mercado.' },
      WORTH_TESTING: { yes: 'La gente ya usa o compra soluciones parecidas. Ahora averigua si responderán y pagarán por la tuya.', no: 'La idea está lo bastante clara para probarla. Ahora averigua si los compradores responderán y pagarán por tu oferta.' },
      REVISE_BEFORE_TESTING: { yes: 'La gente usa y paga por soluciones parecidas, así que sigue. Primero afina tu oferta, para que la prueba te hable de tu versión.', no: 'Hay suficiente para seguir probando. Primero aclara tu oferta antes de contactar compradores.' },
      WEAK_EVIDENCE: { yes: 'La gente usa soluciones parecidas, pero todavía hay pocas señales para tu oferta. Muestra una oferta concreta y pide un compromiso real.', no: 'Las señales todavía son débiles. Muestra una oferta concreta a compradores específicos y pide un compromiso real.' }
    } as Record<VerdictDecision, { yes: string; no: string }>,
    unknownTitle: 'Lo que todavía no sabemos',
    unknowns: {
      customer: 'Si la gente usa soluciones parecidas: no encontramos reseñas ni calificaciones.',
      commercial: 'Si la gente paga por soluciones parecidas: no encontramos señales claras.',
      direct: 'Si los compradores responderán o pagarán por tu oferta. Solo preguntándoles lo sabrás.'
    },
    reviews: 'reseñas',
    providers: { dataforseo: 'búsqueda web', podcast_index: 'podcasts', youtube_api: 'YouTube', founder_input: 'tú' } as Record<string, string>,
    // Item notes come from the scan in English; Spanish shows the source and its numbers only.
    showNotes: false
  }
};

type Copy = typeof COPY.en;

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function itemMeta(item: EvidenceScanItem, t: Copy): string[] {
  const parts: string[] = [t.providers[item.provider] ?? item.provider.replace(/_/g, ' ')];
  if (item.rating) {
    const scale = item.rating.maximum ? `/${item.rating.maximum}` : '';
    parts.push(`${item.rating.value}${scale} · ${item.rating.reviewCount} ${t.reviews}`);
  }
  if (item.price) {
    const amount = item.price.displayed
      || [item.price.currency, item.price.current ?? item.price.maximum ?? item.price.regular]
        .filter(value => value !== undefined).join(' ');
    if (amount) parts.push(String(amount));
  }
  return parts;
}

function SignalList({ title, items, emptyText, t }: { title: string; items: EvidenceScanItem[]; emptyText: string; t: Copy }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-gray-950">{title}</h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-700">{items.length}</span>
      </div>
      {items.length ? (
        <ul className="mt-3 space-y-3 text-sm text-gray-700">
          {items.slice(0, 5).map(item => (
            <li key={item.evidenceId} className="border-l-2 border-ghost-gold pl-3">
              {item.publicUrl
                ? <a href={item.publicUrl} target="_blank" rel="noreferrer" className="font-bold text-blue-700 hover:underline">{item.label}</a>
                : <span className="font-bold">{item.label}</span>}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {itemMeta(item, t).map(meta => (
                  <span key={meta} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">{meta}</span>
                ))}
              </div>
              {t.showNotes && <p className="mt-1 text-xs leading-5 text-gray-600">{item.note}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-gray-500">{emptyText}</p>}
    </article>
  );
}

function layerStatements(t: Copy, counts: EvidenceCounts, scan: GhostTownEvidenceScanV1, decision: VerdictDecisionV3) {
  const bands = (scan.pricingBands ?? []).slice(0, 2).map(band => t.band(band, formatNumber)).join('; ');
  const direct = decision.evidenceLayers;
  return {
    market: counts.market ? t.layerText.market(counts.market) : t.layerText.none.market,
    customer: counts.customer ? t.layerText.customer(counts.customer) : t.layerText.none.customer,
    commercial: counts.commercial ? t.layerText.commercial(counts.commercial) : t.layerText.none.commercial,
    pricing: counts.pricing ? t.layerText.pricing(bands, counts.pricing) : t.layerText.none.pricing,
    premium: counts.premium ? t.layerText.premium(counts.premium) : t.layerText.none.premium,
    response: direct.directOfferResponse.state === 'observed' ? t.layerText.observedResponse(direct.directOfferResponse.count) : t.layerText.response,
    purchase: direct.directOfferPurchase.state === 'observed' ? t.layerText.observedPurchase(direct.directOfferPurchase.count) : t.layerText.purchase
  } as Record<LayerKey, string>;
}

export default function EvidenceScanPanel({ scan, decision, idea, locale = 'en' }: Props) {
  const t = COPY[locale];
  const counts = evidenceCounts(scan)!;
  const layers = decision.evidenceLayers;
  const statements = layerStatements(t, counts, scan, decision);
  const layerState: Record<LayerKey, { state: VerdictEvidenceState; count: number }> = {
    market: layers.marketExistence, customer: layers.customerConsumption, commercial: layers.commercialConsumption,
    pricing: layers.pricingLandscape, premium: layers.premiumPrecedent, response: layers.directOfferResponse, purchase: layers.directOfferPurchase
  };
  const categoryBehavior = counts.customer > 0 || counts.commercial > 0;
  const marketParts = (['market', 'customer', 'commercial', 'pricing', 'premium'] as const)
    .filter(key => counts[key] > 0)
    .map(key => t.marketParts[key](counts[key]));
  const clean = (value: string | undefined) => (value || '').replace(/\s+/g, ' ').trim().replace(/[.;:,]+$/, '');
  const unknowns = [
    counts.customer ? '' : t.unknowns.customer,
    counts.commercial ? '' : t.unknowns.commercial,
    t.unknowns.direct
  ].filter(Boolean);

  return (
    <section data-testid="evidence-scan-v1" className="mb-8 overflow-hidden rounded-2xl border border-ghost-forest/25 bg-[#eef3ef] shadow-dust">
      <div className="border-b border-ghost-forest/15 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-forest">{t.kicker}</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-ghost-ink">{t.heading}</h1>
          </div>
          <span className="rounded-full border border-ghost-forest/25 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-ghost-forest">{t.status[scan.status] ?? scan.status}</span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">{t.intro}</p>
      </div>

      <div className="border-b border-ghost-forest/15 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-forest">{t.marketHeading}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SignalList t={t} title={t.lists.competition} items={scan.competition} emptyText={t.empty.default} />
          <SignalList t={t} title={t.lists.demand} items={scan.demand} emptyText={t.empty.default} />
          <SignalList t={t} title={t.lists.access} items={scan.access} emptyText={t.empty.default} />
          <SignalList t={t} title={t.lists.alternatives} items={scan.currentAlternatives} emptyText={t.empty.default} />
        </div>
      </div>

      <div className="border-b border-ghost-forest/15 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-forest">{t.behaviorHeading}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SignalList t={t} title={t.behaviorLists.customer} items={scan.customerConsumption ?? []} emptyText={t.empty.customer} />
          <SignalList t={t} title={t.behaviorLists.commercial} items={scan.commercialConsumption ?? []} emptyText={t.empty.commercial} />
          <SignalList t={t} title={t.behaviorLists.pricing} items={scan.pricingLandscape ?? []} emptyText={t.empty.pricing} />
          <SignalList t={t} title={t.behaviorLists.premium} items={scan.premiumPrecedent ?? []} emptyText={t.empty.premium} />
        </div>
        <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <strong>{t.pricingRule}</strong> {t.pricingRuleText}
        </p>
      </div>

      <div className="border-b border-ghost-forest/15 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-forest">{t.layersHeading}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(t.layers) as LayerKey[]).map(key => (
            <EvidenceLayer key={key} title={t.layers[key]} statement={statements[key]} value={layerState[key].state === 'observed' ? String(layerState[key].count) : t.state[layerState[key].state]} />
          ))}
        </div>
      </div>

      <div className="space-y-3 bg-white p-6 sm:p-8">
        <Contrast label={t.contrast.founder} text={t.founderSays(clean(idea.targetUser) || t.founderDefaults.who, clean(idea.painfulProblem) || t.founderDefaults.problem, clean(idea.currentAlternative) || t.founderDefaults.alternative)} />
        <Contrast label={t.contrast.market} text={marketParts.length ? t.marketSays(marketParts) : t.marketNone} />
        <Contrast label={t.contrast.conclusion} text={t.conclusion[decision.decision][categoryBehavior || counts.market > 0 && decision.decision === 'DO_NOT_PURSUE_YET' ? 'yes' : 'no']} emphasis />
        <details className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <summary className="cursor-pointer font-black text-amber-900">{t.unknownTitle}</summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {unknowns.map(item => <li key={item}>{item}</li>)}
          </ul>
        </details>
      </div>
    </section>
  );
}

function EvidenceLayer({ title, statement, value }: { title: string; statement: string; value: string }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">{title}</p>
      <p className="mt-2 text-xl font-black text-gray-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-gray-700">{statement}</p>
    </article>
  );
}

function Contrast({ label, text, emphasis = false }: { label: string; text: string; emphasis?: boolean }) {
  return (
    <article className={`rounded-xl border p-4 ${emphasis ? 'border-ghost-rust/30 bg-[#fff7f2]' : 'border-gray-200 bg-gray-50'}`}>
      <p className={`text-xs font-black uppercase tracking-[0.12em] ${emphasis ? 'text-ghost-rust' : 'text-gray-600'}`}>{label}</p>
      <p className={`mt-2 leading-7 ${emphasis ? 'font-bold text-ghost-ink' : 'text-gray-800'}`}>{text}</p>
    </article>
  );
}
