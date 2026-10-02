'use client';

/**
 * Smart R AI — Header
 * Shows live status, symbol, tick count, last digit, and data quality.
 */

import { cn } from '@/lib/utils';
import type { DataQuality } from '@/lib/smart-r-ai/types';

interface SmartRAIHeaderProps {
  isConnected: boolean;
  symbol?: string;
  tickCount: number;
  lastDigit: number | null;
  dataQuality: DataQuality | null;
}

const qualityColors: Record<string, string> = {
  EXCELLENT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  GOOD:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FAIR:      'bg-amber-500/20 text-amber-400 border-amber-500/30',
  POOR:      'bg-orange-500/20 text-orange-400 border-orange-500/30',
  INSUFFICIENT: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export function SmartRAIHeader({
  isConnected,
  symbol,
  tickCount,
  lastDigit,
  dataQuality,
}: SmartRAIHeaderProps) {
  const quality = dataQuality?.rating ?? 'INSUFFICIENT';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Title + Live indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-2.5 w-2.5 rounded-full',
            isConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]' : 'bg-zinc-500',
          )} />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {isConnected ? 'LIVE' : 'DISCONNECTED'}
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          SMART R AI
        </h1>
      </div>

      {/* Right: Stats row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {symbol && (
          <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 font-medium text-foreground">
            {symbol}
          </span>
        )}
        <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-muted-foreground">
          Ticks: <span className="font-semibold text-foreground">{tickCount.toLocaleString()}</span>
        </span>
        {lastDigit !== null && (
          <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 font-bold text-violet-400">
            Last: {lastDigit}
          </span>
        )}
        {dataQuality && (
          <span className={cn(
            'rounded-md border px-2.5 py-1 font-semibold uppercase tracking-wide text-[10px]',
            qualityColors[quality]
          )}>
            {quality}
          </span>
        )}
      </div>
    </div>
  );
}
