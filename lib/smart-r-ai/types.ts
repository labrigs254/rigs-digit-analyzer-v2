/**
 * Smart R AI — TypeScript type definitions
 * All interfaces used across the quantitative digit-analysis engine.
 */

// ─── Window Configuration ──────────────────────────────────────────────────

export const DEFAULT_WINDOW_SIZES = [20, 50, 100, 250, 500, 1000] as const;
export type WindowSize = (typeof DEFAULT_WINDOW_SIZES)[number];

// ─── Per-Window Statistics ─────────────────────────────────────────────────

export interface WindowStats {
  windowSize: number;
  tickCount: number; // Actual ticks available (≤ windowSize)
  // Per-digit (index 0-9)
  digitCounts: number[];          // Raw counts
  digitPercentages: number[];     // 0-100
  deviations: number[];           // percentage - 10 (expected)
  zScores: number[];              // normalized deviation
  standardErrors: number[];       // standard error of sample proportion (%)
  // Streaks
  longestStreak: { digit: number; length: number };
  currentStreak: { digit: number; length: number };
  // Gap analysis per digit
  lastSeenPosition: number[];     // ticks ago (0 = most recent)
  averageGap: number[];           // avg ticks between appearances
  maxGap: number[];               // max ticks between appearances
  // Transition stats
  transitionMatrix: number[][];   // 10x10 counts
  transitionFrequency: number;    // avg distinct transitions/tick
  repeatFrequency: number;        // fraction of ticks that repeat prev digit
  // Information-theoretic
  entropy: number;                // Shannon entropy (max ≈ 3.32 for uniform)
  chiSquare: number;              // goodness-of-fit vs uniform
  chiSquarePValue: number;        // approximate p-value
  // Even/Odd/Over-Under
  evenCount: number;
  oddCount: number;
  evenPct: number;
  oddPct: number;
}

// ─── Digit Probabilities ───────────────────────────────────────────────────

export interface DigitProbabilities {
  /** Probabilities for digits 0-9 (sum ≈ 1.0) */
  probabilities: number[];
  /** Recency-weighted probabilities before final normalization */
  recencyWeighted: number[];
  /** Which windows contributed meaningfully */
  contributingWindows: number[];
  /** Overall evidence strength 0-1 */
  evidenceStrength: number;
}

// ─── Pattern Detection ─────────────────────────────────────────────────────

export type PatternType =
  | 'STREAK'
  | 'REPETITION'
  | 'ALTERNATION'
  | 'FREQUENCY_SPIKE'
  | 'DIGIT_DROUGHT'
  | 'TRANSITION_CLUSTER';

export type PatternSeverity = 'LOW' | 'MODERATE' | 'HIGH';

export interface PatternEvent {
  type: PatternType;
  severity: PatternSeverity;
  digit?: number;        // Primary digit involved
  digits?: number[];     // Multiple digits (e.g. alternation pair)
  count?: number;        // e.g. streak length or absence count
  windowSize: number;    // Window in which pattern was detected
  /** Factual description — no gambler's-fallacy implications */
  description: string;
  /** Statistical context: z-score, frequency, etc. */
  statContext: string;
}

// ─── Market Regime ─────────────────────────────────────────────────────────

export type RegimeType =
  | 'NORMAL'
  | 'HIGH_CONCENTRATION'
  | 'LOW_CONCENTRATION'
  | 'REPEATING'
  | 'STREAKING'
  | 'HIGH_TRANSITION'
  | 'UNSTABLE'
  | 'INSUFFICIENT_DATA';

export interface MarketRegime {
  regime: RegimeType;
  /** 0-100 */
  confidence: number;
  /** Human-readable bullet points of statistical evidence */
  evidence: string[];
  /** The window size that drove this classification */
  primaryWindow: number;
}

// ─── Co-Pilot Recommendation ───────────────────────────────────────────────

/** The direct action the Co-Pilot is recommending */
export type CoPilotAction = 'MATCHES' | 'DIFFERS' | 'EVEN' | 'ODD' | 'OVER' | 'UNDER' | 'HOLD';

