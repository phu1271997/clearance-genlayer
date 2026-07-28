import React from 'react';
import { useWallet } from '../context/WalletContext';
import { Wallet, LogOut, AlertCircle, RefreshCw } from 'lucide-react';

export const ConnectWallet: React.FC = () => {
  const { address, isConnected, isConnecting, error, connect, disconnect } = useWallet();

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="flex flex-col items-end">
      {isConnected && address ? (
        <div className="flex items-center gap-2 bg-[#171926] border border-slate-700/60 rounded-xl px-3 py-1.5 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="font-mono text-xs text-slate-200 font-medium">
            {truncateAddress(address)}
          </span>
          <button
            onClick={disconnect}
            className="text-slate-400 hover:text-rose-400 transition-colors ml-1 p-1 rounded-md"
            title="Disconnect"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98] disabled:opacity-50"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </>
          )}
        </button>
      )}

      {error && (
        <div className="text-xs text-rose-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
