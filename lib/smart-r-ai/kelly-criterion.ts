/**
 * Smart R AI V2 — Kelly Criterion Optimal Stake Sizing
 *
 * The Kelly Criterion calculates the mathematically optimal fraction of
 * your bankroll to stake on a single trade given an estimated edge.
 *
 * Formula (for binary outcome — Win/Lose):
 *   f* = (b × p − q) / b
 *
 * Where:
 *   p = estimated win probability (0-1)
 *   q = 1 - p (loss probability)
 *   b = net payout multiplier (e.g. if stake=$1 and payout=$1.92, b = 0.92)
 *
 * We apply a HALF-KELLY (f_star / 2) for practical safety, cutting the
 * theoretical optimum in half to significantly reduce drawdown risk.
 *
 * If the Kelly fraction is <= 0, there is no mathematical edge and the
 * recommended stake is $0 (NO TRADE).
 */

export interface KellyResult {
  /** Full Kelly fraction (0-1). How much of balance to stake theoretically. */
  fullKellyFraction: number;
  /** Half Kelly fraction — what we actually use for safety. */
  halfKellyFraction: number;
  /** Recommended absolute stake in the account currency given balance. */
  recommendedStake: number;
  /** Whether there is a positive mathematical edge (fullKellyFraction > 0) */
  hasEdge: boolean;
  /** The win probability used as input */
  winProbability: number;
  /** The net payout multiplier used as input (e.g. 0.92 for $1.92 from $1 stake) */
  payoutMultiplier: number;
  /** Human-readable explanation */
  explanation: string;
}

/**
 * @param winProbability   Estimated probability of winning (0-1)
 * @param payoutMultiplier Net profit multiplier (e.g. 0.92 for 92% profit on stake)
 * @param balance          Current account balance in base currency
 * @param minStake         Minimum valid stake (default: 0.35)
 * @param maxFraction      Cap fraction at this ratio of balance (default: 0.05 = 5%)
 */
export function computeKelly(
  winProbability: number,
  payoutMultiplier: number,
  balance: number,
  minStake = 0.35,
  maxFraction = 0.05,
): KellyResult {
  const p = Math.max(0, Math.min(1, winProbability));
  const q = 1 - p;
  const b = Math.max(0.001, payoutMultiplier);

  // Kelly fraction: f* = (b*p - q) / b
  const fullKelly = (b * p - q) / b;
  const halfKelly = fullKelly / 2;

  const hasEdge = fullKelly > 0;

  // Apply safety cap and floor
  const safeFraction = hasEdge
    ? Math.min(halfKelly, maxFraction)
    : 0;

  const rawStake = balance > 0 ? safeFraction * balance : 0;
  // Round to 2 decimal places, minimum minStake if there's an edge
  const recommendedStake = hasEdge
    ? Math.max(minStake, parseFloat(rawStake.toFixed(2)))
    : 0;

  let explanation = '';
  if (!hasEdge) {
    explanation = `No mathematical edge detected (p=${(p * 100).toFixed(1)}%, b=${b.toFixed(2)}). Kelly recommends $0 — Smart R advises NO TRADE.`;
  } else {
    explanation = `Kelly edge: ${(fullKelly * 100).toFixed(1)}%. Half-Kelly suggests staking ${(safeFraction * 100).toFixed(2)}% of balance ($${recommendedStake.toFixed(2)}).`;
  }

  return {
    fullKellyFraction: fullKelly,
    halfKellyFraction: halfKelly,
    recommendedStake,
    hasEdge,
    winProbability: p,
    payoutMultiplier: b,
    explanation,
  };
}
