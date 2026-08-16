// MIRROR of docs/samples/works.json — kept in-tree so tsc's src-only
// include doesn't have to reach outside frontend/. Edit both files in
// the same PR when adding a preset (docs/samples/works.json is the
// canonical source for external readers).
//
// source_url is not decoration: adjudicate() calls gl.nondet.web.render on
// it, so a dead or unrelated page yields no evidence and drags every verdict
// toward REJECTED. The `demo` preset points at an evidence page the dApp
// publishes itself, which is what makes the documented walkthrough
// reproducible. The rest are license templates — replace source_url with
// your own track page.

export interface SamplePreset {
  id: string;
  title: string;
  source_url: string;
  license_terms: string;
  demo?: boolean;
  demoNote?: string;
}

export const SAMPLE_WORKS: SamplePreset[] = [
  {
    id: 'sample.neon-rain',
    title: 'Neon Rain — Mira Solvang',
    source_url: 'https://clearance-genlayer.vercel.app/evidence/original-neon-rain.html',
    license_terms:
      'Samples of 4 seconds or less are free for any remix, with no royalty split required. Samples between 4 and 15 seconds are permitted with a 25% royalty split to the original artist. Samples longer than 15 seconds are not permitted without a separate written agreement. Instrumental sampling only — the vocal hook may not be sampled under any circumstance. No use in advertising for alcohol, tobacco, gambling, or political campaigns. The remix description must credit both the track title and the original artist by name.',
    demo: true,
    demoNote:
      'Demo-ready. Pairs with the three remix evidence pages to produce an APPROVED, a MODIFIED and a REJECTED verdict.',
  },
  {
    id: 'sample.stem-heavy',
    title: 'Stem-heavy release',
    source_url: 'https://clearance-genlayer.vercel.app/evidence/',
    license_terms:
      'Individual stems (drums, bass, vocals) may be sampled with a 30% royalty split. Full-track remixes require a 50% split. Commercial sync (film, TV, games) needs a separate agreement — not covered by this on-chain license. No hate speech or content promoting violence.',
  },
  {
    id: 'sample.attribution-only',
    title: 'Attribution-only',
    source_url: 'https://clearance-genlayer.vercel.app/evidence/',
    license_terms:
      'All samples free provided the remix track description clearly credits the original title and artist. No royalty split required. Prohibited: NFT resales that claim exclusive ownership of the sampled material.',
  },
  {
    id: 'sample.charity-only',
    title: 'Charity-only',
    source_url: 'https://clearance-genlayer.vercel.app/evidence/',
    license_terms:
      'Any sample length is allowed as long as the remix is released as a non-profit release with 100% of proceeds going to a registered charity. Otherwise a 40% royalty split applies. The remixer must state the beneficiary charity name in the track description.',
  },
];

/** Ready-made remix claims that pair with the `sample.neon-rain` work. */
export interface SampleClaimPreset {
  id: string;
  label: string;
  expects: 'APPROVED' | 'MODIFIED' | 'REJECTED';
  remix_url: string;
  declaration: string;
  proposed_split_bps: number;
  why: string;
}

export const SAMPLE_CLAIMS: SampleClaimPreset[] = [
  {
    id: 'claim.approved',
    label: 'Halogen — 3s instrumental loop, credited',
    expects: 'APPROVED',
    remix_url: 'https://clearance-genlayer.vercel.app/evidence/remix-approved.html',
    declaration:
      'Halogen uses a 3-second instrumental drum loop from Neon Rain (0:52-0:55). Percussion only, no vocal material. Mira Solvang and the track title are credited in the description. Independent release, not used in any advertisement.',
    proposed_split_bps: 0,
    why: 'Under the 4-second free threshold and fully attributed, so a 0% split satisfies the license.',
  },
  {
    id: 'claim.modified',
    label: 'Long Exposure — 12s loop, split proposed too low',
    expects: 'MODIFIED',
    remix_url: 'https://clearance-genlayer.vercel.app/evidence/remix-modified.html',
    declaration:
      'Long Exposure loops a 12-second instrumental section of Neon Rain (0:48-1:00) through the whole track. Instrumental only, no vocals. Mira Solvang is credited. I propose a 5% royalty split.',
    proposed_split_bps: 500,
    why: 'The license requires 25% for samples of 4-15 seconds, so the jury should correct 5% upward rather than reject.',
  },
  {
    id: 'claim.rejected',
    label: 'Hold The Line — vocal hook in an alcohol ad',
    expects: 'REJECTED',
    remix_url: 'https://clearance-genlayer.vercel.app/evidence/remix-rejected.html',
    declaration:
      'Hold The Line is a 58-second cut for the Vodka Nord advertising campaign built on the sampled vocal hook from Neon Rain, roughly 22 seconds of the original in total. I propose a 40% royalty split.',
    proposed_split_bps: 4000,
    why: 'Two independent violations — vocal sampling is banned outright and alcohol advertising is a prohibited context. No split can cure it.',
  },
];
