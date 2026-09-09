# ADR-005 — Derivative works and the royalty cascade

**Date:** 2026-09-09
**Status:** Accepted (in force since v3.0.0)

## Context

Through v2.0.0 a `Work` was a flat, standalone record. A cleared remix was a
dead end: it could be settled, but it could not itself be licensed, and nothing
in the model expressed that one track is built on another. Real sampling culture
is a graph — remixes of remixes, with obligations that must survive down the
chain. Two questions had no on-chain answer:

1. Can a downstream license grant what an upstream one forbids? (It must not.)
2. When a derivative earns, does the original rights holder see any of it?

GenLayer can answer both, because the jury reads prose terms and can reason
about inherited obligations; a deterministic contract cannot.

## Decision

### 1. A cleared remix can become a `Work`: `register_derivative`

- Only the remixer of an APPROVED/MODIFIED claim, once (`derivative_work_id`
  guards re-promotion). The remixer becomes the derivative's artist.
- The new work records `parent_work_id`, `origin_claim_id`, `depth`
  (`parent.depth + 1`, capped at `MAX_LINEAGE_DEPTH = 5`), and
  `upstream_split_bps = origin claim's final split` — the fraction of the
  derivative artist's future royalties that flows one hop up.
- `source_url` is the remix track itself, so sampling the derivative fetches
  the right evidence.

### 2. The jury inherits upstream obligations

`_gather_lineage_terms` walks the ancestor chain in deterministic code (before
the nondet block) and injects an UPSTREAM LICENSE OBLIGATIONS section: every
ancestor's terms are binding, and any upstream prohibition forces a REJECT even
if this work's own terms would allow it. Assembled in the closure exactly like
the precedent block (ADR-004), so leader and validators see identical text and
`validator_fn` still compares meaning (ADR-003).

### 3. Royalties cascade up the lineage at settlement

`distribute` computes the artist-side amount as before, then `_artist_settlement`
walks up from the sampled work: each derivative keeps `(1 - upstream_split)` of
what reaches it and passes the rest one hop up, terminating at the root original
artist. Properties:

- **Conservation.** The legs plus the remixer's remainder sum to the payment
  (integer division rounds *down* at each hop, and the final `remaining` carries
  the residue to the root, so nothing is minted or lost). The remixer's deposit
  is refunded on top, as before.
- **Determinism + bound.** A pure storage walk capped at `MAX_LINEAGE_DEPTH`;
  an original work yields a single leg, i.e. the exact v2.0.0 behaviour.
- **Auditable.** `get_settlement_plan(claim_id, total)` returns the identical
  computation as a preview, so the UI and the tests verify the split without
  asserting `emit_transfer` (which the direct test runner does not move).

## Alternatives considered

- **Pay upstream from a separate escrow / pull-payment per ancestor.** Rejected
  — it strands funds and complicates solvency. Cascading *within* the single
  incoming payment keeps the contract holding no long-lived balances.
- **Recompute each ancestor's split from its own live terms at settlement
  time.** Rejected — terms can change; freezing `upstream_split_bps` at
  promotion time is the obligation both parties agreed to, and is stable.
- **Unbounded lineage.** Rejected — `MAX_LINEAGE_DEPTH` bounds the storage walk
  and the payout loop, and keeps gas predictable.
- **Let the derivative loosen upstream terms.** Rejected as the whole point:
  the jury is told upstream prohibitions are binding downstream.

## Consequences

- Clearance is now a rights graph: works link to their source, and value flows
  back through the chain automatically.
- New surface: promotion guards, lineage-aware prompting, and cascade math —
  covered by the v3.0.0 tests (creation/guards, lineage view, cascade one-hop
  and flat, a derivative distribute, and the upstream-prompt proof).
- ABI + storage changed, so v3.0.0 is a fresh deploy at a new address.
