'use client';

/**
 * Smart R AI — Co-Pilot Action Card
 *
 * The primary trading command center. Supports:
 * - HOLD: yellow warning — standby
 * - DIFFERS: emerald card with target digit & gap stats
 * - MATCHES: amber card with target digit & frequency stats
 * - EVEN: violet card with even/odd ratio stats
 * - ODD: sky blue card with even/odd ratio stats
 */

import { cn } from '@/lib/utils';
import { ShieldAlert, TrendingUp, TrendingDown, Clock, Target, Percent, Scale } from 'lucide-react';
import type { CoPilotRecommendation } from '@/lib/smart-r-ai/types';

interface CoPilotCardProps {
  coPilot: CoPilotRecommendation | null;
  tickCount: number;
}

export function CoPilotCard({ coPilot, tickCount }: CoPilotCardProps) {
  // Waiting for data
  if (!coPilot || tickCount < 20) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-muted/10 px-5 py-6 text-center">
        <div className="mb-2 flex justify-center">
          <div className="h-3 w-3 animate-pulse rounded-full bg-violet-400 shadow-lg shadow-violet-500/50" />
        </div>
        <p className="text-sm font-bold text-foreground">Co-Pilot is warming up…</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Collecting live ticks ({tickCount}/20 needed). Hold tight!
        </p>
      </div>
    );
  }

  const isHold    = coPilot.action === 'HOLD';
  const isDiffers = coPilot.action === 'DIFFERS';
  const isMatches = coPilot.action === 'MATCHES';
  const isEven    = coPilot.action === 'EVEN';
  const isOdd     = coPilot.action === 'ODD';

  const themeBorder = isHold
    ? 'border-yellow-500/30 bg-yellow-500/5'
    : isDiffers
    ? 'border-emerald-500/40 bg-emerald-500/7 shadow-lg shadow-emerald-500/10'
    : isMatches
    ? 'border-amber-500/40 bg-amber-500/7 shadow-lg shadow-amber-500/10'
    : isEven
    ? 'border-purple-500/40 bg-purple-500/7 shadow-lg shadow-purple-500/10'
    : 'border-sky-500/40 bg-sky-500/7 shadow-lg shadow-sky-500/10';

  const accentGradient = isDiffers
    ? 'bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0'
    : isMatches
    ? 'bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0'
    : isEven
    ? 'bg-gradient-to-r from-purple-500/0 via-purple-400 to-purple-500/0'
    : 'bg-gradient-to-r from-sky-500/0 via-sky-400 to-sky-500/0';

  const themeText = isHold
    ? 'text-yellow-400'
    : isDiffers
    ? 'text-emerald-400'
    : isMatches
    ? 'text-amber-400'
    : isEven
    ? 'text-purple-400'
    : 'text-sky-400';

  const themeBrightText = isHold
    ? 'text-yellow-300'
    : isDiffers
    ? 'text-emerald-300'
    : isMatches
    ? 'text-amber-300'
    : isEven
    ? 'text-purple-300'
    : 'text-sky-300';

  const themeInstructionBox = isHold
    ? 'bg-yellow-500/10 border-yellow-500/20'
    : isDiffers
    ? 'bg-emerald-500/10 border-emerald-500/25'
    : isMatches
    ? 'bg-amber-500/10 border-amber-500/25'
    : isEven
    ? 'bg-purple-500/10 border-purple-500/25'
    : 'bg-sky-500/10 border-sky-500/25';

  const themeBadge = isDiffers
    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
    : isMatches
    ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
    : isEven
    ? 'border-purple-500/30 bg-purple-500/15 text-purple-300'
    : 'border-sky-500/30 bg-sky-500/15 text-sky-300';

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border transition-all duration-500', themeBorder)}>
      {/* Animated top accent bar */}
      {!isHold && <div className={cn('absolute inset-x-0 top-0 h-1 animate-pulse', accentGradient)} />}

      <div className="px-5 py-4">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isHold ? (
              <ShieldAlert className="h-4 w-4 text-yellow-400" />
            ) : isDiffers ? (
              <TrendingDown className="h-4 w-4 text-emerald-400" />
            ) : isMatches ? (
              <TrendingUp className="h-4 w-4 text-amber-400" />
            ) : (
              <Scale className={cn('h-4 w-4', themeText)} />
            )}
            <span className={cn('text-[10px] font-extrabold uppercase tracking-widest', themeText)}>
              {isHold ? 'CO-PILOT — STANDBY' : `CO-PILOT — ${coPilot.action} SIGNAL`}
            </span>
          </div>

          {/* Confidence badge */}
          {!isHold && (
            <span className={cn('rounded-full border px-3 py-0.5 text-[11px] font-extrabold font-mono', themeBadge)}>
              {coPilot.confidence}% Confidence
            </span>
          )}
        </div>

        {/* ── Main Instruction ─────────────────────────────────────────── */}
        <div className={cn('my-3 rounded-xl border px-4 py-4 text-center', themeInstructionBox)}>
          <p className={cn('text-lg font-black leading-tight tracking-tight sm:text-xl', themeBrightText)}>
            {coPilot.instruction}
          </p>
          {!isHold && (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              👉 {coPilot.entryHint}
            </p>
          )}
        </div>

        {/* ── Stat Reason ──────────────────────────────────────────────── */}
        <p className="mb-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          {coPilot.reason}
        </p>

        {/* ── Stats Row for Digit Contracts (Matches / Differs) ─────────── */}
        {!isHold && coPilot.recommendedDigit !== null && (
          <div className="grid grid-cols-3 gap-2">
            {/* Digit */}
            <div className={cn('flex flex-col items-center justify-center rounded-xl border py-3', themeInstructionBox)}>
              <Target className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Digit</span>
              <span className={cn('mt-0.5 text-2xl font-black', themeBrightText)}>{coPilot.recommendedDigit}</span>
            </div>

            {/* Ticks */}
            <div className={cn('flex flex-col items-center justify-center rounded-xl border py-3', themeInstructionBox)}>
              <Clock className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ticks</span>
              <span className={cn('mt-0.5 text-2xl font-black', themeBrightText)}>{coPilot.ticks}</span>
            </div>

            {/* Win Edge */}
            <div className={cn('flex flex-col items-center justify-center rounded-xl border py-3', themeInstructionBox)}>
              <Percent className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Edge</span>
              <span className={cn('mt-0.5 text-lg font-black', themeBrightText)}>
                {isDiffers
                  ? `~${(100 - (coPilot.coldFrequency ?? 10)).toFixed(0)}%`
                  : `+${((coPilot.hotFrequency ?? 10) - 10).toFixed(1)}pp`}
              </span>
            </div>
          </div>
        )}

        {/* ── Stats Row for Even / Odd Contracts ────────────────────────── */}
        {!isHold && (isEven || isOdd) && (
          <div className="grid grid-cols-3 gap-2">
            <div className={cn('flex flex-col items-center justify-center rounded-xl border py-3', themeInstructionBox)}>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Even %</span>
              <span className="mt-0.5 text-xl font-black text-purple-300">{(coPilot.evenPct ?? 50).toFixed(1)}%</span>
            </div>
            <div className={cn('flex flex-col items-center justify-center rounded-xl border py-3', themeInstructionBox)}>
              <Clock className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ticks</span>
              <span className={cn('mt-0.5 text-2xl font-black', themeBrightText)}>{coPilot.ticks}</span>
            </div>
            <div className={cn('flex flex-col items-center justify-center rounded-xl border py-3', themeInstructionBox)}>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Odd %</span>
              <span className="mt-0.5 text-xl font-black text-sky-300">{(coPilot.oddPct ?? 50).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* ── Cold / Hot Context Bar ───────────────────────────────────── */}
        {(coPilot.hotDigit !== null || coPilot.coldDigit !== null) && (
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            {coPilot.coldDigit !== null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-blue-300 font-semibold">
                🧊 Cold: Digit {coPilot.coldDigit} (absent {coPilot.coldGap} ticks, {coPilot.coldFrequency.toFixed(1)}%)
              </span>
            )}
            {coPilot.hotDigit !== null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-orange-300 font-semibold">
                🔥 Hot: Digit {coPilot.hotDigit} ({coPilot.hotFrequency.toFixed(1)}%)
              </span>
            )}
            {coPilot.evenPct !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-purple-300 font-semibold">
                ⚖️ Even/Odd Ratio: {coPilot.evenPct.toFixed(0)}% / {coPilot.oddPct?.toFixed(0)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
