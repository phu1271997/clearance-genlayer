# ADR-001 — Appeal-with-re-stake vs. slashing

**Date:** 2026-07-30
**Status:** Accepted (v1.1.0)

## Context

After the v1.0.0 review, three recourse mechanisms were on the table for
handling a wrongful `REJECTED` verdict:

1. **No recourse.** Verdict is final; forfeited deposit stays in pool.
2. **Appeal with re-stake.** Remixer pays `2 × deposit` to force one
   re-adjudication round; `MAX_APPEALS = 2`.
3. **Slashing pool + juror voting.** Losers of a challenge round pay the
   winners; add per-address stake to a challenge queue.

## Decision

Adopt option 2 — appeal with re-stake, capped at 2 rounds.

## Consequences

**Positive**

- Fits inside a single-contract MVP; no separate juror registry to build.
- Economically rational deterrent: the appellant risks 2 × their original
  deposit if the second verdict lands identically, so frivolous appeals
  are self-limiting.
- Cap of 2 rounds keeps validator-inference cost bounded per claim.

**Negative**

- Small remixers hit a real cost ceiling on their recourse — cost scales
  linearly with the original deposit.
- Does not create a validator-side incentive to look harder on the second
  pass, beyond the fresh independent LLM sample.

**Deferred to a later ADR**

- Option 3 becomes attractive when validator stake / slashing is exposed
  at the protocol level in a later GenLayer testnet phase (Clarke →
  Mainnet, per `00-read-me.md` §6). At that point the appeal flow can
  compose *on top of* the underlying slashing rather than replace it.
