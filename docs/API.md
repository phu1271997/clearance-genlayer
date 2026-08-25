# Clearance — Contract API Reference

**Contract:** [`0xB9185ccb8D9b6C0667f62B2556596964536a2631`](https://explorer-studio.genlayer.com/address/0xB9185ccb8D9b6C0667f62B2556596964536a2631)
**Network:** studionet (chain id `61999` / `0xF1EF`)
**Source:** [`contracts/clearance.py`](../contracts/clearance.py)

Every method below is exposed through the schema returned by
`gen_getContractSchema`. Verify live at the command line:

```bash
curl -s -X POST https://studio.genlayer.com/api \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"gen_getContractSchema","params":["0xB9185ccb8D9b6C0667f62B2556596964536a2631"]}' | jq .
```

## Method index

| Method | Kind | Payable | Caller | Purpose |
|---|---|---|---|---|
| [`register_work`](#register_work)         | write | no  | anyone         | Register an original work + free-form licence terms. |
| [`submit_claim`](#submit_claim)           | write | yes | anyone         | File a remix claim against a work. Locks a 0.01 GEN deposit. |
| [`adjudicate`](#adjudicate)               | write | no  | anyone         | Trigger the AI jury on a PENDING claim. |
| [`appeal`](#appeal)                       | write | yes | remixer only   | Force one re-adjudication round. Stake = 2× base deposit. |
| [`distribute`](#distribute)               | write | yes | remixer only   | Settle an APPROVED / MODIFIED claim. Pays artist + refunds deposit. |
| [`sweep_forfeited`](#sweep_forfeited)     | write | no  | owner only     | Withdraw only the `forfeited_final` bucket. |
| [`get_work`](#get_work)                   | view  | –   | –              | Read one work. |
| [`get_claim`](#get_claim)                 | view  | –   | –              | Read one claim including on-chain rationale. |
| [`list_claims`](#list_claims)             | view  | –   | –              | Global feed, newest first, joined with work title. |
| [`list_works`](#list_works)               | view  | –   | –              | Full work index (id / artist / title). |
| [`list_claims_for_work`](#list_claims_for_work) | view | – | –             | Per-work claim list. |
| [`list_works_by_artist`](#list_works_by_artist) | view | – | –             | Per-artist work list. |
| [`get_reputation`](#get_reputation)       | view  | –   | –              | Per-address APPROVED / MODIFIED / REJECTED tallies. |
| [`counts`](#counts)                       | view  | –   | –              | `works`, `claims`, `forfeited_pool`, `forfeited_final`. |
| [`get_owner`](#get_owner)                 | view  | –   | –              | Owner address (drives the treasury panel visibility). |
| [`get_config`](#get_config)               | view  | –   | –              | Contract constants (deposit, floor, appeal multiplier, cap). |

Sixteen methods total — six write, ten view.

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

Refunds the deposit to the remixer.

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
# → { id, artist, title, source_url, license_terms, created_at }
```

Reverts with `not found` on unknown id.

### `get_claim`

```python
get_claim(claim_id: str) -> dict
# → { id, work_id, remixer, remix_url, declaration,
#     proposed_split_bps, final_split_bps, status, reason,
#     deposit, base_deposit, forfeited, distributed,
#     ai_confidence, appeals }
```

`base_deposit` and `forfeited` were added in v1.2.0 — the frontend
prices the appeal button off `base_deposit`.

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

### `get_owner`

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
  address: '0xB9185ccb8D9b6C0667f62B2556596964536a2631',
  functionName: 'list_claims',
  args: [],
});

// Write (payable)
const hash = await client.writeContract({
  address: '0xB9185ccb8D9b6C0667f62B2556596964536a2631',
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
      "contract_address":"0xB9185ccb8D9b6C0667f62B2556596964536a2631",
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
