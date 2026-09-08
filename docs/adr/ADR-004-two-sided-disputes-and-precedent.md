# ADR-004 — Two-sided disputes and a precedent-aware jury

**Date:** 2026-09-08
**Status:** Accepted (in force since v2.0.0)

## Context

Through v1.5.0 the protocol had two structural gaps.

1. **The dispute was one-sided.** A remixer who lost could `appeal`. The
   original artist — the party whose rights are actually at stake — had no
   move once the jury cleared a claim, even one cleared on too low a split or
   a use the terms should have barred. The only "artist protection" was the
   quality of the first verdict.
2. **Each ruling was memoryless.** Two near-identical claims against the same
   work could be decided inconsistently, because nothing fed a work's own
   history back into the jury. There was no notion of precedent.

GenLayer makes both fixable *inside the contract*, because the jury reads
prose and weighs argument — a deterministic chain cannot.

## Decision

### 1. Add a symmetric artist challenge: `contest`

- Artist-only, payable, on an APPROVED/MODIFIED, not-yet-settled claim.
- Stake = `base_deposit × CONTEST_STAKE_MULTIPLIER` (2). Priced off the
  immutable `base_deposit`, never the live `deposit` — the same lesson the
  v1.2.0 appeal fix encoded (a REJECTED-zeroed `deposit` must not make a
  challenge free).
- Re-adjudicates with the artist's written objection injected as a
  RIGHTS-HOLDER DISPUTE section, explicitly framed to the jury as a party
  submission, persuasive only where terms + evidence support it.
- **Outcome, decided against the pre-contest position:**
  - *Artist favored* = verdict becomes REJECTED, or the **effective** stored
    split rises. Effective, not the raw jury number, because an APPROVED
    verdict keeps the remixer's proposed split — comparing the raw field would
    refund a stake for a no-op change. On a win, the new verdict is applied
    and the stake is returned by pull-payment.
  - *Otherwise* the clearance stands and the stake is folded into the
    remixer's refundable escrow.
- Capped at `MAX_CONTESTS = 1` per claim.

**Why stake-to-counterparty on a loss, not to a treasury:** the harm of a
frivolous contest lands on the remixer (a re-litigated, delayed clearance), so
the compensation should too. It also needs no new sweepable bucket.

**Why pull-payment for the won stake:** the refund is never pushed inside the
contest transaction, so a failing transfer can neither strand the money nor
re-enter the adjudication path. `withdraw_contest_refund` zeroes the balance
before the external call (CEI), mirroring `distribute`.

### 2. Feed a work's decided history to the jury as precedent

- `_gather_precedents()` runs in deterministic code before the nondet block,
  scans the work's last `PRECEDENT_LOOKBACK = 3` decided claims, and passes a
  plain string into the leader closure.
- The prompt gains a PRIOR RULINGS ON THIS WORK section telling the jury to
  rule consistently or name the distinguishing fact.
- `get_precedents(work_id)` exposes the same history for audit and UI.

Consensus safety: leader and every validator build the *same* precedent and
dispute strings through the closure, so `validator_fn` still compares meaning
(ADR-003) with nothing new to diverge on.

## Alternatives considered

- **Let anyone contest.** Rejected — turns adjudication into a griefing
  surface. The artist has standing; the deposit-scaled stake bounds abuse.
- **Unlimited contests / appeals ping-pong.** Rejected — `MAX_CONTESTS = 1`
  alongside `MAX_APPEALS = 2` keeps a claim's dispute finite and its escrow
  math bounded.
- **A precedent registry contract queried cross-contract.** Rejected for now
  — cross-contract calls are forbidden inside the nondet block anyway, and a
  same-contract deterministic scan is simpler and sufficient at this scale.
- **Slash the losing party's stake to a DAO treasury.** Deferred — routing it
  to the wronged counterparty is the more direct incentive and needs no new
  governance surface.

## Consequences

- Adjudication is genuinely two-sided; neither party can rubber-stamp the
  other.
- Verdicts on a work become self-referential case law, visible on-chain.
- New surface to reason about: contest economics and the effective-split
  comparison are covered by the v2.0.0 tests (artist win/lose, guards,
  pull-payment) and by the two prompt-content proofs that precedent and the
  dispute argument actually reach the jury.
- ABI + storage changed, so v2.0.0 is a fresh deploy at a new address.
