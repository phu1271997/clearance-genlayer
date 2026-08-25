import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS, EXPLORER_URL, awaitTxFinalized } from '../lib/genlayer';
import { ClaimSummary, ClaimStatus, Counts } from '../lib/types';
import { useWallet } from '../context/WalletContext';
import { WorkCardSkeleton } from '../components/Skeleton';
import { CopyButton } from '../components/CopyButton';
import {
  Gavel, RefreshCw, ExternalLink, AlertCircle, ShieldCheck,
  CheckCircle2, Coins, Globe, Lock, Search, Filter,
} from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300',
  MODIFIED: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
  REJECTED: 'bg-rose-950/60 border-rose-500/40 text-rose-300',
  PENDING: 'bg-slate-800/60 border-slate-600/40 text-slate-300',
};

type StatusFilter = 'ALL' | ClaimStatus;
const STATUS_FILTERS: StatusFilter[] = ['ALL', 'APPROVED', 'MODIFIED', 'REJECTED', 'PENDING'];

/**
 * Public verdict feed. Deliberately wallet-free: a first-time visitor (or a
 * reviewer in an incognito window) must be able to see real adjudicated
 * evidence before being asked to connect or spend anything.
 */
export const Verdicts: React.FC = () => {
  const { address, isConnected, connect } = useWallet();

  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepMsg, setSweepMsg] = useState<string | null>(null);
  const [sweepErr, setSweepErr] = useState<string | null>(null);

  // URL-driven filter + search — every filtered view is shareable by copying the
  // address bar. On load, seed from ?status= and ?q=.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = (searchParams.get('status') || 'ALL').toUpperCase();
  const statusFilter: StatusFilter = (STATUS_FILTERS as string[]).includes(rawStatus)
    ? (rawStatus as StatusFilter)
    : 'ALL';
  const searchQuery = (searchParams.get('q') || '').trim();

  const setStatus = (s: StatusFilter) => {
    const next = new URLSearchParams(searchParams);
    if (s === 'ALL') next.delete('status');
    else next.set('status', s);
    setSearchParams(next, { replace: true });
  };
  const setQuery = (q: string) => {
    const next = new URLSearchParams(searchParams);
    if (!q) next.delete('q');
    else next.set('q', q);
    setSearchParams(next, { replace: true });
  };

  /**
   * Rebuild the feed one claim at a time.
   *
   * `list_claims` and `get_owner` only exist from contract v1.2.0. A build
   * pointed at an older address — or at one Studio has since reset — would
   * otherwise show nothing but an error, so fall back to walking claim ids
   * backwards from `counts()`.
   */
  const loadFeedPerClaim = async (client: any, total: number): Promise<ClaimSummary[]> => {
    const rows: ClaimSummary[] = [];
    for (let i = total - 1; i >= 0 && rows.length < 40; i--) {
      try {
        const c: any = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'get_claim',
          args: [String(i)],
        });
        let title = '';
        try {
          const w: any = await client.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: 'get_work',
            args: [String(c.work_id)],
          });
          title = w?.title ?? '';
        } catch {
          /* work missing — the row is still worth showing */
        }
        rows.push({ ...c, work_title: title, reason: (c.reason || '').slice(0, 280) });
      } catch {
        /* id gap — keep walking */
      }
    }
    return rows;
  };

  const load = useCallback(async () => {
    if (!CONTRACT_ADDRESS) {
      setLoadError('VITE_CONTRACT_ADDRESS is not set for this build.');
      return;
    }
    try {
      const client = makeClient();
      const read = (functionName: string, args: any[] = []) =>
        client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args });

      const cnt = (await read('counts')) as unknown as Counts;
      setCounts(cnt);

      const own = await read('get_owner').catch(() => null);
      setOwner(own ? String(own).toLowerCase() : null);

      let rows = (await read('list_claims').catch(() => null)) as ClaimSummary[] | null;
      if (!rows) rows = await loadFeedPerClaim(client, Number(cnt?.claims ?? 0));

      setClaims(rows);
      setLoadError(null);
    } catch (err: any) {
      console.error('Failed to load verdict feed:', err);
      setLoadError(err?.message || 'Could not read the contract');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = !!(address && owner && address.toLowerCase() === owner);
  const sweepable = counts?.forfeited_final ? BigInt(counts.forfeited_final) : 0n;
  const locked = counts?.forfeited_pool ? BigInt(counts.forfeited_pool) : 0n;

  const handleSweep = async () => {
    if (!isConnected || !address) {
      await connect();
      return;
    }
    setIsSweeping(true);
    setSweepErr(null);
    setSweepMsg(null);
    try {
      const client = makeClient(address);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'sweep_forfeited',
        args: [address],
        value: BigInt(0),
      });
      await awaitTxFinalized(client, hash as `0x${string}`);
      setSweepMsg(`Swept ${(Number(sweepable) / 1e18).toFixed(4)} GEN to ${address}.`);
      await load();
    } catch (err: any) {
      console.error(err);
      setSweepErr(err?.message || 'Sweep failed');
    } finally {
      setIsSweeping(false);
    }
  };

  const decided = (claims ?? []).filter((c) => c.status !== 'PENDING');

  const filteredClaims = useMemo(() => {
    const list = claims ?? [];
    const q = searchQuery.toLowerCase();
    return list.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        c.id, c.work_id, c.work_title, c.remixer, c.remix_url, c.reason,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [claims, statusFilter, searchQuery]);

  const statusCount = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      ALL: 0, APPROVED: 0, MODIFIED: 0, REJECTED: 0, PENDING: 0,
    };
    for (const c of claims ?? []) {
      base.ALL += 1;
      base[c.status as StatusFilter] = (base[c.status as StatusFilter] || 0) + 1;
    }
    return base;
  }, [claims]);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            <Gavel className="w-4 h-4" />
            <span>Public verdict feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">On-chain adjudications</h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Every verdict below was produced by GenLayer validator consensus and written to
            studionet — not by this website. No wallet needed to read them.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh from chain</span>
        </button>
      </div>

      {loadError && (
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 text-rose-200 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Treasury — the two forfeit buckets are genuinely different money */}
      {counts && (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-[#121422] border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Verdicts recorded</div>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">{decided.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">of {counts.claims} claims filed</div>
          </div>
          <div className="bg-[#121422] border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked forfeits
            </div>
            <div className="text-2xl font-extrabold text-amber-300 font-mono mt-1">
              {(Number(locked) / 1e18).toFixed(3)}
              <span className="text-xs text-slate-500 ml-1">GEN</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">still appeal-eligible — not sweepable</div>
          </div>
          <div className="bg-[#121422] border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Final forfeits</div>
            <div className="text-2xl font-extrabold text-rose-300 font-mono mt-1">
              {(Number(sweepable) / 1e18).toFixed(3)}
              <span className="text-xs text-slate-500 ml-1">GEN</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">appeals exhausted — owner-sweepable</div>
          </div>
        </div>
      )}

      {/* Owner-only treasury action */}
      {isOwner && (
        <div className="bg-[#0e101a] border border-indigo-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-200 text-sm font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Contract owner — treasury</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            <code>sweep_forfeited()</code> withdraws only the <strong>final</strong> bucket.
            Deposits from claims that can still be appealed stay locked, so a successful appeal
            always has funds to refund.
          </p>
          {sweepMsg && (
            <div className="text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {sweepMsg}
            </div>
          )}
          {sweepErr && (
            <div className="text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {sweepErr}
            </div>
          )}
          <button
            onClick={handleSweep}
            disabled={isSweeping || sweepable <= 0n}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all"
          >
            {isSweeping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            <span>
              {sweepable > 0n
                ? `Sweep ${(Number(sweepable) / 1e18).toFixed(4)} GEN to my wallet`
                : 'Nothing final to sweep yet'}
            </span>
          </button>
        </div>
      )}

      {/* Filter + search bar — URL-driven so /verdicts?status=REJECTED&q=vodka is shareable */}
      {claims && claims.length > 0 && (
        <div className="bg-[#0e101a] border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={statusFilter === s}
                onClick={() => setStatus(s)}
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                  statusFilter === s
                    ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
                <span className="ml-1.5 text-[10px] opacity-70 font-mono">
                  {statusCount[s] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search claim id, work title, remixer, remix URL, or rationale…"
              className="w-full bg-[#0b0c13] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              aria-label="Search verdicts"
            />
          </div>
          {(statusFilter !== 'ALL' || searchQuery) && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>
                {filteredClaims.length} of {claims.length} claim{claims.length === 1 ? '' : 's'} match.
              </span>
              <button
                onClick={() => { setStatus('ALL'); setQuery(''); }}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Feed */}
      {claims === null && !loadError ? (
        <div className="space-y-4"><WorkCardSkeleton /><WorkCardSkeleton /><WorkCardSkeleton /></div>
      ) : claims && claims.length === 0 ? (
        <div className="bg-[#121422] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <Gavel className="w-10 h-10 text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">No claims filed yet</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Register a work, then submit a remix claim against it to see the AI jury run.
          </p>
          <Link
            to="/works"
            className="inline-block bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            Browse the catalog
          </Link>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="bg-[#121422] border border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <Search className="w-8 h-8 text-slate-600 mx-auto" />
          <h2 className="text-base font-bold text-white">No verdicts match this filter</h2>
          <p className="text-slate-400 text-xs">
            Try a broader status or clear the search query.
          </p>
          <button
            onClick={() => { setStatus('ALL'); setQuery(''); }}
            className="text-cyan-400 hover:text-cyan-300 text-xs underline"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((c) => (
            <Link
              key={c.id}
              to={`/claim/${c.id}`}
              className="block bg-[#121422] border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 space-y-3 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${STATUS_STYLE[c.status] || STATUS_STYLE.PENDING}`}>
                    {c.status}
                  </span>
                  <span className="font-mono text-xs text-slate-500">Claim #{c.id}</span>
                  {c.appeals > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-indigo-500/40 bg-indigo-950/60 text-indigo-300">
                      {c.appeals} appeal{c.appeals > 1 ? 's' : ''}
                    </span>
                  )}
                  {c.distributed && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/60 text-emerald-300">
                      settled
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  on <strong className="text-slate-200">{c.work_title || `Work #${c.work_id}`}</strong>
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="bg-[#0b0c13] border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-500 uppercase">Proposed split</div>
                  <div className="font-bold text-slate-200">{(c.proposed_split_bps / 100).toFixed(2)}%</div>
                </div>
                <div className="bg-[#0b0c13] border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-500 uppercase">Binding split</div>
                  <div className="font-bold text-cyan-300">{(c.final_split_bps / 100).toFixed(2)}%</div>
                </div>
                <div className="bg-[#0b0c13] border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-500 uppercase">Jury confidence</div>
                  <div className="font-bold text-purple-300">{c.ai_confidence}%</div>
                </div>
              </div>

              {c.reason && (
                <p className="text-xs text-slate-300 leading-relaxed bg-[#0b0c13] border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-purple-400 block mb-1">
                    Jury rationale (on-chain)
                  </span>
                  {c.reason}
                  {c.reason.length >= 280 && <span className="text-slate-500"> …</span>}
                </p>
              )}

              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 truncate">
                  <Globe className="w-3 h-3 shrink-0" />
                  <span className="font-mono truncate">{c.remix_url}</span>
                </span>
                <span className="inline-flex items-center gap-1 shrink-0 text-cyan-500">
                  Open claim <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {CONTRACT_ADDRESS && (
        <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 flex-wrap">
          <span>Reading contract</span>
          <a
            href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-cyan-500 hover:underline"
          >
            {CONTRACT_ADDRESS}
          </a>
          <CopyButton value={CONTRACT_ADDRESS} label="copy" />
          <span>on studionet.</span>
        </p>
      )}
    </div>
  );
};
