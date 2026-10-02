/**
 * Smart R AI — Pattern Detector
 * Detects statistically meaningful patterns in digit sequences.
 * All descriptions are factual — no gambler's fallacy language.
 */

import type { WindowStats, PatternEvent, PatternSeverity } from './types';

const STREAK_THRESHOLD = 3;         // Min streak length to report
const DROUGHT_THRESHOLD_MULT = 2.5; // Expected gap * this = drought alert
const SPIKE_THRESHOLD_PCT = 5;      // % above expected (10%) = spike

function severity(zScore: number): PatternSeverity {
  const abs = Math.abs(zScore);
  if (abs >= 3) return 'HIGH';
  if (abs >= 2) return 'MODERATE';
  return 'LOW';
}

/**
 * Detect all patterns from a WindowStats snapshot and raw digit array.
 */
export function detectPatterns(
  ws: WindowStats,
  windowSize: number,
  rawDigitsForWindow: number[]
): PatternEvent[] {
  const events: PatternEvent[] = [];
  const n = ws.tickCount;
  if (n < 5) return events;

  // ─── Streak detection ──────────────────────────────────────────
  if (ws.currentStreak.length >= STREAK_THRESHOLD && ws.currentStreak.digit >= 0) {
    const d = ws.currentStreak.digit;
    const len = ws.currentStreak.length;
    // Probability of a natural streak: (1/10)^len
    const prob = Math.pow(0.1, len);
    const sev: PatternSeverity = len >= 5 ? 'HIGH' : len >= 4 ? 'MODERATE' : 'LOW';
    events.push({
      type: 'STREAK',
      severity: sev,
      digit: d,
      count: len,
      windowSize,
      description: `Digit ${d} appeared ${len} consecutive times (current streak).`,
      statContext: `Probability of this occurring by chance: ~${(prob * 100).toFixed(3)}%.`,
    });
  }

  if (ws.longestStreak.length >= STREAK_THRESHOLD + 1 &&
      ws.longestStreak.digit !== ws.currentStreak.digit) {
    const d = ws.longestStreak.digit;
    const len = ws.longestStreak.length;
    if (len >= 4) {
      events.push({
        type: 'STREAK',
        severity: len >= 6 ? 'HIGH' : 'MODERATE',
        digit: d,
        count: len,
        windowSize,
        description: `Longest streak in window: Digit ${d} × ${len}.`,
        statContext: `Observed within the last ${n} ticks.`,
      });
    }
  }

  // ─── Repetition pattern (repeat frequency) ─────────────────────
  if (ws.repeatFrequency > 0.15 && n >= 20) {
    const expected = 0.1;
    const z = (ws.repeatFrequency - expected) / Math.sqrt(expected * (1 - expected) / n);
    if (z >= 2) {
      events.push({
        type: 'REPETITION',
        severity: severity(z),
        windowSize,
        description: `Repeat frequency elevated: ${(ws.repeatFrequency * 100).toFixed(1)}% of ticks repeat the previous digit.`,
        statContext: `Expected ~10%. Z-score: ${z.toFixed(1)}.`,
      });
    }
  }

  // ─── Alternation detection ─────────────────────────────────────
  // Check for A-B-A-B pairs in the tail
  if (rawDigitsForWindow.length >= 8) {
    const tail = rawDigitsForWindow.slice(-8);
    for (let start = 0; start <= tail.length - 6; start++) {
      const a = tail[start];
      const b = tail[start + 1];
      if (a !== b &&
          tail[start + 2] === a && tail[start + 3] === b &&
          tail[start + 4] === a && tail[start + 5] === b) {
        events.push({
          type: 'ALTERNATION',
          severity: 'MODERATE',
          digits: [a, b],
          count: 3,
          windowSize,
          description: `Alternation pattern detected: ${a}→${b}→${a}→${b}→${a}→${b}.`,
          statContext: `6-tick alternation observed. May continue or break randomly.`,
        });
        break; // Only report once
      }
    }
  }

  // ─── Frequency spike ───────────────────────────────────────────
  for (let d = 0; d < 10; d++) {
    const pct = ws.digitPercentages[d];
    const dev = ws.deviations[d];
    const z = ws.zScores[d];
    if (dev >= SPIKE_THRESHOLD_PCT && n >= 20) {
      events.push({
        type: 'FREQUENCY_SPIKE',
        severity: severity(z),
        digit: d,
        windowSize,
        description: `Digit ${d} appeared ${pct.toFixed(1)}% in the last ${n} ticks (expected 10%).`,
        statContext: `Deviation: +${dev.toFixed(1)} pp. Z-score: ${z.toFixed(1)}.`,
      });
    }
  }

  // ─── Digit drought ─────────────────────────────────────────────
  for (let d = 0; d < 10; d++) {
    const absenceTicks = ws.lastSeenPosition[d];
    const avgGap = ws.averageGap[d];
    const threshold = Math.max(DROUGHT_THRESHOLD_MULT * avgGap, 15);
    if (absenceTicks >= threshold && n >= 20) {
      const sev: PatternSeverity =
        absenceTicks >= threshold * 2 ? 'HIGH' :
        absenceTicks >= threshold * 1.4 ? 'MODERATE' : 'LOW';
      events.push({
        type: 'DIGIT_DROUGHT',
        severity: sev,
        digit: d,
        count: absenceTicks,
        windowSize,
        description: `Digit ${d} has not appeared for ${absenceTicks} ticks.`,
        statContext:
          `Average gap for this digit: ${avgGap.toFixed(1)} ticks. ` +
          `Absence does not guarantee its next appearance — each tick is independent.`,
      });
    }
  }

  // ─── Transition cluster ────────────────────────────────────────
  // Detect if transitions to/from one digit are unusually concentrated
  for (let d = 0; d < 10; d++) {
    if (n < 30) break;
    const incoming = ws.transitionMatrix.reduce((s, row) => s + row[d], 0);
    const expected = (n - 1) / 10;
    if (incoming > 0 && expected > 0) {
      const z = (incoming - expected) / Math.sqrt(expected);
      if (z >= 2.5) {
        events.push({
          type: 'TRANSITION_CLUSTER',
          severity: z >= 3.5 ? 'HIGH' : 'MODERATE',
          digit: d,
          windowSize,
          description: `Digit ${d} receives unusually many transitions: ${incoming} observed vs ~${expected.toFixed(1)} expected.`,
          statContext: `Z-score: ${z.toFixed(1)}.`,
        });
      }
    }
  }

  // Deduplicate: keep highest severity per (type, digit)
  const unique = new Map<string, PatternEvent>();
  for (const ev of events) {
    const key = `${ev.type}-${ev.digit ?? ev.digits?.join('-') ?? 'x'}-${ev.windowSize}`;
    const existing = unique.get(key);
    if (!existing || severityRank(ev.severity) > severityRank(existing.severity)) {
      unique.set(key, ev);
    }
  }

  return [...unique.values()].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function severityRank(s: PatternSeverity): number {
  return s === 'HIGH' ? 2 : s === 'MODERATE' ? 1 : 0;
}

/**
 * Aggregate patterns across multiple windows.
 * Prefer patterns from the shortest window (most recent context).
 */
export function detectAllPatterns(
  windowStats: Map<number, WindowStats>,
  windowSizes: number[],
  prices: number[],
  pipSize: number
): PatternEvent[] {
  const { getLastDigit } = require('../digit-stats') as typeof import('../digit-stats');
  const allDigits = prices.map((p) => getLastDigit(p, pipSize));

  const allPatterns: PatternEvent[] = [];
  const sortedSizes = [...windowSizes].sort((a, b) => a - b);

  for (const size of sortedSizes) {
    const ws = windowStats.get(size);
    if (!ws || ws.tickCount < 5) continue;
    const slice = allDigits.slice(-size);
    const patterns = detectPatterns(ws, size, slice);
    allPatterns.push(...patterns);
  }

  // Deduplicate across windows — prefer smaller window (more recent)
  const seen = new Map<string, PatternEvent>();
  for (const ev of allPatterns) {
    const key = `${ev.type}-${ev.digit ?? ev.digits?.join('-') ?? 'x'}`;
    const existing = seen.get(key);
    if (!existing || ev.windowSize < existing.windowSize) {
      seen.set(key, ev);
    }
  }

  return [...seen.values()].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}
