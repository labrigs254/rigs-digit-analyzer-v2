/**
 * Smart R AI V2 — Multi-Timeframe Confluence Engine
 *
 * Evaluates multiple analysis windows simultaneously and returns a
 * unified confluence signal.
 *
 * Concept:
 *  For Even/Odd: independently compute even% for [25, 50, 100, 500] windows.
 *  Confluence = when ALL evaluated windows agree directionally that one
 *  state is dominant (e.g., Even is above 52% in all 4 windows).
 *
 *  For Matches/Differs: evaluate hit rate of the selected digit across windows.
 *
 * The confluence engine is a gating mechanism — it reduces false signals
 * by requiring cross-timeframe agreement before escalating the Co-Pilot.
 */

export type ConfluenceState =
  | 'STRONG_EVEN'
  | 'STRONG_ODD'
  | 'STRONG_DIGIT'
  | 'CONFLICTING'
  | 'NEUTRAL'
  | 'INSUFFICIENT';

export interface WindowSnapshot {
  windowSize: number;
  /** How many ticks are actually available (may be less than windowSize) */
  available: number;
  evenPct: number;
  oddPct: number;
  /** For the explicitly selected digit (Matches/Differs) */
  digitPct: number;
}

export interface ConfluenceResult {
  state: ConfluenceState;
  /** Snapshots for each window evaluated */
  windows: WindowSnapshot[];
  /** Fraction of windows in agreement (0-1) */
  agreementRatio: number;
  /** Human-readable one-line summary */
  summary: string;
  /** Whether a trade signal is supported by confluence */
  isGreenLight: boolean;
}

const CONFLUENCE_THRESHOLD = 0.52; // minimum observed pct to call a direction "dominant"
const MIN_AGREEMENT        = 0.75; // fraction of windows that must agree

/**
 * Runs the multi-timeframe confluence analysis.
 *
 * @param digits        Array of observed last digits (0-9)
 * @param windowSizes   The window sizes to evaluate (e.g. [25, 50, 100, 500])
 * @param focusDigit    The selected digit for Matches analysis (null for Even/Odd)
 */
export function computeConfluence(
  digits: number[],
  windowSizes: number[],
  focusDigit: number | null,
): ConfluenceResult {
  const neutral: ConfluenceResult = {
    state: 'INSUFFICIENT',
    windows: [],
    agreementRatio: 0,
    summary: 'Not enough tick data for multi-timeframe confluence.',
    isGreenLight: false,
  };

  if (digits.length < Math.min(...windowSizes, digits.length)) return neutral;

  const snapshots: WindowSnapshot[] = [];

  for (const w of windowSizes) {
    const slice = digits.slice(-w);
    if (slice.length < 10) continue; // skip windows with too few ticks

    const evenCount  = slice.filter((d) => d % 2 === 0).length;
    const digitCount = focusDigit !== null ? slice.filter((d) => d === focusDigit).length : 0;

    snapshots.push({
      windowSize: w,
      available: slice.length,
      evenPct: (evenCount / slice.length) * 100,
      oddPct: ((slice.length - evenCount) / slice.length) * 100,
      digitPct: focusDigit !== null ? (digitCount / slice.length) * 100 : 0,
    });
  }

  if (snapshots.length < 2) {
    return { ...neutral, windows: snapshots };
  }

  // Evaluate even/odd direction per window
  const evenDominant = snapshots.filter((s) => s.evenPct / 100 > CONFLUENCE_THRESHOLD);
  const oddDominant  = snapshots.filter((s) => s.oddPct / 100 > CONFLUENCE_THRESHOLD);
  const digitSignif  = focusDigit !== null
    ? snapshots.filter((s) => s.digitPct / 100 > 0.12) // digit meaningfully above 10% baseline
    : [];

  const evenAgreement  = evenDominant.length / snapshots.length;
  const oddAgreement   = oddDominant.length / snapshots.length;
  const digitAgreement = digitSignif.length / snapshots.length;

  let state: ConfluenceState = 'NEUTRAL';
  let agreementRatio = 0;
  let summary = 'Timeframes show no consistent directional edge (neutral).';

  if (focusDigit !== null && digitAgreement >= MIN_AGREEMENT) {
    state = 'STRONG_DIGIT';
    agreementRatio = digitAgreement;
    summary = `All ${snapshots.length} timeframes show digit ${focusDigit} above baseline. Confluence: STRONG.`;
  } else if (evenAgreement >= MIN_AGREEMENT) {
    state = 'STRONG_EVEN';
    agreementRatio = evenAgreement;
    summary = `${evenDominant.length}/${snapshots.length} timeframes show Even above ${(CONFLUENCE_THRESHOLD * 100).toFixed(0)}%. Confluence: EVEN.`;
  } else if (oddAgreement >= MIN_AGREEMENT) {
    state = 'STRONG_ODD';
    agreementRatio = oddAgreement;
    summary = `${oddDominant.length}/${snapshots.length} timeframes show Odd above ${(CONFLUENCE_THRESHOLD * 100).toFixed(0)}%. Confluence: ODD.`;
  } else if (evenDominant.length > 0 || oddDominant.length > 0) {
    state = 'CONFLICTING';
    agreementRatio = Math.max(evenAgreement, oddAgreement);
    summary = 'Timeframes disagree — short and long windows point in different directions.';
  }

  const isGreenLight = state === 'STRONG_EVEN' || state === 'STRONG_ODD' || state === 'STRONG_DIGIT';

  return {
    state,
    windows: snapshots,
    agreementRatio,
    summary,
    isGreenLight,
  };
}
