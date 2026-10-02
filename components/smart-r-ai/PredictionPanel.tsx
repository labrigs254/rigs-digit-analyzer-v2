'use client';

/**
 * Smart R AI — Prediction Panel
 * Shows primary prediction, confidence tier, signal state, and
 * expandable "Why This Prediction?" detail section.
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PredictionResult } from '@/lib/smart-r-ai/types';

interface PredictionPanelProps {
  prediction: PredictionResult | null;
  focusDigit?: number;
  contractLabel?: string;
}

const signalColors: Record<string, string> = {
  NO_TRADE: 'text-zinc-400 border-zinc-600 bg-zinc-800/60',
  WAIT:     'text-amber-400 border-amber-600/40 bg-amber-500/10',
  WATCH:    'text-yellow-400 border-yellow-600/40 bg-yellow-500/10',
  SIGNAL:   'text-emerald-400 border-emerald-600/40 bg-emerald-500/10',
};

const tierColors: Record<string, { label: string; cls: string }> = {
  VERY_LOW: { label: 'VERY LOW',  cls: 'text-zinc-400 bg-zinc-800/60' },
  LOW:      { label: 'LOW',       cls: 'text-amber-400 bg-amber-500/10' },
  MODERATE: { label: 'MODERATE',  cls: 'text-yellow-400 bg-yellow-500/10' },
  HIGH:     { label: 'HIGH',      cls: 'text-emerald-400 bg-emerald-500/10' },
  VERY_HIGH:{ label: 'VERY HIGH', cls: 'text-violet-400 bg-violet-500/10' },
};

export function PredictionPanel({ prediction, focusDigit, contractLabel }: PredictionPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!prediction) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Waiting for live tick stream…
      </div>
    );
  }

  const { noTrade, primaryCandidate, secondaryCandidates, confidenceTier, signalState, modelConfidenceScore } = prediction;
  const tier = tierColors[confidenceTier];
  const signalCls = signalColors[signalState];

  return (
    <div className="flex flex-col gap-4">
      {/* Signal state header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block">
            NEXT DIGIT ANALYSIS
          </span>
          {contractLabel && (
            <span className="text-xs font-bold text-violet-400 mt-0.5 block">
              Contract: {contractLabel}
            </span>
          )}
        </div>
        <span className={cn('rounded-lg border px-3 py-1 text-xs font-bold uppercase tracking-wider', signalCls)}>
          {signalState.replace('_', ' ')}
        </span>
      </div>

      {noTrade ? (
        /* NO TRADE state */
        <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 p-4">
          <p className="mb-2 text-sm font-bold text-zinc-300">NO TRADE (SAFE GUARD ACTIVE)</p>
          <ul className="space-y-1">
            {prediction.noTradeReasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                <span className="mt-0.5 text-zinc-500">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        /* Prediction state */
        <div className="flex flex-col gap-3">
          {/* Primary digit */}
          <div className="flex items-center justify-between rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {typeof focusDigit === 'number' ? `Selected Barrier` : 'Top Candidate'}
              </p>
              <p className="mt-1 text-5xl font-black text-violet-400">
                {typeof focusDigit === 'number' ? focusDigit : primaryCandidate?.digit ?? '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Est. Probability</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {primaryCandidate ? `${(primaryCandidate.probability * 100).toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                Model confidence: <span className={cn('font-semibold', tier.cls.split(' ').find(c => c.startsWith('text-')))}>{tier.label}</span>
              </p>
            </div>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Model confidence score</span>
              <span className="font-semibold text-foreground">{modelConfidenceScore}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-500"
                style={{ width: `${modelConfidenceScore}%` }}
              />
            </div>
          </div>

          {/* Secondary candidates */}
          {secondaryCandidates.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Secondary Candidates</p>
              <div className="flex gap-2">
                {secondaryCandidates.slice(0, 3).map((c) => (
                  <div key={c.digit} className="flex-1 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-lg font-bold text-foreground">{c.digit}</p>
                    <p className="text-[10px] text-muted-foreground">{(c.probability * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Why this prediction — expandable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        <span className="font-semibold">WHY THIS PREDICTION?</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 text-xs space-y-3">
          {prediction.reasoning.length > 0 && (
            <div>
              <p className="mb-1.5 font-semibold uppercase tracking-wider text-foreground">Evidence</p>
              <ul className="space-y-1">
                {prediction.reasoning.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <span className="mt-0.5 text-emerald-500">✓</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {prediction.confidenceReductions.length > 0 && (
            <div>
              <p className="mb-1.5 font-semibold uppercase tracking-wider text-amber-400">Confidence Reductions</p>
              <ul className="space-y-1">
                {prediction.confidenceReductions.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <span className="mt-0.5 text-amber-500">↓</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-zinc-600 text-[10px] italic">
            Probabilities are calculated from live tick statistics. Always combine with risk management.
          </p>
        </div>
      )}
    </div>
  );
}
