# Onboarding — from zero to a real verdict

This is the step-by-step version of the in-app welcome modal. It assumes
you have never used GenLayer studionet before.

## 0. Read-only path (no wallet)

You can inspect every real verdict without connecting anything.

- Live site: <https://clearance-genlayer.vercel.app>
- Public verdict feed: <https://clearance-genlayer.vercel.app/verdicts>
- Filter presets:
  - APPROVED only: `/verdicts?status=APPROVED`
  - REJECTED with "vodka" in evidence: `/verdicts?status=REJECTED&q=vodka`
- Evidence pages the on-chain jury actually reads:
  <https://clearance-genlayer.vercel.app/evidence/>

If the feed is empty on a fresh deploy, run [`scripts/seed.mjs`](../scripts/seed.mjs)
to register the sample works and file three claims.

## 1. Set up MetaMask for studionet

Everything below is done inside MetaMask.

1. Open <https://clearance-genlayer.vercel.app> and click **Connect Wallet**.
2. The dApp calls `wallet_switchEthereumChain` first, and falls back to
   `wallet_addEthereumChain` — approve **either** popup.
3. If you prefer to add the chain by hand:
   - Chain ID: `61999` (hex `0xF1EF`)
   - RPC: `https://studio.genlayer.com/api`
   - Symbol: `GEN`, decimals `18`
   - Explorer: `https://explorer-studio.genlayer.com`

Verify: the top-right badge in the app should show your address and the
STUDIONET chip should be visible next to the CLEARANCE logo.

## 2. Fund the wallet with GEN

Do this from the **Studio Accounts panel**, **not** from the testnet
faucet (that funds a different chain). The published contract lives on
studionet; a testnet-funded wallet cannot sign transactions here.

- Open <https://studio.genlayer.com/contracts>.
- Studio provisions accounts with a pre-loaded balance; transfer any
  amount (≥ 1.5 GEN covers every path on this dApp) to your MetaMask
  address.
- Wait for the balance to appear in MetaMask.

## 3. Register your first work — 30 seconds

1. Navigate to `/register`.
2. Under **Quick-start**, click any preset — "Neon Rain" is the one paired
   with the shipped evidence pages.
3. Edit anything you like, then **Publish Work & Licensing Terms**.
4. MetaMask signs. The `PendingBanner` explains what the validators are
   doing while you wait for consensus.
5. On success you land on `/works/:id` with the new work.

## 4. File a remix claim

1. From the work page, click **Submit Remix Claim**.
2. Under **Load a demo claim**, pick one of the three presets:
   - `APPROVED` — 3s instrumental loop, credited.
   - `MODIFIED` — 12s loop, credited but with too low a proposed split.
   - `REJECTED` — vocal hook used in an alcohol advertisement.
3. Confirm the 0.01 GEN deposit and sign.
4. The dApp redirects to `/claim/:id`.

## 5. Adjudicate

1. On the claim page, click **Adjudicate Claim via AI Jury**.
2. Studionet's non-deterministic execution takes ~30–90 seconds — that is
   the leader rendering both track pages, the LLM reading the licence,
   and each validator independently rerunning the same closure to vote.
3. The verdict updates in place. The `reason` field is the on-chain
   rationale — public, permanent, and the same one every validator will
   see.

## 6. Settle or appeal

- **APPROVED / MODIFIED** — click **Distribute** and enter at least
  `SETTLEMENT_MIN` (0.10 GEN). Only the remixer wallet may call this.
  The artist share is paid, the remainder plus the 0.01 GEN deposit
  refund goes back to the remixer.
- **REJECTED / MODIFIED (dispute)** — click **Appeal**. Stake is priced
  off the immutable `base_deposit`, so it stays constant across rounds:
  0.02 GEN in the default configuration. Winning an appeal claws every
  locked wei back into the refundable escrow.

## Troubleshooting

- **"insufficient funds"** on the first write — you funded a testnet
  address instead of studionet. Fund studionet from the Studio Accounts
  panel and retry.
- **"only the remixer may distribute"** — MetaMask is switched to the
  wrong account. The account that filed the claim is the only one that
  can settle it.
- **Verdict feed shows nothing** — the deploy is fresh. Run
  `scripts/seed.mjs` or register a work + submit a claim yourself.
- **All verdicts trend REJECTED with a "no evidence" reason** — the
  URLs you registered are dead. The jury renders the source and remix
  URLs at execution time; use real public pages or the shipped
  `/evidence/*.html` templates.
