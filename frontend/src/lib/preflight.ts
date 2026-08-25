import { makeClient } from './genlayer';

/**
 * Read the connected wallet's studionet balance in wei.
 * Returns 0n on any error so callers can present a friendly "cannot check"
 * message rather than a stack trace.
 */
export async function getBalanceWei(address: `0x${string}`): Promise<bigint> {
  try {
    const client = makeClient();
    const raw = await (client as any).request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    return BigInt(raw);
  } catch (err) {
    console.warn('[preflight] balance read failed:', err);
    return 0n;
  }
}

/** Rough GEN-gas headroom to keep on top of `value` for the outer tx. */
export const GAS_HEADROOM_WEI = BigInt('2000000000000000'); // 0.002 GEN

/**
 * Check the connected wallet holds at least `value + GAS_HEADROOM_WEI` on
 * studionet. Returns a friendly message on failure or `null` when the check
 * passed. Intentionally *warn-only* — the on-chain guard is the source of
 * truth; this exists so users are told the reason before MetaMask opens.
 */
export async function preflightSubmit(
  address: `0x${string}`,
  requiredValueWei: bigint,
  label: string,
): Promise<string | null> {
  const balance = await getBalanceWei(address);
  if (balance === 0n) {
    return (
      `Wallet ${address.slice(0, 6)}…${address.slice(-4)} has 0 GEN on studionet. ` +
      `Top it up from the Studio Accounts panel — the testnet faucet funds a different chain.`
    );
  }
  const needed = requiredValueWei + GAS_HEADROOM_WEI;
  if (balance < needed) {
    const have = (Number(balance) / 1e18).toFixed(4);
    const want = (Number(needed) / 1e18).toFixed(4);
    return (
      `Insufficient GEN for ${label}: wallet has ${have} GEN, ` +
      `needs at least ${want} GEN (value + gas headroom). ` +
      `Top up from the Studio Accounts panel and try again.`
    );
  }
  return null;
}

/**
 * Map an on-chain revert / RPC error to a friendlier one-liner. The contract
 * raises `gl.vm.UserError("insufficient deposit (min 0.01 GEN)")`; the raw
 * frontend surface for that used to be a wall of stderr. This decoder catches
 * the substrings the contract actually uses and rewrites them.
 */
const REVERT_MAP: { match: RegExp; friendly: (m: RegExpMatchArray) => string }[] = [
  { match: /insufficient deposit/i,          friendly: () => 'Deposit is below the 0.01 GEN minimum. Increase the amount and retry.' },
  { match: /settlement amount below minimum/i, friendly: () => 'Settlement is below the 0.10 GEN floor. Enter at least 0.10 GEN.' },
  { match: /artist share rounds to zero/i,   friendly: () => 'Settlement is so small the artist share would be 0 wei. Increase the amount.' },
  { match: /only the remixer may distribute/i, friendly: () => 'Only the remixer wallet can settle this claim. Switch MetaMask to the remixer address.' },
  { match: /only the remixer may appeal/i,   friendly: () => 'Only the remixer wallet can appeal this claim. Switch MetaMask to the remixer address.' },
  { match: /insufficient appeal stake/i,     friendly: () => 'Appeal stake below 2× the original deposit. The frontend should compute this — refresh the page.' },
  { match: /already distributed/i,           friendly: () => 'This claim has already been settled on-chain.' },
  { match: /already adjudicated/i,           friendly: () => 'This claim already has a verdict. Use Appeal to force a re-adjudication.' },
  { match: /max appeals reached/i,           friendly: () => 'This claim has used all its appeals. The verdict is final.' },
  { match: /cannot appeal claim in status/i, friendly: () => 'Only REJECTED and MODIFIED claims may be appealed.' },
  { match: /license_terms too short|declaration too short/i, friendly: () => 'Text is too short — describe the actual license or usage in more detail.' },
  { match: /license_terms too long|declaration too long/i,   friendly: () => 'Text is too long (max 4000 characters).' },
  { match: /reserved token/i,                friendly: () => 'Your text contains a reserved security token. Remove it and retry.' },
  { match: /source_url must be an http|remix_url must be an http/i, friendly: () => 'URLs must start with http:// or https://.' },
  { match: /out of range/i,                  friendly: () => 'Royalty split must be between 0 and 10000 basis points (0% – 100%).' },
  { match: /nothing to sweep/i,              friendly: () => 'No sweepable forfeits — appeal-eligible money is still locked.' },
  { match: /only owner/i,                    friendly: () => 'Only the contract owner may call this method.' },
  { match: /insufficient funds/i,            friendly: () => 'Your wallet does not have enough GEN on studionet to cover value + gas. Top up from the Studio Accounts panel.' },
];

export function decodeRevert(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err)) || 'Unknown error';
  for (const rule of REVERT_MAP) {
    const m = raw.match(rule.match);
    if (m) return rule.friendly(m);
  }
  // Strip the noisiest wrappers so the raw message is at least readable.
  return raw
    .replace(/^Error:\s*/i, '')
    .replace(/^On-chain execution [A-Z_]+: */i, '')
    .slice(0, 320);
}
