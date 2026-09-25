# GhostTown Agent Examples

## Example: partial input

Request:

```json
{
  "idea": "Mobile dog grooming service for older adults",
  "customer": "Older adults who have difficulty transporting pets",
  "public_content_acknowledged": true
}
```

Expected behavior: `needs_input`.

GhostTown should ask for the missing painful problem, current alternative, motivation, and canonical assessment answers. It must not invent those values from the sentence above.

## Example: complete input

A complete request supplies the canonical idea fields plus every assessment answer returned by the earlier `needs_input.questions` response.

The response is:

```json
{
  "status": "complete",
  "verdict_id": "...",
  "verdict": "...",
  "summary": "...",
  "key_assumptions": [],
  "primary_risks": [],
  "fastest_test": "...",
  "next_actions": [],
  "handoff_id": "...",
  "result_url": "https://ghosttowntest.com/agent/handoff/...",
  "offer": {
    "name": "GhostTown 30-Day Evidence Sprint",
    "price_usd": 97,
    "requires_user_action": true
  }
}
```

The secret handoff token is carried only in `result_url`; the non-secret `handoff_id` is suitable for attribution.

## MCP tool call

With MCP revision `2026-07-28`, send a stateless `tools/call` request to `/mcp` with matching `MCP-Protocol-Version`, `Mcp-Method`, and `Mcp-Name` headers.
