/**
 * Smart R AI V2 — TensorFlow.js Machine Learning Engine
 *
 * Runs a lightweight browser-side Dense neural network trained on recent ticks.
 *
 * Architecture Rationale:
 * ─────────────────────
 * Because Deriv's Volatility Indices use a cryptographically secure PRNG,
 * no model can achieve perfect prediction. However, short-term micro-biases
 * in the observed digit distribution can be exploited with a lightweight model
 * that re-trains dynamically on each window of live ticks.
 *
 * Model: Dense Sequential (NOT a deep LSTM, to keep inference <10ms)
 *   Input:  Last 20 digit parity bits [0=Even, 1=Odd] flattened as a 20-element tensor
 *   Hidden: Dense(32, relu) → Dropout(0.2) → Dense(16, relu)
 *   Output: Dense(2, softmax) → [P(Even), P(Odd)]
 *
 * Training cadence:
 *   Retrain every RETRAIN_EVERY new ticks using the most recent TRAIN_WINDOW ticks.
 *   Training is lightweight (~200 samples, 10 epochs) and runs asynchronously.
 *
 * Safety:
 *   - The ML output is ONE of 5 signals; it does not gate trades alone.
 *   - If model confidence < MIN_CONFIDENCE, ML signal is treated as neutral.
 */

import * as tf from '@tensorflow/tfjs';

// ─── Config ────────────────────────────────────────────────────────────────

const INPUT_LENGTH    = 20;  // Look-back window for the model
const TRAIN_WINDOW    = 500; // Ticks to sample for each training run
const RETRAIN_EVERY   = 25;  // Retrain every N new ticks
const EPOCHS          = 10;
const MIN_CONFIDENCE  = 0.55; // Below this, label signal as NEUTRAL

// ─── Types ─────────────────────────────────────────────────────────────────

export type MLSignal = 'EVEN' | 'ODD' | 'NEUTRAL';

export interface MLResult {
  signal: MLSignal;
  evenProbability: number;
  oddProbability: number;
  /** 0-100 confidence in the prediction */
  confidence: number;
  /** Whether the model has been trained at least once */
  isTrained: boolean;
  /** How many training rounds have completed */
  trainingRounds: number;
  /** Last training loss */
  lastLoss: number | null;
  explanation: string;
}

// ─── Internal state (module-level singleton) ───────────────────────────────

let model: tf.LayersModel | null = null;
let ticksSinceRetrain = 0;
let trainingRounds = 0;
let lastLoss: number | null = null;
let lastResult: MLResult = {
  signal: 'NEUTRAL',
  evenProbability: 0.5,
  oddProbability: 0.5,
  confidence: 0,
  isTrained: false,
  trainingRounds: 0,
  lastLoss: null,
  explanation: 'ML engine warming up — waiting for training data.',
};

// ─── Model creation ────────────────────────────────────────────────────────

function buildModel(): tf.LayersModel {
  const m = tf.sequential();
  m.add(tf.layers.dense({ inputShape: [INPUT_LENGTH], units: 32, activation: 'relu' }));
  m.add(tf.layers.dropout({ rate: 0.2 }));
  m.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  m.add(tf.layers.dense({ units: 2, activation: 'softmax' }));
  m.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy' });
  return m;
}

// ─── Feature + label builders ──────────────────────────────────────────────

/** Convert digit → parity bit (0=even, 1=odd) */
function toParity(digit: number): number {
  return digit % 2;
}

/**
 * Build {xs, ys} tensors from an array of parities.
 * xs: sliding windows of INPUT_LENGTH parities
 * ys: next parity after each window (one-hot)
 */
function buildDataset(parities: number[]): { xs: tf.Tensor2D; ys: tf.Tensor2D } | null {
  const samples: number[][] = [];
  const labels:  number[][] = [];

  for (let i = 0; i < parities.length - INPUT_LENGTH; i++) {
    samples.push(parities.slice(i, i + INPUT_LENGTH));
    const nextParity = parities[i + INPUT_LENGTH];
    labels.push(nextParity === 0 ? [1, 0] : [0, 1]); // one-hot [even, odd]
  }

  if (samples.length < 20) return null;

  return {
    xs: tf.tensor2d(samples),
    ys: tf.tensor2d(labels),
  };
}

