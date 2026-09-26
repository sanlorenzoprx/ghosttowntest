const SURFACE_TYPO_FIXES: Array<[RegExp, string]> = [
  [/\brequirments\b/gi, 'requirements'],
  [/\brequirment\b/gi, 'requirement'],
  [/\bmemeory\b/gi, 'memory'],
  [/\bcargivers\b/gi, 'caregivers'],
  [/\bcargiver\b/gi, 'caregiver'],
  [/\brecieve\b/gi, 'receive'],
  [/\bseperate\b/gi, 'separate'],
  [/\bdefinately\b/gi, 'definitely'],
  [/\benviroment\b/gi, 'environment'],
  [/\bsuccesful\b/gi, 'successful'],
  [/\bsuccessfull\b/gi, 'successful'],
  [/\bbecuase\b/gi, 'because'],
  [/\boccurence\b/gi, 'occurrence'],
  [/\bimmediatly\b/gi, 'immediately'],
  [/\bindependant\b/gi, 'independent'],
  [/\bneccessary\b/gi, 'necessary'],
  [/\brelevent\b/gi, 'relevant'],
  [/\baccomodate\b/gi, 'accommodate'],
  [/\bdont\b/gi, "don't"],
  [/\bdoesnt\b/gi, "doesn't"],
  [/\bcant\b/gi, "can't"],
  [/\bwont\b/gi, "won't"]
];

function replacementWithCase(match: string, replacement: string): string {
  return /^[A-Z]/.test(match)
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

export function correctCustomerSurfaceSpelling(value: string): string {
  return SURFACE_TYPO_FIXES.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, match => replacementWithCase(match, replacement)),
    value
  )
    .replace(/[ \t]+([,.;!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
