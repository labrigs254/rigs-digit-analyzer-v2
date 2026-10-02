/**
 * Smart R AI — Probability Engine
 * Multi-factor digit probability estimation with Bayesian smoothing,
 * recency weighting, transition priors, and regime modifiers.
 * Always returns probabilities for all 10 digits summing to 1.0.
 */

import type { WindowStats, DigitProbabilities } from './types';

const ALPHA = 1; // Laplace smoothing pseudo-count per digit
const RECENCY_DECAY = 0.94; // Exponential decay per tick (more recent = higher weight)
const TRANSITION_WEIGHT = 0.15; // How much transition prior contributes

/**
 * Compute recency-weighted digit counts from a digit array.
 * More recent ticks contribute more via exponential weighting.
 */
function recencyWeightedCounts(digits: number[]): number[] {
  const weighted = new Array(10).fill(0);
  const n = digits.length;
  for (let i = 0; i < n; i++) {
    const age = n - 1 - i; // 0 = most recent
    const weight = Math.pow(RECENCY_DECAY, age);
    weighted[digits[i]] += weight;
  }
  return weighted;
}

/**
 * Laplace (add-alpha) smoothed probabilities from raw counts.
 */
function laplaceProbabilities(counts: number[], totalTicks: number): number[] {
  const smoothed = counts.map((c) => c + ALPHA);
  const totalSmoothed = totalTicks + ALPHA * 10;
  return smoothed.map((c) => c / totalSmoothed);
}

/**
 * Transition-based prior: given the last digit, what's the empirical
 * probability of each next digit based on the transition matrix?
 */
function transitionPrior(
  transitionMatrix: number[][],
  lastDigit: number | null
): number[] | null {
  if (lastDigit === null || lastDigit < 0 || lastDigit > 9) return null;
  const row = transitionMatrix[lastDigit];
  const total = row.reduce((a, b) => a + b, 0);
  if (total < 5) return null; // Not enough data for this transition row
  return row.map((c) => (c + ALPHA) / (total + ALPHA * 10));
}

/**
 * Blend an array of probability vectors by their weights.
 */
function blendProbabilities(vectors: Array<{ probs: number[]; weight: number }>): number[] {
  const totalWeight = vectors.reduce((s, v) => s + v.weight, 0);
  if (totalWeight === 0) return new Array(10).fill(0.1);
  const blended = new Array(10).fill(0);
  for (const { probs, weight } of vectors) {
    for (let d = 0; d < 10; d++) {
      blended[d] += (probs[d] * weight) / totalWeight;
    }
  }
  return blended;
}

/**
 * Normalize an array to sum to 1.
 */
function normalize(arr: number[]): number[] {
  const sum = arr.reduce((a, b) => a + b, 0);
  if (sum === 0) return new Array(10).fill(0.1);
  return arr.map((v) => v / sum);
}

/**
 * Compute the final digit probability estimates.
 *
 * Strategy:
 * 1. Short-window Laplace probabilities (highest structural weight)
 * 2. Medium-window Laplace probabilities
 * 3. Long-window Laplace probabilities (long-run baseline)
 * 4. Recency-weighted counts from the shortest available window
 * 5. Transition prior from last digit
 * 6. Final blend + normalize
 */
export function computeProbabilities(
  windowStats: Map<number, WindowStats>,
  windowSizes: number[],
  lastDigit: number | null,
  rawDigits: number[]
): DigitProbabilities {
  const sortedSizes = [...windowSizes].sort((a, b) => a - b);
  const availableSizes = sortedSizes.filter((s) => windowStats.has(s));

  if (availableSizes.length === 0) {
    // No data — return uniform
    return {
      probabilities: new Array(10).fill(0.1),
      recencyWeighted: new Array(10).fill(0.1),
      contributingWindows: [],
      evidenceStrength: 0,
    };
  }

  const vectors: Array<{ probs: number[]; weight: number }> = [];
  const contributing: number[] = [];

  // Build per-window vectors with decreasing weight for larger windows
  // Short windows get more weight as they reflect current state
  for (let i = 0; i < availableSizes.length; i++) {
    const size = availableSizes[i];
    const ws = windowStats.get(size)!;
    if (ws.tickCount < 5) continue;
    // Weight: shorter windows weighted higher (1/(rank+1) style)
    // rank 0 = smallest window = highest weight
    const rank = i;
    const weight = 1 / (rank + 1);
    const probs = laplaceProbabilities(ws.digitCounts, ws.tickCount);
    vectors.push({ probs, weight });
    contributing.push(size);
  }

  // Recency-weighted vector from most available data (up to 200 ticks)
  const recencyDigits = rawDigits.slice(-200);
  const rwCounts = recencyWeightedCounts(recencyDigits);
  const rwTotal = rwCounts.reduce((a, b) => a + b, 0);
  const rwProbs = rwTotal > 0
    ? normalize(rwCounts.map((c) => c + ALPHA))
    : new Array(10).fill(0.1);
  vectors.push({ probs: rwProbs, weight: 0.8 }); // medium weight for recency

  // Transition prior
  const shortWs = windowStats.get(availableSizes[0]);
  if (lastDigit !== null && shortWs) {
    const tp = transitionPrior(shortWs.transitionMatrix, lastDigit);
    if (tp) {
      vectors.push({ probs: tp, weight: TRANSITION_WEIGHT });
    }
  }

  const blended = blendProbabilities(vectors);
  const final = normalize(blended);

  // Evidence strength: based on tick count and chi-square signal
  const shortWsForEvidence = availableSizes.length > 0 ? windowStats.get(availableSizes[0]) : null;
  const tickCount = shortWsForEvidence?.tickCount ?? 0;
  const chiStrength = shortWsForEvidence ? Math.min(shortWsForEvidence.chiSquare / 20, 1) : 0;
  const sizeStrength = Math.min(tickCount / 100, 1);
  const evidenceStrength = (sizeStrength * 0.6 + chiStrength * 0.4);

  return {
    probabilities: final,
    recencyWeighted: rwProbs,
    contributingWindows: contributing,
    evidenceStrength: Math.min(evidenceStrength, 1),
  };
}
