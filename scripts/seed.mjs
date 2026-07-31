#!/usr/bin/env node
// Seed the deployed Clearance contract with sample works so a fresh
// studionet deploy has real data on `/works` for a demo or screencast.
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

for (const w of works) {
  process.stdout.write(`  register: ${w.title.padEnd(24)} … `);
  try {
    const hash = await client.writeContract({
      address: ADDR,
      functionName: 'register_work',
      args: [w.title, w.source_url, w.license_terms],
      value: 0n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash, status: 'FINALIZED', interval: 3000, retries: 30 });
    const lr = receipt?.consensus_data?.leader_receipt?.[0];
    if (lr?.execution_result === 'SUCCESS') {
      console.log('OK', hash);
    } else {
      const stderr = lr?.genvm_result?.stderr || '';
      const last = stderr.trim().split('\n').pop() || '(unknown)';
      console.log('FAIL —', last);
    }
  } catch (e) {
    console.log('THROW —', e?.shortMessage || e?.message || e);
  }
}

const counts = await client.readContract({ address: ADDR, functionName: 'counts', args: [] });
console.log('\nFinal counts:', JSON.stringify(counts, (_, v) => typeof v === 'bigint' ? v.toString() : v));
