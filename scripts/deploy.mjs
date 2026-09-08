#!/usr/bin/env node
// Deploy contracts/clearance.py to GenLayer studionet, unattended.
//
// Reads the deployer key from the environment (the central keystore):
//   source ~/.genlayer/env.sh          # exports GENLAYER_PRIVATE_KEY
//   node scripts/deploy.mjs            # run from the repo root or frontend/
//
// genlayer-js must resolve — run from a directory where it is installed
// (the frontend/ workspace) or with NODE_PATH pointing at it. Prints the new
// contract address and verifies the schema is readable before exiting.

import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACT = join(__dirname, '..', 'contracts', 'clearance.py');

let pk = process.env.GENLAYER_PRIVATE_KEY || process.env.CLEARANCE_PRIVATE_KEY;
if (!pk) {
  console.error('Set GENLAYER_PRIVATE_KEY (source ~/.genlayer/env.sh).');
  process.exit(2);
}
if (!pk.startsWith('0x')) pk = '0x' + pk;

const account = createAccount(pk);
const client = createClient({ chain: studionet, account });

const bal = BigInt(await client.request({ method: 'eth_getBalance', params: [account.address, 'latest'] }));
console.log('deployer :', account.address);
console.log('balance  :', Number(bal) / 1e18, 'GEN');
if (bal === 0n) {
  console.error('Deployer has no GEN on studionet — fund it from the Studio Accounts panel.');
  process.exit(1);
}

const code = await readFile(CONTRACT, 'utf8');
console.log('deploying:', CONTRACT, `(${code.length} bytes)`);

const txHash = await client.deployContract({ code, args: [] });
console.log('deploy tx:', txHash);

const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: 'FINALIZED', interval: 4000, retries: 90 });
const addr =
  receipt?.data?.contract_address ||
  receipt?.contract_address ||
  receipt?.consensus_data?.leader_receipt?.[0]?.contract_address;

const lr = receipt?.consensus_data?.leader_receipt?.[0];
const exec = lr?.execution_result || receipt?.txExecutionResultName;
console.log('exec     :', exec);
if (exec && exec !== 'SUCCESS') {
  console.error('Deploy did not SUCCEED:', lr?.genvm_result?.stderr || exec);
  process.exit(1);
}
if (!addr) {
  console.error('Could not read the deployed address from the receipt. Full receipt keys:', Object.keys(receipt || {}));
  console.error(JSON.stringify(receipt, null, 2).slice(0, 2000));
  process.exit(1);
}
console.log('\nCONTRACT_ADDRESS=' + addr);

// Verify the schema is readable — an ERROR here means the contract is not live.
try {
  const schema = await client.request({ method: 'gen_getContractSchema', params: [addr] });
  const methods = schema?.methods ? Object.keys(schema.methods) : (schema ? Object.keys(schema) : []);
  console.log('schema OK, top-level keys:', methods.slice(0, 40).join(', '));
} catch (e) {
  console.warn('Schema read warning:', e.message);
}
