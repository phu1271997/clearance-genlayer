# CONTRIBUTING.md

Thanks for considering a contribution to Clearance. This document tells
you how to get a working dev loop, what the layout is, and what a
mergeable PR looks like.

---

## 1. Prerequisites

- **Node.js 20+** and **npm** (for the frontend + probes).
- **Python 3.11+** and **pip** (for `gltest`).
- A MetaMask wallet connected to GenLayer Studio Network
  (`https://studio.genlayer.com/api`, chain ID `61999`).
- GEN balance on studionet — request from the Studio **Accounts** panel
  by transferring from a pre-funded account.

---

## 2. Repo layout

```
contracts/       # Intelligent Contract (Python, deployed to studionet)
frontend/        # React + Vite + genlayer-js SPA
tests/           # gltest suite (Python)
scripts/         # Deploy notes + demo seed
docs/adr/        # Architecture Decision Records
SECURITY.md      # Threat model + audit trail
ECONOMICS.md     # Token flow + fee model
ARCHITECTURE.md  # System boundaries + sequence diagrams
CHANGELOG.md     # Semver history
```

---

## 3. Dev loop

**Frontend**

```bash
cd frontend
cp .env.example .env             # fill VITE_CONTRACT_ADDRESS
npm install
npm run dev                      # http://localhost:3000
```

**Contract**

Edit `contracts/clearance.py`, then deploy through Studio's Run & Debug
panel. See [`scripts/deploy-notes.md`](scripts/deploy-notes.md) for the
step-by-step. **Verify `Result: SUCCESS` on the deploy tx** — not just
`Status: FINALIZED`.

**Tests**

```bash
pip install genlayer-test
gltest --network studionet
```

Mocks follow the R17 format (bare-dict `params` with `llm_mocks` /
`web_mocks`) — see [`tests/test_clearance.py::_install_mocks`](tests/test_clearance.py).

---

## 4. Coding conventions

**Contract (`contracts/clearance.py`)**

- Storage: `TreeMap`/`DynArray`/`bigint`/sized ints only. Never bare
  `int`. Every `TreeMap` key is `str`.
- Address handling: use `_addr_str()` — lowercase, 0x-prefixed. Always
  compare canonicalised strings, never raw.
- Non-determinism: every `gl.nondet.*` call lives inside
  `gl.vm.run_nondet(leader_fn, validator_fn)`. **Never
  `run_nondet_unsafe`.**
- Validators compare **meaning** — verdict + numeric tolerance +
  confidence tolerance. Never `strict_eq` on raw JSON containing free
  text.
- Money-moving methods: Checks-Effects-Interactions. Write the
  finalised state *before* any `emit_transfer`.

**Frontend (`frontend/src/`)**

- Reads: `client.readContract`. Writes: `client.writeContract` **then**
  `awaitTxFinalized()` from `lib/genlayer.ts` — never poll a read view
  as a substitute for the receipt.
- Chain ID is read from `studionet.id`, not hardcoded.
- MetaMask is the only signer. Never bake a private key into a `VITE_`
  env var.

**Docs**

- If you add a public method or change a storage field, update
  `ARCHITECTURE.md` and `CHANGELOG.md` in the same PR.
- Security-relevant changes go into `SECURITY.md`'s threat table with a
  status column entry.

---

## 5. Commit + PR

- One logical change per commit; message describes the *why*, not the
  *what*.
- Prefix by domain: `feat(contract)!`, `fix(frontend)`, `test:`,
  `docs:`, `chore(release):`.
- Every breaking contract change is a `!` commit and requires a
  redeploy note in `CHANGELOG.md`.
- Before opening a PR, run `npm run build` in `frontend/` and
  `gltest --network studionet` in the repo root.

---

## 6. Reporting a bug

Open a GitHub issue with:
- Repro steps (include contract address if relevant).
- Actual vs expected behaviour.
- Tx hash if the bug is on-chain — the maintainer can trace with
  `debugTraceTransaction`.

Security issues: see [`SECURITY.md`](SECURITY.md) §4 for the private
disclosure path.
