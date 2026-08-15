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
  return content.replace(/\r\n?/g, '\n');
}

function gitBlobSha1(content) {
  const body = Buffer.from(content, 'utf8');
  const header = Buffer.from(`blob ${body.byteLength}\0`, 'utf8');
  return createHash('sha1').update(header).update(body).digest('hex');
}

function verifyTrackedSource(entry, label) {
  if (!entry?.path || !entry?.version || !entry?.gitBlobSha1) {
    fail(`Evidence manifest is missing ${label} path, version, or expected hash.`);
  }
  const path = resolve(repositoryRoot, entry.path);
  let source;
  try {
    source = normalizeCanonicalSource(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`Unable to read ${label} at ${path}: ${error.message}`);
  }
  const actualHash = gitBlobSha1(source);
  if (actualHash !== entry.gitBlobSha1) {
    fail(
      `${label} hash mismatch. Expected ${entry.gitBlobSha1}, received ${actualHash}. ` +
      'Create a versioned source update, explicit change record, and regenerated evidence chain before continuing.'
    );
  }
  return { source, actualHash };
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`Unable to read evidence manifest at ${manifestPath}: ${error.message}`);
}

if (!manifest?.changeId) fail('Evidence manifest is missing the change ID.');

const canonical = verifyTrackedSource(manifest.canonical, 'Canonical Blueprint');
const amendment = verifyTrackedSource(manifest.amendment, 'v2.1.2 Vertex AI platform amendment');
const changeRecord = verifyTrackedSource(manifest.changeRecord, 'v2.1.2 change record');

const authorityClause =
  'The canonical Blueprint is the authoritative product and implementation guide. Every Factory slice must revalidate its exact hash before execution.';
if (!canonical.source.includes(authorityClause)) {
  fail('Canonical Blueprint authority clause is missing or altered.');
}

const architectureDecision =
  "Cloudflare remains the application platform; Google Vertex AI becomes GhostTown's canonical generative-AI platform.";
if (!amendment.source.includes(architectureDecision)) {
  fail('v2.1.2 architecture decision is missing or altered.');
}
if (!amendment.source.includes('No commercial, evidence, safety, ownership, fulfillment, or release requirement is waived')) {
  fail('v2.1.2 outcome-protection clause is missing or altered.');
}
if (!changeRecord.source.includes('Weakening approved outcomes remains prohibited.')) {
  fail('v2.1.2 change record does not explicitly preserve outcome protection.');
}
if (manifest?.outcomeProtection?.weakeningAllowed !== false) {
  fail('Evidence manifest must explicitly prohibit weakening the approved customer outcome.');
}
for (const required of [
  'requiresExplicitProductDecision',
  'requiresVersionedSourceUpdate',
  'requiresChangeRecord',
  'requiresRegeneratedEvidenceChain'
]) {
  if (manifest?.outcomeProtection?.[required] !== true) {
    fail(`Evidence manifest must require ${required}.`);
  }
}

console.log(
  `[blueprint-source] verified ${manifest.amendment.version} ` +
  `${amendment.actualHash} (${manifest.changeId}); base ${manifest.canonical.version} ${canonical.actualHash}; ` +
  `change-record ${changeRecord.actualHash}`
);
