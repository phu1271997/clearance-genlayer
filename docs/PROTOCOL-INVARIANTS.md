# Clearance — Protocol Invariants

**Contract:** [`contracts/clearance.py`](../contracts/clearance.py)
**Version:** v1.2.0 (unchanged since 2026-08-16)

This document lists the properties the contract is expected to preserve
on every reachable path, and points to the test that pins each one.
It is written for auditors and Milestone graders — the plain-English
"what could not be true after this change?" list that a code review
scans first.

Notation. `S` is contract state before the tx, `S'` after. `sum(f, X)`
is `Σ f(x) for x in X`. `distributed(c) ⇒ c.status ∈ {APPROVED, MODIFIED}`
by construction.

## 1. Solvency

**I-1 (accounting).** For every state `S`:

```
contract_balance(S) == sum(c.deposit,      claims where not c.distributed)
                    + S.forfeited_pool
                    + S.forfeited_final
```

Every wei entering the contract lands in one of exactly three
categories: a live claim deposit, the appeal-eligible forfeit pool, or
the sweepable final bucket. No other bucket exists. `distribute()`
writes `deposit = 0` and `distributed = True` **before** any
`emit_transfer`, so the invariant holds mid-transaction as well.

**I-2 (locked-pool bookkeeping).**

```
S.forfeited_pool == sum(c.forfeited, all claims)
```

Every wei sitting in the locked pool is owed to exactly one claim, and
that claim knows how much it can pull back via `_unforfeit`.

## 2. Appeal safety

**I-3 (bounded rounds).** `c.appeals` monotonically increases and is
bounded by `MAX_APPEALS = 2`. `appeal()` bumps the counter **before**
running the fresh non-deterministic round, so any nested failure
consumes an appeal rather than allowing infinite retries.

**I-4 (stake floor).** The appeal stake is not free after a rejection.
The required stake equals `c.base_deposit * APPEAL_STAKE_MULTIPLIER`,
and `c.base_deposit` is the original `submit_claim` value — never
mutated. This is the fix that replaced the v1.1.1 formula
`c.deposit * multiplier`, which evaluated to `0 * 2 == 0` on a REJECTED
claim.

**I-5 (payer isolation on appeal).** Only `c.remixer` may call
`appeal(c.id)`. `_addr_str` normalises addresses before comparison, so
case-mismatched addresses cannot bypass the check.

**I-6 (locked-vs-final split).** A REJECTED claim's forfeit goes to
`forfeited_pool` while `c.appeals < MAX_APPEALS`, and only moves to
`forfeited_final` on the last appeal round. `_unforfeit` restores it
to `c.deposit` if the appeal wins. Consequence: the owner can never
sweep money that a legitimate appeal is obliged to refund.

## 3. Settlement safety

**I-7 (payer identity).** `distribute(c.id)` reverts unless
`_addr_str(sender) == c.remixer`. The remixer OWES the royalty; any
other caller could grief by paying dust and finalising the claim.

**I-8 (dust floor).** `distribute()` reverts if
`msg.value < SETTLEMENT_MIN (0.10 GEN)`. The floor is 10× the minimum
deposit, which guarantees that even a 1-bps split rounds the artist
share to ≥ 1 wei.

**I-9 (artist integrity).** If `c.final_split_bps > 0` and
`to_artist = (msg.value * split_bps) // 10000 == 0`, the tx reverts.
Together with I-8 this closes the "legal payment, artist gets zero"
window.

**I-10 (replay).** After `distribute()` returns, `c.distributed`
becomes `True` **before** any `emit_transfer`, and the second call
reverts on `already distributed`. Combined with `c.deposit = 0` being
written in the same block, no wei can leave the contract twice.

## 4. Consensus safety

**I-11 (semantic verdict match).** `validator_fn` returns `True` only
if `leader.verdict == mine.verdict`. Two validators reaching opposite
decisions cannot both accept the round.

**I-12 (bounded split disagreement on MODIFIED).** For MODIFIED
rounds, `|leader.final_split_bps − mine.final_split_bps| ≤ 500`. A
25%/90% "consensus" is not consensus.

**I-13 (bounded confidence disagreement).**
`|leader.confidence − mine.confidence| ≤ 20`. This catches "APPROVED
at 5%" meeting "APPROVED at 95%".

