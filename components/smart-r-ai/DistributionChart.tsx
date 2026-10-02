'use client';

/**
 * Smart R AI — Distribution Chart
 * Horizontal bar chart comparing observed frequency vs expected 10%.
 */

import { cn } from '@/lib/utils';
import type { WindowStats } from '@/lib/smart-r-ai/types';

interface DistributionChartProps {
  windowStats: WindowStats | null;
  selectedDigit?: number | null;
}

export function DistributionChart({ windowStats, selectedDigit }: DistributionChartProps) {
  const pcts = windowStats?.digitPercentages ?? new Array(10).fill(0);
  const max = Math.max(20, ...pcts); // scale up to at least 20%

  return (
    <div className="flex h-[200px] items-end justify-between gap-1 px-1 pt-6 pb-2">
      {Array.from({ length: 10 }, (_, d) => {
        const pct = pcts[d];
        const hPct = (pct / max) * 100;
        const isSel = selectedDigit === d;
        const isSpike = pct > 14;

        return (
          <div key={d} className="relative flex flex-1 flex-col items-center justify-end h-full group">
            {/* Value tooltip-style label */}
            <div className="mb-1 text-[9px] font-mono text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100">
              {pct.toFixed(1)}
            </div>

            {/* Bar */}
            <div className="relative flex w-full max-w-[24px] justify-center">
              {/* Expected 10% line */}
              <div 
                className="absolute z-10 w-[140%] border-b border-dashed border-zinc-500/50" 
                style={{ bottom: `${(10 / max) * 100}%` }} 
              />
              
              <div
                className={cn(
                  'w-full min-w-[8px] rounded-t-sm transition-all duration-500',
                  isSel ? 'bg-violet-500' : isSpike ? 'bg-amber-500/80' : 'bg-muted-foreground/30'
                )}
                style={{ height: `${Math.max(hPct, 1)}%` }}
              />
            </div>

            {/* Digit label */}
            <div className={cn(
              'mt-1.5 flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold',
              isSel ? 'bg-violet-600 text-white' : 'text-muted-foreground'
            )}>
              {d}
            </div>
          </div>
        );
      })}
    </div>
  );
}
