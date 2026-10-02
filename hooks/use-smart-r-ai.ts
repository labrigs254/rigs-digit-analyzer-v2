'use client';

/**
 * Smart R AI V2 — React Hook
 *
 * Orchestrates the original Smart R AI engine PLUS all 5 advanced V2 modules:
 *   1. Multi-Timeframe Confluence (confluence.ts)
 *   2. Markov Chain Matrices     (markov.ts)
 *   3. Tick Velocity Analysis    (velocity.ts)
 *   4. Kelly Criterion Sizing    (kelly-criterion.ts)
 *   5. TensorFlow.js ML Engine   (ml-engine.ts)
 *
 * The V2 outputs are surfaced via `advanced` on the hook return value.
 * The original `analysis` output is preserved unchanged for backwards compatibility.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { runSmartRAI } from '../lib/smart-r-ai/smartRAI';
import { PredictionLogger } from '../lib/smart-r-ai/predictionLogger';
import { runBacktest } from '../lib/smart-r-ai/backtestEngine';
import { getLastDigit } from '../lib/digit-stats';
import { buildMarkovChain } from '../lib/smart-r-ai/markov';
import { computeVelocity } from '../lib/smart-r-ai/velocity';
import { computeKelly } from '../lib/smart-r-ai/kelly-criterion';
import { computeConfluence } from '../lib/smart-r-ai/confluence';
import { updateMLEngine, resetMLEngine } from '../lib/smart-r-ai/ml-engine';
import type {
  AIAnalysis,
  PredictionRecord,
  PredictionLogStats,
  BacktestResult,
  BacktestConfig,
  AdvancedEngineResult,
} from '../lib/smart-r-ai/types';
import type { ContractMode, TradeType } from '../lib/types';

export interface Tick {
  epoch?: number;
  quote: number;
}

const DEFAULT_WINDOW_SIZES = [20, 50, 100, 250, 500, 1000];
const CONFLUENCE_WINDOWS   = [25, 50, 100, 500];

/** Contract focus derived from user selection in DERIVE trading panel */
export interface ContractFocus {
  contractMode: ContractMode;
  tradeType: TradeType;
  focusDigit: number | null;
  label: string;
}

export interface UseSmartRAIParams {
  prices: number[];
  /** Full Tick objects (from useTicks) — needed for velocity analysis */
  ticks?: Tick[];
  pipSize: number;
  isConnected: boolean;
  symbol?: string;
  contractMode?: ContractMode;
  selectedDigit?: number;
  tradeType?: TradeType;
  /** Account balance for Kelly stake sizing */
  accountBalance?: number;
  /** Proposal payout for Kelly calculation (e.g. 1.92 for 92% profit) */
  proposalPayout?: number;
}

export interface UseSmartRAIReturn {
  analysis: AIAnalysis | null;
  advanced: AdvancedEngineResult | null;
  predictionRecords: PredictionRecord[];
  predictionStats: PredictionLogStats | null;
  windowSizes: number[];
  activeWindowSize: number;
  setActiveWindowSize: (size: number) => void;
  isRunningBacktest: boolean;
  backtestResult: BacktestResult | null;
  backtestProgress: number;
  runBacktestWithConfig: (config: Omit<BacktestConfig, 'prices' | 'pipSize'>) => Promise<void>;
  clearBacktestResult: () => void;
  contractFocus: ContractFocus;
}

function buildContractLabel(contractMode: ContractMode, selectedDigit: number): string {
  switch (contractMode) {
    case 'DIGITMATCH':  return `Matches ${selectedDigit}`;
    case 'DIGITDIFF':   return `Differs ${selectedDigit}`;
    case 'DIGITOVER':   return `Over ${selectedDigit}`;
    case 'DIGITUNDER':  return `Under ${selectedDigit}`;
    case 'DIGITEVEN':   return 'Even';
    case 'DIGITODD':    return 'Odd';
    default:            return String(contractMode);
  }
}

