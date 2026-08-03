import type { BusinessDnaType, EvaluationResult, FinalVerdict } from '../types/lit';

export type VerdictCardFormat = 'landscape' | 'square';
type VerdictCardLocale = 'en' | 'es';

interface CardOptions {
  format: VerdictCardFormat;
  includeIdeaName: boolean;
  shareUrl?: string;
  locale?: VerdictCardLocale;
}

interface CardTheme {
  accent: string;
  soft: string;
  label: string;
  hook: string;
}

interface CardCopy {
  brandLabel: string;
  privateIdea: string;
  scoreLabel: string;
  scoreOutOf: string;
  businessDnaLabel: string;
  survivePrompt: string;
  altPrefix: string;
}

const dimensions: Record<VerdictCardFormat, { width: number; height: number }> = {
  landscape: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 }
};

const BRAND_HOST = 'LIT-GHOSTTOWN.COM';

const themes: Record<FinalVerdict, CardTheme> = {
  build_now: {
    accent: '#2f6b4f', soft: '#dcebe2',
    label: 'BUILD NOW', hook: 'MY IDEA SURVIVED.'
  },
  test_first: {
    accent: '#94620d', soft: '#f4e8ca',
    label: 'TEST FIRST', hook: 'GOOD IDEA. DANGEROUS ASSUMPTION.'
  },
  niche_down: {
    accent: '#a94f2a', soft: '#f1ddd2',
    label: 'NICHE DOWN', hook: 'RIGHT PROBLEM. MARKET TOO WIDE.'
  },
  change_business_dna: {
    accent: '#7a5b22', soft: '#eee3ce',
    label: 'CHANGE THE DNA', hook: 'THE MODEL IS THE PROBLEM.'
  },
  kill_it_before_it_kills_years: {
    accent: '#973838', soft: '#f0dddd',
    label: 'KILL IT', hook: 'PAUSE. LEARN. REASSESS.'
  }
};

const spanishThemes: Record<FinalVerdict, CardTheme> = {
  build_now: {
    accent: '#2f6b4f', soft: '#dcebe2',
    label: 'CONSTRUIR', hook: 'MI IDEA SOBREVIVIÓ.'
  },
  test_first: {
    accent: '#94620d', soft: '#f4e8ca',
    label: 'PROBAR', hook: 'BUENA IDEA. SUPUESTO PELIGROSO.'
  },
  niche_down: {
    accent: '#a94f2a', soft: '#f1ddd2',
    label: 'ENFOCAR', hook: 'PROBLEMA CORRECTO. MERCADO MUY AMPLIO.'
  },
  change_business_dna: {
    accent: '#7a5b22', soft: '#eee3ce',
    label: 'CAMBIAR ADN', hook: 'EL MODELO ES EL PROBLEMA.'
  },
  kill_it_before_it_kills_years: {
    accent: '#973838', soft: '#f0dddd',
    label: 'MATARLA', hook: 'PAUSA. APRENDE. REEVALÚA.'
  }
};

const cardCopy: Record<VerdictCardLocale, CardCopy> = {
  en: {
    brandLabel: 'LIT GHOST TOWN TEST',
    privateIdea: 'Idea name kept private',
    scoreLabel: 'LIT SCORE',
    scoreOutOf: 'OUT OF 5',
    businessDnaLabel: 'BUSINESS DNA',
    survivePrompt: 'WOULD YOUR IDEA SURVIVE?',
    altPrefix: 'Shareable LIT Ghost Town verdict card'
  },
  es: {
    brandLabel: 'PRUEBA GHOST TOWN LIT',
    privateIdea: 'Nombre de idea privado',
    scoreLabel: 'PUNTUACIÓN LIT',
    scoreOutOf: 'DE 5',
    businessDnaLabel: 'ADN DEL NEGOCIO',
    survivePrompt: '¿SOBREVIVIRÍA TU IDEA?',
    altPrefix: 'Tarjeta compartible del veredicto LIT Ghost Town'
  }
};

