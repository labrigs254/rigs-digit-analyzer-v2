'use client';

/**
 * Smart R AI — Backtest Panel
 */

import { useState } from 'react';
import { Play, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WindowSelector } from './WindowSelector';
import type { BacktestResult, ConfidenceTier } from '@/lib/smart-r-ai/types';

interface BacktestPanelProps {
  isRunning: boolean;
  progress: number;
  result: BacktestResult | null;
  onRun: (windowSize: number) => void;
  onClear: () => void;
  availableTicks: number;
}

export function BacktestPanel({ isRunning, progress, result, onRun, onClear, availableTicks }: BacktestPanelProps) {
  const [selectedWindow, setSelectedWindow] = useState(50);

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-muted/5 p-4">
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Strategy Backtester</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Test the quantitative model on historical ticks without look-ahead bias.</p>
        </div>
      </div>

      {!result && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border/40 bg-muted/10 p-3 text-xs text-muted-foreground">
            Current historical session contains <span className="font-bold text-foreground">{availableTicks}</span> ticks to replay.
            {availableTicks < 100 && (
              <p className="mt-1 text-[10px] text-amber-500">Wait for more ticks to run a meaningful backtest.</p>
            )}
          </div>

          <WindowSelector 
            windowSizes={[20, 50, 100, 250, 500, 1000]}
            activeWindowSize={selectedWindow}
            onChange={setSelectedWindow}
          />

          <button
            onClick={() => onRun(selectedWindow)}
            disabled={isRunning || availableTicks < 25}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Running Backtest... {progress}%
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Backtest
              </>
            )}
          </button>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 border border-emerald-500/20">
            <span className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Check className="h-4 w-4" /> Backtest Complete
            </span>
            <span className="text-[10px] font-mono text-emerald-500/70">W-{result.config.windowSize}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/40 bg-muted/10 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Accuracy</p>
              <p className={cn(
                'mt-1 text-2xl font-black',
                result.summary.accuracy >= 15 ? 'text-emerald-400' : 'text-foreground'
              )}>
                {result.summary.accuracy.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">W: {result.summary.correctPredictions} / L: {result.summary.incorrectPredictions}</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-muted/10 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Trades Taken</p>
              <p className="mt-1 text-2xl font-black text-foreground">{result.summary.evaluatedPredictions}</p>
              <p className="text-[10px] text-muted-foreground mt-1">NO TRADE: {result.summary.noTradeCount}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Accuracy by Confidence</p>
            <div className="space-y-1">
              {(Object.entries(result.summary.accuracyByConfidenceTier) as [ConfidenceTier, any][]).map(([tier, data]) => {
                if (data.total === 0) return null;
                return (
                  <div key={tier} className="flex items-center justify-between text-xs rounded border border-border/30 px-2 py-1 bg-muted/5">
                    <span className="w-24 text-[10px] font-bold text-muted-foreground">{tier.replace('_', ' ')}</span>
                    <div className="flex-1 px-3">
                      <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(data.accuracy * 5, 100)}%` }} />
                      </div>
                    </div>
                    <span className="w-10 text-right font-mono">{data.accuracy.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={onClear}
            className="flex items-center justify-center gap-1 mt-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear Results <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
