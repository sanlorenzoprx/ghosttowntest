# GhostTown Launch Blueprint — Step 3 Receipt

**Repository:** `sanlorenzoprx/ghosttowntest`  
**Branch:** `feat/launch-blueprint-spa`  
**Draft PR:** `#7`  
**Production deployment:** prohibited  
**PR merge:** prohibited

## Governing clause

GhostTown Launch Blueprint v2.1, Step 3 — Complete the generation and evidence receipts.

## Implemented receipt contract

The v2.1 generation evidence now records:

- Vertex requirement state, project ID, location, configured model, and safe structured-stage receipts;
- normalized input SHA-256;
- canonical Blueprint JSON SHA-256;
- PDF SHA-256;
- ZIP SHA-256;
- deterministic, v2.1, red-team, source-verification, and candidate-ID gate results;
- exact private R2 artifact keys for PDF, JSON, and ZIP.

No private service-account key, OAuth token, complete prompt body, or raw model response is stored in the receipt.

## Exact-byte artifact rule

One canonical JSON byte sequence is created before artifact persistence. Those exact bytes are:

1. stored in D1 `launch_blueprints.blueprint_json`;
2. stored at the private R2 JSON key;
3. inserted unchanged as `ghosttown-launch-blueprint/blueprint.json` inside the ZIP.

The PDF and ZIP hashes are calculated from the exact byte arrays written to private R2.

A canonical JSON file cannot literally contain the SHA-256 of itself, and a ZIP cannot literally contain its own SHA-256, without a recursive self-hash. Therefore the stored canonical record carries a visible detached-integrity marker for the self-referential artifact hashes. The exact hashes are stored in the detached generation evidence receipt in D1 research-receipt metadata and a compatibility KV pointer. The authenticated account API overlays those exact values into the v2.1 generation receipt while the JSON download remains the exact stored canonical bytes.

## Acceptance assertions covered by automated tests

`tests/blueprintGenerationReceiptV21.test.ts` proves:

- D1 canonical JSON equals private R2 JSON byte-for-byte;
- ZIP `blueprint.json` equals the canonical JSON byte-for-byte;
- canonical JSON, PDF, and ZIP SHA-256 values match the exact persisted bytes;
- canonical source hash remains attached;
- prohibited secret/private-generation material is rejected before persistence;
- the authenticated Blueprint payload can expose the detached exact integrity receipt without mutating stored canonical bytes.

## Validation

GitHub Actions CI run `31141452021` on head `3e3f785f873123006e6614a2eee111dff3ed5973` passed:

- canonical Blueprint source verification;
- TypeScript type check;
- complete Vitest suite;
- Cloudflare Worker dry-run check;
- production Vite build.

This is Step 3 implementation evidence only. It does not authorize merge or production deployment, and it does not substitute for unresolved requirements from earlier Blueprint steps or later real-environment acceptance.
