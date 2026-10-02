'use client';

/**
 * Smart R AI — Recent Ticks
 * Displays the last 50 ticks sequentially, color-coded by their frequency in the active window.
 */

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { WindowStats } from '@/lib/smart-r-ai/types';

interface RecentTicksProps {
  digits: number[]; // the raw digits array (last 50)
  windowStats: WindowStats | null;
}

export function RecentTicks({ digits, windowStats }: RecentTicksProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to right when new digits arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [digits]);

  const pcts = windowStats?.digitPercentages ?? new Array(10).fill(10);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Recent Sequence
        </span>
        <span className="text-[10px] text-muted-foreground">
          Newest →
        </span>
      </div>
      
      <div
        ref={containerRef}
        className="flex gap-1 overflow-x-auto pb-2 scroll-smooth rounded-lg border bg-muted/10 p-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {digits.length === 0 ? (
          <span className="text-xs text-muted-foreground px-2 py-1">Waiting for ticks...</span>
        ) : (
          digits.map((d, i) => {
            const pct = pcts[d];
            const isHigh = pct >= 14;
            const isLow = pct <= 6;
            
            return (
              <div
                key={i}
                className={cn(
                  'flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-md text-sm font-bold',
                  isHigh ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                  isLow ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  'bg-muted/40 text-foreground border border-border/50'
                )}
              >
                {d}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
