import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS, awaitTxFinalized } from '../lib/genlayer';
import { useWallet } from '../context/WalletContext';
import { PendingBanner } from '../components/PendingBanner';
import { PlusCircle, FileText, Globe, Music, AlertCircle, ArrowLeft, CheckCircle, Wand2 } from 'lucide-react';
import { SAMPLE_WORKS } from '../data/sampleWorks';

export const RegisterWork: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected, connect } = useWallet();

  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [licenseTerms, setLicenseTerms] = useState(
    'Samples under 4 seconds allowed for free. Longer samples require a 30% royalty split. No use in advertisements for alcohol or gambling. Attribution required.'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      await connect();
      return;
    }
    if (!CONTRACT_ADDRESS) {
      setError('Contract address is not configured. Please set VITE_CONTRACT_ADDRESS in .env.');
      return;
    }

    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }
    if (!sourceUrl.startsWith('http')) {
      setError('Source URL must be a valid http(s) URL');
      return;
    }
    if (licenseTerms.trim().length < 10) {
      setError('License terms must be at least 10 characters long');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setPendingTxHash(undefined);
    setCreatedId(null);

    try {
      const client = makeClient(address);
      
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'register_work',
        args: [title.trim(), sourceUrl.trim(), licenseTerms.trim()],
        value: BigInt(0),
      });

      if (typeof txHash === 'string') {
        setPendingTxHash(txHash);
      }

      // Wait for consensus and check the leader-receipt execution_result.
      // Throws with the on-chain traceback if execution_result !== SUCCESS.
      await awaitTxFinalized(client, txHash as `0x${string}`);

      // Refresh state — find the freshly created work by title match
      let fetchedId: string | null = null;
      for (let i = 0; i < 4 && !fetchedId; i++) {
        const works = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'list_works',
          args: [],
        }) as unknown as any[];
        if (Array.isArray(works) && works.length > 0) {
          const match = works.slice().reverse().find((w: any) => w.title === title.trim());
          if (match) fetchedId = String(match.id);
        }
        if (!fetchedId) await new Promise((r) => setTimeout(r, 2000));
      }

      if (fetchedId !== null) {
        setCreatedId(fetchedId);
        setTimeout(() => navigate(`/works/${fetchedId}`), 1500);
      } else {
        navigate('/works');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to register work on-chain');
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
        <span>Back to catalog</span>
      </button>

      <div className="bg-[#121422] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="space-y-2 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider">
            <PlusCircle className="w-4 h-4" />
            <span>Rights Holder Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Register Original Work &amp; Terms
          </h1>
          <p className="text-slate-400 text-sm">
            Publish your audio work and define custom sampling &amp; remix license terms in natural English.
          </p>
        </div>

        {isSubmitting && <PendingBanner txHash={pendingTxHash} />}

        {createdId && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-4 text-emerald-200 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">
              Work #{createdId} successfully registered on studionet! Redirecting...
            </span>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 text-rose-200 flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-[#0b0c13] border border-purple-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
            <Wand2 className="w-4 h-4" />
            <span>Quick-start: load a sample license</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_WORKS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setTitle(s.title);
                  setSourceUrl(s.source_url);
                  setLicenseTerms(s.license_terms);
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-purple-950/50 border border-purple-500/30 text-purple-200 hover:bg-purple-900/60 hover:border-purple-400/60 transition-colors font-semibold"
              >
                {s.title}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">
            Presets loaded from <code>docs/samples/works.json</code> — each demonstrates a natural-language license that Solidity cannot interpret.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Work Title *
            </label>
            <div className="relative">
              <Music className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midnight City (Original Mix)"
                className="w-full bg-[#0b0c13] border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Source URL (SoundCloud / YouTube / Spotify) *
            </label>
            <div className="relative">
              <Globe className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="url"
                required
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://soundcloud.com/artist/track-name"
                className="w-full bg-[#0b0c13] border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              AI validators fetch page metadata from this URL to verify title, length, and metadata.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Natural Language License Terms *
            </label>
            <div className="relative">
              <FileText className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              <textarea
                required
                rows={5}
                value={licenseTerms}
                onChange={(e) => setLicenseTerms(e.target.value)}
                placeholder="Describe your licensing conditions in free-form English..."
                className="w-full bg-[#0b0c13] border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors leading-relaxed font-sans"
              ></textarea>
            </div>
            <p className="text-[11px] text-slate-400">
              Be specific about sample duration rules, allowed commercial uses, prohibited contexts (e.g. alcohol/gambling), and required split percentages.
            </p>
          </div>

          <div className="pt-2">
            {!isConnected ? (
              <button
                type="button"
                onClick={connect}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-purple-600/20"
              >
                Connect Wallet to Register Work
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-xl shadow-purple-600/30 active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? 'Registering Work on Studionet...' : 'Publish Work & Licensing Terms'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
