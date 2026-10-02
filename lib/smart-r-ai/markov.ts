/**
 * Smart R AI V2 — Markov Chain Engine
 *
 * Builds normalized transition probability matrices from a digit sequence.
 *
 * For Even/Odd: a 2×2 matrix (states: 0=Even, 1=Odd).
 * For digits:   a 10×10 matrix (states: digits 0-9).
 *
 * The matrices are updated incrementally on each new tick.
 */

export interface MarkovResult {
  /** 2×2 normalized transition matrix for Even→Even, Even→Odd etc. */
  parityMatrix: number[][];
  /** 10×10 normalized transition matrix for digit transitions */
  digitMatrix: number[][];
  /** Probability of next state being Even given current state */
  nextEvenGivenEven: number;
  nextEvenGivenOdd: number;
  nextOddGivenEven: number;
  nextOddGivenOdd: number;
  /** Given last digit, probability for each next digit 0-9 */
  nextDigitProbs: number[];
  /** Sample size used to compute the matrices */
  sampleSize: number;
}

function emptyMatrix(n: number): number[][] {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

function normalizeRow(row: number[]): number[] {
  const sum = row.reduce((a, b) => a + b, 0);
  if (sum === 0) return row.map(() => 1 / row.length); // uniform prior
  return row.map((v) => v / sum);
}

/**
 * Builds a Markov chain from a sequence of digits (0-9).
 * Returns fully normalized matrices and derived probabilities.
 */
export function buildMarkovChain(digits: number[]): MarkovResult {
  if (digits.length < 2) {
    return {
      parityMatrix: [[0.5, 0.5], [0.5, 0.5]],
      digitMatrix: emptyMatrix(10).map(() => Array(10).fill(0.1)),
      nextEvenGivenEven: 0.5,
      nextEvenGivenOdd: 0.5,
      nextOddGivenEven: 0.5,
      nextOddGivenOdd: 0.5,
      nextDigitProbs: Array(10).fill(0.1),
      sampleSize: digits.length,
    };
  }

  // Count matrices
  const parityCount = emptyMatrix(2);
  const digitCount  = emptyMatrix(10);

  for (let i = 0; i < digits.length - 1; i++) {
    const curr = digits[i];
    const next = digits[i + 1];

    // Digit matrix
    digitCount[curr][next]++;

    // Parity matrix: 0=even, 1=odd
    const currParity = curr % 2;
    const nextParity = next % 2;
    parityCount[currParity][nextParity]++;
  }

  const parityMatrix = parityCount.map(normalizeRow);
  const digitMatrix  = digitCount.map(normalizeRow);

  // Last digit drives the "next" probabilities
  const lastDigit = digits[digits.length - 1];
  const nextDigitProbs = digitMatrix[lastDigit];
  const lastParity = lastDigit % 2; // 0=even, 1=odd

  return {
    parityMatrix,
    digitMatrix,
    nextEvenGivenEven: parityMatrix[0][0],
    nextEvenGivenOdd:  parityMatrix[1][0],
    nextOddGivenEven:  parityMatrix[0][1],
    nextOddGivenOdd:   parityMatrix[1][1],
    nextDigitProbs,
    sampleSize: digits.length,
  };
}

/**
 * Returns a human-readable summary of the Markov parity insight.
 */
export function markovInsightText(result: MarkovResult, currentParity: 'EVEN' | 'ODD'): string {
  if (result.sampleSize < 20) return 'Insufficient ticks for Markov analysis.';

  const prob = currentParity === 'EVEN'
    ? result.nextEvenGivenEven
    : result.nextOddGivenOdd;
  const stay = (prob * 100).toFixed(1);
  const flip = ((1 - prob) * 100).toFixed(1);

  return `After ${currentParity}, transition data shows ${stay}% chance of next being ${currentParity} again vs ${flip}% flip (n=${result.sampleSize}).`;
}
