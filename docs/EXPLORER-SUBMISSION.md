# GenLayer Project Explorer — submission draft

**Project:** Clearance · **Prepared:** 2026-08-16 · **Status: DO NOT SUBMIT YET**

Two things must happen first. Both need a wallet, so neither could be done from
the repo.

## ⛔ Blockers

| # | Blocker | Owner | Why it blocks |
|---|---|---|---|
| B1 | Deploy contract v1.2.0 to studionet and update `VITE_CONTRACT_ADDRESS` on Vercel | you | v1.1.1 is still live and has the free-appeal bug. It also lacks `list_claims` / `get_owner`, so `/verdicts` runs a degraded fallback and the owner panel never appears. Steps: [`../scripts/deploy-notes.md`](../scripts/deploy-notes.md) |
| B2 | Seed the demo data | you | The current chain state is 4 works — two of them named `sd sds s sd` and `dfdfdf` — and 2 claims, **both REJECTED**. No APPROVED, no MODIFIED, no settlement, no appeal. A reviewer opening the app today sees only rejections. Redeploying clears the junk; seeding fills it properly |

Everything below is written against the state *after* those two steps.

---

## Seeding procedure

Prerequisite: a MetaMask wallet with **≥ 1.5 GEN on studionet**, funded from
Studio's **Accounts** panel (not the testnet faucet — different network).

Two wallets make the demo more legible (artist vs remixer), but one works.

**Record A — the work.** `/register` → *Load preset* → **Neon Rain — Mira
Solvang**. Submit. Cost: gas only.

**Record B — APPROVED + settled.** Open the work → *Submit claim* → preset
**Halogen — 3s instrumental loop, credited** → submit (0.01 GEN) → *Adjudicate*
→ wait ~30–90s → *Distribute* with 0.10 GEN. Expect APPROVED at 0% and
`distributed: YES`.

**Record C — MODIFIED + settled.** Same work → preset **Long Exposure — 12s
loop, split proposed too low** → submit → adjudicate. Expect MODIFIED with the
binding split raised from 5% to ~25%. Settle with 0.10 GEN.

**Record D — REJECTED.** Same work → preset **Hold The Line — vocal hook in an
alcohol ad** → submit → adjudicate. Expect REJECTED and the 0.01 GEN forfeited.

**Record E — appeal.** On record D press *Appeal* (0.02 GEN). Expect the appeal
counter to read 1/2. The verdict will most likely be upheld, since the evidence
has not changed — that is a legitimate demo of the appeal path, not a failure.

Verdicts come from validator consensus, so a preset can land somewhere other
than its label. If that happens, keep the record and adjust the listing copy
rather than re-rolling until it matches.

**Then check it as a stranger would:** open the live URL in a private window
with no wallet connected and confirm `/verdicts` shows records B–E.

---

## Section 01 — Identity

**Project name:** `Clearance`

**Logo:** [`frontend/public/logo-1024.png`](../frontend/public/logo-1024.png)
(1024×1024, ~1.1 MB) — inside the spec (PNG/JPEG/WebP, 128–2048 px, ≤ 2 MB).
Use [`logo-512.png`](../frontend/public/logo-512.png) (~296 KB) if the upload
is slow. Source: [`logo.svg`](../frontend/public/logo.svg).

**Primary category:** `Dispute Resolution`

The mechanism is adjudication: evidence in, binding verdict out, money moved
accordingly. Not `Marketplaces` — Clearance serves music rights but is not one.
Not `AI & Agents`: nearly every project in the catalog is AI-powered, so that
label separates nothing, and the catalog reshuffles each session, meaning there
is exactly one impression to make.

**Category tag 1:** `Evidence Assessment` — every user hits it.
`_run_adjudication` calls `gl.nondet.web.render` on the work's `source_url` and
the claim's `remix_url`, then weighs those pages against the declaration and
the licence in a three-lens prompt (forensic / legal / skeptic).

**Category tag 2:** `Appeal Review` — the optional branch.
`appeal(claim_id)` is a payable second hearing: it re-runs the full
adjudication on a decided claim, priced at 2× `base_deposit` and capped at
`MAX_APPEALS = 2`.

**Rejected tags, in case a reviewer checks:**

- `License Claims` — tempting, and wrong. The tag is about licence terms as the
  subject of a claim; here the licence is the *rule* being applied, and there
  is no ownership or entitlement dispute over the licence itself.
- `Escrow Claims` — there is an escrow, but it is an anti-spam bond, not a
  two-party escrow over a deliverable.
- `Moderation Appeals` — nothing is moderated or taken down.
- `Jury Selection` — the app calls the validators an "AI jury", but validator
  selection belongs to GenLayer. The app has no say in it.

---

## Section 02 — Project summary

**One-liner** (133 / 180):

> Registers a music sample licence in plain English, then lets an on-chain AI jury read the evidence and set the binding royalty split.

**Description** (966 / 1000):

> Sample clearance takes months of label paperwork, so most remixers ship uncleared or never ship. Clearance replaces that with an on-chain adjudication.
>
> An artist registers a track with licence terms in ordinary English ("4 seconds or less is free, 4-15 seconds needs 25%, no vocals, no alcohol ads"). A remixer submits their track URL, a declaration of how the sample is used, a proposed split, and a 0.01 GEN escrow. Adjudication is public: GenLayer validators fetch both track pages with gl.nondet.web.render, weigh the declaration against the licence, and reach consensus on APPROVED, MODIFIED or REJECTED plus a written rationale, recorded on-chain. MODIFIED overrides the proposed split with what the terms require.
>
> Settlement pays the artist and refunds the escrow. A rejection forfeits it; the remixer can stake 2x to force one re-adjudication, capped at two.
>
> Solidity cannot do this. It cannot read a SoundCloud page and cannot interpret "no alcohol ads".

