import React from 'react';
import { Claim } from '../lib/types';
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, AlertCircle, ExternalLink,
  ShieldCheck, Share2,
} from 'lucide-react';
import { EXPLORER_URL } from '../lib/genlayer';

const LIVE_ORIGIN = 'https://clearance-genlayer-red.vercel.app';

interface VerdictCardProps {
  claim: Claim;
  txHash?: string;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({ claim, txHash }) => {
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          label: 'APPROVED',
          desc: 'Remix declaration complies fully with original work terms.'
        };
      case 'MODIFIED':
        return {
          bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          label: 'MODIFIED',
          desc: 'Compliant use, but royalty split adjusted by AI jury to enforce natural language terms.'
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          label: 'REJECTED',
          desc: 'Claim rejected by AI jury due to term violation or declaration discrepancy.'
        };
      case 'PENDING':
        return {
          bg: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
          icon: <Clock className="w-5 h-5 text-cyan-400 animate-spin" />,
          label: 'PENDING ADJUDICATION',
          desc: 'Claim submitted. Awaiting AI validator consensus.'
        };
      default:
        return {
          bg: 'bg-purple-950/80 border-purple-500/50 text-purple-300',
          icon: <AlertCircle className="w-5 h-5 text-purple-400" />,
          label: status,
          desc: 'Adjudication completed with system status.'
        };
    }
  };

  const style = getBadgeStyle(claim.status);
  const splitPct = (claim.final_split_bps / 100).toFixed(2);
  const proposedPct = (claim.proposed_split_bps / 100).toFixed(2);

  // Pre-composed share URLs — the claim page URL is stable and public.
  const claimUrl = `${LIVE_ORIGIN}/claim/${claim.id}`;
  const shareText =
    claim.status === 'PENDING'
      ? `Claim #${claim.id} is pending an on-chain AI verdict on GenLayer Clearance.`
      : `Claim #${claim.id} → ${claim.status} @ ${splitPct}% split, ${claim.ai_confidence}% confidence. Adjudicated on-chain by the GenLayer AI jury.`;
  const twitterHref =
    'https://twitter.com/intent/tweet?' +
    new URLSearchParams({ text: shareText, url: claimUrl }).toString();
  const farcasterHref =
    'https://warpcast.com/~/compose?' +
    new URLSearchParams({ text: `${shareText} ${claimUrl}` }).toString();

  return (
    <div className={`border rounded-2xl p-6 shadow-2xl backdrop-blur-xl ${style.bg} transition-all`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-inner">
            {style.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-white">
                {style.label}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-900/80 text-slate-300 border border-slate-700">
                Claim #{claim.id}
              </span>
              {(claim as any).contest_outcome === 'ARTIST_WON' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                  ARTIST CONTEST UPHELD
                </span>
              )}
              {(claim as any).contest_outcome === 'REMIXER_WON' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800/80 text-slate-300 border border-slate-600/40">
                  CONTEST REJECTED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{style.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/70 px-4 py-2 rounded-xl border border-slate-700/50">
          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Proposed Split</div>
            <div className="font-mono font-bold text-sm text-slate-300">{proposedPct}%</div>
          </div>
          <div className="w-px h-8 bg-slate-700"></div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold text-purple-400">Final Split</div>
            <div className="font-mono font-extrabold text-base text-cyan-300">{splitPct}%</div>
          </div>
        </div>
      </div>

      {/* PROMINENT REASON FIELD */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>On-Chain AI Jury Verdict & Explanation</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 font-mono text-sm leading-relaxed text-slate-200 shadow-inner">
          {claim.reason ? (
            <p className="whitespace-pre-wrap">{claim.reason}</p>
          ) : (
            <p className="text-slate-500 italic">No verdict reasoning recorded yet. Trigger adjudication to invoke GenLayer AI consensus.</p>
          )}
        </div>
      </div>

      {txHash && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Transaction Hash:</span>
          <a
            href={`${EXPLORER_URL}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline"
          >
            {txHash.substring(0, 14)}...{txHash.substring(txHash.length - 6)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {claim.status !== 'PENDING' && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
            <Share2 className="w-3.5 h-3.5" />
            <span>Share this verdict</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={twitterHref}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/60 text-slate-100 hover:border-cyan-500/60 hover:text-cyan-300 transition-colors"
              aria-label="Share on X"
            >
              Share on X
            </a>
            <a
              href={farcasterHref}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/60 text-slate-100 hover:border-purple-500/60 hover:text-purple-300 transition-colors"
              aria-label="Share on Farcaster"
            >
              Share on Farcaster
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