/**
 * Child-friendly, step-by-step trading instruction generated from real-time
 * digit & contract analysis. Updated on every new tick.
 */
export interface CoPilotRecommendation {
  /** What to do right now */
  action: CoPilotAction;
  /** The digit to bet on (null for EVEN/ODD or HOLD) */
  recommendedDigit: number | null;
  /** Recommended contract duration in ticks */
  ticks: 1 | 3 | 5 | 10;
  /** Large action text, e.g. "🟢 PRESS BUY EVEN NOW — 5 TICKS" */
  instruction: string;
  /** Secondary hint, e.g. "Enter on next tick immediately" */
  entryHint: string;
  /** Short 1-sentence stat reason shown below the action */
  reason: string;
  /** Overall engine confidence 0–100 */
  confidence: number;
  /** Hottest digit (highest % in recent window) — for context */
  hotDigit: number | null;
  /** Coldest digit (longest absence) — for context */
  coldDigit: number | null;
  /** How many ticks ago the cold digit last appeared */
  coldGap: number;
  /** Cold digit's observed % frequency in last 50 ticks */
  coldFrequency: number;
  /** Hot digit's observed % frequency in last 50 ticks */
  hotFrequency: number;
  /** Even observed percentage in current window */
  evenPct?: number;
  /** Odd observed percentage in current window */
  oddPct?: number;
  /** Active streak of consecutive evens or odds */
  evenOddStreak?: { type: 'EVEN' | 'ODD'; count: number };
}

// ─── Prediction ────────────────────────────────────────────────────────────

export type ConfidenceTier =
  | 'VERY_LOW'    // 0-39
  | 'LOW'         // 40-54
  | 'MODERATE'    // 55-69
  | 'HIGH'        // 70-84
  | 'VERY_HIGH';  // 85-100

export type SignalState = 'NO_TRADE' | 'WAIT' | 'WATCH' | 'SIGNAL';

export interface DigitCandidate {
  digit: number;
  probability: number;
  percentageFrequency: number;
}

export interface OverUnderAnalysis {
  threshold: number;
  overDigits: number[];
  underDigits: number[];
  overProbability: number;
  underProbability: number;
  overObservedPct: number;
  underObservedPct: number;
  /** 0-100 */
  modelConfidence: number;
}

export interface EvenOddAnalysis {
  evenProbability: number;
  oddProbability: number;
  evenObservedPct: number;
  oddObservedPct: number;
  difference: number;           // even - odd in pct points
  /** 0-100 */
  signalStrength: number;
}

export interface MatchDifferAnalysis {
  digit: number;
  matchProbability: number;
  differProbability: number;
  matchObservedPct: number;
  /** Estimated break-even probability for a match contract */
  breakEvenProbability: number | null;
  /** Estimated edge = matchProbability - breakEvenProbability */
  estimatedEdge: number | null;
  modelConfidence: number;
}

export interface PredictionResult {
  noTrade: boolean;
  noTradeReasons: string[];
  primaryCandidate: DigitCandidate | null;
  secondaryCandidates: DigitCandidate[];
  /** 0-100 */
  modelConfidenceScore: number;
  confidenceTier: ConfidenceTier;
  signalState: SignalState;
  overUnder: OverUnderAnalysis[];   // for thresholds 0-9
  evenOdd: EvenOddAnalysis;
  matchesDiffers: MatchDifferAnalysis[];  // for digits 0-9
  /** Co-Pilot: direct child-friendly Matches/Differs action instruction */
  coPilot: CoPilotRecommendation;
  /** Natural-language reasoning bullets */
  reasoning: string[];
  /** Factors that reduced confidence */
  confidenceReductions: string[];
  /** Data window used for this prediction */
  primaryWindowSize: number;
  timestamp: number;
}

// ─── Prediction Logging ────────────────────────────────────────────────────

