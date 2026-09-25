# GhostTown Agent Privacy and Trust Boundary

GhostTown's public agent surface is for business-idea validation input that the user explicitly acknowledges may be processed as public-facing verdict content.

## Required acknowledgement

The agent verdict adapter does not execute the canonical verdict until `public_content_acknowledged` is `true`.

## Authorization

A GhostTown `resultId` is a reference, not a credential.

Agent handoffs use a separate 256-bit unguessable capability token with an expiration. The token is not copied into commercial attribution, Stripe metadata, or the public verdict projection.

The existing anonymous browser claim token is not exposed through the agent API and is not reused as the handoff read capability.

## Human account claim

A handoff can be saved into an account only after normal GhostTown authentication and an explicit claim action. The server reads the authoritative stored verdict; client-supplied verdict content is not trusted for ownership.

## Paid data

Public ASC routes do not expose private 30-Day Evidence Sprint/Blueprint artifacts, paid order data, Stripe secrets, account sessions, or owner-only research/metrics.