// ─── Training (async, called from hook) ────────────────────────────────────

let trainingInProgress = false;

async function trainModel(digits: number[]): Promise<void> {
  if (trainingInProgress) return;
  trainingInProgress = true;

  try {
    const slice   = digits.slice(-TRAIN_WINDOW);
    const parities = slice.map(toParity);
    const dataset  = buildDataset(parities);

    if (!dataset) return;

    if (!model) model = buildModel();

    const history = await model.fit(dataset.xs, dataset.ys, {
      epochs: EPOCHS,
      batchSize: 32,
      shuffle: true,
      verbose: 0,
    });

    const losses = history.history.loss as number[];
    lastLoss = losses[losses.length - 1];
    trainingRounds++;

    tf.dispose([dataset.xs, dataset.ys]);
  } catch {
    // Swallow training errors silently — inference still runs with old model
  } finally {
    trainingInProgress = false;
  }
}

// ─── Inference ─────────────────────────────────────────────────────────────

async function predict(digits: number[]): Promise<MLResult> {
  if (!model || digits.length < INPUT_LENGTH) {
    return {
      ...lastResult,
      explanation: !model
        ? 'ML model not yet trained.'
        : 'Insufficient ticks for ML prediction.',
    };
  }

  const recent   = digits.slice(-INPUT_LENGTH).map(toParity);
  const inputTensor = tf.tensor2d([recent]);
  const output   = model.predict(inputTensor) as tf.Tensor;
  const probs    = Array.from(await output.data()) as [number, number];
  tf.dispose([inputTensor, output]);

  const evenProb = probs[0];
  const oddProb  = probs[1];
  const maxProb  = Math.max(evenProb, oddProb);
  const signal: MLSignal = maxProb < MIN_CONFIDENCE
    ? 'NEUTRAL'
    : evenProb > oddProb ? 'EVEN' : 'ODD';

  const confidence = Math.round(maxProb * 100);

  let explanation = '';
  if (signal === 'NEUTRAL') {
    explanation = `ML confidence ${confidence}% is below the ${MIN_CONFIDENCE * 100}% threshold — no strong signal.`;
  } else {
    explanation = `ML predicts ${signal} with ${confidence}% confidence based on the last ${INPUT_LENGTH} ticks (${trainingRounds} training rounds).`;
  }

  lastResult = {
    signal,
    evenProbability: evenProb,
    oddProbability: oddProb,
    confidence,
    isTrained: trainingRounds > 0,
    trainingRounds,
    lastLoss,
    explanation,
  };

  return lastResult;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Called from `useSmartRAI` on each new tick.
 * Handles both incremental training and prediction.
 * Returns a snapshot result synchronously (using the previous training state)
 * so the UI never blocks, while training continues async.
 *
 * @param digits  Full array of observed last digits
 */
export async function updateMLEngine(digits: number[]): Promise<MLResult> {
  ticksSinceRetrain++;

  // Kick off async training without awaiting — non-blocking
  if (ticksSinceRetrain >= RETRAIN_EVERY && digits.length >= INPUT_LENGTH + 20) {
    ticksSinceRetrain = 0;
    void trainModel(digits); // fire-and-forget
  }

  return predict(digits);
}

/** Reset the engine (e.g. when market changes) */
export function resetMLEngine(): void {
  if (model) {
    model.dispose();
    model = null;
  }
  ticksSinceRetrain = 0;
  trainingRounds = 0;
  lastLoss = null;
  lastResult = {
    signal: 'NEUTRAL',
    evenProbability: 0.5,
    oddProbability: 0.5,
    confidence: 0,
    isTrained: false,
    trainingRounds: 0,
    lastLoss: null,
    explanation: 'ML engine reset.',
  };
}
