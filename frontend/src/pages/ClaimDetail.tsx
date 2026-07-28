import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS } from '../lib/genlayer';
import { Claim, Work } from '../lib/types';
import { useWallet } from '../context/WalletContext';
import { VerdictCard } from '../components/VerdictCard';
import { PendingBanner } from '../components/PendingBanner';
import { Cpu, Scale, Coins, ArrowLeft, RefreshCw, ExternalLink, Globe, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const ClaimDetail: React.FC = () => {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const { address, isConnected, connect } = useWallet();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isAdjudicating, setIsAdjudicating] = useState<boolean>(false);
  const [isDistributing, setIsDistributing] = useState<boolean>(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | undefined>(undefined);
  const [distributeAmount, setDistributeAmount] = useState<string>('0.1'); // 0.1 GEN
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchClaimAndWork = useCallback(async () => {
    if (!claimId || !CONTRACT_ADDRESS) return;
    try {
      const client = makeClient();
      const c = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_claim',
        args: [claimId],
      }) as unknown as Claim;

      setClaim(c);

      if (c && c.work_id) {
        const w = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'get_work',
          args: [c.work_id],
        }) as unknown as Work;
        setWork(w);
      }
    } catch (err: any) {
      console.error('Error fetching claim details:', err);
      setFetchError(err?.message || 'Failed to load claim');
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchClaimAndWork();
  }, [fetchClaimAndWork]);

  // Handle Adjudicate action
  const handleAdjudicate = async () => {
    if (!isConnected || !address) {
      await connect();
      return;
    }
    if (!CONTRACT_ADDRESS || !claimId) return;

    setIsAdjudicating(true);
    setActionError(null);
    setSuccessMsg(null);
    setPendingTxHash(undefined);

    try {
      const client = makeClient(address);
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'adjudicate',
        args: [claimId],
        value: BigInt(0),
      });

      if (typeof txHash === 'string') {
        setPendingTxHash(txHash);
      }

      // Poll contract state until status moves away from PENDING or up to 60s
      const startTime = Date.now();
      while (Date.now() - startTime < 60000) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const updated = await client.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: 'get_claim',
            args: [claimId],
          }) as unknown as Claim;

          if (updated && updated.status !== 'PENDING') {
            setClaim(updated);
            setSuccessMsg(`Adjudication finalized with verdict: ${updated.status}!`);
            break;
          }
        } catch (e) {
          console.warn('Polling adjudication status...', e);
        }
      }
      await fetchClaimAndWork();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.message || 'Adjudication execution failed');
    } finally {
      setIsAdjudicating(false);
    }
  };

  // Handle Distribute action
  const handleDistribute = async () => {
    if (!isConnected || !address) {
      await connect();
      return;
    }
    if (!CONTRACT_ADDRESS || !claimId) return;

    const valNum = parseFloat(distributeAmount);
    if (isNaN(valNum) || valNum <= 0) {
      setActionError('Enter a valid GEN amount to distribute');
      return;
    }

    setIsDistributing(true);
    setActionError(null);
    setSuccessMsg(null);
    setPendingTxHash(undefined);

    try {
      const client = makeClient(address);
      // Convert GEN to wei (18 decimals)
      const weiVal = BigInt(Math.floor(valNum * 1e18));

      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'distribute',
        args: [claimId],
        value: weiVal,
      });

      if (typeof txHash === 'string') {
        setPendingTxHash(txHash);
      }

      // Poll state for distribution flag
      const startTime = Date.now();
      while (Date.now() - startTime < 30000) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const updated = await client.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: 'get_claim',
            args: [claimId],
          }) as unknown as Claim;
          if (updated && updated.distributed) {
            setClaim(updated);
            setSuccessMsg('Royalties successfully distributed on-chain!');
            break;
          }
        } catch (e) {
          console.warn('Polling distribution status...', e);
        }
      }
      await fetchClaimAndWork();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.message || 'Distribution failed');
    } finally {
      setIsDistributing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
        <p className="text-slate-400 text-sm font-medium">Fetching on-chain claim &amp; verdict data...</p>
      </div>
    );
  }

  if (fetchError || !claim) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Claim Not Found</h2>
          <p className="text-slate-300 text-sm">{fetchError || `Claim #${claimId} does not exist on studionet.`}</p>
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
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to catalog</span>
        </button>

        <button
          onClick={() => fetchClaimAndWork()}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh State</span>
        </button>
      </div>

      {(isAdjudicating || isDistributing) && <PendingBanner txHash={pendingTxHash} />}

      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-4 text-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {actionError && (
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-sm font-medium">{actionError}</span>
        </div>
      )}

      {/* Primary Verdict Card */}
      <VerdictCard claim={claim} txHash={pendingTxHash} />

      {/* Claim & Work Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Original Work Context */}
        <div className="bg-[#121422] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>Original Work Context</span>
            </span>
            {work && (
              <Link to={`/works/${work.id}`} className="text-xs text-cyan-400 hover:underline">
                Work #{work.id} →
              </Link>
            )}
          </div>

          {work ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500">Title</div>
                <div className="font-bold text-white text-base">{work.title}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500">Artist Address</div>
                <div className="font-mono text-xs text-slate-300 truncate">{work.artist}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500">Source Page</div>
                <a
                  href={work.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono truncate"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {work.source_url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <div className="text-[10px] uppercase font-semibold text-purple-400">License Terms (Natural Language)</div>
                <div className="bg-[#0b0c13] border border-slate-800 p-3 rounded-xl text-xs text-slate-300 font-sans leading-relaxed mt-1">
                  {work.license_terms}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-xs italic">Work details loading...</p>
          )}
        </div>

        {/* Remix Claim Details */}
        <div className="bg-[#121422] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <span>Remix Submission</span>
            </span>
            <span className="font-mono text-xs text-slate-400">Claim #{claim.id}</span>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Remixer Address</div>
              <div className="font-mono text-xs text-slate-300 truncate">{claim.remixer}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Remix Track URL</div>
              <a
                href={claim.remix_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono truncate"
              >
                <Globe className="w-3.5 h-3.5" />
                {claim.remix_url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Remixer Declaration</div>
              <div className="bg-[#0b0c13] border border-slate-800 p-3 rounded-xl text-xs text-slate-300 font-sans leading-relaxed mt-1">
                {claim.declaration}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <div className="bg-[#0b0c13] p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Escrow Deposit</div>
                <div className="font-bold text-slate-200">
                  {(Number(claim.deposit) / 1e18).toFixed(4)} GEN
                </div>
              </div>
              <div className="bg-[#0b0c13] p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Distributed</div>
                <div className={`font-bold ${claim.distributed ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {claim.distributed ? 'YES' : 'NO'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-[#121422] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-purple-400" />
          <span>Interactive On-Chain Actions</span>
        </h3>

        {claim.status === 'PENDING' && (
          <div className="space-y-3 bg-[#0b0c13] border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-300 leading-relaxed">
              This claim is currently <strong>PENDING ADJUDICATION</strong>. Triggering adjudication will invoke GenLayer&apos;s on-chain AI validators to fetch web evidence, cross-reference natural language terms, and write the binding verdict.
            </div>
            <button
              onClick={handleAdjudicate}
              disabled={isAdjudicating}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAdjudicating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Jury Adjudicating on Studionet...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>Adjudicate Claim via AI Jury</span>
                </>
              )}
            </button>
          </div>
        )}

        {(claim.status === 'APPROVED' || claim.status === 'MODIFIED') && !claim.distributed && (
          <div className="space-y-4 bg-[#0b0c13] border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-300 leading-relaxed">
              This claim has been <strong className="text-emerald-400">{claim.status}</strong> with a final royalty split of <strong className="text-cyan-300">{(claim.final_split_bps / 100).toFixed(2)}%</strong>. Distribute revenue on-chain to send funds to original artist &amp; remixer (including deposit refund).
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-48">
                <Coins className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={distributeAmount}
                  onChange={(e) => setDistributeAmount(e.target.value)}
                  placeholder="0.1"
                  className="w-full bg-[#121422] border border-slate-700/80 rounded-xl pl-9 pr-12 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">GEN</span>
              </div>

              <button
                onClick={handleDistribute}
                disabled={isDistributing}
                className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDistributing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Distributing Royalties...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>Distribute Revenue &amp; Refund Deposit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {claim.distributed && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Royalties have already been distributed on-chain.</span>
          </div>
        )}

        {claim.status === 'REJECTED' && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-4 text-rose-300 text-xs space-y-1">
            <div className="font-bold uppercase tracking-wider">Claim Rejected by AI Jury</div>
            <p className="text-slate-300">
              Because this claim was REJECTED, no royalty distribution is allowed and the 0.01 GEN deposit remains in contract escrow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
