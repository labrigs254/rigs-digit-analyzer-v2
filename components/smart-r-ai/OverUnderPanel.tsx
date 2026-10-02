'use client';

/**
 * Smart R AI — Over/Under Panel
 */

import { cn } from '@/lib/utils';
import type { OverUnderAnalysis } from '@/lib/smart-r-ai/types';

interface OverUnderPanelProps {
  overUnder: OverUnderAnalysis[];
  focusThreshold?: number;
}

export function OverUnderPanel({ overUnder, focusThreshold }: OverUnderPanelProps) {
  if (overUnder.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Over / Under Analysis
        </span>
        {typeof focusThreshold === 'number' && (
          <span className="text-[10px] font-bold text-violet-400">
            Active Threshold: {focusThreshold}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {overUnder.map((ou) => {
          const isFocused = focusThreshold === ou.threshold;
          const isOverFavored = ou.overProbability > ou.underProbability;
          const confCls = ou.modelConfidence > 40 ? 'text-amber-400' : 'text-muted-foreground';

          return (
            <div
              key={ou.threshold}
              className={cn(
                'flex flex-col rounded-lg border p-3 transition-all duration-200',
                isFocused
                  ? 'border-violet-500 bg-violet-500/15 shadow-lg shadow-violet-500/20 ring-1 ring-violet-500'
                  : 'border-border/50 bg-muted/10'
              )}
            >
              <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2">
                <span className={cn('font-bold', isFocused ? 'text-violet-300' : 'text-foreground')}>
                  Threshold {ou.threshold}
                </span>
                <span className={cn('text-[10px] font-semibold', confCls)}>
                  Conf: {ou.modelConfidence}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={cn('flex flex-col', isOverFavored && 'bg-emerald-500/5 rounded px-2 -mx-2')}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Over {ou.threshold}</span>
                  <span className={cn('text-lg font-bold', isOverFavored ? 'text-emerald-400' : 'text-foreground')}>
                    {(ou.overProbability * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">Obs: {ou.overObservedPct.toFixed(1)}%</span>
                  <span className="text-[9px] text-zinc-500 mt-1">[{ou.overDigits.join(',')}]</span>
                </div>

                <div className={cn('flex flex-col text-right', !isOverFavored && 'bg-emerald-500/5 rounded px-2 -mx-2')}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Under {ou.threshold}</span>
                  <span className={cn('text-lg font-bold', !isOverFavored ? 'text-emerald-400' : 'text-foreground')}>
                    {(ou.underProbability * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">Obs: {ou.underObservedPct.toFixed(1)}%</span>
                  <span className="text-[9px] text-zinc-500 mt-1">[{ou.underDigits.join(',')}]</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
