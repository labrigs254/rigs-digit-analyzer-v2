/**
 * Smart R AI — Market Regime Detector
 * Classifies the current market regime from measurable statistics.
 * Never claims a regime without statistical evidence.
 */

import type { WindowStats, MarketRegime, RegimeType } from './types';

const MIN_TICKS_FOR_REGIME = 20;

/**
 * Determine the market regime from window statistics.
 * Uses entropy, concentration, streak info, repeats, transitions.
 */
export function detectRegime(
  windowStats: Map<number, WindowStats>,
  windowSizes: number[]
): MarketRegime {
  const sortedSizes = [...windowSizes].sort((a, b) => a - b);

  // Use the short-to-medium window for regime detection
  const shortSize = sortedSizes.find((s) => windowStats.has(s) && windowStats.get(s)!.tickCount >= MIN_TICKS_FOR_REGIME);
  const medSize   = sortedSizes.filter((s) => windowStats.has(s) && windowStats.get(s)!.tickCount >= MIN_TICKS_FOR_REGIME)[1];

  if (!shortSize) {
    return {
      regime: 'INSUFFICIENT_DATA',
      confidence: 100,
      evidence: ['Fewer than 20 ticks available. Cannot classify market regime.'],
      primaryWindow: 0,
    };
  }

  const ws   = windowStats.get(shortSize)!;
  const wsM  = medSize ? windowStats.get(medSize) : null;
  const n    = ws.tickCount;

  const evidence: string[] = [];
  const scores: Partial<Record<RegimeType, number>> = {};

  // Maximum entropy for 10 digits ≈ 3.32
  const MAX_ENTROPY = Math.log2(10);
  const entropyRatio = ws.entropy / MAX_ENTROPY; // 1 = perfectly uniform

  // ─── Concentration analysis ────────────────────────────────────────────
  const maxPct  = Math.max(...ws.digitPercentages);
  const maxDigit = ws.digitPercentages.indexOf(maxPct);
  const concentration = ws.digitPercentages.filter((p) => p >= 15).length;

  if (ws.chiSquare > 21.67 && n >= 50) {
    // Very significant departure from uniform (p < 0.01)
    scores['HIGH_CONCENTRATION'] = (scores['HIGH_CONCENTRATION'] ?? 0) + 40;
    evidence.push(`Chi-square statistic ${ws.chiSquare.toFixed(1)} exceeds critical value (p < 0.01 for uniform distribution).`);
  } else if (ws.chiSquare > 16.92 && n >= 30) {
    scores['HIGH_CONCENTRATION'] = (scores['HIGH_CONCENTRATION'] ?? 0) + 25;
    evidence.push(`Chi-square statistic ${ws.chiSquare.toFixed(1)} indicates significant deviation from uniform (p < 0.05).`);
  }

  if (maxPct >= 18 && n >= 30) {
    scores['HIGH_CONCENTRATION'] = (scores['HIGH_CONCENTRATION'] ?? 0) + 20;
    evidence.push(`Digit ${maxDigit} appears ${maxPct.toFixed(1)}% of the time (expected: 10%).`);
  }

  if (concentration >= 3) {
    scores['HIGH_CONCENTRATION'] = (scores['HIGH_CONCENTRATION'] ?? 0) + 15;
    evidence.push(`${concentration} digits appear ≥ 15% in the last ${n} ticks.`);
  }

  if (entropyRatio < 0.88 && n >= 50) {
    scores['HIGH_CONCENTRATION'] = (scores['HIGH_CONCENTRATION'] ?? 0) + 20;
    evidence.push(`Entropy ${ws.entropy.toFixed(2)} bits (max 3.32) — distribution is less uniform than expected.`);
  }

  // ─── Low concentration (near-uniform) ────────────────────────────────
  if (entropyRatio > 0.98 && n >= 50) {
    scores['LOW_CONCENTRATION'] = (scores['LOW_CONCENTRATION'] ?? 0) + 40;
    evidence.push(`Entropy ${ws.entropy.toFixed(2)} bits — distribution extremely close to uniform (no exploitable bias).`);
  }

  // ─── Repeating regime ────────────────────────────────────────────────
  const expectedRepeat = 0.1;
  const repeatZ = n > 1
    ? (ws.repeatFrequency - expectedRepeat) / Math.sqrt(expectedRepeat * (1 - expectedRepeat) / (n - 1))
    : 0;

  if (repeatZ >= 2.5 && n >= 20) {
    scores['REPEATING'] = (scores['REPEATING'] ?? 0) + 30 + Math.min(repeatZ * 5, 20);
    evidence.push(`Repeat frequency ${(ws.repeatFrequency * 100).toFixed(1)}% vs expected 10% (Z=${repeatZ.toFixed(1)}).`);
  }

  // ─── Streaking regime ────────────────────────────────────────────────
  if (ws.currentStreak.length >= 3) {
    scores['STREAKING'] = (scores['STREAKING'] ?? 0) + ws.currentStreak.length * 10;
    evidence.push(`Active streak: Digit ${ws.currentStreak.digit} × ${ws.currentStreak.length} consecutive ticks.`);
  }
  if (ws.longestStreak.length >= 5) {
    scores['STREAKING'] = (scores['STREAKING'] ?? 0) + 15;
    evidence.push(`Longest streak in window: Digit ${ws.longestStreak.digit} × ${ws.longestStreak.length}.`);
  }

  // ─── High transition ────────────────────────────────────────────────
  if (ws.transitionFrequency > 0.85 && n >= 30) {
    scores['HIGH_TRANSITION'] = (scores['HIGH_TRANSITION'] ?? 0) + 30;
    evidence.push(`High transition diversity: ${(ws.transitionFrequency * 100).toFixed(0)}% of possible transitions observed.`);
  }

  // ─── Unstable regime (multi-window divergence) ────────────────────────
  if (wsM) {
    const shortMaxPct = Math.max(...ws.digitPercentages);
    const medMaxPct   = Math.max(...wsM.digitPercentages);
    const divergence  = Math.abs(shortMaxPct - medMaxPct);
    if (divergence > 8 && n >= 30) {
      scores['UNSTABLE'] = (scores['UNSTABLE'] ?? 0) + 25;
      evidence.push(`Short-term peak digit (${shortMaxPct.toFixed(1)}%) diverges significantly from medium-term (${medMaxPct.toFixed(1)}%).`);
    }
    const entropyDivergence = Math.abs(ws.entropy - wsM.entropy);
    if (entropyDivergence > 0.3) {
      scores['UNSTABLE'] = (scores['UNSTABLE'] ?? 0) + 20;
      evidence.push(`Entropy divergence between windows: ${entropyDivergence.toFixed(2)} bits — regime recently shifted.`);
    }
  }

  // ─── Normal fallback ─────────────────────────────────────────────────
  scores['NORMAL'] = 10; // baseline

  // Determine winner
  const sorted = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const [winnerRegime, winnerScore] = sorted[0] as [RegimeType, number];
  const totalScore = Object.values(scores).reduce((a, b) => a + (b ?? 0), 0);
  const confidence = Math.min(Math.round((winnerScore / Math.max(totalScore, 1)) * 100 + 20), 95);

  // If no strong evidence, it's NORMAL
  if (winnerScore <= 10 && evidence.length === 0) {
    evidence.push(`No statistically significant patterns detected in the last ${n} ticks.`);
    evidence.push(`Digit distribution is consistent with a uniform random process.`);
    return { regime: 'NORMAL', confidence: 60, evidence, primaryWindow: shortSize };
  }

  return {
    regime: winnerRegime,
    confidence,
    evidence: evidence.slice(0, 5), // Cap at most informative 5
    primaryWindow: shortSize,
  };
}