export interface PredictionRecord {
  id: string;
  timestamp: number;
  symbol: string;
  tickSequence: number;          // Index in the prices array
  windowSize: number;
  predictedDigit: number | null;
  probability: number | null;
  modelConfidenceScore: number;
  confidenceTier: ConfidenceTier;
  regime: RegimeType;
  reasoning: string[];
  noTrade: boolean;
  // Filled in after next tick
  actualNextDigit: number | null;
  predictionCorrect: boolean | null;
  evaluated: boolean;
}

export interface PredictionLogStats {
  totalPredictions: number;
  noTradeCount: number;
  evaluatedCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;            // 0-100
  accuracyByConfidenceTier: Record<ConfidenceTier, { correct: number; total: number; accuracy: number }>;
  accuracyByRegime: Partial<Record<RegimeType, { correct: number; total: number; accuracy: number }>>;
  maxLosingStreak: number;
  currentLosingStreak: number;
}

// ─── AI Analysis (Full Output) ─────────────────────────────────────────────

export interface MultiTimeframeComparison {
  shortTermWindow: number;     // e.g. 20
  mediumTermWindow: number;    // e.g. 100
  longTermWindow: number;      // e.g. 500
  // Deviations at each timeframe vs expected 10%
  shortTermDeviations: number[];
  mediumTermDeviations: number[];
  longTermDeviations: number[];
  /** Digits where short-term significantly differs from long-term */
  divergentDigits: { digit: number; shortPct: number; longPct: number; deltaStr: string }[];
  interpretation: string;
}

export interface DataQuality {
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'INSUFFICIENT';
  tickCount: number;
  issues: string[];
}

export interface AIAnalysis {
  timestamp: number;
  tickCount: number;
  lastDigit: number | null;
  dataQuality: DataQuality;
  windowStats: Map<number, WindowStats>;
  activeWindowSize: number;
  probabilities: DigitProbabilities;
  patterns: PatternEvent[];
  regime: MarketRegime;
  prediction: PredictionResult;
  multiTimeframe: MultiTimeframeComparison;
  /** Short AI-generated natural-language summary */
  aiExplanation: string;
}

// ─── Backtest ──────────────────────────────────────────────────────────────

export interface BacktestConfig {
  prices: number[];
  pipSize: number;
  windowSize: number;
  startIndex?: number;   // Default: windowSize (first point with full window)
}

export interface BacktestSummary {
  totalPredictions: number;
  noTradeCount: number;
  evaluatedPredictions: number;
  correctPredictions: number;
  incorrectPredictions: number;
  accuracy: number;
  averageConfidenceScore: number;
  maxLosingStreak: number;
  accuracyByConfidenceTier: Record<ConfidenceTier, { correct: number; total: number; accuracy: number }>;
  accuracyByRegime: Partial<Record<RegimeType, { correct: number; total: number; accuracy: number }>>;
}

export interface BacktestResult {
  config: BacktestConfig;
  records: PredictionRecord[];
  summary: BacktestSummary;
}

// ─── V2 Advanced Engine Outputs ────────────────────────────────────────────

export type { MarkovResult }         from './markov';
export type { VelocityResult, VelocityRegime } from './velocity';
export type { KellyResult }          from './kelly-criterion';
export type { ConfluenceResult, ConfluenceState, WindowSnapshot } from './confluence';
export type { MLResult, MLSignal }   from './ml-engine';

/**
 * Combined output from all 5 advanced engine modules.
 * Returned by useSmartRAI alongside the standard AIAnalysis.
 */
export interface AdvancedEngineResult {
  markov:     import('./markov').MarkovResult;
  velocity:   import('./velocity').VelocityResult;
  kelly:      import('./kelly-criterion').KellyResult;
  confluence: import('./confluence').ConfluenceResult;
  ml:         import('./ml-engine').MLResult;
  /**
   * Overall "green-light" for a trade based on ALL 5 pillars.
   * True only when: velocity=NORMAL, confluence=green, ML≠NEUTRAL, noTrade=false
   */
  compositeGreenLight: boolean;
  /** Short human-readable summary of all pillars */
  compositeSummary: string;
}
