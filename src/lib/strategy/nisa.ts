export interface NisaProjection {
  years: NisaYear[];
  totalContributed: number;     // JPY
  totalValue: number;           // JPY
  totalGrowth: number;          // JPY
  growthPct: number;            // percentage
}

export interface NisaYear {
  year: number;
  contributed: number;          // cumulative JPY contributed
  growth: number;               // cumulative growth JPY
  value: number;                // total value JPY
}

/**
 * Calculate NISA compound growth over N years.
 * monthlyJpy: monthly contribution in JPY
 * annualReturnPct: expected annual return (e.g. 5 for 5%)
 * years: projection period
 */
export function calculateNisaProjection(
  monthlyJpy: number,
  annualReturnPct: number,
  years: number
): NisaProjection {
  const monthlyRate = annualReturnPct / 100 / 12;
  const projectionYears: NisaYear[] = [];

  let totalValue = 0;
  let totalContributed = 0;

  for (let y = 1; y <= years; y++) {
    // Add monthly contributions with compound growth each month
    for (let m = 0; m < 12; m++) {
      totalValue = totalValue * (1 + monthlyRate) + monthlyJpy;
      totalContributed += monthlyJpy;
    }

    projectionYears.push({
      year: y,
      contributed: totalContributed,
      growth: Math.round(totalValue - totalContributed),
      value: Math.round(totalValue),
    });
  }

  const totalGrowth = Math.round(totalValue - totalContributed);
  const growthPct = totalContributed > 0 ? (totalGrowth / totalContributed) * 100 : 0;

  return {
    years: projectionYears,
    totalContributed,
    totalValue: Math.round(totalValue),
    totalGrowth,
    growthPct,
  };
}
