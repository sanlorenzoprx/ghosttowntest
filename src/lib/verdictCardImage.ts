import type { BusinessDnaType, EvaluationResult, FinalVerdict } from '../types/lit';

export type VerdictCardFormat = 'landscape' | 'square';

interface CardOptions {
  format: VerdictCardFormat;
  includeIdeaName: boolean;
  shareUrl?: string;
}

interface CardTheme {
  start: string;
  end: string;
  accent: string;
  soft: string;
  label: string;
  hook: string;
}

const dimensions: Record<VerdictCardFormat, { width: number; height: number }> = {
  landscape: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 }
};

const BRAND_HOST = 'LIT-GHOSTTOWN.COM';

const themes: Record<FinalVerdict, CardTheme> = {
  build_now: {
    start: '#052e2b', end: '#047857', accent: '#6ee7b7', soft: '#d1fae5',
    label: 'BUILD NOW', hook: 'MY IDEA SURVIVED.'
  },
  test_first: {
    start: '#422006', end: '#a16207', accent: '#fde047', soft: '#fef9c3',
    label: 'TEST FIRST', hook: 'GOOD IDEA. DANGEROUS ASSUMPTION.'
  },
  niche_down: {
    start: '#431407', end: '#c2410c', accent: '#fdba74', soft: '#ffedd5',
    label: 'NICHE DOWN', hook: 'RIGHT PROBLEM. MARKET TOO WIDE.'
  },
  change_business_dna: {
    start: '#2e1065', end: '#7e22ce', accent: '#d8b4fe', soft: '#f3e8ff',
    label: 'CHANGE THE DNA', hook: 'THE MODEL IS THE PROBLEM.'
  },
  kill_it_before_it_kills_years: {
    start: '#450a0a', end: '#b91c1c', accent: '#fca5a5', soft: '#fee2e2',
    label: 'KILL IT', hook: 'I JUST SAVED SIX MONTHS.'
  }
};

export function createVerdictCardSvg(result: EvaluationResult, options: CardOptions): string {
  const { width, height } = dimensions[options.format];
  const scores = result.deterministicScores;
  const verdict = result.verdict?.verdict ?? scores.finalVerdict;
  const theme = themes[verdict];
  const headline = result.verdict?.verdict_headline ?? scores.verdictHeadline;
  const advice = result.verdict?.one_sentence_advice ?? scores.oneSentenceAdvice;
  const ideaName = options.includeIdeaName ? result.idea.ideaName : 'Idea name kept private';
  const host = BRAND_HOST;

  return options.format === 'landscape'
    ? landscapeSvg({ width, height, result, theme, headline, advice, ideaName, host })
    : squareSvg({ width, height, result, theme, headline, advice, ideaName, host });
}

export function getVerdictCardAlt(result: EvaluationResult): string {
  const verdict = result.verdict?.verdict_headline ?? result.deterministicScores.verdictHeadline;
  return `Shareable LIT Ghost Town verdict card: ${verdict}`;
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
  const { width, height, result, theme, headline, advice, ideaName, host } = input;
  const hookLines = wrapText(theme.hook, 28, 2);
  const headlineLines = wrapText(headline, 38, 2);
  const adviceLines = wrapText(advice, 58, 2);
  const dna = formatDna(result.deterministicScores.businessDnaType);

  return svgShell(width, height, theme, `
    <text x="64" y="66" fill="#ffffff" font-size="20" font-weight="800" letter-spacing="4">LIT GHOST TOWN TEST</text>
    <rect x="64" y="98" width="238" height="48" rx="24" fill="${theme.accent}"/>
    <text x="183" y="130" fill="${theme.start}" font-size="20" font-weight="900" text-anchor="middle" letter-spacing="2">${theme.label}</text>

    ${textLines(hookLines, 64, 210, 48, 42, theme.accent, 900)}
    ${textLines(headlineLines, 64, 306, 42, 34, '#ffffff', 800)}
    ${textLines(adviceLines, 64, 380, 32, 23, theme.soft, 500)}
    <text x="64" y="462" fill="${theme.accent}" font-size="17" font-weight="700">${escapeXml(ideaName)}</text>

    <rect x="820" y="92" width="316" height="398" rx="28" fill="#ffffff" fill-opacity="0.11" stroke="#ffffff" stroke-opacity="0.18"/>
    <text x="978" y="166" fill="${theme.soft}" font-size="18" font-weight="800" text-anchor="middle" letter-spacing="2">LIT SCORE</text>
    <text x="978" y="286" fill="#ffffff" font-size="106" font-weight="900" text-anchor="middle">${result.deterministicScores.litScore}</text>
    <text x="978" y="326" fill="${theme.accent}" font-size="24" font-weight="800" text-anchor="middle">OUT OF 5</text>
    <line x1="866" y1="365" x2="1090" y2="365" stroke="#ffffff" stroke-opacity="0.22"/>
    <text x="978" y="408" fill="${theme.soft}" font-size="16" font-weight="700" text-anchor="middle">BUSINESS DNA</text>
    <text x="978" y="446" fill="#ffffff" font-size="26" font-weight="900" text-anchor="middle">${escapeXml(dna)}</text>

    <line x1="64" y1="526" x2="1136" y2="526" stroke="#ffffff" stroke-opacity="0.22"/>
    <text x="64" y="574" fill="#ffffff" font-size="22" font-weight="800">WOULD YOUR IDEA SURVIVE?</text>
    <text x="1136" y="574" fill="${theme.accent}" font-size="21" font-weight="800" text-anchor="end">${escapeXml(host)}</text>
  `);
}

