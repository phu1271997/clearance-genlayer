# Clearance — 3-minute demo script

Screenplay for a recorded walkthrough. Times are cumulative — each cue
line is what the presenter says while the screen shows the paired action.

**Total runtime target:** 3:00. **Cutoff before slippage:** 3:30.

## Assumed setup before recording

- Studionet MetaMask account with **at least 1.5 GEN**.
- `frontend/` running against
  `VITE_CONTRACT_ADDRESS=0x4EF054f6f6b394dffEFBA5a6CB81713CC1545C00`.
- One work already registered (Neon Rain), one APPROVED claim already
  settled — so `/verdicts` is not empty on frame one. Run
  `node scripts/seed.mjs` if needed.
- Browser zoom **125%**. DevTools closed. Notifications muted.
- `/verdicts` open in a **second incognito tab** with no wallet
  connected — used to sell the "no wallet needed to read" beat.

## 0:00 – 0:20 — The hook

**Screen:** landing page hero.
**Say:** "This is Clearance — an on-chain AI jury for music sample
licensing on GenLayer. A remixer submits a claim, the jury reads the
public web, and the verdict is written to studionet in ninety seconds
instead of ninety days."

**Action:** click through the three hero buttons at slow pace so the
viewer registers the labels: *Register Original Work*, *Browse
Catalog*, *See AI Verdicts*.

## 0:20 – 0:40 — Public verdict feed (no wallet)

**Screen:** switch to the incognito tab, `/verdicts`.
**Say:** "Every verdict here was produced by validator consensus, not
by this website — and every verdict is public. No wallet, no login."

**Action:**

1. Click `APPROVED` chip → filter narrows.
2. Type `vodka` in the search → the REJECTED alcohol-ad row surfaces.
3. Copy the address bar showing
   `/verdicts?status=REJECTED&q=vodka` and paste into chat overlay to
   sell the shareable-URL point.

## 0:40 – 1:00 — The evidence pages

**Screen:** open a new tab to
`https://clearance-genlayer-red.vercel.app/evidence/remix-rejected.html`.
**Say:** "The jury is not guessing. When it adjudicates, it calls
`gl.nondet.web.render` on the URLs the artist and the remixer supplied.
Here is the real page it reads for the rejected claim — a vocal hook
placed in a vodka ad. The licence forbids both."

## 1:00 – 1:30 — Register a work

**Screen:** back to the primary tab. Navigate `/register`.
**Say:** "Original artists describe their licence rules in plain
English. This is what a normal smart contract can't do."

**Action:**

1. Click preset **Neon Rain**.
2. Highlight the licence text.
3. Click **Publish**. MetaMask signs.
4. Watch the pending banner — call out the 30–90s expected window.

## 1:30 – 2:15 — File a claim → adjudicate

**Screen:** land on the new work's page. Click **Submit Remix Claim**.
**Say:** "The remixer picks the modified preset — a twelve-second loop
with a five percent split proposed. The licence says twelve seconds
requires twenty-five, so the jury should correct it, not reject it."

**Action:**

1. Click preset **MODIFIED**.
2. Submit — 0.01 GEN deposit is locked, MetaMask signs.
3. On the claim page, click **Adjudicate Claim via AI Jury**.
4. Point at the pending banner while validators run.
5. Verdict lands: **MODIFIED**, split rewritten to **25%**, confidence
   ~85%, on-chain rationale shown verbatim.
6. Say: "This rationale is not a UI translation — it is the text
   validators wrote to chain."

## 2:15 – 2:40 — Consensus is semantic, not shape

**Screen:** open `docs/adr/ADR-003-validator-semantics.md` in split view.
**Say:** "Two validators writing the rationale differently still reach
consensus, because `validator_fn` compares verdict exactly, split
within ±5%, confidence within ±20. Different opinions on the split
past 5% do not. That is the property that separates this from a
strict-equality contract that would never finalise."

## 2:40 – 3:00 — Recourse and reputation

**Screen:** navigate `/leaderboard`, then `/reputation/<remixer>`.
**Say:** "Every address has a public track record — approved,
modified, rejected. Rejected verdicts can be appealed by re-staking
two times the original deposit, capped at two rounds. The forfeit
pool is split into a locked bucket that a winning appeal can claw
back, and a final bucket the owner can only sweep once appeals are
spent."

**End card:** contract address on the right, GitHub URL on the left,
Portal handle on the top.

## Beats you can drop if you overrun

- Reputation deep-dive at 2:45 (can end on `/leaderboard`).
- Filter demo at 0:35 (can jump straight to the vodka row).
- Never drop the "no wallet to read" beat — it is the strongest
  first-impression point.

## Recording checklist

- [ ] Screen recorder at 60 fps, ≥ 1600×900.
- [ ] Microphone gain calibrated. Test 20 s of speech before rolling.
- [ ] Cursor highlighting on.
- [ ] Tab titles say "Clearance …" not "Vite + React".
- [ ] Wallet address in header **redacted** if the recording will be
      shared publicly.
- [ ] MetaMask popups accepted without cutting to the popup — the demo
      is about the dApp, not the wallet.
- [ ] After recording, run one dry-play at 1.25× to check pacing.
