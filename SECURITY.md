# SECURITY.md — Clearance Contract Threat Model & Hardening

**Contract version:** `v1.1.0` (post-audit hardening)
**Contract file:** [`contracts/clearance.py`](contracts/clearance.py)
**Network:** GenLayer Studio Network (studionet) — Chain ID `61999`

---

## 1. Reported Finding (2026-07-30 external review)

> *"Please fix distribute so an arbitrary dust payment cannot refund the
> deposit, permanently finalize the claim, and leave the artist with zero.
> Enforce the intended payer and settlement amount, and add a balance-level
> test for the dust and replay cases."*

### Root cause (v1.0.0)

The v1.0.0 `distribute(claim_id)` function was `@gl.public.write.payable`
with no payer check and no minimum-payment floor. The payout math was
`to_artist = total * split_bps // 10000`, then `distributed = True`. For any
`split_bps < 10_000` an attacker could send `1 wei`:

1. `to_artist = 1 * split_bps // 10000 == 0`   (integer division rounds down)
2. `to_remixer = 1 - 0 = 1`
3. `to_remixer_total = 1 + c.deposit`  → the **remixer's own deposit is
   refunded to the caller** (which was any wallet, not necessarily the
   remixer's, but even the remixer could self-grief accidentally)
4. `c.distributed = True` → claim is **permanently finalized**, artist
   loses their entire royalty and has no on-chain recourse.

The bug was a combined **payer-integrity + minimum-payment** gap.

### Fix — 4 invariants enforced in v1.1.0

Location: [`contracts/clearance.py::Contract.distribute`](contracts/clearance.py).

| # | Invariant | Enforcement |
|---|---|---|
| 1 | Only the remixer may settle | `_addr_str(gl.message.sender_address) != c.remixer` → `UserError("only the remixer may distribute this claim")` |
| 2 | Payment ≥ `SETTLEMENT_MIN` (0.10 GEN) | `if total < SETTLEMENT_MIN: raise UserError(...)` |
| 3 | Artist share must round to ≥ 1 wei whenever `split_bps > 0` | `if split_bps > 0 and to_artist <= 0: raise UserError(...)` |
| 4 | Replay-safe finalize | `c.distributed = True; c.deposit = 0; self.claims[claim_id] = c` **before** any external `emit_transfer` (Checks-Effects-Interactions) |

Coverage lives in [`tests/test_clearance.py`](tests/test_clearance.py):

- `test_distribute_rejects_dust_payment` — 1 wei and `SETTLEMENT_MIN - 1`
  both revert; claim stays `distributed=False`, `deposit` intact.
- `test_distribute_rejects_non_remixer_payer` — a griefer wallet **and**
  the artist wallet are both rejected on payer check.
- `test_distribute_replay_rejected` — the second `distribute()` reverts on
  `c.distributed == True`.
- `test_distribute_rejects_when_artist_rounds_to_zero` — invariant 3.

---

## 2. Full Threat Model

### 2.1 Actors

- **Original artist** — registers works, sets license terms.
- **Remixer** — submits claims, pays deposit + royalty.
- **Adjudicator (anyone)** — triggers `adjudicate()`; only the validator
  consensus decides the verdict.
- **Owner** — deploys the contract, sweeps forfeited-deposit pool from
  `REJECTED` claims.
- **Griefer** — an arbitrary caller trying to move state maliciously.
- **Prompt-injection attacker** — a remixer or artist embedding
  instructions in `license_terms` / `declaration` / a hosted page.

### 2.2 Assets

- `Claim.deposit` (remixer-owned until verdict).
- Royalty payment (transient — sent to `distribute()` in a single call).
- `forfeited_pool` (accumulated deposits from `REJECTED` claims; owner-swept).
- The verdict itself — a public, on-chain judgment recorded permanently.

### 2.3 Threats & mitigations

| # | Threat | Mitigation | Status |
|---|---|---|---|
| T1 | Dust `distribute()` refund attack (see §1) | 4 invariants above | **Fixed v1.1.0** |
| T2 | Third-party `distribute()` griefing | Payer = remixer only | **Fixed v1.1.0** |
| T3 | Replay `distribute()` | CEI-ordered `distributed=True` before payout | **Fixed v1.1.0** |
| T4 | Reentrancy via `emit_transfer` | CEI ordering + `distributed` flag written first | Mitigated |
| T5 | Case-mismatched address bypass | `_addr_str()` normalises to lowercase 0x-hex; all comparisons use normalized form | **Fixed v1.1.0** |
| T6 | Prompt injection via `license_terms` / `declaration` | (a) reject `CANARY_TOKEN` at input; (b) LLM prompt has a SECURITY NOTICE + canary rule; (c) validator refuses if leader output echoes the token | **Fixed v1.1.0** |
| T7 | Silent LLM disagreement (schema-only consensus) | Custom `validator_fn` compares **verdict** (semantic), **final_split_bps** within ±5%, **confidence** within ±20 | Pre-existing + tightened v1.1.0 |
| T8 | Validator crash indistinguishable from Disagree | Uses `gl.vm.run_nondet` (sandbox), **not** `run_nondet_unsafe` | Pre-existing |
| T9 | Storage-type mismatch (int in state) | All monetary fields `bigint`; bounded fields `u8`/`u16`; per storage spec | Pre-existing |
| T10 | Public-view calldata boundary rejects `Address` key | Every `TreeMap` keyed by `str` (canonical hex) | Pre-existing |
| T11 | Bad-faith claim spam (attacker floods `REJECTED` claims) | Deposit is **forfeited** to `forfeited_pool`, not refunded → non-trivial spam cost | **Fixed v1.1.0** |
| T12 | Genuine misjudgment by AI jury | `appeal()` — remixer re-stakes 2× the original deposit to force one re-adjudication, capped at `MAX_APPEALS = 2` | **New v1.1.0** |
| T13 | Owner drain of user deposits | `sweep_forfeited()` moves **only** the `forfeited_pool`; live claim deposits are held in a separate accounting invariant and never touched | **Fixed v1.1.0** |
| T14 | Recipient of `sweep_forfeited()` set to garbage | Address validated (`0x…` prefix) and used via `Address(recipient)` | **Fixed v1.1.0** |
| T15 | Storage read inside nondet block | All state read into locals **before** entering the `leader_fn` closure | Pre-existing |

### 2.4 Constants

| Constant | Value | Rationale |
|---|---|---|
| `CLAIM_DEPOSIT_MIN` | `0.01 GEN` (1e16 wei) | Cost floor to submit a claim — deters spam without pricing out small remixers. |
| `SETTLEMENT_MIN` | `0.10 GEN` (1e17 wei) | Distribute floor — 10× deposit. Guarantees the artist's cut can round to ≥ 1 wei even at a 1-bps split. |
| `APPEAL_STAKE_MULTIPLIER` | `2` | Appeal re-stake — economically deters frivolous appeals. |
| `MAX_APPEALS` | `2` | Hard cap on re-adjudication rounds. |

---

## 3. Non-Goals / Out of Scope

- **KYC of artists/remixers.** Anyone with a GEN-funded wallet can register
  work or submit a claim. Reputation (`get_reputation()`) is on-chain and
  observable, but not enforced as a gate.
- **DMCA / copyright registration.** The contract *interprets* an artist's
  self-declared license terms; it does not verify that the artist actually
  owns the copyright.
- **Payment-channel privacy.** All settlements are public.
- **Insurance for wrongful REJECTED verdicts.** Appeal is the sole recourse.

---

## 4. Reporting a Vulnerability

Open a GitHub issue with the label `security` on the project repository.
Include reproducer + expected vs. actual state. If the finding is
sensitive, add the maintainer email listed in the repo's `README.md` and
mark the issue as private.
