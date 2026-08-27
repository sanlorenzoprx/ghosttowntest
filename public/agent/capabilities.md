# GhostTown Agent Capabilities

## REST

### GET `/api/v1/product`
Returns public product identity, current canonical paid offer metadata, OpenAPI location, MCP location, and limitations.

### POST `/api/v1/free-verdict`
Accepts partial or complete GhostTown validation input.

If canonical idea fields or assessment answers are missing, returns `needs_input` with the exact missing fields and questions. Agents should ask the user for those values and retry the same endpoint.

If complete, the adapter invokes GhostTown's existing `/api/verdict` handler and returns a safe public projection plus an expiring human handoff URL.

### POST `/api/v1/agent-handoffs/{token}/resolve`
Resolves an unguessable handoff capability into the safe public verdict projection and non-secret attribution dimensions.

### POST `/api/v1/agent-handoffs/{token}/claim`
Authenticated human action. Saves the authoritative verdict into that person's existing GhostTown account and retires the handoff token.

## MCP

MCP revision: `2026-07-28`.

Tools:

- `ghosttown.explain` — product identity, limitations and interface information.
- `ghosttown.validate_idea` — same business capability as the REST verdict adapter.
- `ghosttown.get_fastest_test` — reads the fastest test from an active handoff; does not regenerate a verdict.
- `ghosttown.get_offer` — returns the current paid offer; never creates checkout.

## Human-action boundary

No public agent capability can autonomously buy the GhostTown Launch Blueprint. Checkout remains an authenticated human action in the existing application.
