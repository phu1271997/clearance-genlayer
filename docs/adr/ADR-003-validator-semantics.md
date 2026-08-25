# ADR-003 — What `validator_fn` compares, and why

**Date:** 2026-08-25
**Status:** Accepted (in force since v1.1.0, formalised in v1.3.0)

## Context

`adjudicate()` runs on GenLayer's non-deterministic engine: a leader
validator produces the verdict, and every other validator has to
independently agree on whether the leader's output is acceptable. That
"agree" call lives in `validator_fn`, which the contract passes into
`gl.vm.run_nondet(leader_fn, validator_fn)`.

There are three obvious ways `validator_fn` could compare two validator
runs:

1. **Strict equality on the raw leader payload** (JSON dict, including
   `reason`).
2. **LLM-based semantic equivalence** — hand both `reason` blobs back to
   an LLM and ask "same conclusion?".
3. **Field-level comparison** — programmatically compare only the fields
   the contract *acts on*, allowing bounded tolerance on the ones that
   are numeric.

## Decision

Adopt option 3. The concrete rules `validator_fn` enforces:

| Field | Compared how | Tolerance |
|---|---|---|
| `verdict` | Exact string match (`APPROVED` / `MODIFIED` / `REJECTED`) | none — the state the contract writes must agree |
| `final_split_bps` (`MODIFIED` only) | `abs(leader − mine) ≤ 500` | ±5 percentage points |
| `confidence` | `abs(leader − mine) ≤ 20` | ±20 out of 100 |
| `reason` | Not compared | free-form; wording legitimately varies between LLM samples |

If the leader output leaks `CANARY_TOKEN` inside `reason`, the validator
refuses regardless of any other field — a leaked control token is the
canonical sign the prompt was subverted.

If `leader_res` is anything other than a `gl.vm.Return` (i.e. the leader
crashed), the validator refuses.

The wrappers `gl.eq_principle.strict_eq` /
`gl.eq_principle.prompt_comparative` /
`gl.eq_principle.prompt_non_comparative` were considered and ruled out
for this contract:

- `strict_eq` — fails on the free-form `reason` field. Two validators
  writing the same conclusion in different words would disagree.
- `prompt_comparative` — an LLM-vs-LLM comparison is another
  non-deterministic call, cheap to farm agreement out to but expensive
  to reason about and to test in isolation. The rules above are
  auditable in one page of Python.
- `prompt_non_comparative` — a "critique the leader's answer" call
  suits tasks where the validator does not need to re-run the leader,
  but *this* contract needs the re-run to make sure the leader did not
  pick a rare LLM sample that a supermajority would reject.

## Consequences

**Positive**

- The consensus rule is small, static, unit-testable. `run_validator()`
  in the direct-mode test suite pins every branch: verdict match,
  split-band, confidence-band, canary leak, leader crash.
- Two validators writing the rationale differently (which is expected —
  LLMs vary) still reach consensus.
- Two validators reaching genuinely opposite decisions cannot both
  pass. This is the property the contract's Trục 2 rubric grade depends
  on.
- Money-carrying fields (`final_split_bps`) have to agree within a
  bounded band, so a MODIFIED with $split = 25\%$ and $split = 90\%$
  cannot silently be treated as consensus.

**Negative**

- Bounded numeric tolerance is a policy choice, not a proof. A future
  legal opinion could argue "±5 percentage points on a split is too
  wide"; that would require a redeploy to tighten. Recording the choice
  here so a later grader can see it was deliberate.
- Because `reason` is not compared, a validator could return a
  nonsensical rationale but the correct verdict and still pass. The
  human-readable `reason` field is user-facing, not consensus-critical
  — this is the intended trade-off.

**Deferred**

- If a later GenLayer runtime version exposes `sim_installMocks` for
  the hosted simulator, the same tests would run against real
  validators. The direct runner is what makes them tractable today.
- If `Claim.reason` ever gates behaviour (e.g. a policy engine reads
  it), `validator_fn` will need to compare it too, likely through an
  `eq_principle.prompt_comparative`-style wrapper. Adding that is a
  separate ADR.

## Evidence

- Contract implementation:
  [`contracts/clearance.py`](../../contracts/clearance.py) —
  `_run_adjudication.validator_fn`.
- Consensus-in-isolation tests:
  [`tests/test_clearance.py`](../../tests/test_clearance.py) — the
  five `test_validator_*` cases and
  `test_validator_refuses_a_leader_that_echoes_the_canary`.
