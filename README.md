# Clearance — Music Sample & Remix Royalty Splitter on GenLayer

> **An on-chain AI jury clears music samples in minutes, not months.**

**Current version:** `v1.1.0` — see [`CHANGELOG.md`](CHANGELOG.md) and
[`SECURITY.md`](SECURITY.md) for the post-audit hardening.

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
  APPROVED/MODIFIED, deposit is refunded through `distribute()`. On
  REJECTED, deposit moves to a `forfeited_pool` (deters bad-faith spam).

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
|  _apply_verdict(): update Claim, bump reputation, forfeit deposit on REJECTED     |
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
- **Contract (v1.0.0):** `0x6D7F886071935061B3C1C69DaA0ddb1d143Ced8E`
- **Contract (v1.1.0):** *pending redeploy — update `VITE_CONTRACT_ADDRESS` in [`frontend/.env`](frontend/.env) after redeploy.*
- **Block Explorer:** https://genlayer-explorer.vercel.app

---

## Live App

- **Vercel Live URL:** https://clearance-genlayer.vercel.app

---

## Demo Video

- **Walkthrough Video:** *`[DEMO VIDEO LINK PLACEHOLDER — v1.1.0 flow: register → submit → adjudicate → distribute (dust-rejected) → appeal]`*

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
   `VITE_CONTRACT_ADDRESS` in [`frontend/.env`](frontend/.env).

---

## Run the Frontend Locally

```bash
cd frontend
cp .env.example .env
# Set VITE_CONTRACT_ADDRESS=<address from Studio Result: SUCCESS>
npm install
npm run dev
```

Launches at `http://localhost:3000`.

---

## Run Tests

```bash
pip install genlayer-test
gltest --network studionet
```

Test suite covers happy path, MODIFIED, REJECTED-forfeits-to-pool, dust
distribute rejection, non-remixer payer rejection, replay rejection,
artist-rounds-to-zero, appeal round-trip, and owner sweep. See
[`tests/test_clearance.py`](tests/test_clearance.py).

Mock installation follows the R17 format documented in
[gen-rules `02-common-errors.md`](../gen-rules/mới/02-common-errors.md) —
`params` is a bare dict with `llm_mocks` / `web_mocks` keys, not a
wrapping list.

---

## Submit to the Builder Program

Portal: https://portal.genlayer.foundation/#/builders/contributions

Contribution type: GenLayer App / Intelligent Contract (v1.1.0
milestone: *Security Hardening Bundle + AI Enhancement + Appeal Flow +
Owner Sweep*, see [`CHANGELOG.md`](CHANGELOG.md)).

---

## Runtime Notes

- **Pragma:** `# v0.2.16` + `Depends: py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`.
- **API Choice:** Uses `gl.vm.run_nondet` (sandboxed). Never
  `run_nondet_unsafe`.
- **Constants (v1.1.0):** `CLAIM_DEPOSIT_MIN = 0.01 GEN`,
  `SETTLEMENT_MIN = 0.10 GEN`, `APPEAL_STAKE_MULTIPLIER = 2`,
  `MAX_APPEALS = 2`. Read live from the chain via `get_config()`.

---

## License

[MIT](LICENSE)