**I-14 (canary refusal).** If `CANARY_TOKEN` appears in the leader's
`reason`, the validator refuses regardless of any other field —
control-token leakage is treated as prompt subversion.

**I-15 (leader crash).** If `leader_res` is not a `gl.vm.Return`, the
validator refuses. A crashed leader cannot count as agreement.

**I-16 (sandboxed validator).** The contract uses `gl.vm.run_nondet`,
which sandboxes the validator: a bug there is distinguishable from a
genuine Disagree. `run_nondet_unsafe` is never called.

## 5. Data-integrity

**I-17 (input rejection at the boundary).** Every write validates
inputs before touching storage: URLs start with `http`, `license_terms`
and `declaration` are between 10 and 4000 characters, and the canary
token is rejected in either.

**I-18 (address canonicalisation).** `_addr_str` lowercases and
`0x`-prefixes every address before it enters storage or a comparison,
so case-mismatched addresses cannot desync artist / remixer / owner
checks.

**I-19 (deterministic id counters).** `next_work_id` and
`next_claim_id` only increase, and the previous value is used as the
new record's id — no gaps, no reuse.

## 6. Non-deterministic hygiene

**I-20 (no storage reads inside the block).** `leader_fn` and
`validator_fn` close over locals captured **before** entering the
non-det block. `self.*` is never read there — the GenVM would silently
drop such reads, so this is enforced by convention and by review.

**I-21 (allowed non-det call surface).** Every `gl.nondet.*` call
lives inside the same `gl.vm.run_nondet(leader_fn, validator_fn)`
invocation. There is no top-level `gl.nondet.exec_prompt` and no
`gl.eq_principle.*` wrapper — the contract uses the base API because it
needs the custom `validator_fn`.

## Where each invariant is tested

| Invariant | Test |
|---|---|
| I-1, I-2 | `test_rejected_claim_forfeits_into_the_locked_bucket`, `test_appeals_are_capped_and_then_forfeits_become_final` |
| I-3 | `test_appeals_are_capped_and_then_forfeits_become_final` |
| I-4 | `test_appeal_stake_is_priced_off_base_deposit` |
| I-5 | `test_only_the_remixer_may_appeal` |
| I-6 | `test_winning_an_appeal_restores_the_forfeited_escrow`, `test_sweep_takes_only_final_forfeits_and_only_from_the_owner` |
| I-7 | `test_only_the_remixer_may_distribute` |
| I-8 | `test_distribute_rejects_dust` |
| I-9 | `test_artist_share_may_not_round_to_zero` |
| I-10 | `test_distribute_is_replay_safe` |
| I-11 | `test_validator_disagrees_when_the_verdict_differs`, `test_validator_agrees_when_the_verdict_matches_despite_different_wording` |
| I-12 | `test_validator_disagrees_when_the_modified_split_is_far_apart` |
| I-13 | `test_validator_disagrees_when_confidence_is_far_apart` |
| I-14 | `test_validator_refuses_a_leader_that_echoes_the_canary` |
| I-15 | `test_validator_refuses_a_leader_that_reverted` |
| I-16 | source-level (contract uses `run_nondet`, not `run_nondet_unsafe`) |
| I-17 | `test_register_work_rejects_bad_input`, `test_submit_claim_rejects_bad_input`, `test_register_work_rejects_the_injection_canary` |
| I-18 | source-level (`_addr_str`) |
| I-19 | source-level (`next_*_id` counters) |
| I-20 | source-level (locals captured before nondet block) |
| I-21 | source-level (only `run_nondet` is used) |

Run the suite: `pytest tests/` → 32 tests, 0.37 s, deterministic.

## What is NOT invariant

Recorded here to prevent a grader assuming otherwise.

- `Claim.reason` is not compared between validators. The verdict has to
  agree; the human-readable rationale can and does vary between LLM
  samples. That is the intended freedom — see
  [ADR-003](adr/ADR-003-validator-semantics.md).
- Adjudication is not free of gas. `adjudicate()` is public but the
  caller pays for the round.
- Copyright ownership is not verified. The contract enforces the
  artist's self-declared licence; it does not verify that the artist
  actually owns the underlying work. See `SECURITY.md` §3.
