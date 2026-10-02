'use client';

/**
 * Smart R AI — Digit Probability Table
 * High-contrast table with Hot/Cold badges, probability heatmaps, and Z-scores.
 */

import { Flame, Snowflake, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WindowStats, DigitProbabilities } from '@/lib/smart-r-ai/types';

interface DigitProbabilityTableProps {
  probabilities: DigitProbabilities | null;
  windowStats: WindowStats | null;
  selectedDigit?: number | null;
}

function statusBadge(zScore: number, count: number) {
  if (count < 5) return { label: 'LOW DATA', cls: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/50', icon: null };
  if (zScore >= 2.0)  return { label: 'HOT 🔥', cls: 'bg-red-500/20 text-red-400 border-red-500/40 shadow-sm shadow-red-950', icon: Flame };
  if (zScore >= 1.0)  return { label: 'ABOVE ↑', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: null };
  if (zScore <= -2.0) return { label: 'COLD 🧊', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-950', icon: Snowflake };
  if (zScore <= -1.0) return { label: 'BELOW ↓', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: null };
  return { label: 'NORMAL', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Minus };
}

export function DigitProbabilityTable({
  probabilities,
  windowStats,
  selectedDigit,
}: DigitProbabilityTableProps) {
  const probs     = probabilities?.probabilities ?? new Array(10).fill(0.1);
  const pcts      = windowStats?.digitPercentages ?? new Array(10).fill(0);
  const zScores   = windowStats?.zScores          ?? new Array(10).fill(0);
  const counts    = windowStats?.digitCounts       ?? new Array(10).fill(0);
  const n         = windowStats?.tickCount         ?? 0;

  const maxProb   = Math.max(...probs);

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="py-2.5 px-3 text-left font-bold">Digit</th>
            <th className="py-2.5 px-3 text-right font-bold">Probability</th>
            <th className="py-2.5 px-3 text-right font-bold">Observed Freq</th>
            <th className="py-2.5 px-3 text-right font-bold">Deviation</th>
            <th className="py-2.5 px-3 text-right font-bold">Z-Score</th>
            <th className="py-2.5 px-3 text-center font-bold">State</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {Array.from({ length: 10 }, (_, d) => {
            const prob   = probs[d];
            const pct    = pcts[d];
            const z      = zScores[d];
            const dev    = pct - 10;
            const badge  = statusBadge(z, counts[d]);
            const isTop  = prob === maxProb;
            const isSel  = selectedDigit === d;
            const Icon   = badge.icon;

            return (
              <tr
                key={d}
                className={cn(
                  'transition-colors duration-150',
                  isSel ? 'bg-violet-500/15 font-semibold' :
                  isTop ? 'bg-emerald-500/5' : 'hover:bg-muted/30'
                )}
              >
                {/* Digit Badge */}
                <td className="py-2 px-3">
                  <span className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-lg font-black text-xs shadow-sm',
                    isSel  ? 'bg-violet-600 text-white ring-2 ring-violet-400/50' :
                    isTop  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                    'bg-muted/60 text-foreground border border-border/50'
                  )}>
                    {d}
                  </span>
                </td>

                {/* Probability Heatmap Cell */}
                <td className="py-2 px-3 text-right font-mono">
                  <div className="flex items-center justify-end gap-2">
                    <span className={cn(
                      'font-bold text-xs',
                      isTop ? 'text-emerald-400' : 'text-foreground'
                    )}>
                      {(prob * 100).toFixed(1)}%
                    </span>
                    {/* Visual meter bar */}
                    <div className="w-12 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isTop ? 'bg-emerald-400' : 'bg-violet-500/70'
                        )}
                        style={{ width: `${Math.min(prob * 500, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Frequency */}
                <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                  {n > 0 ? (
                    <span>
                      <strong className="text-foreground">{pct.toFixed(1)}%</strong>
                      <span className="ml-1 text-[10px] text-muted-foreground">({counts[d]})</span>
                    </span>
                  ) : '—'}
                </td>

                {/* Deviation */}
                <td className={cn(
                  'py-2 px-3 text-right font-mono font-bold text-xs',
                  dev > 3  ? 'text-red-400' :
                  dev > 0  ? 'text-amber-400' :
                  dev < -3 ? 'text-cyan-300' :
                  dev < 0  ? 'text-blue-400' : 'text-muted-foreground',
                )}>
                  {n > 0 ? `${dev >= 0 ? '+' : ''}${dev.toFixed(1)} pp` : '—'}
                </td>

                {/* Z-Score */}
                <td className={cn(
                  'py-2 px-3 text-right font-mono text-xs',
                  Math.abs(z) >= 2 ? 'font-bold text-amber-400' : 'text-muted-foreground'
                )}>
                  {n > 0 ? z.toFixed(2) : '—'}
                </td>

                {/* State Badge */}
                <td className="py-2 px-3 text-center">
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border tracking-wider uppercase',
                    badge.cls
                  )}>
                    {Icon && <Icon className="h-3 w-3" />}
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

