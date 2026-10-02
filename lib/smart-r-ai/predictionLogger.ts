/**
 * Smart R AI — Prediction Logger
 * In-memory record of all predictions produced by the engine.
 * Automatically evaluates correctness when the next tick arrives.
 */

import type {
  PredictionRecord,
  PredictionLogStats,
  ConfidenceTier,
  RegimeType,
} from './types';

const CONFIDENCE_TIERS: ConfidenceTier[] = ['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'];

function emptyTierEntry() {
  return { correct: 0, total: 0, accuracy: 0 };
}

function buildTierMap(): Record<ConfidenceTier, { correct: number; total: number; accuracy: number }> {
  return Object.fromEntries(CONFIDENCE_TIERS.map((t) => [t, emptyTierEntry()])) as Record<
    ConfidenceTier,
    { correct: number; total: number; accuracy: number }
  >;
}

/**
 * Mutable prediction log. Call `addPrediction` each tick,
 * `evaluateLast` after the next tick arrives.
 */
export class PredictionLogger {
  private records: PredictionRecord[] = [];
  private tickSequence = 0;

  /** Record a new prediction before the next tick. */
  addPrediction(record: Omit<PredictionRecord, 'actualNextDigit' | 'predictionCorrect' | 'evaluated'>): void {
    this.records.push({
      ...record,
      actualNextDigit: null,
      predictionCorrect: null,
      evaluated: false,
    });
    this.tickSequence++;
  }

  /**
   * Evaluate the most recent unevaluated prediction against the actual next digit.
   * Skips NO_TRADE entries in correctness scoring but still marks them evaluated.
   */
  evaluateLast(actualDigit: number): void {
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i];
      if (!r.evaluated) {
        r.actualNextDigit = actualDigit;
        if (!r.noTrade && r.predictedDigit !== null) {
          r.predictionCorrect = r.predictedDigit === actualDigit;
        } else {
          r.predictionCorrect = null; // NO_TRADE: not scored
        }
        r.evaluated = true;
        break;
      }
    }
  }

  /** Return a copy of the full records array. */
  getRecords(): PredictionRecord[] {
    return [...this.records];
  }

  /** Return the last N records. */
  getRecentRecords(n = 50): PredictionRecord[] {
    return this.records.slice(-n);
  }

  /** Compute aggregate performance statistics. */
  getStats(): PredictionLogStats {
    const evaluated = this.records.filter((r) => r.evaluated && !r.noTrade && r.predictionCorrect !== null);
    const noTradeCount = this.records.filter((r) => r.noTrade).length;

    const correctCount = evaluated.filter((r) => r.predictionCorrect === true).length;
    const incorrectCount = evaluated.filter((r) => r.predictionCorrect === false).length;
    const accuracy = evaluated.length > 0 ? (correctCount / evaluated.length) * 100 : 0;

    // By confidence tier
    const byTier = buildTierMap();
    for (const r of evaluated) {
      const entry = byTier[r.confidenceTier];
      entry.total++;
      if (r.predictionCorrect) entry.correct++;
      entry.accuracy = entry.total > 0 ? (entry.correct / entry.total) * 100 : 0;
    }

    // By regime
    const byRegime: Partial<Record<RegimeType, { correct: number; total: number; accuracy: number }>> = {};
    for (const r of evaluated) {
      if (!byRegime[r.regime]) byRegime[r.regime] = emptyTierEntry();
      const entry = byRegime[r.regime]!;
      entry.total++;
      if (r.predictionCorrect) entry.correct++;
      entry.accuracy = entry.total > 0 ? (entry.correct / entry.total) * 100 : 0;
    }

    // Losing streak
    let maxLose = 0;
    let curLose = 0;
    for (const r of evaluated) {
      if (r.predictionCorrect === false) {
        curLose++;
        maxLose = Math.max(maxLose, curLose);
      } else {
        curLose = 0;
      }
    }

    return {
      totalPredictions: this.records.length,
      noTradeCount,
      evaluatedCount: evaluated.length,
      correctCount,
      incorrectCount,
      accuracy,
      accuracyByConfidenceTier: byTier,
      accuracyByRegime: byRegime,
      maxLosingStreak: maxLose,
      currentLosingStreak: curLose,
    };
  }

  /** Clear all records (for testing / reset). */
  clear(): void {
    this.records = [];
    this.tickSequence = 0;
  }
}
