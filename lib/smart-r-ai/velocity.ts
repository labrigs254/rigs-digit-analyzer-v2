/**
 * Smart R AI V2 — Tick Velocity & Quote Delta Engine
 *
 * Analyzes the SPEED and MAGNITUDE of tick movements.
 *
 * Inputs: Array of full Tick objects (epoch + quote).
 *
 * Outputs:
 * - Average inter-tick interval (ms)
 * - Rolling True Range (ATR-like)
 * - Volatility regime classification
 * - Whether the market is "stalling" (unusually slow ticks)
 * - Whether the market is in a high-volatility burst
 *
 * A stalling or bursting market triggers a NO_TRADE override
 * in the Co-Pilot to protect against noise trading.
 */

export type VelocityRegime =
  | 'NORMAL'
  | 'FAST'        // Ticks arriving much faster than avg — possible burst
  | 'SLOW'        // Ticks arriving much slower than avg — possible stall
  | 'VOLATILE'    // Large quote jumps
  | 'CALM'        // Very small quote jumps
  | 'INSUFFICIENT';

export interface VelocityResult {
  /** Average milliseconds between ticks (rolling last N) */
  avgIntervalMs: number;
  /** Current inter-tick interval in ms */
  lastIntervalMs: number;
  /** Rolling average absolute quote change */
  avgQuoteDelta: number;
  /** Latest absolute quote change */
  lastQuoteDelta: number;
  /** Whether the current tick interval is abnormally fast (< 0.5× avg) */
  isBurst: boolean;
  /** Whether the current tick interval is abnormally slow (> 2× avg) */
  isStall: boolean;
  /** Whether the price movement is much larger than normal */
  isHighVolatility: boolean;
  /** Derived regime label */
  regime: VelocityRegime;
  /** Whether velocity analysis recommends avoiding a trade right now */
  noTradeSignal: boolean;
  /** Human-readable explanation */
  explanation: string;
  /** Number of tick intervals analysed */
  sampleSize: number;
}

interface MinimalTick {
  epoch: number;
  quote: number;
}

const WINDOW = 50; // rolling window for baseline computation

export function computeVelocity(ticks: MinimalTick[]): VelocityResult {
  const insufficient: VelocityResult = {
    avgIntervalMs: 0,
    lastIntervalMs: 0,
    avgQuoteDelta: 0,
    lastQuoteDelta: 0,
    isBurst: false,
    isStall: false,
    isHighVolatility: false,
    regime: 'INSUFFICIENT',
    noTradeSignal: false,
    explanation: 'Not enough ticks for velocity analysis.',
    sampleSize: 0,
  };

  if (ticks.length < 3) return insufficient;

  const recent = ticks.slice(-WINDOW);
  const intervals: number[] = [];
  const deltas: number[] = [];

  for (let i = 1; i < recent.length; i++) {
    const dtMs = (recent[i].epoch - recent[i - 1].epoch) * 1000;
    if (dtMs > 0) intervals.push(dtMs);
    deltas.push(Math.abs(recent[i].quote - recent[i - 1].quote));
  }

  if (intervals.length < 2) return { ...insufficient, sampleSize: intervals.length };

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const avgDelta    = deltas.reduce((a, b) => a + b, 0) / deltas.length;

  const lastInterval = intervals[intervals.length - 1];
  const lastDelta    = deltas[deltas.length - 1];

  const isBurst         = lastInterval < avgInterval * 0.5;
  const isStall         = lastInterval > avgInterval * 2.5;
  const isHighVolatility = lastDelta > avgDelta * 3.0;
  const isCalm           = avgDelta < 0.0001;

  let regime: VelocityRegime = 'NORMAL';
  if (isHighVolatility)  regime = 'VOLATILE';
  else if (isBurst)      regime = 'FAST';
  else if (isStall)      regime = 'SLOW';
  else if (isCalm)       regime = 'CALM';

  const noTradeSignal = isBurst || isStall || isHighVolatility;

  let explanation = 'Market velocity is normal.';
  if (isHighVolatility) explanation = `Price jumped ${lastDelta.toFixed(5)} vs avg ${avgDelta.toFixed(5)} — high volatility burst detected. Smart R recommends caution.`;
  else if (isBurst)     explanation = `Ticks arriving ${(avgInterval / lastInterval).toFixed(1)}× faster than avg. Possible market event in progress.`;
  else if (isStall)     explanation = `Tick interval ${(lastInterval / 1000).toFixed(1)}s vs avg ${(avgInterval / 1000).toFixed(1)}s — market appears stalled.`;
  else if (isCalm)      explanation = 'Market is in an unusually calm low-movement phase.';

  return {
    avgIntervalMs: avgInterval,
    lastIntervalMs: lastInterval,
    avgQuoteDelta: avgDelta,
    lastQuoteDelta: lastDelta,
    isBurst,
    isStall,
    isHighVolatility,
    regime,
    noTradeSignal,
    explanation,
    sampleSize: intervals.length,
  };
}
