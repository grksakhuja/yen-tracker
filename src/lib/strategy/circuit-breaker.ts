import type { ConversionRecord, Settings } from '@/types';

export interface CircuitBreakerResult {
  triggered: boolean;
  currentLoss: number;
  threshold: number;
  lossPct: number;
  message: string;
}

/**
 * Check if unrealised losses exceed the circuit breaker threshold.
 * The circuit breaker fires when your net GBP deployed is worth LESS than
 * (deployed - threshold) at the current rate.
 *
 * E.g. deployed £10k, threshold £5k -> fires if current value < £5k
 */
export function checkCircuitBreaker(
  conversions: ConversionRecord[],
  currentRate: number,
  settings: Settings
): CircuitBreakerResult {
  const gbpToJpy = conversions.filter((c) => c.direction === 'GBP_TO_JPY');
  const jpyToGbp = conversions.filter((c) => c.direction === 'JPY_TO_GBP');

  const totalGbpOut = gbpToJpy.reduce((s, c) => s + c.gbp_amount, 0);
  const totalGbpBack = jpyToGbp.reduce((s, c) => s + c.gbp_amount, 0);
  const netDeployed = totalGbpOut - totalGbpBack;

  const jpyHeld =
    gbpToJpy.reduce((s, c) => s + c.jpy_amount, 0) -
    jpyToGbp.reduce((s, c) => s + c.jpy_amount, 0);

  const currentValuePence =
    currentRate > 0 ? Math.round((jpyHeld / currentRate) * 100) : 0;

  const loss = currentValuePence - netDeployed; // negative = loss
  const lossPct = netDeployed > 0 ? (loss / netDeployed) * 100 : 0;
  const threshold = settings.circuit_breaker_loss_pence;

  // Triggered when loss exceeds threshold (loss is negative, threshold is positive)
  const triggered = loss < 0 && Math.abs(loss) >= threshold;

  let message: string;
  if (netDeployed === 0) {
    message = 'No conversions to monitor.';
  } else if (triggered) {
    message = `Circuit breaker triggered! Unrealised loss of £${(Math.abs(loss) / 100).toFixed(2)} exceeds your £${(threshold / 100).toFixed(2)} threshold. Consider pausing conversions.`;
  } else if (loss < 0) {
    message = `Unrealised loss of £${(Math.abs(loss) / 100).toFixed(2)} (${Math.abs(lossPct).toFixed(1)}%). Circuit breaker at £${(threshold / 100).toFixed(2)}.`;
  } else {
    message = `Portfolio in profit. Circuit breaker at £${(threshold / 100).toFixed(2)} loss threshold.`;
  }

  return { triggered, currentLoss: loss, threshold, lossPct, message };
}