export function useSmartRAI({
  prices = [],
  ticks  = [],
  pipSize = 2,
  isConnected,
  symbol = 'UNKNOWN',
  contractMode = 'DIGITMATCH',
  selectedDigit = 5,
  tradeType = 'matches-differs',
  accountBalance = 0,
  proposalPayout = 1.92,
}: UseSmartRAIParams): UseSmartRAIReturn {
  const [activeWindowSize, setActiveWindowSize] = useState<number>(50);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);
  const [backtestProgress, setBacktestProgress] = useState(0);
  const [mlResult, setMlResult] = useState<import('../lib/smart-r-ai/ml-engine').MLResult>({
    signal: 'NEUTRAL',
    evenProbability: 0.5,
    oddProbability: 0.5,
    confidence: 0,
    isTrained: false,
    trainingRounds: 0,
    lastLoss: null,
    explanation: 'ML engine warming up.',
  });

  const loggerRef = useRef(new PredictionLogger());
  const prevPricesLengthRef = useRef(0);
  const prevPredictionRef   = useRef<AIAnalysis | null>(null);
  const prevSymbolRef       = useRef<string>(symbol);

  const safePrices  = prices ?? [];
  const safePipSize = typeof pipSize === 'number' && pipSize >= 0 ? pipSize : 2;

  // Reset ML engine when the market changes
  useEffect(() => {
    if (symbol !== prevSymbolRef.current) {
      prevSymbolRef.current = symbol;
      resetMLEngine();
    }
  }, [symbol]);

  // Derive last digits array from prices (needed by Markov, Confluence, ML)
  const digits = useMemo(
    () => safePrices.map((p) => getLastDigit(p, safePipSize)),
    [safePrices, safePipSize]
  );

  // Contract focus
  const contractFocus = useMemo<ContractFocus>(() => {
    const hasDigit = contractMode !== 'DIGITEVEN' && contractMode !== 'DIGITODD';
    return {
      contractMode,
      tradeType,
      focusDigit: hasDigit ? selectedDigit : null,
      label: buildContractLabel(contractMode, selectedDigit),
    };
  }, [contractMode, selectedDigit, tradeType]);

  // ── Original Smart R AI analysis (unchanged) ────────────────────────────
  const analysis = useMemo<AIAnalysis | null>(() => {
    if (safePrices.length === 0) return null;
    return runSmartRAI(
      safePrices,
      safePipSize,
      DEFAULT_WINDOW_SIZES,
      isConnected,
      activeWindowSize,
      { selectedDigit, tradeType }
    );
  }, [safePrices, safePipSize, isConnected, activeWindowSize, selectedDigit, tradeType]);

  // ── V2 Pillar 1: Markov Chain ────────────────────────────────────────────
  const markov = useMemo(
    () => buildMarkovChain(digits),
    [digits]
  );

  // ── V2 Pillar 3: Tick Velocity ───────────────────────────────────────────
  const velocity = useMemo(() => {
    // Use real Tick objects when available, fall back to mock from prices+epoch
    const ticksForVelocity = ticks.length >= 3
      ? ticks.map((t) => ({ epoch: t.epoch ?? 0, quote: t.quote }))
      : safePrices.map((p, i) => ({ epoch: i, quote: p })); // fallback: sequential epochs
    return computeVelocity(ticksForVelocity);
  }, [ticks, safePrices]);

  // ── V2 Pillar 5: Multi-Timeframe Confluence ──────────────────────────────
  const confluence = useMemo(() => {
    const focusDigit = contractFocus.focusDigit;
    return computeConfluence(digits, CONFLUENCE_WINDOWS, focusDigit);
  }, [digits, contractFocus.focusDigit]);

  // ── V2 Pillar 4: Kelly Criterion ─────────────────────────────────────────
  const kelly = useMemo(() => {
    // Determine win probability from prediction result or Markov
    const isEven = contractMode === 'DIGITEVEN';
    const isOdd  = contractMode === 'DIGITODD';
    let winProb = 0.5; // baseline

    if (isEven || isOdd) {
      // Use Markov: probability based on current parity state
      const currDigit = digits.length > 0 ? digits[digits.length - 1] : 0;
      const currIsEven = currDigit % 2 === 0;
      winProb = isEven
        ? (currIsEven ? markov.nextEvenGivenEven : markov.nextEvenGivenOdd)
        : (currIsEven ? markov.nextOddGivenEven  : markov.nextOddGivenOdd);
    } else if (contractFocus.focusDigit !== null) {
      // Digit contract: use observed frequency of selected digit
      const d = contractFocus.focusDigit;
      const digitFreq = digits.length > 0
        ? digits.filter((x) => x === d).length / digits.length
        : 0.1;
      winProb = contractMode === 'DIGITMATCH' ? digitFreq : 1 - digitFreq;
    }

    // Net payout multiplier = proposalPayout - 1 (net profit on stake)
    const netMultiplier = Math.max(0.01, proposalPayout - 1);

    return computeKelly(winProb, netMultiplier, accountBalance);
  }, [contractMode, contractFocus.focusDigit, digits, markov, accountBalance, proposalPayout]);

  // ── V2 Pillar 2: ML Engine (async, non-blocking) ─────────────────────────
  useEffect(() => {
    if (digits.length < 20) return;
    let cancelled = false;
    void updateMLEngine(digits).then((result) => {
      if (!cancelled) setMlResult(result);
    });
    return () => { cancelled = true; };
  }, [digits]);

  // ── Composite V2 Result ──────────────────────────────────────────────────
  const advanced = useMemo<AdvancedEngineResult | null>(() => {
    if (digits.length < 10) return null;

    const compositeGreenLight =
      !velocity.noTradeSignal &&
      confluence.isGreenLight &&
      mlResult.signal !== 'NEUTRAL' &&
      kelly.hasEdge &&
      !(analysis?.prediction.noTrade ?? true);

    const parts: string[] = [];
    parts.push(`Velocity: ${velocity.regime}`);
    parts.push(`Confluence: ${confluence.state}`);
    parts.push(`ML: ${mlResult.signal} (${mlResult.confidence}%)`);
    parts.push(`Kelly: ${kelly.hasEdge ? `$${kelly.recommendedStake.toFixed(2)}` : 'NO EDGE'}`);
    parts.push(`Markov next-even: ${(markov.nextEvenGivenEven * 100).toFixed(1)}%`);

    return {
      markov,
      velocity,
      kelly,
      confluence,
      ml: mlResult,
      compositeGreenLight,
      compositeSummary: parts.join(' | '),
    };
  }, [digits, velocity, confluence, mlResult, kelly, markov, analysis]);

  // ── Prediction logging (unchanged) ───────────────────────────────────────
  useEffect(() => {
    if (!analysis || prices.length === 0) return;
    const newLen = prices.length;
    if (newLen > prevPricesLengthRef.current) {
      if (prevPredictionRef.current && prevPricesLengthRef.current > 0) {
        const newLastDigit = getLastDigit(prices[newLen - 1], pipSize);
        loggerRef.current.evaluateLast(newLastDigit);
      }
      const pred = analysis.prediction;
      loggerRef.current.addPrediction({
        id: `${Date.now()}-${newLen}`,
        timestamp: Date.now(),
        symbol,
        tickSequence: newLen,
        windowSize: activeWindowSize,
        predictedDigit: pred.primaryCandidate?.digit ?? null,
        probability: pred.primaryCandidate?.probability ?? null,
        modelConfidenceScore: pred.modelConfidenceScore,
        confidenceTier: pred.confidenceTier,
        regime: analysis.regime.regime,
        reasoning: pred.reasoning,
        noTrade: pred.noTrade,
      });
      prevPricesLengthRef.current = newLen;
      prevPredictionRef.current = analysis;
    }
  }, [analysis, prices, pipSize, symbol, activeWindowSize]);

  const predictionRecords = useMemo(
    () => loggerRef.current.getRecentRecords(100),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysis]
  );

  const predictionStats = useMemo(
    () => (predictionRecords.length > 0 ? loggerRef.current.getStats() : null),
    [predictionRecords]
  );

  const runBacktestWithConfig = useCallback(
    async (config: Omit<BacktestConfig, 'prices' | 'pipSize'>) => {
      if (prices.length < 25) return;
      setIsRunningBacktest(true);
      setBacktestProgress(0);
      try {
        const result = await runBacktest(
          { ...config, prices, pipSize },
          (current, total) => setBacktestProgress(total > 0 ? Math.round((current / total) * 100) : 0)
        );
        setBacktestResult(result);
        setBacktestProgress(100);
      } finally {
        setIsRunningBacktest(false);
      }
    },
    [prices, pipSize]
  );

  const clearBacktestResult = useCallback(() => {
    setBacktestResult(null);
    setBacktestProgress(0);
  }, []);

  return {
    analysis,
    advanced,
    predictionRecords,
    predictionStats,
    windowSizes: DEFAULT_WINDOW_SIZES,
    activeWindowSize,
    setActiveWindowSize,
    isRunningBacktest,
    backtestResult,
    backtestProgress,
    runBacktestWithConfig,
    clearBacktestResult,
    contractFocus,
  };
}
