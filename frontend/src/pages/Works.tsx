import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeClient, CONTRACT_ADDRESS } from '../lib/genlayer';
import { Disc, Search, PlusCircle, RefreshCw, FileText, ArrowRight, ShieldAlert } from 'lucide-react';

interface WorkSummary {
  id: string;
  artist: string;
  title: string;
}

export const Works: React.FC = () => {
  const [works, setWorks] = useState<WorkSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchWorks = async () => {
    if (!CONTRACT_ADDRESS) {
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
      setWorks(res || []);
    } catch (err) {
      console.error('Error listing works:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, []);

  const filtered = works.filter(
    (w) =>
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.artist.toLowerCase().includes(search.toLowerCase()) ||
      w.id.includes(search)
  );

  return (
    <div className="py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Registered Music Works</h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse original compositions registered on GenLayer studionet with natural language terms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchWorks}
            className="p-2.5 bg-[#121422] border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Refresh Works"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/register"
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Work</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, artist address, or work ID..."
          className="w-full bg-[#121422] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Content */}
      {!CONTRACT_ADDRESS ? (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-8 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="font-bold text-lg text-white">Contract Address Not Configured</h3>
          <p className="text-slate-300 text-xs max-w-md mx-auto">
            Please deploy the contract to GenLayer studionet and configure <code className="text-amber-300">VITE_CONTRACT_ADDRESS</code> in frontend/.env.
          </p>
        </div>
      ) : loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
          <p className="text-slate-400 text-xs">Loading registered catalog from studionet...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#121422] border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
          <Disc className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-300">No Works Found</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            {search ? 'No works matched your search query.' : 'Be the first artist to register an original composition on GenLayer!'}
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register First Work</span>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((w) => (
            <div
              key={w.id}
              className="bg-[#121422] border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 space-y-4 shadow-lg transition-all hover:-translate-y-1 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold">
                    Work #{w.id}
                  </span>
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>

                <h3 className="font-extrabold text-white text-lg line-clamp-1">{w.title}</h3>

                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Rights Holder</div>
                  <div className="font-mono text-xs text-slate-300 truncate">{w.artist}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
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
                  <span>View Details</span>
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
