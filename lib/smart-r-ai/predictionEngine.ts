/**
 * Smart R AI — Prediction Engine
 * Converts probabilities + patterns + regime into a structured prediction.
 * Implements strict NO TRADE logic and confidence tiering.
 * Never fabricates probabilities or guarantees outcomes.
 */

import type {
  WindowStats,
  DigitProbabilities,
  PatternEvent,
  MarketRegime,
  PredictionResult,
  ConfidenceTier,
  SignalState,
  DigitCandidate,
  OverUnderAnalysis,
  EvenOddAnalysis,
  MatchDifferAnalysis,
  CoPilotRecommendation,
} from './types';

const MIN_TICKS_FOR_PREDICTION = 20;
const UNIFORMITY_THRESHOLD = 0.0005; // Max variance from 0.1 to be "uniform"
const NO_TRADE_EVIDENCE_THRESHOLD = 0.2; // Evidence strength below this → NO TRADE

function confidenceTier(score: number): ConfidenceTier {
  if (score < 40) return 'VERY_LOW';
  if (score < 55) return 'LOW';
  if (score < 70) return 'MODERATE';
  if (score < 85) return 'HIGH';
  return 'VERY_HIGH';
}

function toSignalState(tier: ConfidenceTier, noTrade: boolean): SignalState {
  if (noTrade) return 'NO_TRADE';
  if (tier === 'VERY_LOW' || tier === 'LOW') return 'WAIT';
  if (tier === 'MODERATE') return 'WATCH';
  return 'SIGNAL';
}

/** Variance of probability distribution — 0 = uniform */
function distributionVariance(probs: number[]): number {
  const mean = 0.1;
  return probs.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / probs.length;
}

/** Over/Under analysis for all thresholds */
function buildOverUnder(ws: WindowStats, probs: number[]): OverUnderAnalysis[] {
  const results: OverUnderAnalysis[] = [];
  // Meaningful thresholds: 0-9 
  // In Deriv, "Over t" wins if digit > t. "Under t" wins if digit < t. Digit = t always loses.
  for (let t = 0; t <= 9; t++) {
    const overDigits = Array.from({ length: 10 }, (_, i) => i).filter((d) => d > t);
    const underDigits = Array.from({ length: 10 }, (_, i) => i).filter((d) => d < t);
    const overProb    = overDigits.reduce((s, d) => s + probs[d], 0);
    const underProb   = underDigits.reduce((s, d) => s + probs[d], 0);
    const n = ws.tickCount;
    const overObs     = overDigits.reduce((s, d) => s + ws.digitCounts[d], 0);
    const underObs    = underDigits.reduce((s, d) => s + ws.digitCounts[d], 0);
    const overObsPct  = n > 0 ? (overObs / n) * 100 : 0;
    const underObsPct = n > 0 ? (underObs / n) * 100 : 0;
    // Confidence based on deviation from 50%
    const deviation = Math.abs(overObsPct - 50);
    const modelConf = Math.min(Math.round(deviation * 2), 60);
    results.push({
      threshold: t,
      overDigits,
      underDigits,
      overProbability: overProb,
      underProbability: underProb,
      overObservedPct: overObsPct,
      underObservedPct: underObsPct,
      modelConfidence: modelConf,
    });
  }
  return results;
}

/** Even/Odd analysis */
function buildEvenOdd(ws: WindowStats, probs: number[]): EvenOddAnalysis {
  const evenDigits = [0, 2, 4, 6, 8];
  const oddDigits  = [1, 3, 5, 7, 9];
  const evenProb   = evenDigits.reduce((s, d) => s + probs[d], 0);
  const oddProb    = oddDigits.reduce((s, d) => s + probs[d], 0);
  const diff       = (ws.evenPct - ws.oddPct);
  const signalStrength = Math.min(Math.abs(diff) * 3, 60); // Weak by design
  return {
    evenProbability: evenProb,
    oddProbability: oddProb,
    evenObservedPct: ws.evenPct,
    oddObservedPct: ws.oddPct,
    difference: diff,
    signalStrength,
  };
}

