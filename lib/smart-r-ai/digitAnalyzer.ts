/**
 * Smart R AI — Digit Analyzer
 * Computes multi-window rolling statistics from a raw prices array.
 */

import { getLastDigit } from '../digit-stats';
import type { WindowStats } from './types';

const EXPECTED_PCT = 10; // Each digit expected ~10% in uniform distribution

// Approximate chi-square p-value for df=9 (10 digits - 1)
function chiSquarePValue(chiSq: number): number {
  // Simple lookup table for df=9 critical values
  if (chiSq < 2.09) return 0.99;
  if (chiSq < 3.33) return 0.95;
  if (chiSq < 4.17) return 0.90;
  if (chiSq < 7.36) return 0.60;
  if (chiSq < 14.68) return 0.10;
  if (chiSq < 16.92) return 0.05;
  if (chiSq < 21.67) return 0.01;
  return 0.001;
}

/**
 * Shannon entropy of a digit-probability distribution.
 * Max is log2(10) ≈ 3.32 for uniform.
 */
function shannonEntropy(percentages: number[]): number {
  return percentages.reduce((sum, p) => {
    const frac = p / 100;
    return frac > 0 ? sum - frac * Math.log2(frac) : sum;
  }, 0);
}

/**
 * Build a gap array (list of tick distances between appearances) for each digit.
 */
function buildGaps(digits: number[]): number[][] {
  const lastSeen = new Array(10).fill(-1);
  const gaps: number[][] = Array.from({ length: 10 }, () => []);
  for (let i = 0; i < digits.length; i++) {
    const d = digits[i];
    if (lastSeen[d] !== -1) {
      gaps[d].push(i - lastSeen[d]);
    }
    lastSeen[d] = i;
  }
  return gaps;
}

/**
 * Compute full WindowStats for a slice of digit values.
 */
export function computeWindowStats(digits: number[], windowSize: number): WindowStats {
  const n = digits.length;

  // ─── Digit counts & percentages ───────────────────────────
  const counts = new Array(10).fill(0);
  for (const d of digits) counts[d]++;
  const percentages = counts.map((c) => (n > 0 ? (c / n) * 100 : 0));
  const deviations = percentages.map((p) => p - EXPECTED_PCT);
  const zScores = deviations.map((dev) => {
    const se = Math.sqrt((EXPECTED_PCT / 100) * (1 - EXPECTED_PCT / 100) / Math.max(n, 1)) * 100;
    return se > 0 ? dev / se : 0;
  });
  const standardErrors = percentages.map((p) => {
    const prop = p / 100;
    return Math.sqrt((prop * (1 - prop)) / Math.max(n, 1)) * 100;
  });

  // ─── Chi-square ────────────────────────────────────────────
  const expected = n / 10;
  const chiSquare = expected > 0
    ? counts.reduce((s, c) => s + Math.pow(c - expected, 2) / expected, 0)
    : 0;
  const chiSquarePVal = chiSquarePValue(chiSquare);

  // ─── Entropy ───────────────────────────────────────────────
  const entropy = shannonEntropy(percentages);

  // ─── Streaks ───────────────────────────────────────────────
  let longestStreak = { digit: -1, length: 0 };
  let currentStreak = { digit: -1, length: 0 };
  if (digits.length > 0) {
    let runDigit = digits[0];
    let runLen = 1;
    let maxLen = 1;
    let maxDigit = runDigit;
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] === runDigit) {
        runLen++;
        if (runLen > maxLen) { maxLen = runLen; maxDigit = runDigit; }
      } else {
        runDigit = digits[i];
        runLen = 1;
      }
    }
    longestStreak = { digit: maxDigit, length: maxLen };
    // Current streak = trailing run
    const last = digits[digits.length - 1];
    let cLen = 1;
    for (let i = digits.length - 2; i >= 0; i--) {
      if (digits[i] === last) cLen++; else break;
    }
    currentStreak = { digit: last, length: cLen };
  }

  // ─── Gap analysis ──────────────────────────────────────────
  const gaps = buildGaps(digits);
  const lastSeen = new Array(10).fill(n); // default: never seen → treat as windowSize gap
  for (let i = digits.length - 1; i >= 0; i--) {
    const d = digits[i];
    if (lastSeen[d] === n) lastSeen[d] = digits.length - 1 - i;
  }
  const averageGap = gaps.map((g) => (g.length > 0 ? g.reduce((a, b) => a + b, 0) / g.length : n));
  const maxGap = gaps.map((g) => (g.length > 0 ? Math.max(...g) : n));

  // ─── Transition matrix ─────────────────────────────────────
  const transitionMatrix: number[][] = Array.from({ length: 10 }, () => new Array(10).fill(0));
  for (let i = 1; i < digits.length; i++) {
    transitionMatrix[digits[i - 1]][digits[i]]++;
  }

  // Transition frequency: fraction of distinct (prev→next) pairs vs possible 90
  let distinctTransitions = 0;
  for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) {
    if (a !== b && transitionMatrix[a][b] > 0) distinctTransitions++;
  }
  const transitionFrequency = n > 1 ? distinctTransitions / 90 : 0;

  // Repeat frequency: fraction of ticks where digit == prev digit
  let repeats = 0;
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] === digits[i - 1]) repeats++;
  }
  const repeatFrequency = n > 1 ? repeats / (n - 1) : 0;

  // ─── Even / Odd ────────────────────────────────────────────
  const evenDigits = [0, 2, 4, 6, 8];
  const evenCount = evenDigits.reduce((s, d) => s + counts[d], 0);
  const oddCount = n - evenCount;
  const evenPct = n > 0 ? (evenCount / n) * 100 : 50;
  const oddPct = n > 0 ? (oddCount / n) * 100 : 50;

  return {
    windowSize,
    tickCount: n,
    digitCounts: counts,
    digitPercentages: percentages,
    deviations,
    zScores,
    standardErrors,
    longestStreak,
    currentStreak,
    lastSeenPosition: lastSeen,
    averageGap,
    maxGap,
    transitionMatrix,
    transitionFrequency,
    repeatFrequency,
    entropy,
    chiSquare,
    chiSquarePValue: chiSquarePVal,
    evenCount,
    oddCount,
    evenPct,
    oddPct,
  };
}

/**
 * Compute multiple rolling window stats from a prices array.
 * Returns a Map of windowSize → WindowStats.
 * Only computes windows for which there are at least 5 ticks.
 */
export function computeAllWindowStats(
  prices: number[],
  pipSize: number,
  windowSizes: number[]
): Map<number, WindowStats> {
  const digits = prices.map((p) => getLastDigit(p, pipSize));
  const result = new Map<number, WindowStats>();

  for (const size of windowSizes) {
    const slice = digits.slice(-size);
    if (slice.length >= 5) {
      result.set(size, computeWindowStats(slice, size));
    }
  }
  return result;
}
