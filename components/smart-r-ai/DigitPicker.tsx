'use client';

/**
 * Smart R AI — Digit Picker
 * A compact 2×5 grid of clickable digit buttons (0–9).
 * Used exclusively for Matches/Differs digit selection on the Smart R page.
 */

import { cn } from '@/lib/utils';

interface DigitPickerProps {
  selectedDigit: number;
  onChange: (digit: number) => void;
  disabled?: boolean;
}

export function DigitPicker({ selectedDigit, onChange, disabled }: DigitPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Digit
      </span>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, d) => {
          const isSelected = selectedDigit === d;
          return (
            <button
              key={d}
              disabled={disabled}
              onClick={() => onChange(d)}
              className={cn(
                'flex h-9 w-full items-center justify-center rounded-lg text-sm font-bold transition-all duration-150',
                isSelected
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30 ring-2 ring-violet-400/40 scale-105'
                  : disabled
                    ? 'bg-muted/20 text-muted-foreground/40 cursor-not-allowed'
                    : 'border border-border/60 bg-muted/30 text-foreground hover:bg-violet-500/20 hover:border-violet-500/50 hover:text-violet-300'
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
