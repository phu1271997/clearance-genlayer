// MIRROR of docs/samples/works.json — kept in-tree so tsc's src-only
// include doesn't have to reach outside frontend/. Edit both files in
// the same PR when adding a preset (docs/samples/works.json is the
// canonical source for external readers).

export interface SamplePreset {
  id: string;
  title: string;
  source_url: string;
  license_terms: string;
}

export const SAMPLE_WORKS: SamplePreset[] = [
  {
    id: 'sample.short-loop-free',
    title: 'Short-loop friendly',
    source_url: 'https://soundcloud.com/example/short-loop-friendly',
    license_terms:
      'Samples of 4 seconds or less are free for any remix. Samples between 4 and 15 seconds require a 25% royalty split to the original artist. Samples longer than 15 seconds are not allowed without written permission. No use in advertisements for alcohol, tobacco, gambling, or political campaigns. Attribution in the track description is required.',
  },
  {
    id: 'sample.stem-heavy',
    title: 'Stem-heavy release',
    source_url: 'https://soundcloud.com/example/stem-heavy',
    license_terms:
      'Individual stems (drums, bass, vocals) may be sampled with a 30% royalty split. Full-track remixes require a 50% split. Commercial sync (film, TV, games) needs a separate agreement — not covered by this on-chain license. No hate speech or content promoting violence.',
  },
  {
    id: 'sample.attribution-only',
    title: 'Attribution-only',
    source_url: 'https://soundcloud.com/example/attribution-only',
    license_terms:
      'All samples free provided the remix track description clearly credits the original title and artist. No royalty split required. Prohibited: NFT resales that claim exclusive ownership of the sampled material.',
  },
  {
    id: 'sample.no-vocals',
    title: 'No-vocals rule',
    source_url: 'https://soundcloud.com/example/no-vocals',
    license_terms:
      'Instrumental portions may be sampled freely for the first 8 seconds, 15% split thereafter. Vocal samples are strictly not permitted under any circumstance. Genre restriction: remixes must not be classified as country or ambient.',
  },
  {
    id: 'sample.charity-only',
    title: 'Charity-only',
    source_url: 'https://soundcloud.com/example/charity-only',
    license_terms:
      'Any sample length is allowed as long as the remix is released as a non-profit release with 100% of proceeds going to a registered charity. Otherwise a 40% royalty split applies. The remixer must state the beneficiary charity name in the track description.',
  },
];