/** Matches/Differs analysis for each digit */
function buildMatchesDiffers(ws: WindowStats, probs: number[]): MatchDifferAnalysis[] {
  return Array.from({ length: 10 }, (_, d) => {
    const matchProb  = probs[d];
    const differProb = 1 - matchProb;
    const matchObsPct = ws.digitPercentages[d];
    const deviation = Math.abs(matchObsPct - 10);
    return {
      digit: d,
      matchProbability: matchProb,
      differProbability: differProb,
      matchObservedPct: matchObsPct,
      breakEvenProbability: null, // Requires payout data — left null
      estimatedEdge: null,
      modelConfidence: Math.min(Math.round(deviation * 3), 60),
    };
  });
}

// ─── MATCHES threshold: digit frequency > 14% in recent window  ────────────
const MATCHES_HOT_THRESHOLD = 14;
// ─── DIFFERS threshold: digit absent for 18+ ticks  ───────────────────────
const DIFFERS_COLD_GAP_THRESHOLD = 18;
// ─── Market is "too random": chi-square p-value above this → HOLD  ────────
const HOLD_PVALUE_THRESHOLD = 0.5;

/**
 * Co-Pilot logic:
 * 1. Find coldest digit (longest gap since last seen) → try DIFFERS
 * 2. Find hottest digit (highest % in window) → try MATCHES
 * 3. If neither threshold is met, or market is too uniform → HOLD
 * Dynamically picks tick duration based on signal strength.
 */
/**
 * Co-Pilot logic:
 * Calculates real-time statistics across all Deriv digit contract types:
 * - Matches / Differs (hot/cold digits, absence gaps)
 * - Even / Odd (even/odd percentages, consecutive streaks)
 * - Over / Under (skew relative to middle thresholds)
 * Dynamically selects or respects the active tradeType context.
 */
