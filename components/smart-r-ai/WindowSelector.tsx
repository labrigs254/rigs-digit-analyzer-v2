'use client';

/**
 * Smart R AI — Window Selector
 * Chip group for selecting the active analysis window size.
 */

import { cn } from '@/lib/utils';

interface WindowSelectorProps {
  windowSizes: number[];
  activeWindowSize: number;
  onChange: (size: number) => void;
  availableSizes?: number[];
}

export function WindowSelector({ windowSizes, activeWindowSize, onChange, availableSizes }: WindowSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Analysis Window
      </span>
      <div className="flex flex-wrap gap-1.5">
        {windowSizes.map((size) => {
          const available = !availableSizes || availableSizes.includes(size);
          const active = size === activeWindowSize;
          return (
            <button
              key={size}
              disabled={!available}
              onClick={() => onChange(size)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150',
                active
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : available
                    ? 'border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                    : 'border border-border/40 bg-muted/10 text-muted-foreground/30 cursor-not-allowed',
              )}
            >
              {size >= 1000 ? `${size / 1000}k` : size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
