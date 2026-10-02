'use client';

/**
 * Smart R AI — Matches / Differs Panel (Enhanced)
 * Shows hot/cold badges, absence gap, and highlights the Co-Pilot's recommended digit.
 */

import { cn } from '@/lib/utils';
import type { MatchDifferAnalysis, CoPilotRecommendation } from '@/lib/smart-r-ai/types';

interface MatchesDiffersPanelProps {
  matchesDiffers: MatchDifferAnalysis[];
  focusDigit?: number;
  coPilot?: CoPilotRecommendation | null;
}

export function MatchesDiffersPanel({ matchesDiffers, focusDigit, coPilot }: MatchesDiffersPanelProps) {
  if (matchesDiffers.length === 0) return null;

  const recommendedDigit = coPilot?.recommendedDigit ?? null;
  const hotDigit         = coPilot?.hotDigit ?? null;
  const coldDigit        = coPilot?.coldDigit ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Match / Differs Analysis
        </span>
        <div className="flex items-center gap-2">
          {typeof focusDigit === 'number' && (
            <span className="text-[10px] font-bold text-violet-400">
              Active Barrier: Digit {focusDigit}
            </span>
          )}
          {coPilot && coPilot.action !== 'HOLD' && (
            <span className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide',
              coPilot.action === 'DIFFERS'
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/15 text-amber-300',
            )}>
              AI → {coPilot.action} {recommendedDigit}
            </span>
          )}
        </div>
      </div>

      {/* Digit Grid */}
      <div className="grid grid-cols-5 gap-2">
        {matchesDiffers.map((md) => {
          const isFocused      = focusDigit === md.digit;
          const isRecommended  = recommendedDigit === md.digit;
          const isHot          = hotDigit === md.digit;
          const isCold         = coldDigit === md.digit;
          const isHighFreq     = md.matchProbability > 0.13;
          const isLowFreq      = md.matchProbability < 0.07;

          return (
            <div
              key={md.digit}
              className={cn(
                'flex flex-col rounded-xl border p-2 text-center transition-all duration-300 relative',
                // Priority styling: recommended > focused > hot/cold > freq
                isRecommended && coPilot?.action === 'DIFFERS'
                  ? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                  : isRecommended && coPilot?.action === 'MATCHES'
                  ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/50'
                  : isFocused
                  ? 'border-violet-500 bg-violet-500/15 shadow-lg shadow-violet-500/20 ring-1 ring-violet-500'
                  : isHighFreq
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : isLowFreq
                  ? 'border-blue-500/30 bg-blue-500/5'
                  : 'border-border/30 bg-muted/10 text-muted-foreground',
              )}
            >
              {/* Hot / Cold indicator badges */}
              {(isCold || isHot) && (
                <span className={cn(
                  'absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0 text-[9px] font-bold',
                  isCold
                    ? 'bg-blue-500 text-white'
                    : 'bg-orange-500 text-white',
                )}>
                  {isCold ? '🧊' : '🔥'}
                </span>
              )}

              {/* Digit label */}
              <div className="flex items-center gap-1 justify-center border-b border-border/20 pb-1.5 mb-1.5 mt-1">
                <span className={cn(
                  'flex h-5 w-5 items-center justify-center rounded font-black text-[11px]',
                  isRecommended && coPilot?.action === 'DIFFERS'
                    ? 'bg-emerald-500 text-white'
                    : isRecommended && coPilot?.action === 'MATCHES'
                    ? 'bg-amber-500 text-white'
                    : isFocused ? 'bg-violet-500 text-white'
                    : isHighFreq ? 'bg-amber-500 text-amber-950'
                    : isLowFreq ? 'bg-blue-500 text-blue-950'
                    : 'bg-muted-foreground/30 text-foreground',
                )}>
                  {md.digit}
                </span>
              </div>

              {/* Match probability */}
              <span className={cn(
                'text-base font-bold',
                isRecommended && coPilot?.action === 'DIFFERS' ? 'text-emerald-300'
                : isRecommended && coPilot?.action === 'MATCHES' ? 'text-amber-300'
                : isFocused ? 'text-violet-300'
                : isHighFreq ? 'text-amber-400'
                : isLowFreq ? 'text-blue-400'
                : 'text-foreground',
              )}>
                {(md.matchProbability * 100).toFixed(1)}%
              </span>
              <span className="text-[8px] text-muted-foreground mt-0.5">match</span>

              {/* Differs row */}
              <span className="text-[9px] mt-1 opacity-60 flex justify-between px-0.5">
                <span>Diff:</span>
                <span>{(md.differProbability * 100).toFixed(1)}%</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[9px] text-muted-foreground border-t border-border/20 pt-2">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />AI Differs Pick</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />AI Matches Pick</span>
        <span className="flex items-center gap-1">🧊 Coldest Digit</span>
        <span className="flex items-center gap-1">🔥 Hottest Digit</span>
      </div>
    </div>
  );
}
