/**
 * Smart R AI — Unit Test Suite
 * Tests math calculations, rolling window statistics, Laplace smoothing,
 * entropy, chi-square, regime detection, and contract-aware prediction engine.
 */

import { computeWindowStats, computeAllWindowStats } from '../lib/smart-r-ai/digitAnalyzer';
import { computeProbabilities } from '../lib/smart-r-ai/probabilityEngine';
import { detectRegime } from '../lib/smart-r-ai/regimeDetector';
import { detectAllPatterns } from '../lib/smart-r-ai/patternDetector';
import { generatePrediction } from '../lib/smart-r-ai/predictionEngine';
import { runSmartRAI } from '../lib/smart-r-ai/smartRAI';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

function testWindowStats() {
  console.log('\n--- 1. Testing Window Statistics & Math Calculations ---');

  // Test data: 100 ticks, uniform distribution (10 of each digit)
  const uniformDigits: number[] = [];
  for (let i = 0; i < 10; i++) {
    for (let d = 0; d < 10; d++) uniformDigits.push(d);
  }

  const stats = computeWindowStats(uniformDigits, 100);

  assert(stats.tickCount === 100, 'Tick count should equal 100');
  assert(stats.digitCounts.every((c) => c === 10), 'All 10 digits should have count = 10');
  assert(stats.digitPercentages.every((p) => p === 10), 'All digit percentages should equal 10%');
  assert(stats.deviations.every((d) => d === 0), 'All deviations should equal 0');
  assert(stats.evenCount === 50 && stats.oddCount === 50, 'Even and odd counts should be 50 each');
  assert(stats.evenPct === 50 && stats.oddPct === 50, 'Even and odd percentages should be 50%');
  assert(stats.entropy > 3.3, `Entropy should be near max (~3.32), got ${stats.entropy.toFixed(3)}`);
  assert(stats.chiSquare === 0, `Chi-square for perfect uniform should be 0, got ${stats.chiSquare}`);
  assert(stats.standardErrors.length === 10, 'Standard errors array should contain 10 elements');
  assert(Math.abs(stats.standardErrors[0] - 3.0) < 0.1, `Standard error for 10% in N=100 should be ~3.0%, got ${stats.standardErrors[0].toFixed(2)}%`);

  console.log('✓ Window Statistics tests PASSED!');
}

function testProbabilityEngine() {
  console.log('\n--- 2. Testing Probability Engine (Smoothing & Recency) ---');

  // Biased dataset: digit 7 appears 40 times out of 100
  const biasedDigits: number[] = [];
  for (let i = 0; i < 60; i++) biasedDigits.push(i % 10);
  for (let i = 0; i < 40; i++) biasedDigits.push(7);

  const windowStats = new Map();
  windowStats.set(100, computeWindowStats(biasedDigits, 100));

  const probs = computeProbabilities(windowStats, [100], 7, biasedDigits);

  assert(probs.probabilities.length === 10, 'Probabilities vector should have length 10');
  const sum = probs.probabilities.reduce((a, b) => a + b, 0);
  assert(Math.abs(sum - 1.0) < 0.001, `Probabilities should sum to 1.0, got ${sum.toFixed(4)}`);
  assert(probs.probabilities[7] > 0.25, `Biased digit 7 should have probability > 25%, got ${(probs.probabilities[7] * 100).toFixed(1)}%`);

  console.log('✓ Probability Engine tests PASSED!');
}

function testRegimeDetector() {
  console.log('\n--- 3. Testing Regime Detector ---');

  // Streaking dataset: long run of same digit
  const streakingDigits = new Array(50).fill(7);
  const windowStats = new Map();
  windowStats.set(50, computeWindowStats(streakingDigits, 50));

  const regime = detectRegime(windowStats, [50]);
  assert(regime.regime === 'STREAKING' || regime.regime === 'HIGH_CONCENTRATION', `Regime should detect streaking or high concentration, got ${regime.regime}`);

  console.log('✓ Regime Detector tests PASSED!');
}

function testContractAwarePrediction() {
  console.log('\n--- 4. Testing Contract-Aware Prediction Engine ---');

  const prices = Array.from({ length: 60 }, (_, i) => 100 + (i % 10) * 0.01);
  const windowStats = computeAllWindowStats(prices, 2, [20, 50]);
  const probs = computeProbabilities(windowStats, [20, 50], 5, prices.map(p => Math.floor(p * 100) % 10));
  const regime = detectRegime(windowStats, [20, 50]);
  const patterns = detectAllPatterns(windowStats, [20, 50], prices, 2);

  // Test Matches/Differs contract
  const matchesPred = generatePrediction(
    windowStats,
    [20, 50],
    probs,
    patterns,
    regime,
    50,
    60,
    { selectedDigit: 7, tradeType: 'matches-differs' }
  );

  assert(matchesPred.matchesDiffers.length === 10, 'Matches/Differs analysis should contain 10 digits');
  assert(matchesPred.matchesDiffers[7].digit === 7, 'Target digit 7 should exist in matchesDiffers array');

  // Test Over/Under contract
  const overUnderPred = generatePrediction(
    windowStats,
    [20, 50],
    probs,
    patterns,
    regime,
    50,
    60,
    { selectedDigit: 5, tradeType: 'over-under' }
  );

  assert(overUnderPred.overUnder.length > 0, 'Over/Under analysis should contain thresholds');

  console.log('✓ Contract-Aware Prediction Engine tests PASSED!');
}

function testFullPipeline() {
  console.log('\n--- 5. Testing Full Smart R AI Pipeline ---');

  const livePrices = Array.from({ length: 120 }, (_, i) => 1000 + Math.sin(i / 5) * 5);
  const analysis = runSmartRAI(
    livePrices,
    2,
    [20, 50, 100],
    true,
    50,
    { selectedDigit: 3, tradeType: 'matches-differs' }
  );

  assert(analysis.tickCount === 120, 'Analysis tick count should be 120');
  assert(analysis.activeWindowSize === 50, 'Active window size should be 50');
  assert(analysis.dataQuality.rating === 'GOOD' || analysis.dataQuality.rating === 'FAIR', `Data quality should be GOOD or FAIR, got ${analysis.dataQuality.rating}`);
  assert(analysis.aiExplanation.includes('SMART R AI'), 'AI Explanation should contain header');

  console.log('✓ Full Smart R AI Pipeline tests PASSED!');
}

function runAllTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SMART R AI QUANTITATIVE UNIT TEST SUITE');
  console.log('====================================================');

  try {
    testWindowStats();
    testProbabilityEngine();
    testRegimeDetector();
    testContractAwarePrediction();
    testFullPipeline();

    console.log('\n====================================================');
    console.log('🎉 ALL 5 UNIT TEST SUITES PASSED WITH 100% SUCCESS!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ UNIT TEST SUITE FAILED:', err);
    process.exit(1);
  }
}

runAllTests();
