# Deploying Clearance to GenLayer studionet

`contracts/clearance.py` is deployed by hand through GenLayer Studio. There is
no CI deploy step: Studio signs with the browser wallet, and this repo
deliberately keeps no private key anywhere.

---

## 1. Deploy the contract

1. Open <https://studio.genlayer.com/run-debug>.
2. Connect MetaMask on **GenLayer Studio Network**:
   - RPC URL `https://studio.genlayer.com/api`
   - Chain ID `61999` (`0xF1EF`)
   - Currency symbol `GEN`

   The live app switches the network for you on connect
   (`wallet_switchEthereumChain`, see `frontend/src/lib/network.ts`), but
   Studio itself does not.
3. Fund the deploying wallet from Studio's **Accounts** panel. Do **not** use
   `testnet-faucet.genlayer.foundation` — that funds testnet, a different
   network entirely, and the GEN will never appear on studionet.
4. Paste the full contents of [`../contracts/clearance.py`](../contracts/clearance.py)
   into the Studio editor. Keep line 1 (`# v0.2.16`) and line 2 (the `Depends`
   comment) exactly as they are — dropping either makes Studio fall back to an
   older runtime and fail with `Contract Queues not found`.
5. Click **Deploy** and confirm in MetaMask.
6. Open the transaction in the sidebar and check the **Result** field reads
   `SUCCESS`. `Status: FINALIZED` on its own is not enough — a finalized
   transaction can still have reverted.
7. Copy the deployed address.

## 2. Verify it is really live

```bash
curl -s -X POST https://studio.genlayer.com/api \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"gen_getContractSchema","params":["0xYOUR_ADDRESS"]}'
```

Expect a JSON object listing the methods. v1.2.0 exposes **16**, including
`list_claims` and `get_owner` — if those two are missing you deployed an older
file. An error instead of a schema means the contract is not there.

Studio occasionally resets its storage, which silently kills a previously
working address. Re-run this check before any demo.

## 3. Point the frontend at it

Local:

```bash
cd frontend
echo "VITE_CONTRACT_ADDRESS=0xYOUR_ADDRESS" > .env
npm install && npm run dev
```

Production — the Vercel env var is the source of truth for the live site, and
editing `frontend/.env` alone changes nothing there:

```bash
cd frontend
vercel env rm VITE_CONTRACT_ADDRESS production
vercel env add VITE_CONTRACT_ADDRESS production   # paste the address
vercel --prod
```

Then confirm the live site picked it up, rather than trusting the build log:

```bash
curl -s https://clearance-genlayer.vercel.app/verdicts | grep -c 'id="root"'
```

and open `/verdicts` in a private window — the feed must render without a
wallet.

## 4. Seed the demo data

A fresh contract has an empty catalog. See the **Seed the Demo Data** section
of the [README](../README.md) for the per-step GEN budget and the preset
buttons that fill in the evidence URLs.

## 5. Update the record

Fill the new address into:

- `README.md` → *Deployed Contract*, and move the old address into the
  deprecated table with the reason it was retired
- `CHANGELOG.md` → the current version heading
- the Project Explorer listing's contract link:
  `https://explorer-studio.genlayer.com/address/<addr>`

Note the explorer host: `genlayer-explorer.vercel.app` is dead (503 on every
path).
