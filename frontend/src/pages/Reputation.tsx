import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS, EXPLORER_URL } from '../lib/genlayer';
import { useWallet } from '../context/WalletContext';
import { Reputation as ReputationT, ClaimSummary } from '../lib/types';
import { CopyButton } from '../components/CopyButton';
import {
  Award, Search, ArrowLeft, RefreshCw, ExternalLink, User, TrendingUp,
  ShieldCheck, XCircle, AlertTriangle, Music, Disc,
} from 'lucide-react';

interface WorkRow { id: string; artist: string; title: string; }

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40',
  MODIFIED: 'text-amber-300 bg-amber-950/60 border-amber-500/40',
  REJECTED: 'text-rose-300 bg-rose-950/60 border-rose-500/40',
  PENDING:  'text-slate-300 bg-slate-800/60 border-slate-600/40',
};

// Reputation tiers derived from on-chain counters. Purely display —
// contract exposes raw counts, tier logic lives here so it can evolve
// without a redeploy.
function tierFor(rep: ReputationT): { label: string; color: string; icon: React.ReactNode } {
  const total = (rep.approved || 0) + (rep.modified || 0) + (rep.rejected || 0);
  const good = (rep.approved || 0) + (rep.modified || 0);
  if (total === 0)                       return { label: 'Newcomer',   color: 'text-slate-400',  icon: <User className="w-4 h-4" /> };
  if (good >= 10 && rep.rejected === 0)  return { label: 'Trusted',    color: 'text-emerald-400', icon: <ShieldCheck className="w-4 h-4" /> };
  if (good >= 5 && good / total >= 0.9)  return { label: 'Reliable',   color: 'text-cyan-400',    icon: <TrendingUp className="w-4 h-4" /> };
  if (rep.rejected >= 3 && rep.rejected / total >= 0.5) return { label: 'Contested', color: 'text-rose-400', icon: <XCircle className="w-4 h-4" /> };
  return { label: 'Active', color: 'text-amber-400', icon: <Award className="w-4 h-4" /> };
}

