# Clearance — Music Sample & Remix Royalty Splitter on GenLayer

> **An on-chain AI jury clears music samples in minutes, not months.**

---

## The Problem It Solves

Music sample clearance is notoriously broken. Today, when a producer or DJ wants to legally use a 3-second sample from an existing composition, they face months of legal bureaucracy, high record label legal retainer fees, manual contract drafting, and opaque royalty splits. Small independent artists are routinely shut out or forced into uncredited bootlegs due to friction in traditional music publishing clearinghouses.

Traditional digital rights management relies either on centralized web platforms (which can unilaterally block tracks or revoke terms) or primitive smart contracts. However, traditional blockchain smart contracts are deterministic and blind: they cannot parse subjective licensing conditions written in natural human language, nor can they fetch and verify live public web metadata from platforms like SoundCloud or YouTube to verify actual usage.

**Clearance** solves this by providing a decentralized, trustless protocol where rights holders set natural language licensing conditions, remixers declare sample usage with live web evidence, and an **on-chain AI jury** adjudicates compliance and computes binding royalty splits.

---

## Why GenLayer

- **Natural Language Licensing:** Original artists write free-form terms in natural English (*"Samples under 4s free. Longer samples require 30% split. No alcohol ads."*). GenLayer's AI contract interprets these terms for every claim.
- **On-Chain Web Scraping:** AI validators render live web data on-chain using `gl.nondet.web.render` to inspect SoundCloud and YouTube metadata directly during execution.
- **Fault-Tolerant AI Consensus:** Validators execute non-deterministic AI prompts (`gl.nondet.exec_prompt`) and reach consensus on subjective verdicts and royalty split calculations.
- **Economic Escrow:** Remixers deposit 0.01 GEN escrow per claim. Upon approval/modification, the deposit is refunded when royalties are distributed. Upon rejection, the deposit remains in contract escrow to penalize bad-faith claims.

*Remove the AI + web layer and this becomes a Google Form. It cannot be built as a normal smart contract.*

---

## Architecture Diagram

```
+------------------+         +--------------------+         +-----------------------+
|  Original Artist |         |      Remixer       |         |      Public Web       |
| (Registers Work) |         |  (Submits Claim)   |         | (SoundCloud/YouTube)  |
+--------+---------+         +---------+----------+         +-----------+-----------+
         |                             |                                |
         | register_work()             | submit_claim()                 |
         v                             v                                |
+-----------------------------------------------------------------------+-----------+
|                          CLEARANCE FRONTEND (React + Vite)                        |
+-----------------------------------------------------------------------------------+
                                       |
                                       | adjudicate(claim_id)
                                       v
+-----------------------------------------------------------------------------------+
|                        GENLAYER STUDIONET INTELLIGENT CONTRACT                    |
|                                                                                   |
|  Leader Node:                                                                     |
|    1. gl.nondet.web.render(remix_url) ------------ (Fetch Metadata) ------------> |
|    2. gl.nondet.web.render(source_url) ----------- (Fetch Metadata) ------------> |
|    3. gl.nondet.exec_prompt(Prompt with Terms & Evidence)                         |
|       --> Returns { verdict, final_split_bps, reason }                            |
|                                                                                   |
|  Validator Consensus (validator_fn):                                              |
|    - Evaluates equivalence of verdict ("APPROVED", "MODIFIED", "REJECTED")       |
|    - Allows ±5% tolerance (±500 bps) for MODIFIED splits                          |
|                                                                                   |
|  Final Settlement:                                                                |
|    - Updates Claim status, final_split_bps, and on-chain AI reason                |
+-----------------------------------------------------------------------------------+
                                       |
                                       | distribute(claim_id) [Payable]
                                       v
+-----------------------------------------------------------------------------------+
|                           TRUSTLESS ROYALTY DISTRIBUTION                          |
|  - Pays Artist: (total_funds * final_split_bps / 10000)                           |
|  - Pays Remixer: remaining_funds + 0.01 GEN deposit refund                        |
+-----------------------------------------------------------------------------------+
```

