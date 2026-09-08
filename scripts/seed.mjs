#!/usr/bin/env node
// Seed the deployed Clearance contract with sample works so a fresh
// studionet deploy has real data on `/works` for a demo or screencast.
//
// v1.3.0 — also files three sample claims against the Neon Rain work so
// the public `/verdicts` feed is not empty on a fresh deploy. Skip claim
// seeding with `SEED_CLAIMS=0`.
//
// Usage from repo root:
//   cd frontend
//   VITE_CONTRACT_ADDRESS=0x... node ../scripts/seed.mjs
//   # or:
//   CLEARANCE_ADDR=0x... CLEARANCE_PRIVATE_KEY=0x... node ../scripts/seed.mjs
//
// If CLEARANCE_PRIVATE_KEY is omitted a fresh key is generated. The
// address needs GEN on studionet — top up from the Studio Accounts panel
// before running.

import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ADDR = process.env.CLEARANCE_ADDR || process.env.VITE_CONTRACT_ADDRESS;
if (!ADDR) {
  console.error('Set CLEARANCE_ADDR (or VITE_CONTRACT_ADDRESS) to the deployed contract address.');
  process.exit(2);
}

const PK = process.env.CLEARANCE_PRIVATE_KEY;
const account = createAccount(PK || generatePrivateKey());
const client = createClient({ chain: studionet, account });
if (!PK) {
  console.log('No CLEARANCE_PRIVATE_KEY provided — generated a fresh key.');
  console.log('  address    :', account.address);
  console.log('  → fund it with GEN via the Studio Accounts panel, then re-run.');
}

const bal = BigInt(await client.request({ method: 'eth_getBalance', params: [account.address, 'latest'] }));
console.log('Signer balance :', (Number(bal) / 1e18).toFixed(4), 'GEN');
if (bal === 0n) {
  console.error('Address has 0 GEN on studionet. Fund it and retry.');
  process.exit(3);
}

// Load canonical presets from docs/samples/works.json
const here = dirname(fileURLToPath(import.meta.url));
const samplesPath = join(here, '..', 'docs', 'samples', 'works.json');
const { works } = JSON.parse(await readFile(samplesPath, 'utf8'));
console.log(`Loaded ${works.length} presets from ${samplesPath}`);

async function waitAndReport(hash, prefix) {
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash, status: 'FINALIZED', interval: 3000, retries: 30,
    });
    const lr = receipt?.consensus_data?.leader_receipt?.[0];
    if (lr?.execution_result === 'SUCCESS') {
      console.log(prefix, 'OK', hash);
      return { ok: true, receipt };
    }
    const stderr = lr?.genvm_result?.stderr || '';
    const last = stderr.trim().split('\n').pop() || '(unknown)';
    console.log(prefix, 'FAIL —', last);
    return { ok: false };
  } catch (e) {
    console.log(prefix, 'THROW —', e?.shortMessage || e?.message || e);
    return { ok: false };
  }
}

// Register every work in the presets file.
for (const w of works) {
  process.stdout.write(`  register: ${w.title.padEnd(24)} … `);
  try {
    const hash = await client.writeContract({
      address: ADDR,
      functionName: 'register_work',
      args: [w.title, w.source_url, w.license_terms],
      value: 0n,
    });
    await waitAndReport(hash, '');
  } catch (e) {
    console.log('THROW —', e?.shortMessage || e?.message || e);
  }
}

// Locate the Neon Rain work id (its 3 shipped claim presets pair with it).
let neonRainId = null;
if ((process.env.SEED_CLAIMS ?? '1') !== '0') {
  const listed = await client.readContract({ address: ADDR, functionName: 'list_works', args: [] });
  const neon = Array.isArray(listed)
    ? listed.find((w) => (w?.title || '').startsWith('Neon Rain'))
    : null;
  neonRainId = neon?.id ?? null;
}

// Ready-made claims mirroring frontend/src/data/sampleWorks.ts::SAMPLE_CLAIMS.
const CLAIMS = neonRainId ? [
  {
    label: 'APPROVED — 3s instrumental loop, credited',
    remix_url: 'https://clearance-genlayer-red.vercel.app/evidence/remix-approved.html',
    declaration:
      'Halogen uses a 3-second instrumental drum loop from Neon Rain (0:52-0:55). Percussion only, no vocal material. Mira Solvang and the track title are credited in the description. Independent release, not used in any advertisement.',
    proposed_split_bps: 0,
  },
  {
    label: 'MODIFIED — 12s loop, split proposed too low',
    remix_url: 'https://clearance-genlayer-red.vercel.app/evidence/remix-modified.html',
    declaration:
      'Long Exposure loops a 12-second instrumental section of Neon Rain (0:48-1:00) through the whole track. Instrumental only, no vocals. Mira Solvang is credited. I propose a 5% royalty split.',
    proposed_split_bps: 500,
  },
  {
    label: 'REJECTED — vocal hook in an alcohol ad',
    remix_url: 'https://clearance-genlayer-red.vercel.app/evidence/remix-rejected.html',
    declaration:
      'Hold The Line is a 58-second cut for the Vodka Nord advertising campaign built on the sampled vocal hook from Neon Rain, roughly 22 seconds of the original in total. I propose a 40% royalty split.',
    proposed_split_bps: 4000,
  },
] : [];

const CLAIM_DEPOSIT = 10_000_000_000_000_000n; // 0.01 GEN

if (CLAIMS.length) {
  console.log(`\nSeeding ${CLAIMS.length} sample claims against work #${neonRainId} (Neon Rain).`);
  for (const c of CLAIMS) {
    process.stdout.write(`  claim   : ${c.label.padEnd(48)} … `);
    try {
      const hash = await client.writeContract({
        address: ADDR,
        functionName: 'submit_claim',
        args: [String(neonRainId), c.remix_url, c.declaration, c.proposed_split_bps],
        value: CLAIM_DEPOSIT,
      });
      await waitAndReport(hash, '');
    } catch (e) {
      console.log('THROW —', e?.shortMessage || e?.message || e);
    }
  }
  console.log('\nAdjudicate them from the app or run `adjudicate(claim_id)` directly.');
} else if ((process.env.SEED_CLAIMS ?? '1') !== '0') {
  console.log('\nSkipped claim seeding — Neon Rain not found in list_works().');
}

const counts = await client.readContract({ address: ADDR, functionName: 'counts', args: [] });
console.log('\nFinal counts:', JSON.stringify(counts, (_, v) => typeof v === 'bigint' ? v.toString() : v));
