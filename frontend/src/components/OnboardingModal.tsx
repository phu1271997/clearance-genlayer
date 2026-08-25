import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, ArrowRight, ArrowLeft, X, Music, Disc, Gavel, ShieldCheck, Coins,
} from 'lucide-react';

const STORAGE_KEY = 'clearance.onboarding.v1.dismissed';

interface Step {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    icon: <Sparkles className="w-5 h-5 text-purple-400" />,
    title: 'Welcome to Clearance',
    body: (
      <>
        Clearance is an on-chain AI jury for music sample licensing on{' '}
        <strong>GenLayer studionet</strong>. Every verdict is decided by validator
        consensus, not by this website — and every verdict is public.
      </>
    ),
  },
  {
    icon: <Music className="w-5 h-5 text-purple-400" />,
    title: '1 — Artists register works',
    body: (
      <>
        An original artist writes their licensing rules in natural English
        (<em>"Samples under 4s free. Longer needs a 30% split. No alcohol ads."</em>),
        picks a public source URL, and registers the work. No cost beyond gas.
      </>
    ),
  },
  {
    icon: <Disc className="w-5 h-5 text-cyan-400" />,
    title: '2 — Remixers submit claims',
    body: (
      <>
        A remixer picks a work, points at their remix URL, describes how the
        sample is used, and proposes a royalty split. Locking a{' '}
        <strong>0.01 GEN deposit</strong> discourages spam — it comes straight
        back on APPROVED or MODIFIED.
      </>
    ),
  },
  {
    icon: <Gavel className="w-5 h-5 text-amber-400" />,
    title: '3 — Validators read the web on-chain',
    body: (
      <>
        GenLayer validators fetch both track pages via <code>gl.nondet.web.render</code>,
        weigh the declaration against the natural-language licence with an LLM, and
        reach consensus on APPROVED / MODIFIED / REJECTED — plus a binding split.
      </>
    ),
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    title: 'Recourse: appeal',
    body: (
      <>
        Think the jury got it wrong? The remixer can re-stake{' '}
        <strong>2× the original deposit</strong> to force a re-adjudication, capped
        at 2 rounds. Winning an appeal claws every locked wei back into the
        refundable escrow.
      </>
    ),
  },
  {
    icon: <Coins className="w-5 h-5 text-emerald-400" />,
    title: 'You are ready',
    body: (
      <>
        Every write needs GEN on studionet — top up from the Studio{' '}
        <strong>Accounts</strong> panel, not the testnet faucet (they are separate
        networks). Or just read <Link to="/verdicts" className="text-cyan-400 underline">the verdict feed</Link>{' '}
        without connecting anything.
      </>
    ),
  },
];

export const OnboardingModal: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (localStorage.getItem(STORAGE_KEY)) return;
      // Delay slightly so it doesn't fight with initial paint / wallet popups.
      const t = setTimeout(() => setOpen(true), 700);
      return () => clearTimeout(t);
    } catch {
      // Private-mode localStorage lockdown — skip onboarding rather than throw.
    }
  }, []);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* private mode — ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clearance-onboarding-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gradient-to-b from-[#141624] to-[#0f111c] border border-purple-500/40 rounded-3xl shadow-2xl shadow-purple-950/60 p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center">
              {s.icon}
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                Getting started · {step + 1} / {STEPS.length}
              </div>
              <h2 id="clearance-onboarding-title" className="text-lg font-extrabold text-white">
                {s.title}
              </h2>
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Dismiss onboarding"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed">{s.body}</p>

        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            onClick={() => setStep((n) => Math.max(0, n - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <button
            onClick={close}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Skip
          </button>
          {isLast ? (
            <button
              onClick={close}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-purple-600/30"
            >
              <span>Let&apos;s go</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setStep((n) => Math.min(STEPS.length - 1, n + 1))}
              className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-purple-600/20"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
