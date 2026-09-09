import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS } from '../lib/genlayer';
import { LineageNode } from '../lib/types';
import { GitBranch, ChevronRight } from 'lucide-react';

/**
 * v3.0.0 — renders a work's derivative chain (get_lineage), root first. A
 * single-node chain (an original work) renders nothing. Each hop shows the
 * upstream royalty share that cascades to the ancestor on settlement.
 */
export const Lineage: React.FC<{ workId: string }> = ({ workId }) => {
  const [chain, setChain] = useState<LineageNode[] | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!CONTRACT_ADDRESS || !workId) return;
      try {
        const client = makeClient();
        const res = (await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'get_lineage',
          args: [workId],
        })) as unknown as LineageNode[];
        if (live) setChain(Array.isArray(res) ? res : []);
      } catch {
        if (live) setChain([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [workId]);

  if (!chain || chain.length < 2) return null; // original work: nothing to show

  return (
    <div className="bg-[#121422] border border-slate-800 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
          Derivative Lineage
        </span>
        <span className="ml-auto text-[10px] text-slate-500">royalties cascade to every level</span>
      </div>

      <div className="flex items-center flex-wrap gap-1.5">
        {chain.map((node, i) => (
          <React.Fragment key={node.id}>
            {i > 0 && (
              <span className="inline-flex items-center text-[10px] text-slate-500">
                <ChevronRight className="w-3 h-3" />
                <span className="text-cyan-300 font-mono">
                  {(node.upstream_split_bps / 100).toFixed(0)}% up
                </span>
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
            <Link
              to={`/works/${node.id}`}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                i === chain.length - 1
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                  : 'bg-[#0b0c13] border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
              title={node.is_derivative ? 'Derivative work' : 'Original work'}
            >
              {node.is_derivative ? '' : '◆ '}
              {node.title || `Work #${node.id}`}
            </Link>
          </React.Fragment>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        The leftmost is the original work. Each arrow is the upstream royalty
        share that flows one hop back on every settlement of the rightmost track.
      </p>
    </div>
  );
};
