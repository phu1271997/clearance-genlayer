import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectWallet } from './ConnectWallet';
import { Music, PlusCircle, Disc, User, Sparkles, Award, Gavel, Menu, X } from 'lucide-react';

const NAV_ITEMS: { to: string; label: string; icon: React.ReactNode; matchPrefix?: string }[] = [
  { to: '/',           label: 'Overview',      icon: <Sparkles    className="w-3.5 h-3.5" /> },
  { to: '/works',      label: 'All Works',     icon: <Disc        className="w-3.5 h-3.5" /> },
  { to: '/verdicts',   label: 'Verdicts',      icon: <Gavel       className="w-3.5 h-3.5" /> },
  { to: '/register',   label: 'Register Work', icon: <PlusCircle  className="w-3.5 h-3.5" /> },
  { to: '/my-works',   label: 'My Portfolio',  icon: <User        className="w-3.5 h-3.5" /> },
  { to: '/reputation', label: 'Reputation',    icon: <Award       className="w-3.5 h-3.5" />, matchPrefix: '/reputation' },
];

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: { to: string; matchPrefix?: string }) =>
    item.matchPrefix ? location.pathname.startsWith(item.matchPrefix) : location.pathname === item.to;

  // Close the mobile sheet whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 bg-[#090a0f]/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0d0e15] rounded-[10px] flex items-center justify-center">
              <Music className="w-5 h-5 text-purple-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider text-white text-lg font-mono">
                CLEARANCE
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-900/60 border border-purple-500/40 text-purple-300">
                STUDIONET
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium -mt-1">
              AI Royalty Splitter on GenLayer
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-[#131522] border border-slate-800/80 rounded-2xl p-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive(item)
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ConnectWallet />
          <button
            type="button"
            className="md:hidden p-2 rounded-xl border border-slate-800 bg-[#131522] text-slate-200 hover:text-white transition-colors"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            aria-controls="clearance-mobile-nav"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="clearance-mobile-nav"
          className="md:hidden border-t border-slate-800/80 bg-[#0b0c13]/95 backdrop-blur-xl"
        >
          <nav className="flex flex-col p-3 gap-1 max-w-7xl mx-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive(item)
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="w-6 h-6 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-center">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};
