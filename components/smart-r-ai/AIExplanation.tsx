'use client';

/**
 * Smart R AI — AI Explanation Panel
 * Renders structured, executive-level natural language interpretation.
 */

import { Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIAnalysis } from '@/lib/smart-r-ai/types';

interface AIExplanationProps {
  analysis: AIAnalysis | null;
}

export function AIExplanation({ analysis }: AIExplanationProps) {
  if (!analysis) {
    return (
      <div className="flex h-36 flex-col items-center justify-center text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 bg-muted/10 p-6 text-center">
        <Sparkles className="mb-2 h-6 w-6 text-violet-400 opacity-60 animate-pulse" />
        <p className="font-medium text-foreground">Waiting for AI Quantitative Analysis…</p>
        <p className="text-xs text-muted-foreground mt-1">Collecting tick data to synthesize real-time insights.</p>
      </div>
    );
  }

  const { regime, prediction, patterns, probabilities, dataQuality } = analysis;
  const primary = prediction.primaryCandidate;
  const isNoTrade = prediction.noTrade;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-card/60 backdrop-blur-sm overflow-hidden shadow-lg">
      {/* Executive Header */}
      <div className="border-b border-border/40 bg-gradient-to-r from-violet-950/40 via-background to-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              AI Quantitative Insights
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Real-time statistical synthesis • {dataQuality.rating} Data Quality
            </p>
          </div>
        </div>

        {/* Signal Status Badge */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide border shadow-sm',
            isNoTrade
              ? 'bg-zinc-900/80 text-zinc-300 border-zinc-700'
              : prediction.signalState === 'SIGNAL'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-950/50'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
          )}
        >
          {isNoTrade ? (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              NO TRADE
            </>
          ) : prediction.signalState === 'SIGNAL' ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              STRONG SIGNAL
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              {prediction.signalState}
            </>
          )}
        </span>
      </div>

      {/* Main Content Body */}
      <div className="p-4 space-y-4 text-xs">
        {/* Market Condition Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Regime Card */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Market Regime
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-400" />
              <span className="font-bold text-foreground capitalize">
                {regime.regime.replace(/_/g, ' ').toLowerCase()}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Confidence: <span className="font-semibold text-foreground">{regime.confidence}%</span>
            </p>
          </div>

          {/* Leading Candidate Card */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Primary Bias
            </span>
            {primary ? (
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-violet-400">Digit {primary.digit}</span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {(primary.probability * 100).toFixed(1)}%
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground italic">None detected</span>
            )}
          </div>

          {/* Model Confidence */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Evidence Strength
            </span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">
                {(probabilities.evidenceStrength * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {prediction.confidenceTier.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Actionable Executive Takeaways */}
        <div className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px]">
            <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
            <span>AI QUANTITATIVE SUMMARY</span>
          </div>

          {isNoTrade ? (
            <div className="space-y-1.5">
              <p className="text-zinc-300 font-medium">
                The engine recommends <span className="font-bold text-amber-400">HOLDING TRADE EXECUTIONS</span> under current conditions.
              </p>
              <ul className="space-y-1 text-muted-foreground pl-1">
                {prediction.noTradeReasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-zinc-200">
                Statistical evidence favors <span className="font-bold text-emerald-400">Digit {primary?.digit}</span> with an estimated probability of <span className="font-bold text-foreground">{(primary ? primary.probability * 100 : 0).toFixed(1)}%</span> (baseline: 10%).
              </p>
              {patterns.length > 0 && (
                <p className="text-muted-foreground">
                  Key pattern detected: <span className="text-foreground font-medium">{patterns[0].description}</span>.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

