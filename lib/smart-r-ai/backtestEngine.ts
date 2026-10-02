/**
 * Smart R AI — Backtest Engine
 * Replays a historical prices array tick-by-tick, generating predictions
 * using only data available before each prediction point.
 * Strictly prevents look-ahead bias.
 */

import { computeAllWindowStats } from './digitAnalyzer';
import { computeProbabilities } from './probabilityEngine';
import { detectAllPatterns } from './patternDetector';
import { detectRegime } from './regimeDetector';
import { generatePrediction } from './predictionEngine';
import { getLastDigit } from '../digit-stats';
import type {
  BacktestConfig,
  BacktestResult,
  BacktestSummary,
  PredictionRecord,
  ConfidenceTier,
  RegimeType,
} from './types';

const DEFAULT_WINDOW_SIZES = [20, 50, 100, 250, 500, 1000];

function emptyEntry() {
  return { correct: 0, total: 0, accuracy: 0 };
}

export async function runBacktest(
  config: BacktestConfig,
  onProgress?: (current: number, total: number) => void
): Promise<BacktestResult> {
  const { prices, pipSize, windowSize } = config;
  const windowSizes = DEFAULT_WINDOW_SIZES;
  const startIndex = config.startIndex ?? Math.min(windowSize, 20);

  const records: PredictionRecord[] = [];

  // Process every tick from startIndex to len-2
  // (we need at least one more tick to evaluate the prediction)
  for (let i = startIndex; i < prices.length - 1; i++) {
    // ONLY use data up to and including prices[i] — no look-ahead
    const historySlice = prices.slice(0, i + 1);
    const lastDigit = getLastDigit(prices[i], pipSize);
    const digits = historySlice.map((p) => getLastDigit(p, pipSize));

    const windowStats = computeAllWindowStats(historySlice, pipSize, windowSizes);
    const sortedAvailable = [...windowStats.keys()].sort((a, b) => a - b);
    const activeWindow = sortedAvailable[0] ?? windowSize;

    const probs = computeProbabilities(windowStats, windowSizes, lastDigit, digits);
    const patterns = detectAllPatterns(windowStats, windowSizes, historySlice, pipSize);
    const regime = detectRegime(windowStats, windowSizes);
    const prediction = generatePrediction(
      windowStats,
      windowSizes,
      probs,
      patterns,
      regime,
      activeWindow,
      historySlice.length
    );

    const actualNextDigit = getLastDigit(prices[i + 1], pipSize);
    const predicted = prediction.primaryCandidate?.digit ?? null;
    const correct = !prediction.noTrade && predicted !== null
      ? predicted === actualNextDigit
      : null;

    records.push({
      id: `bt-${i}`,
      timestamp: i,
      symbol: 'BACKTEST',
      tickSequence: i,
      windowSize: activeWindow,
      predictedDigit: predicted,
      probability: prediction.primaryCandidate?.probability ?? null,
      modelConfidenceScore: prediction.modelConfidenceScore,
      confidenceTier: prediction.confidenceTier,
      regime: regime.regime,
      reasoning: prediction.reasoning,
      noTrade: prediction.noTrade,
      actualNextDigit,
      predictionCorrect: correct,
      evaluated: true,
    });

    if (onProgress && i % 100 === 0) {
      onProgress(i - startIndex, prices.length - 1 - startIndex);
      // Yield to keep UI responsive during large backtests
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return { config, records, summary: buildSummary(records) };
}

function buildSummary(records: PredictionRecord[]): BacktestSummary {
  const evaluated = records.filter((r) => !r.noTrade && r.predictionCorrect !== null);
  const correct   = evaluated.filter((r) => r.predictionCorrect === true).length;

  const byTier: Record<ConfidenceTier, { correct: number; total: number; accuracy: number }> = {
    VERY_LOW: emptyEntry(),
    LOW: emptyEntry(),
    MODERATE: emptyEntry(),
    HIGH: emptyEntry(),
    VERY_HIGH: emptyEntry(),
  };
  for (const r of evaluated) {
    const e = byTier[r.confidenceTier];
    e.total++;
    if (r.predictionCorrect) e.correct++;
    e.accuracy = e.total > 0 ? (e.correct / e.total) * 100 : 0;
  }

  const byRegime: Partial<Record<RegimeType, { correct: number; total: number; accuracy: number }>> = {};
  for (const r of evaluated) {
    if (!byRegime[r.regime]) byRegime[r.regime] = emptyEntry();
    const e = byRegime[r.regime]!;
    e.total++;
    if (r.predictionCorrect) e.correct++;
    e.accuracy = e.total > 0 ? (e.correct / e.total) * 100 : 0;
  }

  let maxLose = 0, curLose = 0;
  let totalConf = 0;
  for (const r of evaluated) {
    totalConf += r.modelConfidenceScore;
    if (r.predictionCorrect === false) { curLose++; maxLose = Math.max(maxLose, curLose); }
    else curLose = 0;
  }

  return {
    totalPredictions: records.length,
    noTradeCount: records.filter((r) => r.noTrade).length,
    evaluatedPredictions: evaluated.length,
    correctPredictions: correct,
    incorrectPredictions: evaluated.length - correct,
    accuracy: evaluated.length > 0 ? (correct / evaluated.length) * 100 : 0,
    averageConfidenceScore: evaluated.length > 0 ? totalConf / evaluated.length : 0,
    maxLosingStreak: maxLose,
    accuracyByConfidenceTier: byTier,
    accuracyByRegime: byRegime,
  };
}
