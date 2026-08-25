import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS } from '../lib/genlayer';
import { ClaimSummary, Counts } from '../lib/types';
import { WorkCardSkeleton } from '../components/Skeleton';
import {
  BarChart3, TrendingUp, ShieldCheck, AlertCircle, Percent, Cpu, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Clock,
} from 'lucide-react';

const STATUS_META = {
  APPROVED: { color: '#10b981', bg: 'bg-emerald-500',  icon: <CheckCircle2 className="w-4 h-4" /> },
  MODIFIED: { color: '#f59e0b', bg: 'bg-amber-500',    icon: <AlertTriangle className="w-4 h-4" /> },
  REJECTED: { color: '#f43f5e', bg: 'bg-rose-500',     icon: <XCircle className="w-4 h-4" /> },
  PENDING:  { color: '#64748b', bg: 'bg-slate-500',    icon: <Clock className="w-4 h-4" /> },
} as const;

/**
 * Protocol-wide analytics dashboard. Every number is derived from the same
 * `list_claims()` + `counts()` the rest of the app already consumes, so the
 * contract needs no new methods and the numbers can never drift from what
 * `/verdicts` displays.
 */
export const Stats: React.FC = () => {
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!CONTRACT_ADDRESS) {
      setError('VITE_CONTRACT_ADDRESS is not set for this build.');
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
      const [c, cnt] = await Promise.all([
        read('list_claims').catch(() => []),
        read('counts').catch(() => null),
      ]);
      setClaims((c as unknown as ClaimSummary[]) ?? []);
      setCounts((cnt as unknown as Counts) ?? null);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not read the contract');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const list = claims ?? [];
    const total = list.length;
    const buckets: Record<'APPROVED' | 'MODIFIED' | 'REJECTED' | 'PENDING', number> = {
      APPROVED: 0, MODIFIED: 0, REJECTED: 0, PENDING: 0,
    };
    let confSum = 0, confCount = 0, appealsSum = 0, settledCount = 0;
    let splitSumBps = 0, splitCount = 0;

    for (const c of list) {
      buckets[c.status as keyof typeof buckets] = (buckets[c.status as keyof typeof buckets] ?? 0) + 1;
      if (c.status !== 'PENDING' && c.ai_confidence > 0) {
        confSum += c.ai_confidence;
        confCount += 1;
      }
      appealsSum += c.appeals ?? 0;
      if (c.distributed) settledCount += 1;
      if (c.status === 'APPROVED' || c.status === 'MODIFIED') {
        splitSumBps += c.final_split_bps ?? 0;
        splitCount += 1;
      }
    }

    const decided = buckets.APPROVED + buckets.MODIFIED + buckets.REJECTED;
    const goodFaith = decided > 0 ? ((buckets.APPROVED + buckets.MODIFIED) / decided) * 100 : 0;
    const avgConfidence = confCount > 0 ? confSum / confCount : 0;
    const avgAppeals = total > 0 ? appealsSum / total : 0;
    const avgSplitPct = splitCount > 0 ? (splitSumBps / splitCount) / 100 : 0;

    // Split distribution buckets — 0%, 1-10%, 10-25%, 25-50%, 50%+.
    const splitBands = { '0%': 0, '0-10%': 0, '10-25%': 0, '25-50%': 0, '50%+': 0 };
    for (const c of list) {
      if (c.status !== 'APPROVED' && c.status !== 'MODIFIED') continue;
      const pct = (c.final_split_bps ?? 0) / 100;
      if (pct === 0) splitBands['0%'] += 1;
      else if (pct <= 10) splitBands['0-10%'] += 1;
      else if (pct <= 25) splitBands['10-25%'] += 1;
      else if (pct <= 50) splitBands['25-50%'] += 1;
      else splitBands['50%+'] += 1;
    }

    return {
      total, buckets, decided, goodFaith, avgConfidence, avgAppeals,
      settledCount, avgSplitPct, splitBands,
    };
  }, [claims]);

  const lockedGen = counts?.forfeited_pool ? Number(BigInt(counts.forfeited_pool)) / 1e18 : 0;
  const finalGen = counts?.forfeited_final ? Number(BigInt(counts.forfeited_final)) / 1e18 : 0;

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Protocol analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Verdict statistics</h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Aggregated live from{' '}
            <code className="text-cyan-300">list_claims()</code> +{' '}
            <code className="text-cyan-300">counts()</code>. Every number
            here traces to on-chain state — refresh to re-read.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
          aria-label="Refresh statistics from chain"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh from chain</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 text-rose-200 flex items-center gap-3 text-sm"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !claims ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <WorkCardSkeleton /><WorkCardSkeleton />
          <WorkCardSkeleton /><WorkCardSkeleton />
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              icon={<Cpu className="w-4 h-4 text-purple-400" />}
              label="Claims filed"
              value={stats.total.toString()}
              hint={`${stats.decided} decided`}
            />
            <StatTile
              icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
              label="Good-faith rate"
              value={`${stats.goodFaith.toFixed(0)}%`}
              hint="approved + modified vs decided"
              color="text-emerald-300"
            />
            <StatTile
              icon={<TrendingUp className="w-4 h-4 text-cyan-400" />}
              label="Avg AI confidence"
              value={`${stats.avgConfidence.toFixed(0)}%`}
              hint="across decided claims"
              color="text-cyan-300"
            />
            <StatTile
              icon={<Percent className="w-4 h-4 text-amber-400" />}
              label="Avg binding split"
              value={`${stats.avgSplitPct.toFixed(1)}%`}
              hint="APPROVED + MODIFIED only"
              color="text-amber-300"
            />
          </div>

          {/* Verdict distribution */}
          <section aria-labelledby="verdict-dist" className="bg-[#121422] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 id="verdict-dist" className="text-base font-bold text-white">
              Verdict distribution
            </h2>
            {stats.total === 0 ? (
              <p className="text-slate-500 text-sm">No claims filed yet.</p>
            ) : (
              <>
                {/* Horizontal stacked bar */}
                <div className="w-full h-4 rounded-full bg-slate-900 overflow-hidden flex">
                  {(['APPROVED', 'MODIFIED', 'REJECTED', 'PENDING'] as const).map((k) =>
                    stats.buckets[k] > 0 ? (
                      <div
                        key={k}
                        className={`${STATUS_META[k].bg} h-full`}
                        style={{ width: `${(stats.buckets[k] / stats.total) * 100}%` }}
                        title={`${k}: ${stats.buckets[k]}`}
                      />
                    ) : null
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  {(['APPROVED', 'MODIFIED', 'REJECTED', 'PENDING'] as const).map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ background: STATUS_META[k].color }}
                        aria-hidden="true"
                      />
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider">{k}</span>
                      <span className="ml-auto font-bold text-white">
                        {stats.buckets[k]}
                        <span className="text-slate-500 text-[10px] ml-1">
                          ({stats.total > 0 ? ((stats.buckets[k] / stats.total) * 100).toFixed(0) : 0}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Split-band distribution */}
          <section aria-labelledby="split-dist" className="bg-[#121422] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 id="split-dist" className="text-base font-bold text-white">
              Binding split distribution (APPROVED + MODIFIED)
            </h2>
            <div className="space-y-2">
              {(Object.keys(stats.splitBands) as (keyof typeof stats.splitBands)[]).map((band) => {
                const n = stats.splitBands[band];
                const denom = Object.values(stats.splitBands).reduce((a, b) => a + b, 0) || 1;
                const pct = (n / denom) * 100;
                return (
                  <div key={band} className="flex items-center gap-3 font-mono text-xs">
                    <span className="w-20 text-slate-400">{band}</span>
                    <div className="flex-1 h-2.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-slate-200">
                      {n} <span className="text-slate-500 text-[10px]">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Treasury + workflow */}
          <div className="grid sm:grid-cols-2 gap-3">
            <StatTile
              icon={<Cpu className="w-4 h-4 text-indigo-400" />}
              label="Settled claims"
              value={stats.settledCount.toString()}
              hint={`of ${stats.buckets.APPROVED + stats.buckets.MODIFIED} eligible`}
              color="text-indigo-300"
            />
            <StatTile
              icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
              label="Avg appeals per claim"
              value={stats.avgAppeals.toFixed(2)}
              hint="max 2 per claim"
              color="text-purple-300"
            />
            <StatTile
              icon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
              label="Locked forfeits"
              value={`${lockedGen.toFixed(3)} GEN`}
              hint="still appeal-eligible"
              color="text-amber-300"
            />
            <StatTile
              icon={<ShieldCheck className="w-4 h-4 text-rose-400" />}
              label="Final forfeits"
              value={`${finalGen.toFixed(3)} GEN`}
              hint="owner-sweepable"
              color="text-rose-300"
            />
          </div>

          <div className="text-center pt-2 text-[11px] text-slate-500">
            <span>
              Deep-dive per address at{' '}
              <Link to="/leaderboard" className="text-cyan-400 underline">Leaderboard</Link>
              {' · '}
              raw feed at{' '}
              <Link to="/verdicts" className="text-cyan-400 underline">Verdicts</Link>.
            </span>
          </div>
        </>
      )}
    </div>
  );
};

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  color?: string;
}> = ({ icon, label, value, hint, color = 'text-white' }) => (
  <div className="bg-[#121422] border border-slate-800 rounded-2xl p-4 space-y-1">
    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
      {icon}
      <span>{label}</span>
    </div>
    <div className={`text-2xl font-extrabold font-mono ${color}`}>{value}</div>
    {hint && <div className="text-[10px] text-slate-500">{hint}</div>}
  </div>
);

export default Stats;
