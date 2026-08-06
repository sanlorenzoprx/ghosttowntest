import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = process.cwd();
const manifestPath = resolve(
  repositoryRoot,
  'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json'
);

function fail(message) {
  console.error(`[blueprint-source] ${message}`);
  process.exit(1);
}

function normalizeCanonicalSource(content) {
  // Git stores the canonical contract with LF line endings. Windows checkouts may
  // materialize the same tracked content with CRLF. Normalize line endings only;
  // every other byte remains protected by the canonical Git blob SHA-1.
  return content.replace(/\r\n?/g, '\n');
}

function gitBlobSha1(content) {
  const body = Buffer.from(content, 'utf8');
  const header = Buffer.from(`blob ${body.byteLength}\0`, 'utf8');
  return createHash('sha1').update(header).update(body).digest('hex');
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`Unable to read evidence manifest at ${manifestPath}: ${error.message}`);
}

const canonicalPath = resolve(repositoryRoot, manifest?.canonical?.path ?? '');
const expectedHash = manifest?.canonical?.gitBlobSha1;

if (!manifest?.changeId || !manifest?.canonical?.version || !expectedHash) {
  fail('Evidence manifest is missing the change ID, canonical version, or expected hash.');
}

let canonicalSource;
try {
  canonicalSource = normalizeCanonicalSource(readFileSync(canonicalPath, 'utf8'));
} catch (error) {
  fail(`Unable to read canonical Blueprint at ${canonicalPath}: ${error.message}`);
}

const actualHash = gitBlobSha1(canonicalSource);
if (actualHash !== expectedHash) {
  fail(
    `Canonical Blueprint hash mismatch. Expected ${expectedHash}, received ${actualHash}. ` +
      'Create a versioned source update, explicit change record, and regenerated evidence chain before continuing.'
  );
}

const authorityClause =
  'The canonical Blueprint is the authoritative product and implementation guide. Every Factory slice must revalidate its exact hash before execution.';

if (!canonicalSource.includes(authorityClause)) {
  fail('Canonical Blueprint authority clause is missing or altered.');
}

if (manifest?.outcomeProtection?.weakeningAllowed !== false) {
  fail('Evidence manifest must explicitly prohibit weakening the approved customer outcome.');
}

console.log(
  `[blueprint-source] verified ${manifest.canonical.version} ${actualHash} (${manifest.changeId})`
);
