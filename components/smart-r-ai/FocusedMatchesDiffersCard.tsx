'use client';

/**
 * Smart R AI — Focused Matches/Differs Card
 *
 * Primary analysis card for the selected Matches or Differs contract.
 * Shows a single-digit focused view including:
 * - Contract label (e.g. "MATCHES 7")
 * - Observed frequency (count / ticksAnalyzed)
 * - Match probability + Differs probability from the AI engine
 * - Statistical confidence / standard error
 * - Relevant recent occurrences in the active window
 *
 * This replaces the 10-card-all-at-once MatchesDiffersPanel as the default view.
 * The full 10-digit grid remains available in the collapsible section.
 */

import { cn } from '@/lib/utils';
import type { ContractMode } from '@/lib/types';
import type { MatchDifferAnalysis, WindowStats } from '@/lib/smart-r-ai/types';

interface FocusedMatchesDiffersCardProps {
  contractMode: ContractMode;
  selectedDigit: number;
  matchesDiffers: MatchDifferAnalysis[];
  windowStats: WindowStats | null;
  ticksAnalyzed: number;
}

export function FocusedMatchesDiffersCard({
  contractMode,
  selectedDigit,
  matchesDiffers,
  windowStats,
  ticksAnalyzed,
}: FocusedMatchesDiffersCardProps) {
  const isMatches = contractMode === 'DIGITMATCH';
  const md = matchesDiffers[selectedDigit] ?? null;
  const counts = windowStats?.digitCounts ?? null;
  const pcts = windowStats?.digitPercentages ?? null;

  const digitCount = counts ? counts[selectedDigit] : null;
  const digitPct = pcts ? pcts[selectedDigit] : null;

  // Estimated probabilities from AI engine
  const matchProb = md ? md.matchProbability : null;
  const differProb = md ? md.differProbability : null;

  // Standard error as a confidence proxy — SE = sqrt(p(1-p)/n)
  const p = matchProb ?? 0.1;
  const se = ticksAnalyzed > 0 ? Math.sqrt((p * (1 - p)) / ticksAnalyzed) : null;

  const contractLabel = isMatches ? `MATCHES ${selectedDigit}` : `DIFFERS ${selectedDigit}`;
  const primaryProb = isMatches ? matchProb : differProb;
  const primaryPct = isMatches
    ? digitPct
    : digitPct !== null
      ? 100 - digitPct
      : null;

  const themeActive = isMatches
    ? 'border-amber-500/40 bg-amber-500/5 shadow-sm shadow-amber-500/10'
    : 'border-emerald-500/40 bg-emerald-500/5 shadow-sm shadow-emerald-500/10';

  const themeAccent   = isMatches ? 'text-amber-400' : 'text-emerald-400';
  const themeBadgeBg  = isMatches
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  const themeBarFill  = isMatches
    ? 'bg-gradient-to-r from-amber-600 to-amber-400'
    : 'bg-gradient-to-r from-emerald-600 to-emerald-400';

  const hasData = ticksAnalyzed >= 10;

  return (
    <div className={cn('rounded-2xl border p-5 transition-all duration-300', themeActive)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block">
            SMART R ANALYSIS
          </span>
          <span className={cn('text-2xl font-black tracking-tight mt-0.5 block', themeAccent)}>
            {contractLabel}
          </span>
        </div>
        <span className={cn('rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide', themeBadgeBg)}>
          {isMatches ? 'MATCH' : 'DIFFER'}
        </span>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">INSUFFICIENT DATA</p>
          <p className="text-xs mt-1">
            Collecting ticks… ({ticksAnalyzed}/10 needed)
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Primary probability */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block">
                {isMatches ? 'Est. Match Probability' : 'Est. Differs Probability'}
              </span>
              <span className={cn('text-4xl font-black tabular-nums mt-0.5', themeAccent)}>
                {primaryProb !== null
                  ? `${(primaryProb * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block">
                Observed Freq.
              </span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">
                {primaryPct !== null ? `${primaryPct.toFixed(1)}%` : '—'}
              </span>
              {digitCount !== null && (
                <span className="text-xs text-muted-foreground">
                  ({isMatches ? digitCount : ticksAnalyzed - digitCount} of {ticksAnalyzed})
                </span>
              )}
            </div>
          </div>

          {/* Probability bar */}
          {primaryProb !== null && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Probability bar</span>
                <span className={cn('font-semibold', themeAccent)}>
                  {(primaryProb * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', themeBarFill)}
                  style={{ width: `${Math.min(primaryProb * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Supplementary stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border/40 bg-muted/10 p-2.5 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-0.5">
                Ticks
              </span>
              <span className="text-base font-black text-foreground">{ticksAnalyzed}</span>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/10 p-2.5 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-0.5">
                {isMatches ? 'Differ Prob' : 'Match Prob'}
              </span>
              <span className="text-base font-black text-foreground">
                {isMatches
                  ? differProb !== null ? `${(differProb * 100).toFixed(1)}%` : '—'
                  : matchProb !== null ? `${(matchProb * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/10 p-2.5 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-0.5">
                Std. Error
              </span>
              <span className="text-base font-black text-foreground">
                {se !== null ? `±${(se * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          {/* Context note */}
          <p className="text-[10px] text-muted-foreground italic">
            Probability is estimated from observed tick statistics. {isMatches
              ? `Baseline for any single digit is 10%.`
              : `Baseline for differs (any of 9 digits) is 90%.`
            } Always apply risk management.
          </p>
        </div>
      )}
    </div>
  );
}
