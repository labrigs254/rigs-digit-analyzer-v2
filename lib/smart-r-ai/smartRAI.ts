/**
 * Smart R AI — Orchestrator
 * Combines all sub-engines into a single analysis call.
 * Returns the full AIAnalysis object consumed by the UI hook.
 */

import { computeAllWindowStats } from './digitAnalyzer';
import { computeProbabilities } from './probabilityEngine';
import { detectAllPatterns } from './patternDetector';
import { detectRegime } from './regimeDetector';
import { generatePrediction } from './predictionEngine';
import { getLastDigit } from '../digit-stats';
import type { AIAnalysis, DataQuality, MultiTimeframeComparison, WindowStats } from './types';

const DEFAULT_WINDOW_SIZES = [20, 50, 100, 250, 500, 1000];

function assessDataQuality(tickCount: number, isConnected: boolean): DataQuality {
  const issues: string[] = [];
  if (!isConnected) issues.push('WebSocket disconnected — data may be stale.');
  if (tickCount < 20)  return { rating: 'INSUFFICIENT', tickCount, issues };
  if (tickCount < 50)  { issues.push('Limited data — results have high uncertainty.'); return { rating: 'POOR', tickCount, issues }; }
  if (tickCount < 100) { issues.push('Moderate data — use caution with predictions.'); return { rating: 'FAIR', tickCount, issues }; }
  if (tickCount < 250) return { rating: 'GOOD', tickCount, issues };
  return { rating: 'EXCELLENT', tickCount, issues };
}

function buildMultiTimeframe(
  windowStats: Map<number, WindowStats>,
  windowSizes: number[]
): MultiTimeframeComparison {
  const sorted = [...windowSizes].sort((a, b) => a - b);
  const available = sorted.filter((s) => windowStats.has(s) && windowStats.get(s)!.tickCount >= 10);

  const shortW  = available[0] ?? 20;
  const medW    = available[Math.floor(available.length / 2)] ?? 100;
  const longW   = available[available.length - 1] ?? 500;

  const shortWs = windowStats.get(shortW);
  const medWs   = windowStats.get(medW);
  const longWs  = windowStats.get(longW);

  const shortDev = shortWs?.deviations ?? new Array(10).fill(0);
  const medDev   = medWs?.deviations   ?? new Array(10).fill(0);
  const longDev  = longWs?.deviations  ?? new Array(10).fill(0);

  // Find digits where short-term significantly diverges from long-term
  const divergent = [];
  for (let d = 0; d < 10; d++) {
    const shortPct = shortWs?.digitPercentages[d] ?? 10;
    const longPct  = longWs?.digitPercentages[d]  ?? 10;
    const delta    = shortPct - longPct;
    if (Math.abs(delta) >= 5 && (shortWs?.tickCount ?? 0) >= 20) {
      divergent.push({
        digit: d,
        shortPct,
        longPct,
        deltaStr: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pp`,
      });
    }
  }

  let interpretation = '';
  if (available.length < 2) {
    interpretation = 'Insufficient data across multiple windows for multi-timeframe comparison.';
  } else if (divergent.length === 0) {
    interpretation = 'Short-term and long-term distributions are broadly consistent. No significant multi-timeframe divergence detected.';
  } else {
    const parts = divergent.slice(0, 3).map(
      (d) => `Digit ${d.digit}: ${d.shortPct.toFixed(1)}% short-term vs ${d.longPct.toFixed(1)}% long-term (${d.deltaStr})`
    );
    interpretation = `Multi-timeframe divergence detected:\n${parts.join('\n')}\nShort-term behavior may reflect a transient fluctuation rather than a persistent bias.`;
  }

  return {
    shortTermWindow: shortW,
    mediumTermWindow: medW,
    longTermWindow: longW,
    shortTermDeviations: shortDev,
    mediumTermDeviations: medDev,
    longTermDeviations: longDev,
    divergentDigits: divergent,
    interpretation,
  };
}

function generateExplanation(analysis: Omit<AIAnalysis, 'aiExplanation'>): string {
  const { dataQuality, regime, prediction, patterns, probabilities } = analysis;

  if (dataQuality.rating === 'INSUFFICIENT') {
    return `SMART R AI\n\nData insufficient for analysis.\nCollecting tick data… (${dataQuality.tickCount} ticks received, minimum 20 required).\n\nDecision state: NO TRADE`;
  }

  const topPattern = patterns[0];
  const primary = prediction.primaryCandidate;
  const regime2 = `${regime.regime.replace(/_/g, ' ')} (${regime.confidence}% confidence)`;

  let text = `SMART R AI\n\nMarket condition: ${regime2}\n\n`;

  if (topPattern) {
    text += `Notable pattern: ${topPattern.description}\n\n`;
  }

  if (primary) {
    text += `Primary candidate: Digit ${primary.digit}\n`;
    text += `Estimated probability: ${(primary.probability * 100).toFixed(1)}%\n`;
    text += `Evidence strength: ${(probabilities.evidenceStrength * 100).toFixed(0)}%\n\n`;
    text += `Model confidence: ${prediction.confidenceTier.replace('_', ' ')}\n\n`;
  }

  if (prediction.noTrade) {
    text += `Decision state: NO TRADE\n`;
    text += prediction.noTradeReasons.slice(0, 2).map((r) => `• ${r}`).join('\n');
  } else {
    text += `Decision state: ${prediction.signalState}`;
  }

  return text;
}

/**
 * Run the full Smart R AI analysis pipeline.
 */
export function runSmartRAI(
  prices: number[],
  pipSize: number,
  windowSizes: number[] = DEFAULT_WINDOW_SIZES,
  isConnected = true,
  activeWindowSize?: number,
  contractOptions?: {
    selectedDigit?: number;
    tradeType?: string;
  }
): AIAnalysis {
  const tickCount = prices.length;
  const dataQuality = assessDataQuality(tickCount, isConnected);
  const digits = prices.map((p) => getLastDigit(p, pipSize));
  const lastDigit = digits[digits.length - 1] ?? null;

  // Compute window stats
  const windowStats = computeAllWindowStats(prices, pipSize, windowSizes);

  // Determine active window
  const sortedAvailable = [...windowStats.keys()].sort((a, b) => a - b);
  const effectiveWindow = activeWindowSize && windowStats.has(activeWindowSize)
    ? activeWindowSize
    : sortedAvailable[0] ?? windowSizes[0];

  // Run all sub-engines
  const probabilities  = computeProbabilities(windowStats, windowSizes, lastDigit, digits);
  const patterns       = detectAllPatterns(windowStats, windowSizes, prices, pipSize);
  const regime         = detectRegime(windowStats, windowSizes);
  const prediction     = generatePrediction(
    windowStats,
    windowSizes,
    probabilities,
    patterns,
    regime,
    effectiveWindow,
    tickCount,
    contractOptions
  );
  const multiTimeframe = buildMultiTimeframe(windowStats, windowSizes);

  const partial: Omit<AIAnalysis, 'aiExplanation'> = {
    timestamp: Date.now(),
    tickCount,
    lastDigit,
    dataQuality,
    windowStats,
    activeWindowSize: effectiveWindow,
    probabilities,
    patterns,
    regime,
    prediction,
    multiTimeframe,
  };

  return {
    ...partial,
    aiExplanation: generateExplanation(partial),
  };
}
