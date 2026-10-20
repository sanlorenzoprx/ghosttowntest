import { GHOSTTOWN_FIRST_30_V1 } from '../lib/ghosttownOffer';
import type { Locale } from '../lib/locale';

// Shown to First 30 buyers where others see the Get Me Live upsell: the
// website is already paid for, so there is nothing to buy.

interface Props {
  locale?: Locale;
}

const COPY: Record<Locale, { kicker: string; heading: string; body: string; refund: string }> = {
  en: {
    kicker: 'Included in First 30',
    heading: 'Your customer-acquisition website is included',
    body: 'When your 30-day plan is ready, you can build your website from it. There is nothing else to buy.',
    refund: `${GHOSTTOWN_FIRST_30_V1.refundRule} The website build starts ${GHOSTTOWN_FIRST_30_V1.buildStartsWhen}.`
  },
  es: {
    kicker: 'Incluido en First 30',
    heading: 'Tu sitio web para conseguir clientes está incluido',
    body: 'Cuando tu plan de 30 días esté listo, puedes construir tu sitio web a partir de él. No hay nada más que comprar.',
    refund: `${GHOSTTOWN_FIRST_30_V1.refundRuleEs} La construcción del sitio empieza ${GHOSTTOWN_FIRST_30_V1.buildStartsWhenEs}.`
  }
};

export default function First30WebsiteIncluded({ locale = 'en' }: Props) {
  const t = COPY[locale];
  return (
    <section data-testid="first30-website-included" className="mt-6 rounded-xl border border-ghost-forest/25 bg-[#eef3ef] p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-forest">{t.kicker}</p>
      <h3 className="mt-2 text-xl font-black text-ghost-ink">{t.heading}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-700">{t.body}</p>
      <p className="mt-3 text-xs leading-5 text-gray-600">{t.refund}</p>
    </section>
  );
}
