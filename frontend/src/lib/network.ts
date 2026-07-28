import { studionet } from 'genlayer-js/chains';

const CHAIN_ID_HEX = '0x' + studionet.id.toString(16);

export async function ensureStudionet(): Promise<void> {
  if (!('ethereum' in window)) throw new Error('MetaMask not detected');
  const eth = (window as any).ethereum;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    if (err?.code === 4902 || err?.code === -32603) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: 'GenLayer Studio Network',
          nativeCurrency: { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
          rpcUrls: ['https://studio.genlayer.com/api'],
          blockExplorerUrls: ['https://genlayer-explorer.vercel.app'],
        }],
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(): Promise<`0x${string}`> {
  if (!('ethereum' in window)) throw new Error('MetaMask not detected');
  const eth = (window as any).ethereum;
  const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
  if (!accounts?.length) throw new Error('No account selected');
  await ensureStudionet();
  return accounts[0] as `0x${string}`;
}
