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
  {
    id: 'sample.education-only',
    title: 'Education-only',
    source_url: 'https://clearance-genlayer.vercel.app/evidence/',
    license_terms:
      'Free sampling for educational content — tutorials, coursework, academic analysis. The remix description must state the educational context and link to the syllabus, lesson, or course. Commercial redistribution requires a 45% royalty split. No use in ads, sponsored placements, or fundraising campaigns.',
  },
  {
    id: 'sample.regional-lock',
    title: 'Regional-lock',
    source_url: 'https://clearance-genlayer.vercel.app/evidence/',
    license_terms:
      'Sampling permitted in EU and Nordic regions only. The remix description must declare a primary release region. Distribution or streaming outside the EU/Nordics requires a separate written agreement. 20% royalty split applies within the permitted region. No use in political, religious or nationalist campaigns of any country.',
  },
  {
    id: 'sample.livestream-cover',
    title: 'Livestream-cover',
    source_url: 'https://clearance-genlayer.vercel.app/evidence/',
    license_terms:
      'Livestream covers and VOD replays permitted with attribution and a 15% royalty split against monetized earnings. Uploaded audio releases (Spotify, Apple Music, Bandcamp) require a 35% split. Vocal covers acceptable; instrumental karaoke tracks require original stems purchase. No use as bed music for gambling streams.',
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
  {
    id: 'claim.approved-attribution',
    label: 'Fade Into Grey — 2s hi-hat clip, credited',
    expects: 'APPROVED',
    remix_url: 'https://clearance-genlayer.vercel.app/evidence/remix-approved.html',
    declaration:
      'Fade Into Grey uses a 2-second isolated hi-hat clip from Neon Rain (1:14-1:16). Percussion only, no melodic or vocal content. Full attribution to Mira Solvang and Neon Rain in the track title suffix and description. Independent bandcamp release, no advertising context.',
    proposed_split_bps: 0,
    why: 'Well below the 4-second free threshold, non-vocal, credited, non-commercial — every license predicate is comfortably satisfied at 0%.',
  },
  {
    id: 'claim.modified-band',
    label: 'Small Hours — 8s pad loop, no split declared',
    expects: 'MODIFIED',
    remix_url: 'https://clearance-genlayer.vercel.app/evidence/remix-modified.html',
    declaration:
      'Small Hours weaves an 8-second instrumental pad from Neon Rain (0:32-0:40) through the intro and outro. Instrumental only, no vocals. Mira Solvang is credited by name. I propose a 0% royalty split because the sample is short.',
    proposed_split_bps: 0,
    why: 'The sample sits in the 4-15s paid band, so the licence forces a 25% split — the jury should correct 0% upward rather than reject.',
  },
  {
    id: 'claim.rejected-length',
    label: 'Cascade — 22s uncredited chorus lift',
    expects: 'REJECTED',
    remix_url: 'https://clearance-genlayer.vercel.app/evidence/remix-rejected.html',
    declaration:
      'Cascade loops a 22-second chorus section from Neon Rain (0:44-1:06) verbatim, including the top-line vocal, released commercially on all major DSPs. No credit line in the description. I propose a 30% royalty split.',
    proposed_split_bps: 3000,
    why: 'Three violations: sample longer than 15s (requires separate agreement), vocal sampling (banned), and no attribution. Length alone is disqualifying.',
  },
];