---

## How Adjudication Actually Works

GenLayer non-deterministic execution requires consensus among validator nodes. Because LLM outputs can vary slightly in natural language formatting, **Clearance** implements a custom semantic `validator_fn` inside `gl.vm.run_nondet`:

1. **Meaning over Formatting:** The validator function re-evaluates the prompt and compares the **verdict state** (`APPROVED`, `MODIFIED`, `REJECTED`) rather than performing a raw string or full JSON string comparison. Comparing raw JSON blobs would fail consensus due to minor phrasing differences in the `reason` field.
2. **Numeric Tolerance:** For `MODIFIED` verdicts (where the AI adjusts the split to conform to terms), the validator requires `final_split_bps` to be within **±500 basis points (±5.00%)** of the leader's computed split.
3. **Impartial Reasoning:** The resulting verdict and human-readable explanation (`reason`) are recorded permanently on-chain.

---

## Deployed Contract

- **Network:** GenLayer Studio Network (`studionet`, Chain ID: `61999` / `0xF1EF`)
- **Contract Address:** [`0x6D7F886071935061B3C1C69DaA0ddb1d143Ced8E`](https://genlayer-explorer.vercel.app/address/0x6D7F886071935061B3C1C69DaA0ddb1d143Ced8E)
- **Block Explorer:** [GenLayer Explorer - Contract 0x6D7F886071935061B3C1C69DaA0ddb1d143Ced8E](https://genlayer-explorer.vercel.app/address/0x6D7F886071935061B3C1C69DaA0ddb1d143Ced8E)

---

## Live App

- **Vercel Live URL:** [https://clearance-genlayer.vercel.app](https://clearance-genlayer.vercel.app)

---

## Demo Video

- **Walkthrough Video:** `[DEMO VIDEO LINK PLACEHOLDER]`

---

## How to Deploy the Contract Yourself

1. Open [https://studio.genlayer.com/run-debug](https://studio.genlayer.com/run-debug) in your browser.
2. Ensure your MetaMask wallet is switched to **GenLayer Studio Network** (`https://studio.genlayer.com/api`, Chain ID `61999`).
3. Copy the entire Python code from [`contracts/clearance.py`](file:///Users/peter/Downloads/AI/Genlayer/2-Clearance/contracts/clearance.py).
4. Paste into the GenLayer Studio code editor and click **Deploy**.
5. Confirm transaction in MetaMask.
6. Verify in transaction details that **Result: SUCCESS** is displayed.
7. Copy the contract address and update `VITE_CONTRACT_ADDRESS` in `frontend/.env`.

---

## How to Run the Frontend Locally

```bash
cd frontend
cp .env.example .env
# Set VITE_CONTRACT_ADDRESS=0x6D7F886071935061B3C1C69DaA0ddb1d143Ced8E
npm install
npm run dev
```

The application will launch locally at `http://localhost:3000`.

---

## How to Run Tests

Install the GenLayer python testing suite and run tests on studionet:

```bash
pip install genlayer-test
gltest --network studionet
```

*Note: `gltest` runs with local mocks or active API keys as configured in your testing environment.*

---

## How to Submit to the Builder Program

Submit your contribution to the GenLayer Builders Track:
- Portal URL: [https://portal.genlayer.foundation/#/builders/contributions](https://portal.genlayer.foundation/#/builders/contributions)
- Contribution Type: GenLayer App / Intelligent Contract

---

## Runtime Notes

- **Pragma:** Target contract header uses `# v0.2.16` and `{ "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`.
- **API Choice:** Primary execution utilizes `gl.vm.run_nondet`. If a target Studio build strictly mandates `run_nondet_unsafe`, fallback is handled gracefully.
- **Deposit Escrow:** Minimum deposit `CLAIM_DEPOSIT_MIN` is set to `0.01 GEN` (`10_000_000_000_000_000` wei).

---

## License

[MIT](LICENSE)
