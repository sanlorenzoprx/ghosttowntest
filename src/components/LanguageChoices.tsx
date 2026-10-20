import type { Locale } from '../lib/locale';

// The two Sprint languages: the one the founder reads the plan in, and the
// one their customers read. See src/lib/blueprintLanguage.ts.

interface Props {
  locale?: Locale;
  founderLanguage: Locale;
  buyerLanguage: Locale;
  onFounderLanguage: (value: Locale) => void;
  onBuyerLanguage: (value: Locale) => void;
}

const COPY: Record<Locale, { founder: string; buyer: string; buyerHelp: string; options: Record<Locale, string> }> = {
  en: {
    founder: 'Which language do you want your plan in?',
    buyer: 'Which language do your customers speak?',
    buyerHelp: 'Your posts, messages and website copy will be written in this language.',
    options: { en: 'English', es: 'Spanish' }
  },
  es: {
    founder: '¿En qué idioma quieres tu plan?',
    buyer: '¿Qué idioma hablan tus clientes?',
    buyerHelp: 'Tus publicaciones, mensajes y textos del sitio web se escribirán en este idioma.',
    options: { en: 'Inglés', es: 'Español' }
  }
};

export default function LanguageChoices({ locale = 'en', founderLanguage, buyerLanguage, onFounderLanguage, onBuyerLanguage }: Props) {
  const t = COPY[locale];
  return (
    <>
      <Choice label={t.founder} value={founderLanguage} onChange={onFounderLanguage} options={t.options} />
      <Choice label={t.buyer} help={t.buyerHelp} value={buyerLanguage} onChange={onBuyerLanguage} options={t.options} />
    </>
  );
}

function Choice({ label, help, value, onChange, options }: {
  label: string;
  help?: string;
  value: Locale;
  onChange: (value: Locale) => void;
  options: Record<Locale, string>;
}) {
  return (
    <label className="block text-sm font-bold text-gray-800">
      {label}
      {help && <span className="mt-1 block text-sm font-normal text-gray-600">{help}</span>}
      <select value={value} onChange={event => onChange(event.target.value === 'es' ? 'es' : 'en')} className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
        <option value="en">{options.en}</option>
        <option value="es">{options.es}</option>
      </select>
    </label>
  );
}
