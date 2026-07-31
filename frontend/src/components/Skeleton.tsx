import React from 'react';

/**
 * Reusable shimmer skeleton. Prefer over "..." + spinner for content
 * loads — reserves the final layout so the page doesn't jump when the
 * data lands.
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-slate-800 via-slate-700/60 to-slate-800 bg-[length:200%_100%] rounded ${className}`}
    style={{ animation: 'clearance-shimmer 1.6s ease-in-out infinite' }}
  />
);

export const WorkCardSkeleton: React.FC = () => (
  <div className="bg-[#121422] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </div>
    <Skeleton className="h-6 w-3/4" />
    <div className="space-y-1">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-3 w-full" />
    </div>
    <div className="pt-4 border-t border-slate-800 flex justify-between">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

export const CounterSkeleton: React.FC = () => (
  <div className="bg-[#0b0c13]/80 border border-slate-800 rounded-2xl p-4 space-y-2">
    <Skeleton className="h-2.5 w-24" />
    <Skeleton className="h-8 w-16" />
  </div>
);
