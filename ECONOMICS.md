# ECONOMICS.md — Clearance Token Flow & Fee Model

**Contract version:** v1.2.0
**Native asset:** GEN (18 decimals) on GenLayer studionet.

Clearance is fee-free at the protocol level. Every wei of GEN entering
the contract either (a) leaves it in a bounded settlement path or
(b) accumulates in a forfeit bucket. There is no protocol skim, no
maker/taker fee, no burn.

---

## 1. Actors and their flows

```
                         ┌──────────────┐
        register_work    │              │  sweep_forfeited (owner, final only)
       ──── (free) ────► │              │ ──────────────────────►  Treasury
                         │              │
      submit_claim       │  Clearance   │       distribute (remixer)
   ── 0.01 GEN deposit ─►│   contract   │ ── artist share  ────►  Artist
                         │              │ ── remainder + refund ►  Remixer
      appeal (remixer)   │              │
   ── 2× deposit stake ─►│              │
                         └──────────────┘
```

- **Artist** — pays 0 GEN to register a work. Receives royalty payouts
  when a claim on their work is `APPROVED` / `MODIFIED` and the remixer
  settles.
- **Remixer** — locks a `CLAIM_DEPOSIT_MIN = 0.01 GEN` escrow at
  `submit_claim()`. Pays the royalty settlement (≥ `SETTLEMENT_MIN =
  0.10 GEN`) at `distribute()` and receives the deposit back in the
  same call. If they lose on `REJECTED`, the deposit is forfeited
  (see §3). If they appeal, they re-stake `2 × original_deposit`.
- **Owner** — deploys the contract and holds the only key allowed to
  call `sweep_forfeited(recipient)`. The owner can *never* touch a live
  claim's `deposit`, a live settlement's transient balance, or a forfeit
  that is still appeal-eligible (§3.3).
- **Adjudicator** — anyone. `adjudicate(claim_id)` is public and free
  to call; caller pays only for the outer EVM gas.

---

## 2. Constants (read on-chain via `get_config()`)

| Constant | Value (wei / raw) | GEN | Purpose |
|---|---:|---:|---|
| `CLAIM_DEPOSIT_MIN` | `10_000_000_000_000_000` | 0.01 | Anti-spam floor on `submit_claim()`. |
| `SETTLEMENT_MIN` | `100_000_000_000_000_000` | 0.10 | Distribute floor — 10× deposit. Guarantees the artist share can round to ≥ 1 wei even at a 1-bps split. |
| `APPEAL_STAKE_MULTIPLIER` | `2` | — | Multiplier on `base_deposit` — the *original* escrow, not the live one — when calling `appeal()`. |
| `MAX_APPEALS` | `2` | — | Hard cap on re-adjudication rounds per claim. |

Values live in `contracts/clearance.py` as module constants and are
surfaced by `get_config()`. The frontend reads them at page load and
falls back to hard-coded defaults only if the view is unavailable.

---

## 3. Money-flow scenarios

### 3.1 Happy path — APPROVED

1. Remixer calls `submit_claim({value: 0.01 GEN})`. Escrow +0.01.
2. Adjudicator calls `adjudicate()`. Status → `APPROVED`,
   `final_split_bps = proposed_split_bps`.
3. Remixer calls `distribute({value: S})` where `S ≥ 0.10 GEN`.
   - `to_artist  = (S × final_split_bps) / 10000`
   - `to_remixer = S − to_artist + 0.01 GEN` (deposit refund)
4. Contract balance change: **−(S + 0.01)**. Every wei accounted for.

### 3.2 MODIFIED

Identical to 3.1 but `final_split_bps` is set by the AI jury (possibly
different from `proposed_split_bps`). Same settlement math applies.

### 3.3 REJECTED — deposit forfeit, into one of two buckets

1. Remixer calls `submit_claim({value: 0.01 GEN})`. Escrow +0.01, and
   `base_deposit` records 0.01 permanently.
2. `adjudicate()` returns `REJECTED`. `_apply_verdict` zeroes
   `Claim.deposit` and parks the money in a forfeit bucket:
   - `appeals < MAX_APPEALS` → **`forfeited_pool`** (locked), and
     `Claim.forfeited` records this claim's share so an appeal can
     reclaim it.
   - `appeals >= MAX_APPEALS` → **`forfeited_final`** (sweepable), and
     `Claim.forfeited` is zero because the money is now unrecoverable.
3. `distribute()` reverts (status is not `APPROVED`/`MODIFIED`).
4. The owner may call `sweep_forfeited(recipient)`, which drains
   **`forfeited_final` only**.

Why two buckets: with a single pool the owner could sweep money that a
later successful appeal is obliged to refund, leaving the contract short.
Locking appeal-eligible forfeits makes that impossible by construction
rather than by owner discipline.

### 3.4 Appeal

1. Claim is `REJECTED` or `MODIFIED` and `appeals < MAX_APPEALS`.
2. Remixer calls `appeal({value: 2 × base_deposit})`.

   The stake is priced off `base_deposit`, **not** `deposit`. A REJECTED
   claim has `deposit == 0`, so pricing it off the live escrow made the
   required stake `0 × 2 == 0` and every post-rejection appeal free —
   fixed in v1.2.0.
3. `appeals` increments *before* the re-adjudication, so a nested failure
   cannot allow infinite retries.
4. The stake is absorbed into `Claim.deposit`.
   - Re-verdict `APPROVED` / `MODIFIED`: any amount parked in
     `forfeited_pool` for this claim is pulled back into `deposit`, and
     the whole enlarged escrow is refunded through `distribute()`. An
     overturned verdict returns what it took.
   - Re-verdict `REJECTED`: the enlarged escrow forfeits again, to the
     locked bucket if an appeal remains, otherwise to the final one.

Economic implication: a remixer wrongly rejected once pays a 3× total
lockup (`1 × deposit + 2 × stake`) to force a re-check, and gets all of it
back if the appeal lands. Losing both appeals costs `1 + 2 + 2 = 5 ×` the
original deposit. That is the intended pain point — it deters frivolous
appeals without a protocol-side arbitration cost, while leaving a
genuinely wronged remixer whole.

---

## 4. Solvency invariant

At any block, the contract's GEN balance equals:

```
Σ (Claim.deposit for c in claims if not c.distributed and c.status in {PENDING, APPROVED, MODIFIED})
+ forfeited_pool     # locked — reclaimable by a winning appeal
+ forfeited_final    # sweepable by the owner
```

with the locked bucket exactly accounted for per claim:

```
forfeited_pool == Σ (Claim.forfeited for c in claims)
```

Live claim deposits + the two forfeit buckets. No other balance category
exists inside the contract. `distribute()` writes `deposit = 0` and
`distributed = True` *before* any `emit_transfer` (Checks-Effects-
Interactions), so the invariant holds mid-transaction as well.

---

## 5. Non-goals

- **No dynamic fee.** The two constants above are compile-time. Raising
  them requires a redeploy and a `VITE_CONTRACT_ADDRESS` rotation.
- **No LP or staking rewards.** The contract does not distribute revenue
  to any party outside artist / remixer / forfeited-pool sweep.
- **No secondary market for claims.** A claim is bound to its remixer
  address; there is no transfer method.
