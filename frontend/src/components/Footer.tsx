import React from 'react';
import { ExternalLink, ShieldAlert, Cpu } from 'lucide-react';
import { CONTRACT_ADDRESS, EXPLORER_URL } from '../lib/genlayer';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#07080d] py-8 mt-20 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
          <span className="font-semibold text-slate-300">CLEARANCE</span>
          <span>— On-Chain AI Royalty Clearance & Adjudication</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-slate-400 font-mono">
          {CONTRACT_ADDRESS ? (
            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Contract: {CONTRACT_ADDRESS.substring(0, 8)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-amber-400/80 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Contract address pending deployment</span>
            </span>
          )}

          <a
            href="https://portal.genlayer.foundation/#/builders/contributions"
            target="_blank"
            rel="noreferrer"
            className="hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <span>GenLayer Builder Program</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </footer>
  );
};