export const Reputation: React.FC = () => {
  const { address: paramAddr } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { address: myAddr, isConnected } = useWallet();

  const targetAddr = (paramAddr || myAddr || '').toLowerCase();
  const [inputAddr, setInputAddr] = useState<string>(paramAddr || myAddr || '');
  const [rep, setRep] = useState<ReputationT | null>(null);
  const [works, setWorks] = useState<WorkRow[]>([]);
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRep = useCallback(async (addr: string) => {
    if (!addr || !CONTRACT_ADDRESS) return;
    setLoading(true);
    setError(null);
    try {
      const client = makeClient();
      const call = (fn: string, args: any[] = []) =>
        client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: fn,
          args,
        });
      const [r, w, feed] = await Promise.all([
        call('get_reputation', [addr]) as unknown as Promise<ReputationT>,
        call('list_works_by_artist', [addr]).catch(() => []) as unknown as Promise<WorkRow[]>,
        call('list_claims').catch(() => []) as unknown as Promise<ClaimSummary[]>,
      ]);
      setRep(r);
      setWorks(Array.isArray(w) ? w : []);
      // Only claims filed by this remixer, newest first (list_claims already newest first)
      const mine = (Array.isArray(feed) ? feed : []).filter(
        (c) => (c.remixer || '').toLowerCase() === addr.toLowerCase(),
      );
      setClaims(mine);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch reputation');
      setRep(null);
      setWorks([]);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (targetAddr) fetchRep(targetAddr);
  }, [targetAddr, fetchRep]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAddr.startsWith('0x') || inputAddr.length !== 42) {
      setError('Address must be a 42-char 0x-prefixed hex string');
      return;
    }
    navigate(`/reputation/${inputAddr.toLowerCase()}`);
  };

  const tier = rep ? tierFor(rep) : null;
  const total = rep ? (rep.approved || 0) + (rep.modified || 0) + (rep.rejected || 0) : 0;
  const goodRate = total > 0 ? (((rep!.approved || 0) + (rep!.modified || 0)) / total) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2.5">
          <Award className="w-7 h-7 text-amber-400" />
          <span>On-Chain Reputation</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Read <code className="text-cyan-300">get_reputation(address)</code> for any wallet — approved / modified / rejected claim tallies, live from studionet.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={inputAddr}
            onChange={(e) => setInputAddr(e.target.value)}
            placeholder="0x…"
            className="w-full bg-[#0b0c13] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500"
          />
        </div>
        <button
          type="submit"
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-amber-600/20"
        >
          Look up
        </button>
        {isConnected && myAddr && (
          <button
            type="button"
            onClick={() => { setInputAddr(myAddr); navigate(`/reputation/${myAddr.toLowerCase()}`); }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs"
          >
            My address
          </button>
        )}
      </form>

      {loading && (
        <div className="py-16 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
        </div>
      )}

      {error && (
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 text-rose-200 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {rep && !loading && (
        <>
          <div className="bg-[#121422] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Wallet</div>
                <div className="font-mono text-sm text-slate-100 break-all">{rep.address}</div>
              </div>
              {tier && (
                <div className={`flex items-center gap-2 bg-slate-900/70 border border-slate-800 px-3 py-2 rounded-xl ${tier.color}`}>
                  {tier.icon}
                  <span className="font-extrabold uppercase text-sm tracking-wider">{tier.label}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono">
              <div className="bg-[#0b0c13] border border-emerald-500/20 rounded-xl p-4">
                <div className="text-[10px] uppercase text-emerald-400 font-semibold">Approved</div>
                <div className="text-3xl font-extrabold text-emerald-300 mt-1">{rep.approved || 0}</div>
              </div>
              <div className="bg-[#0b0c13] border border-amber-500/20 rounded-xl p-4">
                <div className="text-[10px] uppercase text-amber-400 font-semibold">Modified</div>
                <div className="text-3xl font-extrabold text-amber-300 mt-1">{rep.modified || 0}</div>
              </div>
              <div className="bg-[#0b0c13] border border-rose-500/20 rounded-xl p-4">
                <div className="text-[10px] uppercase text-rose-400 font-semibold">Rejected</div>
                <div className="text-3xl font-extrabold text-rose-300 mt-1">{rep.rejected || 0}</div>
              </div>
            </div>

            {total > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Good-faith rate</span>
                  <span className="text-white font-bold">{goodRate.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    style={{ width: `${goodRate}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <a
              href={`${EXPLORER_URL}/address/${rep.address}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
            >
              View on Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
            <Link to="/works" className="text-purple-400 hover:text-purple-300">
              Browse works →
            </Link>
            <CopyButton value={rep.address} label="copy" />
          </div>

          {/* Works registered by this address (artist side) */}
          <section aria-labelledby="works-heading" className="space-y-3">
            <h2 id="works-heading" className="text-sm font-bold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-400" />
              <span>Works registered ({works.length})</span>
            </h2>
            {works.length === 0 ? (
              <p className="text-slate-500 text-xs italic">
                This address has not registered any works.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {works.map((w) => (
                  <Link
                    key={w.id}
                    to={`/works/${w.id}`}
                    className="bg-[#121422] border border-slate-800 hover:border-purple-500/40 rounded-xl p-3 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-slate-500">Work #{w.id}</div>
                      <div className="text-sm font-semibold text-white truncate">{w.title}</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Claims filed by this address (remixer side) */}
          <section aria-labelledby="claims-heading" className="space-y-3">
            <h2 id="claims-heading" className="text-sm font-bold text-white flex items-center gap-2">
              <Disc className="w-4 h-4 text-cyan-400" />
              <span>Claims filed ({claims.length})</span>
            </h2>
            {claims.length === 0 ? (
              <p className="text-slate-500 text-xs italic">
                This address has not filed any remix claims yet.
              </p>
            ) : (
              <div className="space-y-2">
                {claims.slice(0, 20).map((c) => (
                  <Link
                    key={c.id}
                    to={`/claim/${c.id}`}
                    className="block bg-[#121422] border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLE[c.status] || STATUS_STYLE.PENDING}`}>
                        {c.status}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        Claim #{c.id}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        on <strong className="text-slate-200">{c.work_title || `Work #${c.work_id}`}</strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500">Proposed: </span>
                        <span className="text-slate-200">{(c.proposed_split_bps / 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Binding: </span>
                        <span className="text-cyan-300">{(c.final_split_bps / 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Confidence: </span>
                        <span className="text-purple-300">{c.ai_confidence}%</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {claims.length > 20 && (
                  <p className="text-[11px] text-slate-500 text-center pt-1">
                    Showing 20 most recent of {claims.length}.
                  </p>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {!rep && !loading && !error && targetAddr && (
        <div className="bg-[#121422] border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-sm">
          No reputation record yet — this wallet has never had an adjudicated claim.
        </div>
      )}
    </div>
  );
};

export default Reputation;
