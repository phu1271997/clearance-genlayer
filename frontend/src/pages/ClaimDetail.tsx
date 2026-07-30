import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS, awaitTxFinalized } from '../lib/genlayer';
import { Claim, Work } from '../lib/types';
import { useWallet } from '../context/WalletContext';
import { VerdictCard } from '../components/VerdictCard';
import { PendingBanner } from '../components/PendingBanner';
import { Cpu, Scale, Coins, ArrowLeft, RefreshCw, ExternalLink, Globe, FileText, CheckCircle2, AlertCircle, ShieldAlert, Gavel } from 'lucide-react';

const SETTLEMENT_MIN_GEN_FALLBACK = 0.1;
const APPEAL_STAKE_MULTIPLIER_FALLBACK = 2;
const MAX_APPEALS_FALLBACK = 2;

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
  const [isAppealing, setIsAppealing] = useState<boolean>(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | undefined>(undefined);
  const [distributeAmount, setDistributeAmount] = useState<string>('0.1'); // 0.1 GEN
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [settlementMinGen, setSettlementMinGen] = useState<number>(SETTLEMENT_MIN_GEN_FALLBACK);
  const [appealMultiplier, setAppealMultiplier] = useState<number>(APPEAL_STAKE_MULTIPLIER_FALLBACK);
  const [maxAppeals, setMaxAppeals] = useState<number>(MAX_APPEALS_FALLBACK);

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

  const fetchConfig = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;
    try {
      const client = makeClient();
      const cfg = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_config',
        args: [],
      }) as any;
      if (cfg?.settlement_min) {
        setSettlementMinGen(Number(BigInt(cfg.settlement_min)) / 1e18);
      }
      if (cfg?.appeal_stake_multiplier) setAppealMultiplier(Number(cfg.appeal_stake_multiplier));
      if (cfg?.max_appeals) setMaxAppeals(Number(cfg.max_appeals));
    } catch (e) {
      // Older contract w/o get_config — keep fallbacks
    }
  }, []);

  useEffect(() => {
    fetchClaimAndWork();
    fetchConfig();
  }, [fetchClaimAndWork, fetchConfig]);

  const isRemixer = !!(address && claim && address.toLowerCase() === claim.remixer.toLowerCase());

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

      if (typeof txHash === 'string') setPendingTxHash(txHash);

      await awaitTxFinalized(client, txHash as `0x${string}`);

      const updated = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_claim',
        args: [claimId],
      }) as unknown as Claim;
      setClaim(updated);
      setSuccessMsg(`Adjudication finalized with verdict: ${updated.status}!`);
      await fetchClaimAndWork();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.message || 'Adjudication execution failed');
    } finally {
      setIsAdjudicating(false);
    }
  };

  // Handle Distribute action (v1.1.0: remixer-only, >= SETTLEMENT_MIN)
  const handleDistribute = async () => {
    if (!isConnected || !address) {
      await connect();
      return;
    }
    if (!CONTRACT_ADDRESS || !claimId || !claim) return;

    if (!isRemixer) {
      setActionError(
        'Only the remixer wallet may settle this claim. Switch MetaMask to ' +
        claim.remixer + ' and try again.'
      );
      return;
    }

    const valNum = parseFloat(distributeAmount);
    if (isNaN(valNum) || valNum < settlementMinGen) {
      setActionError(
        `Enter at least ${settlementMinGen} GEN — the contract rejects settlements ` +
        `below SETTLEMENT_MIN to protect the artist against dust-payment attacks.`
      );
      return;
    }

    setIsDistributing(true);
    setActionError(null);
    setSuccessMsg(null);
    setPendingTxHash(undefined);

    try {
      const client = makeClient(address);
      const weiVal = BigInt(Math.floor(valNum * 1e18));

      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'distribute',
        args: [claimId],
        value: weiVal,
      });

      if (typeof txHash === 'string') setPendingTxHash(txHash);

      await awaitTxFinalized(client, txHash as `0x${string}`);

      const updated = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_claim',
        args: [claimId],
      }) as unknown as Claim;
      setClaim(updated);
      if (updated.distributed) setSuccessMsg('Royalties successfully distributed on-chain!');
      await fetchClaimAndWork();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.message || 'Distribution failed');
    } finally {
      setIsDistributing(false);
    }
  };

  // Handle Appeal action (v1.1.0: remixer-only, stake = 2× deposit)
  const handleAppeal = async () => {
    if (!isConnected || !address) {
      await connect();
      return;
    }
    if (!CONTRACT_ADDRESS || !claimId || !claim) return;

    if (!isRemixer) {
      setActionError('Only the remixer may appeal. Switch MetaMask to ' + claim.remixer + '.');
      return;
    }
    if ((claim.appeals ?? 0) >= maxAppeals) {
      setActionError(`Max appeals (${maxAppeals}) already used on this claim.`);
      return;
    }

    setIsAppealing(true);
    setActionError(null);
    setSuccessMsg(null);
    setPendingTxHash(undefined);

    try {
      const stakeWei = BigInt(claim.deposit) * BigInt(appealMultiplier);
      const client = makeClient(address);
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'appeal',
        args: [claimId],
        value: stakeWei,
      });
      if (typeof txHash === 'string') setPendingTxHash(txHash);

      await awaitTxFinalized(client, txHash as `0x${string}`);

      const updated = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_claim',
        args: [claimId],
      }) as unknown as Claim;
      setClaim(updated);
      setSuccessMsg(`Appeal finalized — new verdict: ${updated.status}`);
      await fetchClaimAndWork();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.message || 'Appeal failed');
    } finally {
      setIsAppealing(false);
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

      {(isAdjudicating || isDistributing || isAppealing) && <PendingBanner txHash={pendingTxHash} />}

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

      <VerdictCard claim={claim} txHash={pendingTxHash} />

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
                <a href={work.source_url} target="_blank" rel="noreferrer"
                   className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono truncate">
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
              <a href={claim.remix_url} target="_blank" rel="noreferrer"
                 className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono truncate">
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
                <div className="text-[10px] text-slate-500 uppercase">AI Confidence</div>
                <div className="font-bold text-cyan-300">
                  {(claim as any).ai_confidence ?? 0}%
                </div>
              </div>
              <div className="bg-[#0b0c13] p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Appeals Used</div>
                <div className="font-bold text-amber-300">
                  {(claim as any).appeals ?? 0} / {maxAppeals}
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
              Verdict: <strong className="text-emerald-400">{claim.status}</strong>. Final royalty split: <strong className="text-cyan-300">{(claim.final_split_bps / 100).toFixed(2)}%</strong>. Sending a settlement now pays the artist their cut, refunds your deposit, and closes the claim.
            </div>

            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-amber-200 text-xs flex gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold mb-1">Contract-enforced rules (v1.1.0):</div>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-100/90">
                  <li>Only the remixer wallet <span className="font-mono">{claim.remixer.slice(0, 10)}…</span> may call <code>distribute()</code>.</li>
                  <li>Minimum settlement: <strong>{settlementMinGen} GEN</strong>. Dust payments revert on-chain.</li>
                  <li>Second call to <code>distribute()</code> after success reverts (replay-safe).</li>
                </ul>
                {!isRemixer && (
                  <div className="mt-2 text-rose-300">
                    ⚠ You are connected as a different wallet. Switch MetaMask to the remixer account before continuing.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-48">
                <Coins className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="number"
                  step="0.01"
                  min={settlementMinGen}
                  value={distributeAmount}
                  onChange={(e) => setDistributeAmount(e.target.value)}
                  placeholder={String(settlementMinGen)}
                  className="w-full bg-[#121422] border border-slate-700/80 rounded-xl pl-9 pr-12 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">GEN</span>
              </div>

              <button
                onClick={handleDistribute}
                disabled={isDistributing || !isRemixer}
                title={!isRemixer ? 'Only the remixer wallet may distribute' : ''}
                className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {(claim.status === 'REJECTED' || claim.status === 'MODIFIED') && !claim.distributed && (
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-indigo-200 text-sm font-bold">
              <Gavel className="w-4 h-4" />
              <span>Appeal this verdict</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You (the remixer) may re-stake <strong>{appealMultiplier}×</strong> the original deposit
              ({(Number(claim.deposit) * appealMultiplier / 1e18).toFixed(4)} GEN) to force one
              re-adjudication round. Capped at {maxAppeals} appeals per claim.
              Appeals used: <strong>{(claim as any).appeals ?? 0} / {maxAppeals}</strong>.
            </p>
            <button
              onClick={handleAppeal}
              disabled={isAppealing || !isRemixer || ((claim as any).appeals ?? 0) >= maxAppeals}
              title={!isRemixer ? 'Only the remixer may appeal' : ''}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAppealing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Jury Re-adjudicating...</span>
                </>
              ) : (
                <>
                  <Gavel className="w-4 h-4" />
                  <span>Appeal ({(Number(claim.deposit) * appealMultiplier / 1e18).toFixed(4)} GEN stake)</span>
                </>
              )}
            </button>
          </div>
        )}

        {claim.status === 'REJECTED' && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-4 text-rose-300 text-xs space-y-1">
            <div className="font-bold uppercase tracking-wider">Claim Rejected by AI Jury</div>
            <p className="text-slate-300">
              The 0.01 GEN deposit was forfeited into the contract&apos;s <code>forfeited_pool</code>
              — appeals require an additional {appealMultiplier}× stake.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
