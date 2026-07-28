import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS } from '../lib/genlayer';
import { Work } from '../lib/types';
import { Disc, Globe, FileText, PlusCircle, ArrowLeft, RefreshCw, ExternalLink, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const WorkDetail: React.FC = () => {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();

  const [work, setWork] = useState<Work | null>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkAndClaims = async () => {
    if (!workId || !CONTRACT_ADDRESS) return;
    setLoading(true);
    setError(null);
    try {
      const client = makeClient();
      const w = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_work',
        args: [workId],
      }) as unknown as Work;

      setWork(w);

      const cList = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'list_claims_for_work',
        args: [workId],
      }) as unknown as any[];

      setClaims(cList || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to load work details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkAndClaims();
  }, [workId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded text-[11px] font-bold"><CheckCircle2 className="w-3 h-3" /> APPROVED</span>;
      case 'MODIFIED':
        return <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded text-[11px] font-bold"><AlertTriangle className="w-3 h-3" /> MODIFIED</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 rounded text-[11px] font-bold"><XCircle className="w-3 h-3" /> REJECTED</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded text-[11px] font-bold"><Clock className="w-3 h-3 animate-spin" /> PENDING</span>;
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
        <p className="text-slate-400 text-sm">Loading work details from studionet...</p>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-6 text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Work Not Found</h2>
          <p className="text-slate-300 text-sm">{error || `Work #${workId} does not exist.`}</p>
          <button
            onClick={() => navigate('/works')}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/works')}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to catalog</span>
        </button>

        <Link
          to={`/claim/new/${work.id}`}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-cyan-600/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Submit Remix Claim</span>
        </Link>
      </div>

      {/* Work Specification Card */}
      <div className="bg-[#121422] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold">
                Work #{work.id}
              </span>
              {work.created_at > 0 && (
                <span className="text-[11px] text-slate-500 font-mono">
                  Registered: {new Date(Number(work.created_at) * 1000).toLocaleDateString()}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">{work.title}</h1>
          </div>

          <a
            href={work.source_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-[#0b0c13] hover:bg-[#161826] border border-slate-700/80 px-4 py-2.5 rounded-xl text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors shrink-0"
          >
            <Globe className="w-4 h-4" />
            <span>Open Source Audio URL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Rights Holder / Artist Address</span>
            <div className="font-mono text-xs text-slate-200 bg-[#0b0c13] border border-slate-800 p-3 rounded-xl truncate">
              {work.artist}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>Natural Language License Terms</span>
          </span>
          <div className="bg-[#0b0c13] border border-slate-800 p-5 rounded-2xl text-slate-200 text-sm leading-relaxed font-sans">
            {work.license_terms}
          </div>
        </div>
      </div>

      {/* Claims Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Disc className="w-5 h-5 text-cyan-400" />
            <span>Remix Claims for this Work ({claims.length})</span>
          </h2>
        </div>

        {claims.length === 0 ? (
          <div className="bg-[#121422] border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <p className="text-slate-400 text-xs">No remix claims submitted for this work yet.</p>
            <Link
              to={`/claim/new/${work.id}`}
              className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-xl text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit First Claim</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((c) => (
              <div
                key={c.id}
                className="bg-[#121422] border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-300">Claim #{c.id}</span>
                    {getStatusBadge(c.status)}
                  </div>
                  <div className="font-mono text-xs text-slate-400">
                    Remixer: {c.remixer.substring(0, 8)}...{c.remixer.substring(c.remixer.length - 6)}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase">Proposed Split</div>
                    <div className="font-mono text-xs font-bold text-slate-300">{(c.proposed_split_bps / 100).toFixed(2)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-purple-400 uppercase">Final Split</div>
                    <div className="font-mono text-sm font-extrabold text-cyan-300">{(c.final_split_bps / 100).toFixed(2)}%</div>
                  </div>
                  <Link
                    to={`/claim/${c.id}`}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
                  >
                    View Verdict →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
