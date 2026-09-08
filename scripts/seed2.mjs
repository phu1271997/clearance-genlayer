#!/usr/bin/env node
// v2.0.0 seed — registers a work, drives three claims to a verdict, and runs
// one artist contest so the new two-sided-dispute feature has real on-chain
// evidence on a fresh deploy.
//
//   source ~/.genlayer/env.sh
//   CLEARANCE_ADDR=0x... node scripts/seed2.mjs      # run so genlayer-js resolves
//
// artist  = GENLAYER_PRIVATE_KEY   (registers the work, contests)
// remixer = GENLAYER_PRIVATE_KEY_2 (submits + settles claims)

import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const ADDR = process.env.CLEARANCE_ADDR || process.env.VITE_CONTRACT_ADDRESS;
if (!ADDR) { console.error('Set CLEARANCE_ADDR'); process.exit(2); }
const ORIGIN = process.env.EVIDENCE_ORIGIN || 'https://clearance-genlayer-red.vercel.app';

const norm = (k) => (k?.startsWith('0x') ? k : '0x' + k);
const artist = createAccount(norm(process.env.GENLAYER_PRIVATE_KEY));
const remixer = createAccount(norm(process.env.GENLAYER_PRIVATE_KEY_2 || process.env.GENLAYER_PRIVATE_KEY));
const A = createClient({ chain: studionet, account: artist });
const R = createClient({ chain: studionet, account: remixer });

console.log('contract:', ADDR);
console.log('artist  :', artist.address);
console.log('remixer :', remixer.address);

async function wait(client, hash, label) {
  const r = await client.waitForTransactionReceipt({ hash, status: 'FINALIZED', interval: 4000, retries: 120 });
  const lr = r?.consensus_data?.leader_receipt?.[0];
  const exec = lr?.execution_result || r?.txExecutionResultName;
  if (exec && exec !== 'SUCCESS') {
    const err = (lr?.genvm_result?.stderr || '').trim().split('\n').pop();
    console.log(`  ${label}: FAIL — ${err || exec}`);
    return false;
  }
  console.log(`  ${label}: SUCCESS ${hash}`);
  return true;
}

const LICENSE =
  'Instrumental samples of 4 seconds or less may be used for free with credit. ' +
  'Instrumental samples between 4 and 15 seconds require a 25% royalty split to ' +
  'the original artist. Vocal samples are not licensed under any circumstances. ' +
  'No use in advertising for alcohol, tobacco, or gambling.';

const CLAIMS = [
  { label: 'APPROVED (3s instrumental loop)', url: `${ORIGIN}/evidence/remix-approved.html`,
    decl: 'Halogen uses a 3-second instrumental drum loop from Neon Rain (0:52-0:55). Percussion only, no vocals. Mira Solvang and the title are credited. Independent release, no advertising.',
    split: 0 },
  { label: 'MODIFIED (12s loop, split too low)', url: `${ORIGIN}/evidence/remix-modified.html`,
    decl: 'Long Exposure loops a 12-second instrumental section of Neon Rain (0:48-1:00). Instrumental only, credited. I propose a 5% royalty split.',
    split: 500 },
  { label: 'REJECTED (vocal hook in alcohol ad)', url: `${ORIGIN}/evidence/remix-rejected.html`,
    decl: 'Hold The Line is a 58-second cut for the Vodka Nord ad campaign built on the sampled vocal hook from Neon Rain, ~22s of the original. I propose a 40% split.',
    split: 4000 },
];

const DEPOSIT = 10_000_000_000_000_000n;      // 0.01 GEN
const CONTEST = 20_000_000_000_000_000n;      // 0.02 GEN = 2x base deposit

// 1) register work (artist)
console.log('\n[1] register work');
const wHash = await A.writeContract({ address: ADDR, functionName: 'register_work',
  args: ['Neon Rain', `${ORIGIN}/evidence/original-neon-rain.html`, LICENSE], value: 0n });
await wait(A, wHash, 'register Neon Rain');
const works = await A.readContract({ address: ADDR, functionName: 'list_works', args: [] });
const neon = (works || []).find((w) => (w?.title || '').startsWith('Neon Rain'));
const workId = neon?.id ?? '0';
console.log('  work id:', workId);

// 2) submit + adjudicate each claim
const claimIds = [];
for (const c of CLAIMS) {
  console.log(`\n[2] ${c.label}`);
  const sHash = await R.writeContract({ address: ADDR, functionName: 'submit_claim',
    args: [String(workId), c.url, c.decl, c.split], value: DEPOSIT });
  if (!(await wait(R, sHash, 'submit'))) continue;
  const feed = await A.readContract({ address: ADDR, functionName: 'list_claims', args: [] });
  const cid = feed?.[0]?.id;   // newest first
  claimIds.push({ cid, ...c });
  console.log('  claim id:', cid);
  const aHash = await A.writeContract({ address: ADDR, functionName: 'adjudicate', args: [String(cid)], value: 0n });
  await wait(A, aHash, 'adjudicate');
  const cl = await A.readContract({ address: ADDR, functionName: 'get_claim', args: [String(cid)] });
  console.log('  verdict:', cl?.status, 'split', cl?.final_split_bps, 'conf', cl?.ai_confidence);
}

// 3) artist contests the MODIFIED claim (argues the split is still too low)
const target = claimIds.find((x) => x.split === 500) || claimIds[0];
if (target) {
  console.log(`\n[3] artist contests claim #${target.cid}`);
  try {
    const cHash = await A.writeContract({ address: ADDR, functionName: 'contest',
      args: [String(target.cid),
        'This is a 12-second instrumental loop running through the whole track, not a brief accent. My terms price 4-15s samples at 25%, so a 5% split underpays the original work.'],
      value: CONTEST });
    await wait(A, cHash, 'contest');
    const cl = await A.readContract({ address: ADDR, functionName: 'get_claim', args: [String(target.cid)] });
    console.log('  outcome:', cl?.contest_outcome, '| status', cl?.status, '| split', cl?.final_split_bps, '| refund', cl?.artist_refund);
  } catch (e) {
    console.log('  contest THROW —', e?.shortMessage || e?.message);
  }
}

const counts = await A.readContract({ address: ADDR, functionName: 'counts', args: [] });
console.log('\nFinal counts:', JSON.stringify(counts, (_, v) => typeof v === 'bigint' ? v.toString() : v));
console.log('Precedents:', JSON.stringify(await A.readContract({ address: ADDR, functionName: 'get_precedents', args: [String(workId)] })).slice(0, 400));