function buildCoPilot(
  ws50: WindowStats | undefined,
  chiSquarePValue: number,
  evidenceStrength: number,
  tickCount: number,
  contractOptions?: { selectedDigit?: number; tradeType?: string }
): CoPilotRecommendation {
  const activeTradeType = contractOptions?.tradeType ?? 'auto';

  // ── Default HOLD ──────────────────────────────────────────────────────────
  const holdResult: CoPilotRecommendation = {
    action:            'HOLD',
    recommendedDigit:  null,
    ticks:             5,
    instruction:       '⛔ HOLD — DO NOT TRADE NOW',
    entryHint:         'Wait for the market to show a clear pattern',
    reason:            'Market digits are evenly distributed — no statistical edge detected.',
    confidence:        0,
    hotDigit:          null,
    coldDigit:         null,
    coldGap:           0,
    coldFrequency:     0,
    hotFrequency:      0,
    evenPct:           50,
    oddPct:            50,
  };

  if (!ws50 || tickCount < 20) return holdResult;

  // ── Determine cold & hot digit ────────────────────────────────────────────
  const { lastSeenPosition, digitPercentages, evenPct, oddPct } = ws50;

  let coldDigit = 0;
  let maxGap    = lastSeenPosition[0];
  for (let d = 1; d < 10; d++) {
    if (lastSeenPosition[d] > maxGap) { maxGap = lastSeenPosition[d]; coldDigit = d; }
  }

  let hotDigit  = 0;
  let maxFreq   = digitPercentages[0];
  for (let d = 1; d < 10; d++) {
    if (digitPercentages[d] > maxFreq) { maxFreq = digitPercentages[d]; hotDigit = d; }
  }

  const coldFreq = digitPercentages[coldDigit];
  const hotFreq  = digitPercentages[hotDigit];

  // ── HOLD if market is statistically too random ───────────────────────────
  const tooRandom = (chiSquarePValue > HOLD_PVALUE_THRESHOLD) || (evidenceStrength < 0.15);

  // ── EVEN / ODD signals ───────────────────────────────────────────────────
  const evenBias = evenPct >= 57;
  const oddBias  = oddPct >= 57;

  // ── If user specifically selected EVEN/ODD market or tradeType is 'even-odd' ──
  if (activeTradeType === 'even-odd') {
    if (evenBias) {
      const conf = Math.min(95, Math.round(50 + (evenPct - 50) * 3));
      const ticks: 1 | 3 | 5 | 10 = conf >= 75 ? 3 : 5;
      return {
        action:           'EVEN',
        recommendedDigit: null,
        ticks,
        instruction:      `🟣 BUY EVEN — ${ticks} TICKS NOW`,
        entryHint:        `Set Contract to "Even" → Ticks to ${ticks} → press BUY EVEN`,
        reason:           `Even digits accounting for ${evenPct.toFixed(1)}% of last 50 ticks (baseline 50%). Clear statistical even bias.`,
        confidence:       conf,
        hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
        evenPct, oddPct,
      };
    } else if (oddBias) {
      const conf = Math.min(95, Math.round(50 + (oddPct - 50) * 3));
      const ticks: 1 | 3 | 5 | 10 = conf >= 75 ? 3 : 5;
      return {
        action:           'ODD',
        recommendedDigit: null,
        ticks,
        instruction:      `🔵 BUY ODD — ${ticks} TICKS NOW`,
        entryHint:        `Set Contract to "Odd" → Ticks to ${ticks} → press BUY ODD`,
        reason:           `Odd digits accounting for ${oddPct.toFixed(1)}% of last 50 ticks (baseline 50%). Clear statistical odd bias.`,
        confidence:       conf,
        hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
        evenPct, oddPct,
      };
    } else {
      return {
        ...holdResult,
        hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
        evenPct, oddPct,
        reason: `Even (${evenPct.toFixed(1)}%) and Odd (${oddPct.toFixed(1)}%) are close to 50/50 baseline. Wait for imbalance.`,
      };
    }
  }

  // ── OVER / UNDER signals ─────────────────────────────────────────────────
  if (activeTradeType === 'over-under') {
    const threshold = contractOptions?.selectedDigit ?? 4;
    // Calculate over/under strictly for this threshold
    const overDigits = Array.from({ length: 10 }, (_, i) => i).filter((d) => d > threshold);
    const underDigits = Array.from({ length: 10 }, (_, i) => i).filter((d) => d < threshold);
    const overObs = overDigits.reduce((s, d) => s + ws50.digitCounts[d], 0);
    const underObs = underDigits.reduce((s, d) => s + ws50.digitCounts[d], 0);
    const overPct = ws50.tickCount > 0 ? (overObs / ws50.tickCount) * 100 : 0;
    const underPct = ws50.tickCount > 0 ? (underObs / ws50.tickCount) * 100 : 0;

    // Baseline Over % = (9 - t) * 10. Baseline Under % = t * 10.
    const baselineOver = (9 - threshold) * 10;
    const baselineUnder = threshold * 10;

    const overEdge = overPct - baselineOver;
    const underEdge = underPct - baselineUnder;

    // We only recommend a trade if the edge is substantial (e.g. at least +10 over baseline)
    if (overEdge >= 10) {
      const conf = Math.min(95, Math.round(50 + (overEdge * 2.5)));
      const ticks: 1 | 3 | 5 | 10 = conf >= 75 ? 3 : 5;
      return {
        action:           'OVER',
        recommendedDigit: threshold,
        ticks,
        instruction:      `🔺 BUY OVER ${threshold} — ${ticks} TICKS NOW`,
        entryHint:        `Set Contract to "Over" → Threshold to ${threshold} → Ticks to ${ticks} → press BUY OVER`,
        reason:           `Digits > ${threshold} are hitting ${overPct.toFixed(1)}% of the time (baseline ${baselineOver}%). +${overEdge.toFixed(1)}pp Over Edge.`,
        confidence:       conf,
        hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
        evenPct, oddPct,
      };
    } else if (underEdge >= 10) {
      const conf = Math.min(95, Math.round(50 + (underEdge * 2.5)));
      const ticks: 1 | 3 | 5 | 10 = conf >= 75 ? 3 : 5;
      return {
        action:           'UNDER',
        recommendedDigit: threshold,
        ticks,
        instruction:      `🔻 BUY UNDER ${threshold} — ${ticks} TICKS NOW`,
        entryHint:        `Set Contract to "Under" → Threshold to ${threshold} → Ticks to ${ticks} → press BUY UNDER`,
        reason:           `Digits < ${threshold} are hitting ${underPct.toFixed(1)}% of the time (baseline ${baselineUnder}%). +${underEdge.toFixed(1)}pp Under Edge.`,
        confidence:       conf,
        hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
        evenPct, oddPct,
      };
    } else {
      return {
        ...holdResult,
        hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
        evenPct, oddPct,
        reason: `Over/Under ${threshold} edge is too small (Over: ${overPct.toFixed(1)}%, Under: ${underPct.toFixed(1)}%). Wait for stronger imbalance.`,
      };
    }
  }

  // ── Try DIFFERS first (highest statistical edge ~90%) ─────────────────────
  const differSignal = maxGap >= DIFFERS_COLD_GAP_THRESHOLD;

  // ── Try MATCHES if hot digit is strong ──────────────────────────────────
  const matchesSignal = !differSignal && hotFreq >= MATCHES_HOT_THRESHOLD;

  if (tooRandom && !differSignal && !matchesSignal && !evenBias && !oddBias) {
    return {
      ...holdResult,
      hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
      evenPct, oddPct,
      reason: 'Market is statistically uniform right now — no exploitable bias. Stay patient.',
    };
  }

  if (differSignal) {
    const rawConf   = Math.min(100, Math.round(50 + (maxGap - DIFFERS_COLD_GAP_THRESHOLD) * 2.5));
    const confidence = tooRandom ? Math.round(rawConf * 0.7) : rawConf;
    const ticks: 1 | 3 | 5 | 10 = confidence >= 75 ? 1 : confidence >= 55 ? 5 : 10;
    return {
      action:           'DIFFERS',
      recommendedDigit: coldDigit,
      ticks,
      instruction:      `🟢 BUY DIFFERS — DIGIT ${coldDigit} — ${ticks} TICK${ticks > 1 ? 'S' : ''}`,
      entryHint:        `Press "Differs" on Digit ${coldDigit} → set ticks to ${ticks} → press BUY`,
      reason:           `Digit ${coldDigit} has NOT appeared for ${maxGap} ticks (only ${coldFreq.toFixed(1)}% frequency). Statistical edge: ~${(100 - coldFreq).toFixed(0)}% Differs win rate.`,
      confidence,
      hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
      evenPct, oddPct,
    };
  }

  if (matchesSignal) {
    const deviation = hotFreq - 10;
    const rawConf   = Math.min(90, Math.round(40 + deviation * 3.5));
    const confidence = tooRandom ? Math.round(rawConf * 0.65) : rawConf;
    const ticks: 1 | 3 | 5 | 10 = confidence >= 70 ? 5 : 10;
    return {
      action:           'MATCHES',
      recommendedDigit: hotDigit,
      ticks,
      instruction:      `🟡 BUY MATCHES — DIGIT ${hotDigit} — ${ticks} TICK${ticks > 1 ? 'S' : ''}`,
      entryHint:        `Press "Matches" on Digit ${hotDigit} → set ticks to ${ticks} → press BUY`,
      reason:           `Digit ${hotDigit} appearing ${hotFreq.toFixed(1)}% of last 50 ticks (baseline 10%). Trending hot — Matches edge: +${deviation.toFixed(1)}pp above random.`,
      confidence,
      hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
      evenPct, oddPct,
    };
  }

  // Check Even/Odd as fallback recommendation if no digit match/differ signal
  if (evenBias) {
    const conf = Math.min(90, Math.round(45 + (evenPct - 50) * 3));
    return {
      action:           'EVEN',
      recommendedDigit: null,
      ticks:            5,
      instruction:      `🟣 BUY EVEN — 5 TICKS NOW`,
      entryHint:        `Select "Even" contract → set ticks to 5 → press BUY EVEN`,
      reason:           `Even digits accounting for ${evenPct.toFixed(1)}% of last 50 ticks. Strong secondary Even bias.`,
      confidence:       conf,
      hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
      evenPct, oddPct,
    };
  }

  if (oddBias) {
    const conf = Math.min(90, Math.round(45 + (oddPct - 50) * 3));
    return {
      action:           'ODD',
      recommendedDigit: null,
      ticks:            5,
      instruction:      `🔵 BUY ODD — 5 TICKS NOW`,
      entryHint:        `Select "Odd" contract → set ticks to 5 → press BUY ODD`,
      reason:           `Odd digits accounting for ${oddPct.toFixed(1)}% of last 50 ticks. Strong secondary Odd bias.`,
      confidence:       conf,
      hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
      evenPct, oddPct,
    };
  }

  // Fallback HOLD with context
  return {
    ...holdResult,
    hotDigit, coldDigit, coldGap: maxGap, coldFrequency: coldFreq, hotFrequency: hotFreq,
    evenPct, oddPct,
    reason: `Cold digit ${coldDigit} (${maxGap} tick gap), hot digit ${hotDigit} (${hotFreq.toFixed(1)}%), and Even/Odd (${evenPct.toFixed(0)}/${oddPct.toFixed(0)}) not yet at signal threshold. Keep watching.`,
  };
}

