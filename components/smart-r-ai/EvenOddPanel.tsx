'use client';

/**
 * Smart R AI — Even/Odd Panel
 * Highlights AI recommended EVEN or ODD choice with glowing styling.
 */

import { cn } from '@/lib/utils';
import type { EvenOddAnalysis, CoPilotRecommendation } from '@/lib/smart-r-ai/types';

interface EvenOddPanelProps {
  evenOdd: EvenOddAnalysis | null;
  coPilot?: CoPilotRecommendation | null;
}

export function EvenOddPanel({ evenOdd, coPilot }: EvenOddPanelProps) {
  if (!evenOdd) return null;

  const isEvenFavored = evenOdd.evenProbability > evenOdd.oddProbability;
  const isStrong = evenOdd.signalStrength > 30;
  const isCoPilotEven = coPilot?.action === 'EVEN';
  const isCoPilotOdd  = coPilot?.action === 'ODD';

  return (
    <div className="flex flex-col rounded-xl border border-border/50 bg-muted/10 p-4">
      <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Even / Odd Analysis</span>
        <div className="flex items-center gap-2">
          {coPilot && (isCoPilotEven || isCoPilotOdd) && (
            <span className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide',
              isCoPilotEven
                ? 'border-purple-500/40 bg-purple-500/20 text-purple-300'
                : 'border-sky-500/40 bg-sky-500/20 text-sky-300',
            )}>
              AI Recommendation → BUY {coPilot.action}
            </span>
          )}
          <span className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            isStrong ? 'bg-amber-500/20 text-amber-500' : 'bg-muted/40 text-muted-foreground'
          )}>
            {isStrong ? 'SIGNAL' : 'WEAK'}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
        {/* Even */}
        <div className={cn(
          'flex-1 rounded-xl border p-4 text-center transition-all duration-300',
          isCoPilotEven
            ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/25 ring-2 ring-purple-400/50'
            : isEvenFavored
            ? 'border-violet-500/40 bg-violet-500/10'
            : 'border-border/30 bg-muted/20 text-muted-foreground'
        )}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-purple-300">Even</p>
          <p className={cn('text-2xl font-black', isCoPilotEven ? 'text-purple-300' : isEvenFavored ? 'text-violet-400' : 'text-foreground')}>
            {(evenOdd.evenProbability * 100).toFixed(1)}%
          </p>
          <p className="text-[10px] mt-1 opacity-70">Observed: {evenOdd.evenObservedPct.toFixed(1)}%</p>
        </div>

        {/* VS */}
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">VS</div>

        {/* Odd */}
        <div className={cn(
          'flex-1 rounded-xl border p-4 text-center transition-all duration-300',
          isCoPilotOdd
            ? 'border-sky-400 bg-sky-500/20 shadow-lg shadow-sky-500/25 ring-2 ring-sky-400/50'
            : !isEvenFavored
            ? 'border-sky-500/40 bg-sky-500/10'
            : 'border-border/30 bg-muted/20 text-muted-foreground'
        )}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-sky-300">Odd</p>
          <p className={cn('text-2xl font-black', isCoPilotOdd ? 'text-sky-300' : !isEvenFavored ? 'text-sky-400' : 'text-foreground')}>
            {(evenOdd.oddProbability * 100).toFixed(1)}%
          </p>
          <p className="text-[10px] mt-1 opacity-70">Observed: {evenOdd.oddObservedPct.toFixed(1)}%</p>
        </div>
      </div>
      
      {isStrong && (
        <p className="mt-3 text-center text-xs text-amber-400 italic">
          Significant divergence between Even and Odd distributions. ({Math.abs(evenOdd.difference).toFixed(1)} pp diff)
        </p>
      )}
    </div>
  );
}
