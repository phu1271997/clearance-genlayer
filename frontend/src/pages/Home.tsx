import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS } from '../lib/genlayer';
import { Counts } from '../lib/types';
import { Music, ShieldCheck, Scale, Cpu, Globe, ArrowRight, Disc, PlusCircle, CheckCircle2 } from 'lucide-react';

export const Home: React.FC = () => {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchCounts() {
      if (!CONTRACT_ADDRESS) {
        setLoading(false);
        return;
      }
      try {
        const client = makeClient();
        const res = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'counts',
          args: [],
        });
        setCounts(res as any);
      } catch (err) {
        console.error('Failed to fetch counts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCounts();
  }, []);

  return (
    <div className="space-y-16 py-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#141624] via-[#0f111c] to-[#090a0f] border border-slate-800 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-3xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>GenLayer Studionet Intelligent Contract</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight font-sans">
            An on-chain AI jury clears music samples in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
              minutes, not months.
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed">
            Clearance brings natural language music licensing to Web3. Original artists specify free-form license terms, remixers submit claims with public URLs & declarations, and a decentralized jury of AI validators inspects public web data to enforce trustless royalty splits.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-6 py-3.5 rounded-2xl text-sm transition-all shadow-xl shadow-purple-600/25 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Original Work</span>
            </Link>
            <Link
              to="/works"
              className="flex items-center gap-2 bg-[#1a1c2b] hover:bg-[#222538] text-slate-200 font-semibold px-6 py-3.5 rounded-2xl text-sm border border-slate-700/70 transition-all active:scale-[0.98]"
            >
              <Disc className="w-4 h-4 text-cyan-400" />
              <span>Browse Catalog & Submit Claim</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mt-10 pt-8 border-t border-slate-800/80 max-w-lg">
          <div className="bg-[#0b0c13]/80 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Registered Works</div>
            <div className="text-3xl font-extrabold text-white mt-1 font-mono">
              {loading ? '...' : (counts?.works ?? 0)}
            </div>
          </div>
          <div className="bg-[#0b0c13]/80 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Remix Claims</div>
            <div className="text-3xl font-extrabold text-cyan-400 mt-1 font-mono">
              {loading ? '...' : (counts?.claims ?? 0)}
            </div>
          </div>
        </div>
      </section>

      {/* Why GenLayer Section */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Why GenLayer?</h2>
          <p className="text-slate-400 text-sm">
            Remove the AI + web layer and this product dies — it becomes a Google Form. Standard EVM smart contracts cannot read SoundCloud or interpret natural language terms.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#121422] border border-slate-800/80 rounded-2xl p-6 space-y-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Natural Language Contracts</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Artists declare license terms in natural English (&quot;Samples under 4s allowed. No alcohol ads.&quot;). The AI contract interprets these terms for every claim.
            </p>
          </div>

          <div className="bg-[#121422] border border-slate-800/80 rounded-2xl p-6 space-y-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">On-Chain Web Scraping</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Validators execute <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">gl.nondet.web.render</code> directly during execution to inspect public page metadata from YouTube, SoundCloud, and Spotify.
            </p>
          </div>

          <div className="bg-[#121422] border border-slate-800/80 rounded-2xl p-6 space-y-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Semantic AI Consensus</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Custom consensus validator logic compares <strong>verdict meaning + split within ±5%</strong> instead of strict JSON equality, ensuring fault-tolerant consensus across LLMs.
            </p>
          </div>
        </div>
      </section>

      {/* Protocol Architecture Sketch */}
      <section className="bg-[#0e101a] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <h3 className="font-bold text-xl text-white flex items-center gap-2">
          <Music className="w-5 h-5 text-purple-400" />
          <span>Protocol Clearance Lifecycle</span>
        </h3>

        <div className="grid md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-[#141726] p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-purple-400 font-bold">1. Artist Registers</div>
            <p className="text-slate-400 font-sans">
              Artist submits work title, original source URL, and natural language license terms to GenLayer studionet.
            </p>
          </div>

          <div className="bg-[#141726] p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-cyan-400 font-bold">2. Remixer Claims</div>
            <p className="text-slate-400 font-sans">
              Remixer submits remix URL, usage declaration, proposed royalty split, and deposits 0.01 GEN escrow.
            </p>
          </div>

          <div className="bg-[#141726] p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-amber-400 font-bold">3. AI Adjudication</div>
            <p className="text-slate-400 font-sans">
              AI validators render public pages, evaluate declaration against terms, and reach on-chain consensus on verdict.
            </p>
          </div>

          <div className="bg-[#141726] p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-emerald-400 font-bold">4. Trustless Split</div>
            <p className="text-slate-400 font-sans">
              Royalty payout distributes funds according to AI jury verdict &amp; refunds deposit upon approval.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