---

## How to try it

**Prerequisites.** Reading needs nothing — no wallet, no GEN. To run the flow
yourself: MetaMask, and about 0.15 GEN on studionet. Every step below except
2 and 3 is free to look at.

**Step 1 — See a verdict before spending anything.**
Open `/verdicts`. Each row is a real adjudication: the verdict, the split the
contract will enforce, the jury's confidence, and the rationale the validators
wrote on-chain. Open one to see the licence, the declaration and the evidence
URL it was judged against.

**Step 2 — Get a funded wallet on studionet.**
Add GenLayer Studio Network to MetaMask (the app offers the switch when you
press Connect; chain ID 61999). Fund the address from the **Accounts** panel at
studio.genlayer.com. The public testnet faucet does not work here — it funds a
different network.

**Step 3 — Register a track and its licence.**
`/register` → *Load preset* → **Neon Rain — Mira Solvang**. That fills a
real, readable track page as the source URL and a licence with several
conditions an ordinary contract could not evaluate. Submit and confirm in
MetaMask. Free apart from gas.

**Step 4 — File a remix claim.**
Open the work → *Submit claim* → pick a preset. Each one points at a public
evidence page at `/evidence/`; open it first so you can see what the jury will
see. Start with **Halogen — 3s instrumental loop, credited**. Costs 0.01 GEN,
refunded when the claim settles.

**Step 5 — Run the jury.**
Press *Adjudicate*. Validators fetch both track pages and run the licence
prompt before voting, so this takes roughly 30–90 seconds — much slower than an
ordinary transaction. The claim page shows the verdict, the binding split, the
confidence, and the reasoning, with a link to the transaction.

**Step 6 — Settle.**
Press *Distribute* and send at least 0.10 GEN. The artist gets their share, you
get the rest plus your 0.01 GEN escrow back. Only the remixer can settle, and a
second attempt reverts.

**Step 7 (optional) — Make the jury disagree with itself.**
Submit the **Hold The Line** preset, a vocal hook used in an alcohol
advertisement. Expect a rejection and a forfeited escrow. Then press *Appeal*
and stake 0.02 GEN to force a second hearing, capped at two.

**Expected end state:** at least one claim reading APPROVED or MODIFIED with
`distributed: YES`, visible to anyone at `/verdicts` without a wallet.

**If something goes wrong:**

- *A write fails or MetaMask errors on `'from'`* — you are on the wrong
  network or the wrong account. Reconnect (step 2); the app re-issues the
  network switch.
- *`insufficient funds`* — the connected address has no GEN **on studionet**.
  Fund it from Studio's Accounts panel, not the testnet faucet (step 2).
- *Adjudication seems stuck* — non-deterministic transactions are slow. Give it
  90 seconds, then press *Refresh State*.
- *The verdict is not the one the preset predicted* — that is consensus, not a
  bug. The rationale on the claim page says how the validators read it.

---

## Expected verification outcome (498 / 500)

> Open /verdicts with no wallet: real adjudications, each with the verdict, the binding split, jury confidence and the rationale the validators wrote on-chain.
>
> Run it yourself and the APPROVED preset (3-second credited loop) clears at the proposed 0%, while the MODIFIED preset (12-second loop) has its 5% proposal overridden to the 25% the licence requires. That override is the proof the jury read the terms rather than echoing the input.
>
> Settling pays the artist and refunds the 0.01 GEN escrow.

> ⚠️ The middle paragraph is only true once record C exists. If you submit
> before seeding the MODIFIED case, cut that sentence.

---

## Links

| Field | Value |
|---|---|
| Contract link | `https://explorer-studio.genlayer.com/address/<v1.2.0 address>` |
| Address | fill in after deploying |
| Network | studionet |
| **Status** | **Preview** — studionet is Studio-hosted. Writing "Live" would be a misrepresentation, and it is the first thing a reviewer checks |
| Website | https://clearance-genlayer.vercel.app |
| GitHub | https://github.com/phu1271997/clearance-genlayer |
| Community links | none — leave blank, they are optional |

Before pasting the contract link, open it in a browser and confirm the address
page renders with at least one transaction showing `GENVM RESULT: SUCCESS` and
`CONSENSUS RESULT: Accepted`. `genlayer-explorer.vercel.app` is dead (503 on
every path) — do not use it.

---

## Pre-submission checklist

**Truthfulness**
- [ ] Every feature in the description works at the live URL right now
- [ ] Status reads Preview, not Live
- [ ] Both category tags map to a function you can point at

**Deploy state**
- [ ] v1.2.0 deployed, transaction `Result: SUCCESS`
- [ ] `gen_getContractSchema` returns 16 methods including `list_claims` and `get_owner`
- [ ] `VITE_CONTRACT_ADDRESS` updated on Vercel **and** redeployed
- [ ] Explorer address page opened in a browser, shows a SUCCESS transaction

**End-to-end**
- [ ] Seeded: APPROVED + settled, MODIFIED + settled, REJECTED, appeal
- [ ] `/verdicts` opened in a private window with no wallet — records visible
- [ ] Walked "How to try it" start to finish with a fresh wallet

**Assets and limits**
- [ ] Logo uploaded (1024 or 512 PNG)
- [ ] One-liner 133 ≤ 180 · Description 966 ≤ 1000 · Verification 498 ≤ 500

**Understood**
- [ ] Changes requested = one revision, 14 days
- [ ] Declined = no self-service resubmit
- [ ] One Projects contribution = one Explorer entry