const deterministicSpanishCopy = {
  build_now: {
    headline: 'Tienes la ventaja.',
    advice: 'Empieza a construir el MVP esta semana.'
  },
  test_first: {
    headline: 'Buena idea, prueba el supuesto.',
    advice: 'Prueba un supuesto crítico antes de construir.'
  },
  test_first_passion: {
    headline: 'Pasión sin prueba.',
    advice: 'Prueba antes de construir. Encuentra primero a tu primer cliente.'
  },
  niche_down: {
    headline: 'Demasiado amplio, sin foso.',
    advice: 'Enfoca el nicho. Encuentra el segmento donde ganas.'
  },
  change_business_dna: {
    headline: 'Cambia el modelo de negocio.',
    advice: 'Cambia el modelo antes de aumentar la inversión.'
  },
  kill_it_before_it_kills_years: {
    headline: 'Esto es un ghost town.',
    advice: 'No construyas esto. Mátalo antes de que te quite años de vida.'
  }
} as const;

const deterministicEnglishCopy = {
  build_now: {
    headline: 'You have the advantage.',
    advice: 'Start building the MVP this week.'
  },
  test_first: {
    headline: 'Good idea, test the assumption.',
    advice: 'Test one critical assumption before building.'
  },
  test_first_passion: {
    headline: 'Passion without proof.',
    advice: 'Test before you build. Find your first customer first.'
  },
  niche_down: {
    headline: 'Too broad, no moat.',
    advice: 'Niche down. Find the segment where you win.'
  },
  change_business_dna: {
    headline: 'Change the business model.',
    advice: 'Change the model before increasing investment.'
  },
  kill_it_before_it_kills_years: {
    headline: 'This is a ghost town.',
    advice: 'Do not build this. Kill it before it kills years of your life.'
  }
} as const;

export function createVerdictCardSvg(result: EvaluationResult, options: CardOptions): string {
  const { width, height } = dimensions[options.format];
  const locale = options.locale === 'es' ? 'es' : 'en';
  const scores = result.deterministicScores;
  const verdict = result.verdict?.verdict ?? scores.finalVerdict;
  const theme = (locale === 'es' ? spanishThemes : themes)[verdict];
  const copy = cardCopy[locale];
  const headline = localizeDeterministicField(locale, scores.finalVerdict, 'headline', result.verdict?.verdict_headline ?? scores.verdictHeadline);
  const advice = localizeDeterministicField(locale, scores.finalVerdict, 'advice', result.verdict?.one_sentence_advice ?? scores.oneSentenceAdvice);
  const ideaName = options.includeIdeaName ? result.idea.ideaName : copy.privateIdea;
  const host = BRAND_HOST;
  const dna = formatDna(result.deterministicScores.businessDnaType, locale);

  return options.format === 'landscape'
    ? landscapeSvg({ width, height, result, theme, headline, advice, ideaName, host, copy, dna })
    : squareSvg({ width, height, result, theme, headline, advice, ideaName, host, copy, dna });
}

export function getVerdictCardAlt(result: EvaluationResult, locale: VerdictCardLocale = 'en'): string {
  const safeLocale = locale === 'es' ? 'es' : 'en';
  const verdict = localizeDeterministicField(safeLocale, result.deterministicScores.finalVerdict, 'headline', result.verdict?.verdict_headline ?? result.deterministicScores.verdictHeadline);
  return `${cardCopy[safeLocale].altPrefix}: ${verdict}`;
}

