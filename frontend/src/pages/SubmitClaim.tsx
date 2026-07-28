import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS } from '../lib/genlayer';
import { Work } from '../lib/types';
import { useWallet } from '../context/WalletContext';
import { PendingBanner } from '../components/PendingBanner';
import { Disc, Globe, FileCheck, Percent, ShieldAlert, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

export const SubmitClaim: React.FC = () => {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const { address, isConnected, connect } = useWallet();

  const [work, setWork] = useState<Work | null>(null);
  const [loadingWork, setLoadingWork] = useState<boolean>(true);

  const [remixUrl, setRemixUrl] = useState('');
  const [declaration, setDeclaration] = useState('');
  const [splitPct, setSplitPct] = useState<number>(20); // 20.00% = 2000 bps

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [createdClaimId, setCreatedClaimId] = useState<string | null>(null);

  useEffect(() => {
    async function loadWork() {
      if (!workId || !CONTRACT_ADDRESS) {
        setLoadingWork(false);
        return;
      }
      try {
        const client = makeClient();
        const res = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'get_work',
          args: [workId],
        }) as unknown as Work;
        setWork(res);
      } catch (err) {
        console.error('Error fetching work:', err);
      } finally {
        setLoadingWork(false);
      }
    }
    loadWork();
  }, [workId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      await connect();
      return;
    }
    if (!CONTRACT_ADDRESS || !workId) return;

    if (!remixUrl.startsWith('http')) {
      setError('Remix URL must be an http(s) link');
      return;
    }
    if (declaration.trim().length < 10) {
      setError('Declaration must be at least 10 characters long describing sample usage');
      return;
    }

    const proposedSplitBps = Math.round(splitPct * 100);

    setIsSubmitting(true);
    setError(null);
    setPendingTxHash(undefined);
    setCreatedClaimId(null);

    try {
      const client = makeClient(address);

      // 0.01 GEN = 10,000,000,000,000,000 wei (10^16)
      const depositValue = BigInt('10000000000000000');

      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'submit_claim',
        args: [workId, remixUrl.trim(), declaration.trim(), proposedSplitBps],
        value: depositValue,
      });

      if (typeof txHash === 'string') {
        setPendingTxHash(txHash);
      }

      // Re-read contract state to verify completion & find new claim ID
      let foundClaimId: string | null = null;
      const startTime = Date.now();
      while (Date.now() - startTime < 60000) {
        try {
          const claims = await client.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: 'list_claims_for_work',
            args: [workId],
          }) as unknown as any[];

          if (Array.isArray(claims) && claims.length > 0) {
            const latest = claims[claims.length - 1];
            foundClaimId = String(latest.id);
            break;
          }
        } catch (e) {
          console.warn('Polling claims...', e);
        }
        await new Promise((r) => setTimeout(r, 2500));
      }

      if (foundClaimId !== null) {
        setCreatedClaimId(foundClaimId);
        setTimeout(() => {
          navigate(`/claim/${foundClaimId}`);
        }, 1500);
      } else {
        navigate(`/works/${workId}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to submit claim on-chain');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to work details</span>
      </button>

      <div className="bg-[#121422] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="space-y-2 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Disc className="w-4 h-4" />
            <span>Remixer Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Submit Remix &amp; Sample Claim
          </h1>
          {loadingWork ? (
            <p className="text-slate-400 text-sm">Loading original work details...</p>
          ) : work ? (
            <div className="bg-[#0b0c13] border border-slate-800 rounded-xl p-3 mt-2 text-xs">
              <span className="text-slate-400 font-medium">Sampling Original Work: </span>
              <span className="font-bold text-purple-300">#{work.id} — {work.title}</span>
              <div className="mt-1 text-slate-400 font-mono text-[11px] truncate">
                Terms: {work.license_terms}
              </div>
            </div>
          ) : null}
        </div>

        {isSubmitting && <PendingBanner txHash={pendingTxHash} />}

        {createdClaimId && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-4 text-emerald-200 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">
              Claim #{createdClaimId} submitted on studionet! Redirecting to adjudication view...
            </span>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 text-rose-200 flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Remix URL (SoundCloud / YouTube) *
            </label>
            <div className="relative">
              <Globe className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="url"
                required
                value={remixUrl}
                onChange={(e) => setRemixUrl(e.target.value)}
                placeholder="https://soundcloud.com/remixer/remix-track"
                className="w-full bg-[#0b0c13] border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Public page where the AI jury will fetch metadata &amp; verify your track details.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Sample Declaration *
            </label>
            <div className="relative">
              <FileCheck className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              <textarea
                required
                rows={4}
                value={declaration}
                onChange={(e) => setDeclaration(e.target.value)}
                placeholder="Describe how the sample is used (e.g., 3-second loop at 0:15 in intro, pitch shifted +2 semitones)..."
                className="w-full bg-[#0b0c13] border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors leading-relaxed"
              ></textarea>
            </div>
            <p className="text-[11px] text-slate-400">
              The AI validators compare your declaration against the original artist terms and public page metadata.
            </p>
          </div>

          <div className="space-y-3 bg-[#0b0c13] border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-cyan-400" />
                <span>Proposed Royalty Split to Original Artist</span>
              </label>
              <span className="font-mono font-extrabold text-lg text-cyan-300">
                {splitPct.toFixed(1)}% <span className="text-xs text-slate-400">({Math.round(splitPct * 100)} bps)</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={splitPct}
              onChange={(e) => setSplitPct(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Free)</span>
              <span>50% (Equal Split)</span>
              <span>100% (Full License)</span>
            </div>
          </div>

          <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 text-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-300">
              <ShieldAlert className="w-4 h-4" />
              <span>Anti-Spam Escrow Deposit: 0.01 GEN</span>
            </div>
            <p className="text-slate-300">
              Submitting a claim requires depositing <strong>0.01 GEN</strong>. This deposit is <strong>fully refunded</strong> to you when royalties are distributed for APPROVED or MODIFIED claims. If the claim is REJECTED, the deposit remains in escrow to discourage bad-faith claims.
            </p>
          </div>

          <div className="pt-2">
            {!isConnected ? (
              <button
                type="button"
                onClick={connect}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-600/20"
              >
                Connect Wallet to Submit Claim
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-xl shadow-cyan-600/30 active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting Claim with 0.01 GEN Escrow...' : 'Submit Claim & Deposit 0.01 GEN'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
