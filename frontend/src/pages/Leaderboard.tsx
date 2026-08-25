import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS } from '../lib/genlayer';
import { ClaimSummary } from '../lib/types';
import { WorkCardSkeleton } from '../components/Skeleton';
import { CopyButton } from '../components/CopyButton';
import {
  Trophy, Music, Disc, User, Percent, RefreshCw, AlertCircle, Award,
} from 'lucide-react';

interface WorkRow { id: string; artist: string; title: string; }

interface ArtistRow {
  address: string;
  worksCount: number;
  claimsAgainst: number;
  approvedAgainst: number;
}
interface RemixerRow {
  address: string;
  submitted: number;
  approved: number;
  modified: number;
  rejected: number;
  goodFaithRate: number;
  settled: number;
}

const TOP_N = 10;

/**
 * Client-side leaderboard. Aggregated from `list_works()` + `list_claims()` so
 * it works against any Clearance deploy without a subgraph. The contract does
 * not need a leaderboard method — the raw feed is enough to build one.
 */
export const Leaderboard: React.FC = () => {
  const [works, setWorks] = useState<WorkRow[] | null>(null);
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!CONTRACT_ADDRESS) {
      setLoadError('VITE_CONTRACT_ADDRESS is not set for this build.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const client = makeClient();
      const read = (fn: string) =>
        client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: fn,
          args: [],
        });
      const [w, c] = await Promise.all([
        read('list_works'),
        read('list_claims').catch(() => []),
      ]);
      setWorks((w as unknown as WorkRow[]) ?? []);
      setClaims((c as unknown as ClaimSummary[]) ?? []);
      setLoadError(null);
    } catch (err: any) {
      console.error('Leaderboard load failed:', err);
      setLoadError(err?.message || 'Could not read the contract');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { topArtists, topRemixers, totalDecided } = useMemo(() => {
    const artistWorks = new Map<string, number>();
    const workOwner  = new Map<string, string>();
    for (const w of works ?? []) {
      const a = (w.artist || '').toLowerCase();
      artistWorks.set(a, (artistWorks.get(a) ?? 0) + 1);
      workOwner.set(w.id, a);
    }

    const remixerAgg = new Map<string, RemixerRow>();
    const artistIncoming = new Map<string, { total: number; approved: number }>();

    for (const c of claims ?? []) {
      const r = (c.remixer || '').toLowerCase();
      const row = remixerAgg.get(r) ?? {
        address: r,
        submitted: 0, approved: 0, modified: 0, rejected: 0,
        goodFaithRate: 0, settled: 0,
      };
      row.submitted += 1;
      if (c.status === 'APPROVED') row.approved += 1;
      else if (c.status === 'MODIFIED') row.modified += 1;
      else if (c.status === 'REJECTED') row.rejected += 1;
      if (c.distributed) row.settled += 1;
      remixerAgg.set(r, row);

      // Incoming pressure on the artist that owns this work
      const owner = workOwner.get(c.work_id);
      if (owner) {
        const cur = artistIncoming.get(owner) ?? { total: 0, approved: 0 };
        cur.total += 1;
        if (c.status === 'APPROVED' || c.status === 'MODIFIED') cur.approved += 1;
        artistIncoming.set(owner, cur);
      }
    }

    for (const row of remixerAgg.values()) {
      const decided = row.approved + row.modified + row.rejected;
      row.goodFaithRate = decided > 0 ? ((row.approved + row.modified) / decided) * 100 : 0;
    }

    const artistRows: ArtistRow[] = Array.from(artistWorks.entries()).map(([addr, cnt]) => {
      const inc = artistIncoming.get(addr) ?? { total: 0, approved: 0 };
      return {
        address: addr,
        worksCount: cnt,
        claimsAgainst: inc.total,
        approvedAgainst: inc.approved,
      };
    });

    artistRows.sort((a, b) =>
      b.worksCount - a.worksCount ||
      b.approvedAgainst - a.approvedAgainst ||
      b.claimsAgainst - a.claimsAgainst
    );

    const remixerRows = Array.from(remixerAgg.values());
    remixerRows.sort((a, b) => {
      // Rank by (good-faith rate) desc, then by decided count desc
      const aDecided = a.approved + a.modified + a.rejected;
      const bDecided = b.approved + b.modified + b.rejected;
      if (aDecided === 0 && bDecided > 0) return 1;
      if (bDecided === 0 && aDecided > 0) return -1;
      return b.goodFaithRate - a.goodFaithRate || bDecided - aDecided;
    });

    const totalDecided = (claims ?? []).filter((c) => c.status !== 'PENDING').length;

    return {
      topArtists: artistRows.slice(0, TOP_N),
      topRemixers: remixerRows.slice(0, TOP_N),
      totalDecided,
    };
  }, [works, claims]);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <Trophy className="w-4 h-4" />
            <span>Client-side leaderboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Top artists and remixers</h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Aggregated on your machine from{' '}
            <code className="text-cyan-300">list_works()</code> +{' '}
            <code className="text-cyan-300">list_claims()</code>. No wallet needed to read.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
          aria-label="Refresh leaderboard from chain"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh from chain</span>
        </button>
      </div>

      {loadError && (
        <div
          role="alert"
          className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 text-rose-200 flex items-center gap-3 text-sm"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-[#121422] border border-slate-800 rounded-2xl p-4">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Registered works
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">
            {works?.length ?? 0}
          </div>
        </div>
        <div className="bg-[#121422] border border-slate-800 rounded-2xl p-4">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Claims filed
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono mt-1">
            {claims?.length ?? 0}
          </div>
        </div>
        <div className="bg-[#121422] border border-slate-800 rounded-2xl p-4">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Verdicts recorded
          </div>
          <div className="text-2xl font-extrabold text-purple-300 font-mono mt-1">
            {totalDecided}
          </div>
        </div>
      </div>

      <section aria-labelledby="artists-heading" className="space-y-3">
        <h2 id="artists-heading" className="text-base font-bold text-white flex items-center gap-2">
          <Music className="w-4 h-4 text-purple-400" />
          <span>Top artists — by works registered</span>
        </h2>
        {loading && !works ? (
          <div className="space-y-3">
            <WorkCardSkeleton /><WorkCardSkeleton />
          </div>
        ) : topArtists.length === 0 ? (
          <div className="bg-[#121422] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No works registered on this deploy yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 text-left">
                  <th className="p-2">#</th>
                  <th className="p-2">Artist</th>
                  <th className="p-2 text-right">Works</th>
                  <th className="p-2 text-right">Claims incoming</th>
                  <th className="p-2 text-right">Approved / mod</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {topArtists.map((a, i) => (
                  <tr key={a.address} className="border-t border-slate-800">
                    <td className="p-2 text-slate-400">{i + 1}</td>
                    <td className="p-2 text-slate-100 flex items-center gap-2">
                      <span className="truncate max-w-[16ch]" title={a.address}>{a.address}</span>
                      <CopyButton value={a.address} />
                    </td>
                    <td className="p-2 text-right font-bold text-white">{a.worksCount}</td>
                    <td className="p-2 text-right text-cyan-300">{a.claimsAgainst}</td>
                    <td className="p-2 text-right text-emerald-300">{a.approvedAgainst}</td>
                    <td className="p-2 text-right">
                      <Link
                        to={`/reputation/${a.address}`}
                        className="text-xs text-purple-400 hover:text-purple-300 underline"
                      >
                        reputation →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="remixers-heading" className="space-y-3">
        <h2 id="remixers-heading" className="text-base font-bold text-white flex items-center gap-2">
          <Disc className="w-4 h-4 text-cyan-400" />
          <span>Top remixers — by good-faith rate</span>
        </h2>
        <p className="text-[11px] text-slate-500">
          Good-faith rate = (APPROVED + MODIFIED) / decided verdicts. Remixers
          with zero decided claims are shown last.
        </p>
        {loading && !claims ? (
          <div className="space-y-3">
            <WorkCardSkeleton /><WorkCardSkeleton />
          </div>
        ) : topRemixers.length === 0 ? (
          <div className="bg-[#121422] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No claims filed yet — no remixers to rank.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 text-left">
                  <th className="p-2">#</th>
                  <th className="p-2">Remixer</th>
                  <th className="p-2 text-right">Submitted</th>
                  <th className="p-2 text-right">A / M / R</th>
                  <th className="p-2 text-right">Settled</th>
                  <th className="p-2 text-right">Good-faith</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {topRemixers.map((r, i) => (
                  <tr key={r.address} className="border-t border-slate-800">
                    <td className="p-2 text-slate-400">{i + 1}</td>
                    <td className="p-2 text-slate-100 flex items-center gap-2">
                      <span className="truncate max-w-[16ch]" title={r.address}>{r.address}</span>
                      <CopyButton value={r.address} />
                    </td>
                    <td className="p-2 text-right text-white">{r.submitted}</td>
                    <td className="p-2 text-right">
                      <span className="text-emerald-300">{r.approved}</span>
                      <span className="text-slate-600"> / </span>
                      <span className="text-amber-300">{r.modified}</span>
                      <span className="text-slate-600"> / </span>
                      <span className="text-rose-300">{r.rejected}</span>
                    </td>
                    <td className="p-2 text-right text-slate-200">{r.settled}</td>
                    <td className="p-2 text-right">
                      <span className="inline-flex items-center gap-1 text-cyan-300 font-bold">
                        {r.goodFaithRate.toFixed(0)}
                        <Percent className="w-3 h-3" />
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <Link
                        to={`/reputation/${r.address}`}
                        className="text-xs text-purple-400 hover:text-purple-300 underline"
                      >
                        reputation →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="text-center pt-2 text-[11px] text-slate-500">
        <Award className="w-4 h-4 inline text-amber-400 mr-1" />
        <span>
          Client-side aggregation. For per-address deep dive use{' '}
          <Link to="/reputation" className="text-cyan-400 underline">
            <User className="w-3 h-3 inline" /> Reputation
          </Link>
          .
        </span>
      </div>
    </div>
  );
};

export default Leaderboard;
