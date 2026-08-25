# Clearance — Music Sample & Remix Royalty Splitter on GenLayer

> **An on-chain AI jury clears music samples in minutes, not months.**

![network](https://img.shields.io/badge/network-studionet-8b5cf6)
![contract](https://img.shields.io/badge/contract-v1.2.0-22d3ee)
![frontend](https://img.shields.io/badge/frontend-v1.5.0-a78bfa)
![tests](https://img.shields.io/badge/tests-32%20passing-10b981)
![license](https://img.shields.io/badge/license-MIT-64748b)

**Current frontend:** `v1.5.0` — protocol analytics dashboard, per-address
history, social share, formal invariant spec.  **Contract on-chain:** `v1.2.0`
(unchanged since 2026-08-16). See [`CHANGELOG.md`](CHANGELOG.md) and
[`SECURITY.md`](SECURITY.md). Vietnamese translation: [`README.vi.md`](README.vi.md).
Step-by-step onboarding: [`docs/ONBOARDING.md`](docs/ONBOARDING.md).
Contract method reference: [`docs/API.md`](docs/API.md).
Demo screenplay: [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md).
Protocol invariants: [`docs/PROTOCOL-INVARIANTS.md`](docs/PROTOCOL-INVARIANTS.md).

---

## The Problem It Solves

Music sample clearance is notoriously broken. When a producer wants to
legally use a 3-second sample, they face months of legal bureaucracy,
label retainers, manual contract drafting, and opaque royalty splits.
Small independent artists are shut out or forced into uncredited bootlegs
by the friction of traditional publishing clearinghouses.

Traditional digital-rights management relies either on centralized web
platforms (which can unilaterally block tracks or revoke terms) or on
primitive smart contracts. Solidity is deterministic and blind: it cannot
parse subjective licensing conditions written in natural human language,
nor fetch and verify live public web metadata from SoundCloud or YouTube.

**Clearance** solves this with a decentralized, trustless protocol where
rights holders set natural-language licensing conditions, remixers
declare sample usage with live web evidence, and an **on-chain AI jury**
adjudicates compliance and computes binding royalty splits.

---

## Why GenLayer

- **Natural Language Licensing.** Original artists write free-form terms
  in English (*"Samples under 4s free. Longer samples require 30% split.
  No alcohol ads."*). GenLayer's AI contract interprets these terms per
  claim.
- **On-Chain Web Scraping.** AI validators render live web data on-chain
  with `gl.nondet.web.render` to inspect SoundCloud and YouTube metadata
  directly during execution.
- **Fault-Tolerant AI Consensus.** Validators run non-deterministic AI
  prompts (`gl.nondet.exec_prompt`) and reach consensus on subjective
  verdicts + royalty splits via a **custom `validator_fn`** inside
  `gl.vm.run_nondet` — verdicts match semantically, splits within ±5%,
  confidence within ±20 points.
- **Prompt-Injection Defense.** A `CANARY_TOKEN` is embedded in the
  system prompt; the validator refuses if the leader output leaks it.
  Inputs containing the token are rejected at the boundary.
- **Economic Escrow.** Remixers deposit 0.01 GEN per claim. On
  APPROVED/MODIFIED the deposit is refunded through `distribute()`. On
  REJECTED it is forfeited, and an appeal costs 2× the original deposit —
  priced off an immutable `base_deposit` so a rejection can never make the
  next appeal free. Forfeits stay **locked** while appeals remain and only
  become owner-sweepable once they are exhausted. Full model in
  [`ECONOMICS.md`](ECONOMICS.md).

*Remove the AI + web layer and this becomes a Google Form. It cannot be
built as a normal smart contract.*

---

## Architecture

Full breakdown in [`ARCHITECTURE.md`](ARCHITECTURE.md). Short version:

```
+------------------+         +--------------------+         +-----------------------+
|  Original Artist |         |      Remixer       |         |      Public Web       |
| (Registers Work) |         |  (Submits Claim)   |         | (SoundCloud/YouTube)  |
+--------+---------+         +---------+----------+         +-----------+-----------+
         |                             |                                |
         | register_work()             | submit_claim() {0.01 GEN}      |
         v                             v                                |
+-----------------------------------------------------------------------+-----------+
|                          CLEARANCE FRONTEND (React + Vite)                        |
+-----------------------------------------------------------------------------------+
                                       |
                                       | adjudicate(claim_id)  /  appeal(claim_id)
                                       v
+-----------------------------------------------------------------------------------+
|                        GENLAYER STUDIONET INTELLIGENT CONTRACT                    |
|                                                                                   |
|  Leader Node (leader_fn):                                                         |
|    1. gl.nondet.web.render(remix_url)  ── (Fetch Metadata) ────────────────────►  |
|    2. gl.nondet.web.render(source_url) ── (Fetch Metadata) ────────────────────►  |
|    3. gl.nondet.exec_prompt(3-lens prompt: Forensic / Legal / Skeptic + canary)   |
|       → { verdict, final_split_bps, confidence, reason }                          |
|                                                                                   |
|  Validator Consensus (validator_fn — inside gl.vm.run_nondet):                    |
|    - verdict must match exactly (semantic equivalence)                            |
|    - MODIFIED: final_split_bps within ±500 bps of leader                          |
|    - confidence within ±20 points                                                 |
|    - refuse if leader output leaks CANARY_TOKEN                                   |
|                                                                                   |
|  _apply_verdict(): update Claim, bump reputation, and move the escrow —           |
|    APPROVED/MODIFIED -> reclaim any locked forfeit back into the deposit          |
|    REJECTED          -> forfeit; locked while appeals remain, final once spent    |
+-----------------------------------------------------------------------------------+
                                       |
                                       | distribute(claim_id) [Payable, REMIXER ONLY, >= 0.10 GEN]
                                       v
+-----------------------------------------------------------------------------------+
|                           TRUSTLESS ROYALTY DISTRIBUTION                          |
|  - Pays Artist: (total * final_split_bps / 10000)                                 |
|  - Pays Remixer: remaining + 0.01 GEN deposit refund                              |
|  - Sets distributed=True BEFORE external calls (CEI / replay-safe)                |
+-----------------------------------------------------------------------------------+
```

## How Adjudication Actually Works

GenLayer non-deterministic execution requires consensus among validator
nodes. Because LLM outputs can vary in wording, **Clearance** implements
a custom semantic `validator_fn` inside `gl.vm.run_nondet`:

1. **Meaning over Formatting.** The validator re-evaluates the prompt and
   compares the **verdict state** (`APPROVED`, `MODIFIED`, `REJECTED`)
   rather than raw JSON. Comparing raw JSON would fail consensus due to
   minor phrasing differences in the `reason` field.
2. **Numeric Tolerance.** For `MODIFIED` verdicts, the validator requires
   `final_split_bps` within **±500 bps (±5%)** of the leader's.
3. **Confidence Tolerance.** `|leader.confidence − validator.confidence|`
   must be ≤ 20 points — catches "APPROVED at 5% confidence" mismatches.
4. **Impartial Reasoning.** The verdict and human-readable explanation
   are recorded permanently on-chain.

---

## Deployed Contract

- **Network:** GenLayer Studio Network (`studionet`, Chain ID `61999` / `0xF1EF`)
- **Contract (v1.2.0 — current, unchanged in v1.3.0):** [`0xB9185ccb8D9b6C0667f62B2556596964536a2631`](https://explorer-studio.genlayer.com/address/0xB9185ccb8D9b6C0667f62B2556596964536a2631)
- **Deployed:** 2026-08-16 · schema verified live via `gen_getContractSchema` (16 methods)
- **Block Explorer:** https://explorer-studio.genlayer.com

> v1.3.0 is a frontend, tests, sample-data and documentation release —
> the contract bytecode is unchanged so **no redeploy is required** and
> `VITE_CONTRACT_ADDRESS` stays at the v1.2.0 address above.

### Deprecated addresses

| Version | Address | Why it was retired |
|---|---|---|
| v1.1.1 | `0x5832270783938d0559BdeD7b9D8AD807b7C2D0E3` | Appeal stake priced off `deposit`, which REJECTED zeroes → post-rejection appeals were free (see CHANGELOG 1.2.0) |
| v1.1.0 | `0xD1cbE5E47ebaE8a2c879913801ee275cfDbd0356` | Every write reverted — `DynArray[str]` reverse indices |
| v1.0.0 | `0x6D7F886071935061B3C1C69DaA0ddb1d143Ced8E` | Superseded by the v1.1.0 security pass |

> ⚠️ Through v1.1.1 every explorer link in this repo pointed at
> `genlayer-explorer.vercel.app`, which now answers `503` on every path. The
> live studionet explorer is `explorer-studio.genlayer.com`.

---

## Live App

- **Vercel Live URL:** https://clearance-genlayer.vercel.app
- **Public verdict feed (no wallet needed):** https://clearance-genlayer.vercel.app/verdicts
- **Filtered feed example:** https://clearance-genlayer.vercel.app/verdicts?status=REJECTED
- **Client-side leaderboard:** https://clearance-genlayer.vercel.app/leaderboard
- **Protocol stats dashboard:** https://clearance-genlayer.vercel.app/stats
- **Evidence pages the jury reads:** https://clearance-genlayer.vercel.app/evidence/

---

## Demo Evidence Pages

Adjudication is only as good as the evidence it can fetch. `adjudicate()` calls
`gl.nondet.web.render` on the work's `source_url` and the claim's `remix_url`,
so a dead or unrelated link gives the jury nothing to weigh and pushes every
verdict toward REJECTED.

To make the flow reproducible for anyone testing it, the dApp publishes four
stable public track pages under [`/evidence/`](https://clearance-genlayer.vercel.app/evidence/):

| Page | Scenario | Typical verdict |
|---|---|---|
| `original-neon-rain.html` | The registered work and its sampling policy | — (this is the `source_url`) |
| `remix-approved.html` | 3-second instrumental loop, credited | APPROVED at 0% |
| `remix-modified.html` | 12-second loop, credited, split proposed too low | MODIFIED to 25% |
| `remix-rejected.html` | Vocal hook used in an alcohol advertisement | REJECTED |

These are ordinary public web pages fetched on-chain like any other URL — not
mocks, and not a shortcut around consensus. Any real SoundCloud or YouTube link
works the same way; these simply guarantee readable, stable content. Mira
Solvang, KVSTLE and Vodka Nord are fictional. The verdict still comes from
validator consensus at execution time, so the table says *typical*, not
*guaranteed*.

---

## Deploy the Contract Yourself

1. Open https://studio.genlayer.com/run-debug.
2. Ensure MetaMask is switched to **GenLayer Studio Network**
   (`https://studio.genlayer.com/api`, Chain ID `61999`).
3. Copy [`contracts/clearance.py`](contracts/clearance.py).
4. Paste into Studio and click **Deploy**.
5. Confirm the transaction in MetaMask.
6. In transaction details, verify **Result: SUCCESS** (not just
   `Status: FINALIZED`).
7. Copy the deployed contract address and update
   `VITE_CONTRACT_ADDRESS` in [`frontend/.env`](frontend/.env) **and** in the
   Vercel project's environment variables, then redeploy the frontend.
8. Confirm the contract is live and its schema is readable:
   ```bash
   curl -s -X POST https://studio.genlayer.com/api -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"gen_getContractSchema","params":["0xYOUR_ADDRESS"]}'
   ```
   A JSON list of methods means the deploy took. An error means the contract is
   gone (Studio storage reset) and must be redeployed.

---

## Run the Frontend Locally

```bash
cd frontend
cp .env.example .env
# Set VITE_CONTRACT_ADDRESS=0xB9185ccb8D9b6C0667f62B2556596964536a2631
# (or your own after redeploying to studionet)
npm install
npm run dev
```

Launches at `http://localhost:3000`.

---

## Run Tests

```bash
pip install genlayer-test
pytest tests/
```

**32 tests, ~0.3s, no network and no LLM key required.** The suite runs on
gltest's *direct* runner: the contract executes natively in Python against an
in-memory VM, and `vm.mock_llm` / `vm.mock_web` supply the jury's answers, so
every run is deterministic.

Coverage:

- happy path (APPROVED → `distribute`), MODIFIED, REJECTED
- settlement guards: dust payments, non-remixer payer, replay, artist share
  rounding to zero
- appeal flow: winning an appeal restores the forfeited escrow; the stake is
  priced off `base_deposit`; only the remixer may appeal; appeals are capped
- forfeit buckets: locked vs final, and that `sweep_forfeited` only touches
  the final one
- input validation at the boundary, including the prompt-injection canary
- **`validator_fn` semantics in isolation** — it agrees when two validators
  word the rationale differently, and disagrees on a different verdict, a
  split more than ±500 bps apart, confidence more than ±20 apart, a leaked
  canary, or a leader that reverted
- public read surface: `list_claims()`, `get_owner()`, `get_config()`

Earlier versions of this file claimed a `gltest --network studionet` suite.
Those tests used a `gl` fixture that does not exist in `genlayer-test`, so the
suite errored at collection and had never actually run. Deterministic mocking
through the hosted simulator is not possible either — the `sim_installMocks`
RPC is not exposed by the current build. Direct mode replaces both.

To also exercise the contract against a live network, point the same file at
`gltest --network studionet` with funded account keys in `gltest.config.yaml`;
the non-deterministic assertions will then depend on real validator output.

See [`tests/test_clearance.py`](tests/test_clearance.py).

---

## Seed the Demo Data

A fresh deploy has an empty catalog, and a visitor who lands on an empty app
has nothing to judge. Seeding needs a wallet holding GEN **on studionet** —
top it up from the Studio **Accounts** panel, not the testnet faucet.

Budget roughly **1.5 GEN** to walk every path once:

| Step | Wallet | Cost |
|---|---|---|
| Register "Neon Rain" | artist | gas only |
| Submit + adjudicate the APPROVED claim | remixer | 0.01 GEN deposit |
| Settle it (`distribute`) | remixer | ≥ 0.10 GEN, deposit refunded |
| Submit + adjudicate the MODIFIED claim | remixer | 0.01 GEN deposit |
| Settle it | remixer | ≥ 0.10 GEN, deposit refunded |
| Submit + adjudicate the REJECTED claim | remixer | 0.01 GEN, forfeited |
| Appeal the rejection | remixer | 0.02 GEN stake |

Use the preset buttons on the Register and Submit-Claim forms — they fill in
the evidence URLs, declarations and splits described above. To register the
works from the command line instead:

```bash
cd frontend
CLEARANCE_ADDR=0x... CLEARANCE_PRIVATE_KEY=0x... node ../scripts/seed.mjs
```

Keep that key in your shell, never in a `VITE_` variable — anything prefixed
`VITE_` is bundled into the shipped JavaScript and is publicly readable.

Afterwards open `/verdicts` in a private window with no wallet connected. The
evidence has to be visible to a stranger.

---

## Submit to the Builder Program

Portal: https://portal.genlayer.foundation/#/builders/contributions

Contribution type: GenLayer App / Intelligent Contract. See
[`CHANGELOG.md`](CHANGELOG.md), [`SECURITY.md`](SECURITY.md),
[`ECONOMICS.md`](ECONOMICS.md), [`CONTRIBUTING.md`](CONTRIBUTING.md),
and [`docs/adr/`](docs/adr/).

Deployed on GenLayer **studionet** via GenLayer Studio — which is why the
Project Explorer listing carries status **Preview**, not Live.

---

## Runtime Notes

- **Pragma:** `# v0.2.16` + `Depends: py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`.
- **API Choice:** Uses `gl.vm.run_nondet` (sandboxed). Never
  `run_nondet_unsafe`.
- **`UserError` is not a star-import.** `from genlayer import *` exports
  types and `gl`, not `UserError` — it lives at `gl.vm.UserError`. Through
  v1.1.1 every validation branch raised a bare `UserError(...)`, so instead of
  a readable revert reason the caller got `NameError: name 'UserError' is not
  defined`. Fixed in v1.2.0; the frontend's revert-surfacing now shows the
  real message.
- **Constants:** `CLAIM_DEPOSIT_MIN = 0.01 GEN`,
  `SETTLEMENT_MIN = 0.10 GEN`, `APPEAL_STAKE_MULTIPLIER = 2`,
  `MAX_APPEALS = 2`. Read live from the chain via `get_config()`.

---

## License

[MIT](LICENSE)
