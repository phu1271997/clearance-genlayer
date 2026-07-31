# ADR-002 — Deploy on studionet, not testnet

**Date:** 2026-07-28
**Status:** Accepted

## Context

Two GenLayer networks were candidates for the Builder-track submission:

- **studionet** — the hosted Studio at `https://studio.genlayer.com`.
  Contract deploys through the browser IDE; balances funded from the
  Studio Accounts panel; validators are Studio-side.
- **testnet Bradbury** — the public testnet with community validators,
  Chain ID different from studionet. Contract deploys through
  `genlayer-cli`; balances funded via
  `testnet-faucet.genlayer.foundation`.

The two networks are **not connected**. A contract on studionet exists
only on studionet; switching means redeploying and rotating
`VITE_CONTRACT_ADDRESS`.

## Decision

Deploy on studionet.

## Consequences

**Positive**

- Deploy loop is a browser click instead of a CLI + private-key
  workflow. Faster iteration for a small team.
- Studio has a built-in tx explorer with per-transaction consensus data
  (leader receipt, validator votes, stderr). We used that visibility to
  root-cause the v1.1.0 `inmem_allocate` revert in minutes.
- The Portal Builders track accepts studionet submissions with the same
  scoring rubric as testnet — no ranking penalty.
- LLM inference is Studio-subsidised. No per-tx cost to worry about
  during demos.

**Negative**

- No community validators — we don't get testnet's model diversity,
  which is exactly what the "Bradbury Gym" incentivises exercising.
- Chain state is a shared Studio instance; a reset by the Studio team
  wipes all deployments. Mitigation: `contracts/clearance.py` is the
  source of truth, redeploy is scripted in
  [`scripts/deploy-notes.md`](../../scripts/deploy-notes.md).
- Cannot use `testnet-faucet.genlayer.foundation`. Funding path is
  Studio → Accounts panel only.

**Deferred**

- A testnet Bradbury deploy is a future milestone once the appeal +
  reputation flows have been tested end-to-end on a diverse validator
  set. That deploy is deferred to a `feat: multi-network` release; it
  will change `VITE_CONTRACT_ADDRESS` and add a chain switcher in the
  navbar rather than replacing studionet.