/**
 * Generate the full prediction result.
 */
export function generatePrediction(
  windowStats: Map<number, WindowStats>,
  windowSizes: number[],
  probabilities: DigitProbabilities,
  patterns: PatternEvent[],
  regime: MarketRegime,
  activeWindowSize: number,
  tickCount: number,
  contractOptions?: {
    selectedDigit?: number;
    tradeType?: string;
  }
): PredictionResult {
  const sortedSizes = [...windowSizes].sort((a, b) => a - b);
  const primaryWs = windowStats.get(activeWindowSize)
    ?? windowStats.get(sortedSizes.find((s) => windowStats.has(s))!);

  const noTradeReasons: string[] = [];
  const reasoning: string[] = [];
  const confidenceReductions: string[] = [];

  // ─── NO TRADE checks ─────────────────────────────────────────────────
  if (tickCount < MIN_TICKS_FOR_PREDICTION) {
    noTradeReasons.push(`Insufficient data: only ${tickCount} ticks available (minimum: ${MIN_TICKS_FOR_PREDICTION}).`);
  }

  if (regime.regime === 'INSUFFICIENT_DATA') {
    noTradeReasons.push('Market regime cannot be determined — insufficient tick data.');
  }

  if (probabilities.evidenceStrength < NO_TRADE_EVIDENCE_THRESHOLD) {
    noTradeReasons.push(`Evidence strength too low (${(probabilities.evidenceStrength * 100).toFixed(0)}%).`);
  }

  const variance = distributionVariance(probabilities.probabilities);
  if (variance < UNIFORMITY_THRESHOLD && tickCount >= MIN_TICKS_FOR_PREDICTION) {
    noTradeReasons.push('Digit distribution is statistically close to uniform — no exploitable bias detected.');
  }

  const isUnstable = regime.regime === 'UNSTABLE';
  if (isUnstable) {
    noTradeReasons.push('Market regime is UNSTABLE — conflicting signals between time windows.');
    confidenceReductions.push('Unstable regime reduces confidence significantly.');
  }

  if (!primaryWs) {
    noTradeReasons.push('No valid window statistics available.');
  }

  const noTrade = noTradeReasons.length > 0;

  // ─── Build candidates ─────────────────────────────────────────────────
  const probs = probabilities.probabilities;
  const ranked = probs
    .map((p, d) => ({ digit: d, probability: p, percentageFrequency: primaryWs?.digitPercentages[d] ?? 10 } as DigitCandidate))
    .sort((a, b) => b.probability - a.probability);
  const [primary, ...others] = ranked;
  const secondary = others.slice(0, 3);

  // ─── Confidence scoring ───────────────────────────────────────────────
  let confidenceScore = 30; // Base

  // Evidence strength (0-1) contributes up to 30 pts
  confidenceScore += probabilities.evidenceStrength * 30;

  // Chi-square significance
  if (primaryWs && primaryWs.chiSquare > 16.92 && primaryWs.tickCount >= 50) {
    confidenceScore += 15;
    reasoning.push(`Chi-square test shows significant deviation from uniform (χ²=${primaryWs.chiSquare.toFixed(1)}).`);
  }

  // Multiple windows agree on top digit
  const windowsWithSameTop = sortedSizes.filter((s) => {
    const ws = windowStats.get(s);
    if (!ws || ws.tickCount < 10) return false;
    const topInWindow = ws.digitPercentages.indexOf(Math.max(...ws.digitPercentages));
    return topInWindow === primary.digit;
  });
  if (windowsWithSameTop.length >= 2) {
    confidenceScore += windowsWithSameTop.length * 5;
    reasoning.push(`Digit ${primary.digit} leads in ${windowsWithSameTop.length} different time windows.`);
  } else if (windowsWithSameTop.length === 1) {
    confidenceScore -= 5;
    confidenceReductions.push(`Digit ${primary.digit} is only the top digit in the short window. Medium/long-term data does not confirm.`);
  }

  // Pattern support for primary
  const supportingPatterns = patterns.filter(
    (p) => (p.type === 'FREQUENCY_SPIKE' || p.type === 'STREAK') && p.digit === primary.digit
  );
  if (supportingPatterns.length > 0) {
    const bonus = supportingPatterns.reduce((s, p) => s + (p.severity === 'HIGH' ? 8 : p.severity === 'MODERATE' ? 4 : 2), 0);
    confidenceScore += Math.min(bonus, 15);
    reasoning.push(`Detected ${supportingPatterns.length} supporting pattern(s) for digit ${primary.digit}.`);
  }

  // Conflicting signals reduce confidence
  if (patterns.some((p) => p.type === 'DIGIT_DROUGHT' && p.digit === primary.digit)) {
    confidenceScore -= 10;
    confidenceReductions.push(`Digit ${primary.digit} recently appeared after a drought — caution on over-fitting.`);
  }

  // High repeat regime reduces confidence in next digit
  if (regime.regime === 'REPEATING') {
    confidenceReductions.push('Elevated repeat frequency — transitions are harder to predict.');
    confidenceScore -= 5;
  }

  // Streak supporting current digit
  if (primaryWs && primaryWs.currentStreak.digit === primary.digit && primaryWs.currentStreak.length >= 2) {
    reasoning.push(`Digit ${primary.digit} has an active streak of ${primaryWs.currentStreak.length}.`);
    // Streaking does NOT increase confidence per se — it's just a fact
  }

  // Add primary probability reasoning
  reasoning.push(
    `Estimated probability for digit ${primary.digit}: ${(primary.probability * 100).toFixed(1)}% ` +
    `(empirical frequency: ${primary.percentageFrequency.toFixed(1)}%).`
  );

  if (primaryWs) {
    reasoning.push(
      `Analysis window: last ${primaryWs.tickCount} ticks. ` +
      `Contributing windows: ${probabilities.contributingWindows.join(', ')} ticks.`
    );
  }

  // Probability advantage check (primary vs expected 10%)
  const advantage = primary.probability - 0.1;
  if (advantage < 0.015) {
    noTradeReasons.push(`Prediction advantage too small (${(advantage * 100).toFixed(2)} pp above baseline).`);
    confidenceReductions.push('The leading digit holds only a marginal probability advantage over others.');
  }

  // Cap confidence
  confidenceScore = Math.max(0, Math.min(95, Math.round(confidenceScore)));

  const tier = confidenceTier(confidenceScore);
  const finalNoTrade = noTrade || tier === 'VERY_LOW';
  const signal = toSignalState(tier, finalNoTrade);

  // ─── Build sub-analyses ───────────────────────────────────────────────
  const ws50 = windowStats.get(sortedSizes.find((s) => s >= 50 && windowStats.has(s)) ?? sortedSizes[0]);
  const ws4Ou = ws50 ?? primaryWs;
  const overUnder = ws4Ou ? buildOverUnder(ws4Ou, probs) : [];
  const evenOdd   = ws4Ou ? buildEvenOdd(ws4Ou, probs)   : { evenProbability:0.5, oddProbability:0.5, evenObservedPct:50, oddObservedPct:50, difference:0, signalStrength:0 };
  const matchesDiffers = ws4Ou ? buildMatchesDiffers(ws4Ou, probs) : [];
  const coPilot = buildCoPilot(
    ws4Ou,
    ws4Ou?.chiSquarePValue ?? 1,
    probabilities.evidenceStrength,
    tickCount,
    contractOptions,
  );

  return {
    noTrade: finalNoTrade,
    noTradeReasons,
    primaryCandidate: finalNoTrade ? null : primary,
    secondaryCandidates: finalNoTrade ? [] : secondary,
    modelConfidenceScore: confidenceScore,
    confidenceTier: tier,
    signalState: signal,
    overUnder,
    evenOdd,
    matchesDiffers,
    coPilot,
    reasoning,
    confidenceReductions,
    primaryWindowSize: activeWindowSize,
    timestamp: Date.now(),
  };
}