export async function createVerdictCardPng(
  result: EvaluationResult,
  options: CardOptions
): Promise<File> {
  const svg = createVerdictCardSvg(result, options);
  const { width, height } = dimensions[options.format];
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image rendering is not supported in this browser');
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not create the verdict image')), 'image/png', 0.94);
    });
    const fileLabel = options.includeIdeaName ? result.idea.ideaName : 'private-idea';
    return new File([blob], `lit-verdict-${slugify(fileLabel)}-${options.format}.png`, {
      type: 'image/png'
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function landscapeSvg(input: SvgInput): string {
  const { width, height, result, theme, headline, advice, ideaName, host, copy, dna } = input;
  const hookLines = wrapText(theme.hook, 28, 2);
  const headlineLines = wrapText(headline, 38, 2);
  const adviceLines = wrapText(advice, 58, 2);
  const ideaNameLines = wrapText(ideaName, 58, 2);

  return svgShell(width, height, theme, `
    <text x="64" y="66" fill="#252927" font-size="20" font-weight="800" letter-spacing="4">${escapeXml(copy.brandLabel)}</text>
    <rect x="64" y="98" width="248" height="46" rx="6" fill="${theme.soft}" stroke="${theme.accent}"/>
    <text x="188" y="129" fill="${theme.accent}" font-size="19" font-weight="900" text-anchor="middle" letter-spacing="2">${escapeXml(theme.label)}</text>

    ${textLines(hookLines, 64, 210, 48, 42, theme.accent, 900)}
    ${textLines(headlineLines, 64, 306, 42, 34, '#252927', 800)}
    ${textLines(adviceLines, 64, 380, 32, 23, '#555b57', 500)}
    ${textLines(ideaNameLines, 64, 454, 24, 17, theme.accent, 700)}

    <rect x="820" y="92" width="316" height="398" rx="8" fill="#252927"/>
    <rect x="820" y="92" width="8" height="398" rx="4" fill="${theme.accent}"/>
    <text x="978" y="166" fill="#e8e2d7" font-size="18" font-weight="800" text-anchor="middle" letter-spacing="2">${escapeXml(copy.scoreLabel)}</text>
    <text x="978" y="286" fill="#ffffff" font-size="106" font-weight="900" text-anchor="middle">${result.deterministicScores.litScore}</text>
    <text x="978" y="326" fill="#e8e2d7" font-size="24" font-weight="800" text-anchor="middle">${escapeXml(copy.scoreOutOf)}</text>
    <line x1="866" y1="365" x2="1090" y2="365" stroke="#ffffff" stroke-opacity="0.2"/>
    <text x="978" y="408" fill="#c9c3b9" font-size="16" font-weight="700" text-anchor="middle">${escapeXml(copy.businessDnaLabel)}</text>
    <text x="978" y="446" fill="#ffffff" font-size="26" font-weight="900" text-anchor="middle">${escapeXml(dna)}</text>

    <line x1="64" y1="526" x2="1136" y2="526" stroke="#d7d0c5"/>
    <text x="64" y="574" fill="#252927" font-size="22" font-weight="800">${escapeXml(copy.survivePrompt)}</text>
    <text x="1136" y="574" fill="${theme.accent}" font-size="21" font-weight="800" text-anchor="end">${escapeXml(host)}</text>
  `);
}

function squareSvg(input: SvgInput): string {
  const { width, height, result, theme, headline, advice, ideaName, host, copy, dna } = input;
  const hookLines = wrapText(theme.hook, 26, 2);
  const headlineLines = wrapText(headline, 32, 3);
  const adviceLines = wrapText(advice, 48, 3);
  const ideaNameLines = wrapText(ideaName, 50, 2);

  return svgShell(width, height, theme, `
    <text x="72" y="82" fill="#252927" font-size="21" font-weight="800" letter-spacing="4">${escapeXml(copy.brandLabel)}</text>
    <rect x="72" y="124" width="270" height="52" rx="6" fill="${theme.soft}" stroke="${theme.accent}"/>
    <text x="207" y="158" fill="${theme.accent}" font-size="21" font-weight="900" text-anchor="middle" letter-spacing="2">${escapeXml(theme.label)}</text>

    ${textLines(hookLines, 72, 250, 58, 49, theme.accent, 900)}
    ${textLines(headlineLines, 72, 382, 52, 43, '#252927', 800)}
    ${textLines(adviceLines, 72, 538, 38, 27, '#555b57', 500)}
    ${textLines(ideaNameLines, 72, 664, 26, 19, theme.accent, 700)}

    <rect x="72" y="724" width="444" height="176" rx="8" fill="#252927"/>
    <text x="108" y="778" fill="#c9c3b9" font-size="17" font-weight="700">${escapeXml(copy.scoreLabel)}</text>
    <text x="108" y="856" fill="#ffffff" font-size="72" font-weight="900">${result.deterministicScores.litScore}<tspan font-size="28" fill="${theme.accent}"> / 5</tspan></text>
    <rect x="540" y="724" width="468" height="176" rx="8" fill="#252927"/>
    <text x="576" y="778" fill="#c9c3b9" font-size="17" font-weight="700">${escapeXml(copy.businessDnaLabel)}</text>
    <text x="576" y="848" fill="#ffffff" font-size="35" font-weight="900">${escapeXml(dna)}</text>

    <line x1="72" y1="954" x2="1008" y2="954" stroke="#d7d0c5"/>
    <text x="72" y="1010" fill="#252927" font-size="23" font-weight="800">${escapeXml(copy.survivePrompt)}</text>
    <text x="1008" y="1010" fill="${theme.accent}" font-size="22" font-weight="800" text-anchor="end">${escapeXml(host)}</text>
  `);
}

interface SvgInput {
  width: number;
  height: number;
  result: EvaluationResult;
  theme: CardTheme;
  headline: string;
  advice: string;
  ideaName: string;
  host: string;
  copy: CardCopy;
  dna: string;
}

type DeterministicCopyKey = keyof typeof deterministicSpanishCopy;
type DeterministicField = keyof typeof deterministicSpanishCopy.kill_it_before_it_kills_years;

function localizeDeterministicField(
  locale: VerdictCardLocale,
  verdict: FinalVerdict,
  field: DeterministicField,
  value: string
): string {
  if (locale !== 'es') return value;

  const copyKey = getDeterministicCopyKey(verdict, field, value);
  return copyKey ? deterministicSpanishCopy[copyKey][field] : value;
}

function getDeterministicCopyKey(
  verdict: FinalVerdict,
  field: DeterministicField,
  value: string
): DeterministicCopyKey | null {
  if (verdict === 'test_first') {
    if (deterministicEnglishCopy.test_first_passion[field] === value) return 'test_first_passion';
    if (deterministicEnglishCopy.test_first[field] === value) return 'test_first';
    return null;
  }

  const key = verdict as DeterministicCopyKey;
  return deterministicEnglishCopy[key][field] === value ? key : null;
}

function svgShell(width: number, height: number, theme: CardTheme, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f8f4eb"/>
    <rect width="18" height="100%" fill="${theme.accent}"/>
    <line x1="40" y1="0" x2="40" y2="${height}" stroke="#ded7cb"/>
    <g font-family="'Source Sans 3', 'Source Sans Pro', ui-sans-serif, system-ui, sans-serif">${content}</g>
  </svg>`;
}

function textLines(
  lines: string[], x: number, y: number, lineHeight: number, fontSize: number, fill: string, weight: number
): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${fontSize}" font-weight="${weight}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('')}</text>`;
}

function wrapText(text: string, maxCharacters: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).flatMap(word => {
    if (word.length <= maxCharacters) return [word];
    return word.match(new RegExp(`.{1,${maxCharacters}}`, 'g')) ?? [word];
  });
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharacters || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  const usedWords = lines.join(' ').split(/\s+/).length;
  if (usedWords < words.length && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:]?$/, '')}…`;
  }
  return lines;
}

function formatDna(dna: BusinessDnaType, locale: VerdictCardLocale): string {
  if (locale === 'es') {
    const labels: Record<BusinessDnaType, string> = {
      service: 'Servicio',
      physical_product: 'Producto físico',
      digital_product: 'Producto digital',
      marketplace: 'Mercado',
      media: 'Medios',
      capital: 'Capital',
      asset: 'Activo'
    };
    return labels[dna];
  }

  return dna.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  })[character] || character);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'idea';
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not render the verdict image'));
    image.src = url;
  });
}
