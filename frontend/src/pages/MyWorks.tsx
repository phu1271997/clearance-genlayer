import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS } from '../lib/genlayer';
import { useWallet } from '../context/WalletContext';
import { Disc, PlusCircle, User, RefreshCw, ArrowRight } from 'lucide-react';

interface WorkSummary {
  id: string;
  artist: string;
  title: string;
}

export const MyWorks: React.FC = () => {
  const { address, isConnected, connect } = useWallet();
  const [works, setWorks] = useState<WorkSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMyWorks = async () => {
    if (!CONTRACT_ADDRESS || !address) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const client = makeClient();
      const res = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'list_works',
        args: [],
      }) as unknown as WorkSummary[];

      if (Array.isArray(res)) {
        const currentAddr = address;
        const userWorks = res.filter(
          (w) => w.artist && currentAddr && w.artist.toLowerCase() === currentAddr.toLowerCase()
        );
        setWorks(userWorks);
      }
    } catch (err) {
      console.error('Error loading my works:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchMyWorks();
    } else {
      setLoading(false);
    }
  }, [address, isConnected]);

  return (
    <div className="py-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2.5">
            <User className="w-7 h-7 text-purple-400" />
            <span>My Artist Portfolio</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your registered music works and track incoming remix claims.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && (
            <button
              onClick={fetchMyWorks}
              className="p-2.5 bg-[#121422] border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              title="Refresh Portfolio"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <Link
            to="/register"
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Work</span>
          </Link>
        </div>
      </div>

      {!isConnected || !address ? (
        <div className="bg-[#121422] border border-slate-800 rounded-2xl p-12 text-center space-y-4 max-w-md mx-auto">
          <User className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Wallet Not Connected</h3>
          <p className="text-slate-400 text-xs">
            Connect your MetaMask wallet to view the works you have registered on GenLayer studionet.
          </p>
          <button
            onClick={connect}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/20"
          >
            Connect Wallet
          </button>
        </div>
      ) : loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
          <p className="text-slate-400 text-xs">Fetching portfolio for {address.substring(0, 6)}...</p>
        </div>
      ) : works.length === 0 ? (
        <div className="bg-[#121422] border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <Disc className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-300">No Works Registered Yet</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            You have not registered any music works under address <code className="text-purple-300">{address.substring(0, 8)}...</code>.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register First Work</span>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {works.map((w) => (
            <div
              key={w.id}
              className="bg-[#121422] border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 space-y-4 shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold">
                  Work #{w.id}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  Active Rights Holder
                </span>
              </div>

              <h3 className="font-extrabold text-white text-xl">{w.title}</h3>

              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <Link
                  to={`/claim/new/${w.id}`}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  + Submit Claim
                </Link>

                <Link
                  to={`/works/${w.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300"
                >
                  <span>Manage Work</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
