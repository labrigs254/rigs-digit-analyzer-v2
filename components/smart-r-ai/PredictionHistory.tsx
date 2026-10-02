'use client';

/**
 * Smart R AI — Prediction History
 * Displays past predictions and overall accuracy statistics.
 */

import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PredictionLogStats, PredictionRecord } from '@/lib/smart-r-ai/types';

interface PredictionHistoryProps {
  stats: PredictionLogStats | null;
  history: PredictionRecord[];
}

export function PredictionHistory({ stats, history }: PredictionHistoryProps) {
  if (!stats || history.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground border rounded-xl bg-muted/10">
        No evaluation history available yet
      </div>
    );
  }

  // Filter to only those evaluated (where we know the outcome)
  const evaluated = history.filter(h => h.evaluated && !h.noTrade).slice(-10).reverse();

  return (
    <div className="flex flex-col gap-4">
      {/* Top stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex flex-col rounded-xl border border-border/50 bg-muted/10 p-4 items-center justify-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Win Rate</p>
          <p className={cn(
            'text-2xl font-black',
            stats.accuracy >= 15 ? 'text-emerald-400' : stats.accuracy >= 10 ? 'text-foreground' : 'text-amber-400' 
          )}>
            {stats.accuracy.toFixed(1)}%
          </p>
          <p className="text-[10px] mt-1 text-muted-foreground">Expected: 10%</p>
        </div>
        
        <div className="flex flex-col rounded-xl border border-border/50 bg-muted/10 p-4 items-center justify-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Evaluated</p>
          <p className="text-2xl font-black text-foreground">{stats.evaluatedCount}</p>
          <p className="text-[10px] mt-1 text-emerald-400">W: {stats.correctCount} / L: {stats.incorrectCount}</p>
        </div>

        <div className="flex flex-col rounded-xl border border-border/50 bg-muted/10 p-4 items-center justify-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Max Lose Streak</p>
          <p className="text-2xl font-black text-amber-400">{stats.maxLosingStreak}</p>
          <p className="text-[10px] mt-1 text-muted-foreground">Current: {stats.currentLosingStreak}</p>
        </div>

        <div className="flex flex-col rounded-xl border border-border/50 bg-muted/10 p-4 items-center justify-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">NO TRADE rate</p>
          <p className="text-2xl font-black text-zinc-400">
            {stats.totalPredictions > 0 ? ((stats.noTradeCount / stats.totalPredictions) * 100).toFixed(0) : 0}%
          </p>
          <p className="text-[10px] mt-1 text-muted-foreground">Discipline</p>
        </div>
      </div>

      {/* Recent evaluations list */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="bg-muted/30 px-4 py-2 border-b border-border/40">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recent Evaluations</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {evaluated.length === 0 ? (
             <div className="p-4 text-center text-xs text-muted-foreground">No trades evaluated yet...</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 bg-muted/10 text-muted-foreground">
                  <th className="py-2 px-4 text-left font-semibold">Predicted</th>
                  <th className="py-2 px-4 text-left font-semibold">Actual</th>
                  <th className="py-2 px-4 text-left font-semibold">Conf. Tier</th>
                  <th className="py-2 px-4 text-left font-semibold">Regime</th>
                  <th className="py-2 px-4 text-right font-semibold">Result</th>
                </tr>
              </thead>
              <tbody>
                {evaluated.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="py-2.5 px-4 font-bold">{entry.predictedDigit}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{entry.actualNextDigit}</td>
                    <td className="py-2.5 px-4">
                      <span className={cn(
                        'text-[10px] font-bold uppercase',
                        entry.confidenceTier.includes('HIGH') ? 'text-emerald-400' : 'text-muted-foreground'
                      )}>
                        {entry.confidenceTier.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[10px] uppercase text-zinc-400">
                      {entry.regime}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {entry.predictionCorrect ? (
                        <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          WIN
                        </div>
                      ) : entry.predictionCorrect === false ? (
                        <div className="flex items-center justify-end gap-1.5 text-red-400 font-semibold">
                          <XCircle className="h-3.5 w-3.5" />
                          LOSS
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 text-zinc-500">
                          <MinusCircle className="h-3.5 w-3.5" />
                          —
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
