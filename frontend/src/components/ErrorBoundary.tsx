import React from 'react';
import { AlertOctagon } from 'lucide-react';

interface State { error: Error | null }

/**
 * Top-level React error boundary. Catches render-time exceptions in the
 * subtree so a broken page shows a readable message instead of a blank
 * white screen — matters most when the RPC or genlayer-js throws
 * unexpectedly during a demo.
 */
export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[Clearance] Uncaught render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#090a0f] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#121422] border border-rose-500/40 rounded-3xl p-8 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-8 h-8 text-rose-400" />
              <div>
                <div className="text-xs uppercase font-bold tracking-wider text-rose-400">Runtime Error</div>
                <h2 className="text-xl font-extrabold text-white">The app hit an unexpected error.</h2>
              </div>
            </div>
            <pre className="bg-[#0b0c13] border border-slate-800 rounded-xl p-4 text-xs text-rose-200 whitespace-pre-wrap break-all font-mono">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => location.reload()}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-purple-600/20"
            >
              Reload page
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              If the error persists, open a GitHub issue with the message above.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
