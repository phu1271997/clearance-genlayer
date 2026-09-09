#!/usr/bin/env node
// v3.0.0 seed — build a real derivative chain on-chain so the royalty cascade
// has live evidence: original work -> cleared remix -> promoted to a work ->
// a further remix cleared against it -> settled, cascading upstream.
//
//   source ~/.genlayer/env.sh
//   CLEARANCE_ADDR=0x... node scripts/seed3.mjs   (run where genlayer-js resolves)

import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const ADDR = process.env.CLEARANCE_ADDR || process.env.VITE_CONTRACT_ADDRESS;
if (!ADDR) { console.error('Set CLEARANCE_ADDR'); process.exit(2); }
const ORIGIN = process.env.EVIDENCE_ORIGIN || 'https://clearance-genlayer-red.vercel.app';
const norm = (k) => (k?.startsWith('0x') ? k : '0x' + k);

const A = createAccount(norm(process.env.GENLAYER_PRIVATE_KEY));               // original artist
const B = createAccount(norm(process.env.GENLAYER_PRIVATE_KEY_2 || process.env.GENLAYER_PRIVATE_KEY)); // remixer -> derivative artist
const C = createAccount(norm(process.env.GENLAYER_PRIVATE_KEY_3 || process.env.GENLAYER_PRIVATE_KEY_2 || process.env.GENLAYER_PRIVATE_KEY)); // downstream remixer
const cA = createClient({ chain: studionet, account: A });
const cB = createClient({ chain: studionet, account: B });
const cC = createClient({ chain: studionet, account: C });
console.log('artist A  :', A.address, '\nremixer B :', B.address, '\nremixer C :', C.address);

async function wait(cl, h, l) {
  const r = await cl.waitForTransactionReceipt({ hash: h, status: 'FINALIZED', interval: 4000, retries: 150 });
  const lr = r?.consensus_data?.leader_receipt?.[0];
  const e = lr?.execution_result || r?.txExecutionResultName;
  if (e && e !== 'SUCCESS') { console.log(`  ${l}: FAIL — ${(lr?.genvm_result?.stderr || '').trim().split('\n').pop()}`); return false; }
  console.log(`  ${l}: SUCCESS`); return true;
}
const DEPOSIT = 10_000_000_000_000_000n;

const LICENSE_A =
  'Instrumental samples of 4 seconds or less are free with credit. Instrumental samples ' +
  'between 4 and 15 seconds require a 25% royalty split to the original artist. Vocal samples ' +
  'are never licensed. No use in advertising for alcohol, tobacco, or gambling.';

// 1) original work
console.log('\n[1] register original work (A)');
let h = await cA.writeContract({ address: ADDR, functionName: 'register_work',
  args: ['Neon Rain', `${ORIGIN}/evidence/original-neon-rain.html`, LICENSE_A], value: 0n });
await wait(cA, h, 'register Neon Rain');
const works0 = await cA.readContract({ address: ADDR, functionName: 'list_works', args: [] });
const work0 = (works0 || []).find((w) => (w.title || '').startsWith('Neon Rain'))?.id ?? '0';

// 2) B clears a 12s-loop remix against it
console.log('\n[2] B submits + adjudicates a remix of Neon Rain');
h = await cB.writeContract({ address: ADDR, functionName: 'submit_claim',
  args: [String(work0), `${ORIGIN}/evidence/remix-modified.html`,
    'Long Exposure loops a 12-second instrumental section of Neon Rain (0:48-1:00). Instrumental only, credited. I propose a 5% split.', 500], value: DEPOSIT });
await wait(cB, h, 'submit claimB');
const feed1 = await cA.readContract({ address: ADDR, functionName: 'list_claims', args: [] });
const claimB = feed1[0].id;
h = await cA.writeContract({ address: ADDR, functionName: 'adjudicate', args: [String(claimB)], value: 0n });
await wait(cA, h, 'adjudicate claimB');
let cb = await cA.readContract({ address: ADDR, functionName: 'get_claim', args: [String(claimB)] });
console.log('  claimB verdict:', cb.status, 'split', cb.final_split_bps);

// 3) B promotes the cleared remix into a derivative work
console.log('\n[3] B registers the remix as a derivative work');
h = await cB.writeContract({ address: ADDR, functionName: 'register_derivative',
  args: [String(claimB), 'Long Exposure (Neon Rain derivative)',
    'Instrumental re-use of this derivative allowed with a 30% split. Upstream terms still apply. No advertising.'], value: 0n });
await wait(cB, h, 'register_derivative');
cb = await cA.readContract({ address: ADDR, functionName: 'get_claim', args: [String(claimB)] });
const work1 = cb.derivative_work_id;
console.log('  derivative work id:', work1, '| lineage:',
  JSON.stringify(await cA.readContract({ address: ADDR, functionName: 'get_lineage', args: [String(work1)] })).slice(0, 300));

// 4) C clears a remix of the DERIVATIVE (jury must honor upstream terms)
console.log('\n[4] C submits + adjudicates a remix of the derivative');
h = await cC.writeContract({ address: ADDR, functionName: 'submit_claim',
  args: [String(work1), `${ORIGIN}/evidence/remix-approved.html`,
    'A 3-second instrumental drum loop from Long Exposure, credited. Independent release, no advertising.', 3000], value: DEPOSIT });
await wait(cC, h, 'submit claimC');
const feed2 = await cA.readContract({ address: ADDR, functionName: 'list_claims', args: [] });
const claimC = feed2[0].id;
h = await cA.writeContract({ address: ADDR, functionName: 'adjudicate', args: [String(claimC)], value: 0n });
await wait(cA, h, 'adjudicate claimC');
const cc = await cA.readContract({ address: ADDR, functionName: 'get_claim', args: [String(claimC)] });
console.log('  claimC verdict:', cc.status, 'split', cc.final_split_bps);

// 5) preview + settle claimC — royalties cascade up to A
console.log('\n[5] settlement plan + distribute (cascade)');
const plan = await cA.readContract({ address: ADDR, functionName: 'get_settlement_plan', args: [String(claimC), '200000000000000000'] });
console.log('  plan:', JSON.stringify(plan, (_, v) => typeof v === 'bigint' ? v.toString() : v));
if (cc.status === 'APPROVED' || cc.status === 'MODIFIED') {
  h = await cC.writeContract({ address: ADDR, functionName: 'distribute', args: [String(claimC)], value: 200000000000000000n });
  await wait(cC, h, 'distribute claimC (cascade)');
}
console.log('\nDONE. counts:', JSON.stringify(await cA.readContract({ address: ADDR, functionName: 'counts', args: [] }), (_, v) => typeof v === 'bigint' ? v.toString() : v));
