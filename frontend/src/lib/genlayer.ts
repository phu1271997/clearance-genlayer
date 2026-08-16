import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '') as string;

if (!CONTRACT_ADDRESS) {
  console.warn(
    '[Clearance] VITE_CONTRACT_ADDRESS is empty — the app will not be able to read/write the contract.',
  );
}

export function makeClient(userAddress?: `0x${string}`) {
  return createClient({
    chain: studionet,
    ...(userAddress ? { account: userAddress } : {}),
  });
}

export const CHAIN = studionet;

// studionet's block explorer. The older `genlayer-explorer.vercel.app` host
// this repo used through v1.1.1 now answers 503 on every path, so every
// "view on explorer" link in the app was dead. `explorer-studio.genlayer.com`
// is the live one — a nonsense path there 404s while /address/<addr> renders,
// which is how we confirmed the routing is real and not an SPA catch-all.
export const EXPLORER_URL = 'https://explorer-studio.genlayer.com';

/**
 * Wait for a submitted write tx to finalize and surface the on-chain execution
 * result. Throws a rich Error carrying the traceback from the leader receipt
 * when execution_result !== 'SUCCESS' — so the UI can show WHY a tx reverted
 * instead of silently polling an empty state.
 */
export async function awaitTxFinalized(
  client: any,
  hash: `0x${string}`,
): Promise<any> {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: 'FINALIZED',
    interval: 3000,
    retries: 60,
  });

  const lr = receipt?.consensus_data?.leader_receipt?.[0];
  const execResult = lr?.execution_result || receipt?.txExecutionResultName;

  if (execResult && execResult !== 'SUCCESS') {
    let msg = `On-chain execution ${execResult}`;
    const stderr: string | undefined = lr?.genvm_result?.stderr;
    if (stderr) {
      // Extract the last exception line — that's the useful part
      const lines = stderr.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      msg += `: ${lastLine}`;
    } else if (lr?.error) {
      msg += `: ${lr.error}`;
    }
    const err = new Error(msg);
    (err as any).receipt = receipt;
    (err as any).stderr = stderr;
    throw err;
  }
  return receipt;
}
