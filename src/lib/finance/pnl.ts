import type { ConversionRecord, PortfolioSummary } from '@/types';

export function calculateWeightedAvgRate(conversions: ConversionRecord[]): number {
  const gbpToJpy = conversions.filter((c) => c.direction === 'GBP_TO_JPY');

  if (gbpToJpy.length === 0) {
    return 0;
  }

  let totalWeightedRate = 0;
  let totalGbpAmount = 0;

  for (const c of gbpToJpy) {
    totalWeightedRate += c.exchange_rate * c.gbp_amount;
    totalGbpAmount += c.gbp_amount;
  }

  if (totalGbpAmount === 0) {
    return 0;
  }

  return totalWeightedRate / totalGbpAmount;
}

export function calculatePortfolioSummary(
  conversions: ConversionRecord[],
  currentRate: number
): PortfolioSummary {
  const gbpToJpy = conversions.filter((c) => c.direction === 'GBP_TO_JPY');
  const jpyToGbp = conversions.filter((c) => c.direction === 'JPY_TO_GBP');

  const totalGbpConverted = gbpToJpy.reduce((sum, c) => sum + c.gbp_amount, 0);
  const gbpReceived = jpyToGbp.reduce((sum, c) => sum + c.gbp_amount, 0);
  const netGbpDeployed = totalGbpConverted - gbpReceived;

  const jpyAcquired = gbpToJpy.reduce((sum, c) => sum + c.jpy_amount, 0);
  const jpyReturned = jpyToGbp.reduce((sum, c) => sum + c.jpy_amount, 0);
  const totalJpyAcquired = jpyAcquired - jpyReturned;

  const weightedAvgRate = calculateWeightedAvgRate(conversions);

  // Convert total JPY back to GBP pence at current rate
  const currentValueGbp =
    currentRate > 0 ? Math.round((totalJpyAcquired / currentRate) * 100) : 0;

  const unrealisedPnlGbp = currentValueGbp - netGbpDeployed;

  const unrealisedPnlPct =
    netGbpDeployed > 0
      ? (unrealisedPnlGbp / netGbpDeployed) * 100
      : 0;

  const conversionCount = conversions.length;

  return {
    totalGbpConverted,
    netGbpDeployed,
    totalJpyAcquired,
    weightedAvgRate,
    currentRate,
    currentValueGbp,
    unrealisedPnlGbp,
    unrealisedPnlPct,
    conversionCount,
  };
}
