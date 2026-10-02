'use client';

/**
 * Smart R AI — Regime Panel
 * Shows the current market regime, confidence bar, and bulleted evidence.
 */

import { cn } from '@/lib/utils';
import type { MarketRegime } from '@/lib/smart-r-ai/types';

interface RegimePanelProps {
  regime: MarketRegime | null;
}

export function RegimePanel({ regime }: RegimePanelProps) {
  if (!regime) return null;

  const type = regime.regime;
  const isNorm = type === 'NORMAL';
  const isWarn = type === 'UNSTABLE' || type === 'INSUFFICIENT_DATA';
  const isSpecial = !isNorm && !isWarn;

  const bg = isWarn ? 'bg-amber-500/10 border-amber-500/30' : isSpecial ? 'bg-violet-500/10 border-violet-500/30' : 'bg-muted/30 border-border/50';
  const text = isWarn ? 'text-amber-400' : isSpecial ? 'text-violet-400' : 'text-foreground';

  return (
    <div className={cn('rounded-xl border p-4', bg)}>
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Current Regime</p>
          <p className={cn('mt-1 font-black uppercase tracking-wide', text)}>
            {type.replace('_', ' ')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Confidence</p>
          <p className="mt-1 font-mono font-bold text-foreground">{regime.confidence}%</p>
        </div>
      </div>

      <div className="pt-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Statistical Evidence</p>
        <ul className="space-y-1.5">
          {regime.evidence.map((ev, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-tight text-muted-foreground">
              <span className={cn('mt-[1px]', text)}>•</span>
              {ev}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
