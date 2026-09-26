import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const REMOVE_AFTER = '2026-10-10';
const TEXT_EXTENSIONS = new Set(['.md', '.ts', '.tsx', '.mjs', '.js', '.json']);
const TYPO_PATTERNS = [
  ['requirments', 'requirements'],
  ['requirment', 'requirement'],
  ['memeory', 'memory'],
  ['cargivers', 'caregivers'],
  ['cargiver', 'caregiver'],
  ['recieve', 'receive'],
  ['seperate', 'separate'],
  ['definately', 'definitely'],
  ['enviroment', 'environment'],
  ['succesful', 'successful'],
  ['successfull', 'successful'],
  ['becuase', 'because'],
  ['occurence', 'occurrence'],
  ['immediatly', 'immediately'],
  ['independant', 'independent'],
  ['neccessary', 'necessary'],
  ['relevent', 'relevant'],
  ['accomodate', 'accommodate']
];

const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter(path => TEXT_EXTENSIONS.has(extname(path)))
  .filter(path => !path.startsWith('.sprint-review/'))
  .filter(path => !path.startsWith('scripts/.blueprint-correction-payload/'))
  .filter(path => path !== 'scripts/check-language-quality.mjs')
  .filter(path => path !== 'src/api/customerCopyLanguage.ts');

const failures = [];
for (const path of tracked) {
  const text = readFileSync(path, 'utf8');
  for (const [wrong, right] of TYPO_PATTERNS) {
    const match = new RegExp(`\\b${wrong}\\b`, 'i').exec(text);
    if (match) failures.push(`${path}: "${match[0]}" -> "${right}"`);
  }

  const badModal = /\b(could|should|would) of\b/i.exec(text);
  if (badModal) failures.push(`${path}: "${badModal[0]}" -> "${badModal[1]} have"`);
  const alot = /\balot\b/i.exec(text);
  if (alot) failures.push(`${path}: "${alot[0]}" -> "a lot"`);
}

if (failures.length) {
  console.error('[language-quality] obvious misspellings found:');
  failures.forEach(item => console.error(`  - ${item}`));
  process.exit(1);
}

console.log(`[language-quality] PASS: no known obvious misspellings in tracked text. Temporary wrapper review/remove after ${REMOVE_AFTER}.`);
