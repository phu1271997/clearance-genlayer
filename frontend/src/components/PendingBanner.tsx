import React from 'react';
import { Cpu, Loader2 } from 'lucide-react';

interface PendingBannerProps {
  message?: string;
  txHash?: string;
}

export const PendingBanner: React.FC<PendingBannerProps> = ({ message, txHash }) => {
  return (
    <div className="bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-purple-950/80 border border-purple-500/40 rounded-2xl p-4 shadow-xl shadow-purple-950/50 backdrop-blur-md text-purple-100 my-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-900/60 border border-purple-500/50 rounded-xl text-purple-300 shrink-0 mt-0.5">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <h4 className="font-semibold text-sm text-purple-200 uppercase tracking-wider">
              On-Chain AI Adjudication In Progress
            </h4>
          </div>
          <p className="text-xs text-purple-200/90 leading-relaxed font-medium">
            {message || (
              <>
                <strong>Waiting for AI consensus on studionet…</strong> non-deterministic transactions are slower than regular ones because a jury of validators must agree.
              </>
            )}
          </p>
          {txHash && (
            <div className="pt-1">
              <a
                href={`https://genlayer-explorer.vercel.app/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-mono inline-flex items-center gap-1"
              >
                View Transaction on Explorer ({txHash.substring(0, 10)}...) →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
