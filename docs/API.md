# Clearance — Contract API Reference

**Contract:** [`0x51a7eCa8b0B4c2fEe185F4d415d6DB85E0732D03`](https://explorer-studio.genlayer.com/address/0x51a7eCa8b0B4c2fEe185F4d415d6DB85E0732D03)
**Network:** studionet (chain id `61999` / `0xF1EF`)
**Source:** [`contracts/clearance.py`](../contracts/clearance.py)

Every method below is exposed through the schema returned by
`gen_getContractSchema`. Verify live at the command line:

```bash
curl -s -X POST https://studio.genlayer.com/api \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"gen_getContractSchema","params":["0x51a7eCa8b0B4c2fEe185F4d415d6DB85E0732D03"]}' | jq .
```

## Method index

| Method | Kind | Payable | Caller | Purpose |
|---|---|---|---|---|
| [`register_work`](#register_work)         | write | no  | anyone         | Register an original work + free-form licence terms. |
| [`submit_claim`](#submit_claim)           | write | yes | anyone         | File a remix claim against a work. Locks a 0.01 GEN deposit. |
| [`adjudicate`](#adjudicate)               | write | no  | anyone         | Trigger the AI jury on a PENDING claim. |
| [`appeal`](#appeal)                       | write | yes | remixer only   | Force one re-adjudication round. Stake = 2× base deposit. |
| [`contest`](#contest)                     | write | yes | artist only    | Challenge a cleared claim. Stake = 2× base deposit. |
| [`withdraw_contest_refund`](#withdraw_contest_refund) | write | no | artist only | Pull back a won (or errored) contest stake. |
| [`register_derivative`](#register_derivative) | write | no | remixer only | Promote a cleared remix into its own licensable work. |
| [`distribute`](#distribute)               | write | yes | remixer only   | Settle an APPROVED / MODIFIED claim. Cascades royalties up the lineage. |
| [`sweep_forfeited`](#sweep_forfeited)     | write | no  | owner only     | Withdraw only the `forfeited_final` bucket. |
| [`get_work`](#get_work)                   | view  | –   | –              | Read one work. |
| [`get_claim`](#get_claim)                 | view  | –   | –              | Read one claim including on-chain rationale. |
| [`list_claims`](#list_claims)             | view  | –   | –              | Global feed, newest first, joined with work title. |
| [`list_works`](#list_works)               | view  | –   | –              | Full work index (id / artist / title). |
| [`list_claims_for_work`](#list_claims_for_work) | view | – | –             | Per-work claim list. |
| [`list_works_by_artist`](#list_works_by_artist) | view | – | –             | Per-artist work list. |
| [`get_reputation`](#get_reputation)       | view  | –   | –              | Per-address APPROVED / MODIFIED / REJECTED tallies. |
| [`counts`](#counts)                       | view  | –   | –              | `works`, `claims`, `forfeited_pool`, `forfeited_final`. |
| [`get_precedents`](#get_precedents)       | view  | –   | –              | A work's decided-claim history — the on-chain case law the jury reads. |
| [`get_lineage`](#get_lineage)             | view  | –   | –              | A work's derivative chain, root first. |
| [`get_settlement_plan`](#get_settlement_plan) | view | – | –              | Preview how a `distribute(total)` would split across the lineage + remixer. |
| [`get_owner`](#get_owner)                 | view  | –   | –              | Owner address (drives the treasury panel visibility). |
| [`get_config`](#get_config)               | view  | –   | –              | Contract constants (deposit, floor, appeal + contest multipliers, caps, lineage depth). |

Twenty-two methods total — nine write, thirteen view.

## Write methods

### `register_work`

```python
register_work(title: str, source_url: str, license_terms: str) -> str
```

Reverts on empty title, non-`http(s)` URL, `license_terms < 10` or `> 4000`
characters, or `license_terms` containing the reserved canary token.
Returns the newly assigned `work_id` (stringified integer). Anyone may
call; the caller becomes the recorded artist.

### `submit_claim`

```python
@gl.public.write.payable
submit_claim(
    work_id: str,
    remix_url: str,
    declaration: str,
    proposed_split_bps: int,   # 0-10000
) -> str
```

`value >= CLAIM_DEPOSIT_MIN` (0.01 GEN). Reverts on missing `work_id`,
non-`http(s)` remix URL, short/long declaration, split out of range, or
canary in declaration. Returns the new `claim_id`. The caller becomes the
`remixer`; only they can later distribute or appeal.

### `adjudicate`

```python
adjudicate(claim_id: str) -> None
```

Runs the leader-fn (two `web.render` + one `exec_prompt`) and the
custom `validator_fn` inside `gl.vm.run_nondet`. Non-deterministic — a
single call typically takes **30–90 seconds** on studionet. Anyone may
trigger; the caller pays gas only.

### `appeal`

```python
@gl.public.write.payable
appeal(claim_id: str) -> None
```

`value >= base_deposit * APPEAL_STAKE_MULTIPLIER` (default 0.02 GEN).
Reverts if caller ≠ remixer, if `appeals >= MAX_APPEALS`, or if status
is not `REJECTED` / `MODIFIED`. Re-runs adjudication; on APPROVED /
MODIFIED any parked forfeit for this claim is pulled back into the
refundable escrow.

### `contest`

```python
@gl.public.write.payable
contest(claim_id: str, dispute_reason: str) -> None
```

The artist's mirror of `appeal`. `value >= base_deposit *
CONTEST_STAKE_MULTIPLIER` (default 0.02 GEN). Reverts if caller ≠ the work's
artist, if status is not `APPROVED` / `MODIFIED`, if already distributed, if
`contests >= MAX_CONTESTS`, or if `dispute_reason` is short/long or contains
the canary. Re-runs adjudication with the argument injected as a
RIGHTS-HOLDER DISPUTE section. If the artist prevails (a denial, or a strictly
higher effective split) the new verdict is applied and the stake becomes
withdrawable; otherwise the clearance stands and the stake is folded into the
remixer's refundable escrow. A jury ERROR (evidence unfetchable) consumes no
contest and refunds the stake.

### `withdraw_contest_refund`

```python
withdraw_contest_refund(claim_id: str) -> None
```

Artist-only pull-payment. Transfers `artist_refund` back to the artist and
zeroes it first (CEI). Reverts if caller ≠ artist or nothing is owed.

### `register_derivative`

```python
register_derivative(claim_id: str, title: str, license_terms: str) -> str
```

Promotes a cleared (APPROVED/MODIFIED) claim into a new licensable `Work`. The
remixer becomes the derivative's artist; `upstream_split_bps` is inherited from
the claim's binding split, `depth = parent.depth + 1` (capped at
`MAX_LINEAGE_DEPTH`). Reverts if caller ≠ the claim's remixer, the claim is not
cleared, it was already promoted (`derivative_work_id` set), the chain is too
deep, or the title/terms are invalid. Returns the new `work_id`.

### `distribute`

```python
@gl.public.write.payable
distribute(claim_id: str) -> None
```

Four invariants, in order (see [`SECURITY.md`](../SECURITY.md) §1):

1. caller must equal `c.remixer`;
2. `value >= SETTLEMENT_MIN` (0.10 GEN);
3. if `final_split_bps > 0`, artist share must round to ≥ 1 wei;
4. `distributed = True` is written **before** any `emit_transfer`.

Refunds the deposit to the remixer. **v3.0.0:** the artist-side amount cascades
up the derivative lineage — each ancestor takes its `upstream_split_bps` cut on
the way to the root original artist (an original work pays a single artist, as
before). Preview the exact split with [`get_settlement_plan`](#get_settlement_plan).

### `sweep_forfeited`

```python
sweep_forfeited(recipient: str) -> None
```

Owner-only. Sweeps the `forfeited_final` bucket to `recipient`. The
`forfeited_pool` bucket (appeal-eligible) is intentionally untouched —
a successful appeal must always have funds to refund.

## View methods

Every view is safe to call without a wallet.

### `get_work`

```python
get_work(work_id: str) -> dict
# → { id, artist, title, source_url, license_terms, created_at,
#     is_derivative, parent_work_id, origin_claim_id,        # v3.0.0
#     upstream_split_bps, depth }                            # v3.0.0
```

Reverts with `not found` on unknown id. For an original work `is_derivative`
is `false`, `parent_work_id` / `origin_claim_id` are `""`, and `depth` is `0`.

### `get_claim`

```python
get_claim(claim_id: str) -> dict
# → { id, work_id, remixer, remix_url, declaration,
#     proposed_split_bps, final_split_bps, status, reason,
#     deposit, base_deposit, forfeited, distributed,
#     ai_confidence, appeals,
#     contests, contest_stake, contest_reason,        # v2.0.0
#     contest_outcome, artist_refund,                 # v2.0.0
#     derivative_work_id }                             # v3.0.0
```

`base_deposit` and `forfeited` were added in v1.2.0 — the frontend
prices the appeal button off `base_deposit`. The `contest_*` /
`artist_refund` fields were added in v2.0.0; `contest_outcome` is
`""` / `"ARTIST_WON"` / `"REMIXER_WON"` and `artist_refund` is a
stringified `bigint` (wei) pull-payment balance.

### `list_claims`

```python
list_claims() -> list[dict]
# Newest first. Each row includes: id, work_id, work_title (joined
# from the works map), remixer, remix_url, status, proposed_split_bps,
# final_split_bps, ai_confidence, appeals, distributed, reason (≤ 280 chars).
```

Backing view for `/verdicts` and `/leaderboard`. O(n) over
`next_claim_id`.

### `list_works`

```python
list_works() -> list[{id, artist, title}]
```

### `list_claims_for_work`

```python
list_claims_for_work(work_id: str) -> list[dict]
```

O(n) scan; used by `/works/:id`.

### `list_works_by_artist`

```python
list_works_by_artist(artist: str) -> list[{id, artist, title}]
```

Address is canonicalised (lowercased, `0x`-prefixed) before comparison.

### `get_reputation`

```python
get_reputation(address: str) -> {address, approved, modified, rejected}
```

Returns a zero row for unknown addresses rather than reverting.

### `counts`

```python
counts() -> {works, claims, forfeited_pool, forfeited_final}
```

Both forfeit buckets are stringified `bigint` — treat as decimal wei.

### `get_precedents`

```python
get_precedents(work_id: str) -> list[dict]
# Newest first. Each row: id, status, final_split_bps, ai_confidence,
# appeals, contests, contest_outcome, reason (≤ 280 chars).
```

The work's decided-claim history — the same case law the jury reads before
ruling (the last `precedent_lookback` rows are fed into the prompt). Backs the
"On-Chain Case Law" panel on every claim page. O(n) scan.

### `get_lineage`

```python
get_lineage(work_id: str) -> list[dict]
# Root first, ending at the work itself. Each node:
# { id, title, artist, is_derivative, upstream_split_bps, depth }
```

A single-element list means an original work. Powers the lineage breadcrumb and
makes the royalty cascade auditable.

### `get_settlement_plan`

```python
get_settlement_plan(claim_id: str, total: str) -> dict
# total is a decimal wei string. →
# { claim_id, total, final_split_bps, to_artist_side,
#   recipients: [ { address, role, work_id, amount } ] }
# role ∈ { derivative_artist, upstream_artist, original_artist, remixer }
```

Previews how `distribute(total)` would split — every lineage leg plus the
remixer — using the contract's own cascade math, without moving funds. The
`amount`s sum to `total` (the deposit refund is added on top at settlement).

```python
get_owner() -> str    # canonical 0x-hex
```

### `get_config`

```python
get_config() -> {
  claim_deposit_min: str,           # wei
  settlement_min: str,              # wei
  appeal_stake_multiplier: int,
  max_appeals: int,
  contest_stake_multiplier: int,    # v2.0.0
  max_contests: int,                # v2.0.0
  precedent_lookback: int,          # v2.0.0
  max_lineage_depth: int,           # v3.0.0
}
```

The frontend reads this at page load and falls back to hard-coded
defaults only if the view is unavailable.

## Client examples

### JavaScript (`genlayer-js`)

```js
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const client = createClient({ chain: studionet, account: myAddress });

// Read
const feed = await client.readContract({
  address: '0x51a7eCa8b0B4c2fEe185F4d415d6DB85E0732D03',
  functionName: 'list_claims',
  args: [],
});

// Write (payable)
const hash = await client.writeContract({
  address: '0x51a7eCa8b0B4c2fEe185F4d415d6DB85E0732D03',
  functionName: 'submit_claim',
  args: ['0', 'https://…', 'a valid declaration…', 0],
  value: 10_000_000_000_000_000n,     // 0.01 GEN
});
await client.waitForTransactionReceipt({ hash, status: 'FINALIZED' });
```

### Raw JSON-RPC

```bash
# Global verdict feed
curl -s -X POST https://studio.genlayer.com/api \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"gen_call",
    "params":{
      "contract_address":"0x51a7eCa8b0B4c2fEe185F4d415d6DB85E0732D03",
      "function":"list_claims",
      "args":[]
    }
  }' | jq .
```

## Revert reasons

The frontend's `decodeRevert()` maps every reason below to a friendly
one-liner. Grepping the contract for `raise gl.vm.UserError` gives the
authoritative list:

- `title is empty`
- `source_url must be an http(s) URL`
- `license_terms too short — describe the actual license`
- `license_terms too long (max 4000 chars)`
- `license_terms contains a reserved token`
- `work_id <id> not found`
- `remix_url must be an http(s) URL`
- `declaration too short`
- `declaration too long (max 4000 chars)`
- `declaration contains a reserved token`
- `proposed_split_bps out of range [0, 10000]`
- `insufficient deposit (min 0.01 GEN)`
- `claim <id> not found`
- `claim <id> already adjudicated: <STATUS>`
- `work <id> vanished`
- `cannot appeal claim in status <STATUS>`
- `max appeals reached`
- `only the remixer may appeal`
- `insufficient appeal stake (must be >= 2x the original claim deposit)`
- `already distributed`
- `claim is <STATUS> — nothing to distribute`
- `only the remixer may distribute this claim`
- `settlement amount below minimum (0.10 GEN)`
- `settlement too small — artist share rounds to zero`
- `only owner`
- `nothing to sweep — forfeits are still appeal-eligible`
- `recipient must be 0x-prefixed hex address`
