import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS } from '../lib/genlayer';
import { Precedent } from '../lib/types';
import { Landmark, Scale } from 'lucide-react';

const STATUS_TONE: Record<string, string> = {
  APPROVED: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/30',
  MODIFIED: 'text-amber-300 border-amber-500/40 bg-amber-950/30',
  REJECTED: 'text-rose-300 border-rose-500/40 bg-rose-950/30',
};

/**
 * v2.0.0 — renders the on-chain case law for a work: every decided claim the
 * AI jury now reads as precedent before ruling on a new one. `excludeId` hides
 * the claim currently being viewed so the panel shows only *other* rulings.
 */
export const Precedents: React.FC<{ workId: string; excludeId?: string }> = ({ workId, excludeId }) => {
  const [rows, setRows] = useState<Precedent[] | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!CONTRACT_ADDRESS || !workId) return;
      try {
        const client = makeClient();
        const res = (await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'get_precedents',
          args: [workId],
        })) as unknown as Precedent[];
        if (live) setRows(Array.isArray(res) ? res : []);
      } catch {
        // Older contract build without get_precedents — hide the panel.
        if (live) setRows([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [workId]);

  if (!rows) return null;
  const visible = rows.filter((r) => r.id !== excludeId);
  if (visible.length === 0) return null;

  return (
    <div className="bg-[#121422] border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Landmark className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
          On-Chain Case Law for this Work
        </span>
        <span className="ml-auto text-[10px] text-slate-500">
          {visible.length} prior ruling{visible.length === 1 ? '' : 's'} the jury weighs
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Before ruling, the AI jury reads the work&apos;s decided history and is
        instructed to stay consistent with it or explain the difference. This is
        how a pile of one-off verdicts becomes self-referential precedent — a
        property a deterministic contract cannot produce.
      </p>

      <div className="space-y-2">
        {visible.map((p) => (
          <Link
            key={p.id}
            to={`/claim/${p.id}`}
            className="block bg-[#0b0c13] border border-slate-800 hover:border-slate-600 rounded-xl p-3 transition-colors"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-slate-400">Claim #{p.id}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_TONE[p.status] || 'text-slate-300 border-slate-700'}`}>
                {p.status}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300">
                <Scale className="w-3 h-3" />
                {(p.final_split_bps / 100).toFixed(2)}% to artist
              </span>
              {p.appeals > 0 && (
                <span className="text-[10px] text-amber-300/90">{p.appeals} appeal{p.appeals === 1 ? '' : 's'}</span>
              )}
              {p.contest_outcome === 'ARTIST_WON' && (
                <span className="text-[10px] text-purple-300">artist won a contest</span>
              )}
              {p.contest_outcome === 'REMIXER_WON' && (
                <span className="text-[10px] text-slate-400">contest failed</span>
              )}
            </div>
            {p.reason && (
              <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{p.reason}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};
