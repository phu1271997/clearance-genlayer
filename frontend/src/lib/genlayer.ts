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
    ...(userAddress ? { account: userAddress } : {}) 
  });
}

export const CHAIN = studionet;
export const EXPLORER_URL = 'https://genlayer-explorer.vercel.app';