function squareSvg(input: SvgInput): string {
  const { width, height, result, theme, headline, advice, ideaName, host } = input;
  const hookLines = wrapText(theme.hook, 26, 2);
  const headlineLines = wrapText(headline, 32, 3);
  const adviceLines = wrapText(advice, 48, 3);
  const dna = formatDna(result.deterministicScores.businessDnaType);

  return svgShell(width, height, theme, `
    <text x="72" y="82" fill="#ffffff" font-size="21" font-weight="800" letter-spacing="4">LIT GHOST TOWN TEST</text>
    <rect x="72" y="124" width="254" height="52" rx="26" fill="${theme.accent}"/>
    <text x="199" y="158" fill="${theme.start}" font-size="21" font-weight="900" text-anchor="middle" letter-spacing="2">${theme.label}</text>

    ${textLines(hookLines, 72, 250, 58, 49, theme.accent, 900)}
    ${textLines(headlineLines, 72, 382, 52, 43, '#ffffff', 800)}
    ${textLines(adviceLines, 72, 538, 38, 27, theme.soft, 500)}
    <text x="72" y="674" fill="${theme.accent}" font-size="19" font-weight="700">${escapeXml(ideaName)}</text>

    <rect x="72" y="724" width="444" height="176" rx="24" fill="#ffffff" fill-opacity="0.11" stroke="#ffffff" stroke-opacity="0.18"/>
    <text x="108" y="778" fill="${theme.soft}" font-size="17" font-weight="700">LIT SCORE</text>
    <text x="108" y="856" fill="#ffffff" font-size="72" font-weight="900">${result.deterministicScores.litScore}<tspan font-size="28" fill="${theme.accent}"> / 5</tspan></text>
    <rect x="540" y="724" width="468" height="176" rx="24" fill="#ffffff" fill-opacity="0.11" stroke="#ffffff" stroke-opacity="0.18"/>
    <text x="576" y="778" fill="${theme.soft}" font-size="17" font-weight="700">BUSINESS DNA</text>
    <text x="576" y="848" fill="#ffffff" font-size="35" font-weight="900">${escapeXml(dna)}</text>

    <line x1="72" y1="954" x2="1008" y2="954" stroke="#ffffff" stroke-opacity="0.22"/>
    <text x="72" y="1010" fill="#ffffff" font-size="23" font-weight="800">WOULD YOUR IDEA SURVIVE?</text>
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
}

function svgShell(width: number, height: number, theme: CardTheme, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${theme.start}"/>
        <stop offset="100%" stop-color="${theme.end}"/>
      </linearGradient>
      <radialGradient id="glow">
        <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${width * 0.88}" cy="${height * 0.05}" r="${height * 0.55}" fill="url(#glow)"/>
    <circle cx="${width * 0.08}" cy="${height * 0.98}" r="${height * 0.3}" fill="url(#glow)" opacity="0.55"/>
    <g font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">${content}</g>
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
  const words = text.trim().split(/\s+/);
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

function formatDna(dna: BusinessDnaType): string {
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
