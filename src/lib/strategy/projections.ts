import type { Settings } from '@/types';

export interface ScenarioResult {
  label: string;
  rate: number;
  totalJpyIfConvertNow: number;    // if you converted all remaining GBP at this rate
  monthlyJpyBudget: number;        // how many months of JPY expenses this covers
  jpyPerPound: number;             // same as rate (for clarity)
}

export interface ProjectionResult {
  currentRate: number;
  weightedAvgRate: number;
  breakEvenRate: number;           // rate at which your converted JPY = original GBP value
  scenarios: {
    best: ScenarioResult;
    base: ScenarioResult;
    worst: ScenarioResult;
  };
  strategyComparison: StrategyComparison;
}

export interface StrategyComparison {
  lumpSum: StrategyResult;
  monthlyDrip: StrategyResult;
  thermostat: StrategyResult;
}

export interface StrategyResult {
  label: string;
  description: string;
  totalJpy: number;        // total JPY you'd have
  avgRate: number;         // effective average rate
  riskLevel: string;       // 'High' | 'Medium' | 'Low'
}

/**
 * Calculate 3-scenario projections based on settings rates.
 * remainingGbpPence = total savings minus already converted (net deployed)
 */
export function calculateScenarios(
  settings: Settings,
  remainingGbpPence: number,
  monthlyJpyExpenses: number
): { best: ScenarioResult; base: ScenarioResult; worst: ScenarioResult } {
  function scenario(label: string, rate: number): ScenarioResult {
    const totalJpy = Math.round((remainingGbpPence / 100) * rate);
    const monthlyBudget = monthlyJpyExpenses > 0
      ? Math.floor(totalJpy / monthlyJpyExpenses)
      : 0;
    return {
      label,
      rate,
      totalJpyIfConvertNow: totalJpy,
      monthlyJpyBudget: monthlyBudget,
      jpyPerPound: rate,
    };
  }

  return {
    best: scenario('Best Case', settings.scenario_best_rate),
    base: scenario('Base Case', settings.scenario_base_rate),
    worst: scenario('Worst Case', settings.scenario_worst_rate),
  };
}

/**
 * Break-even rate = the rate at which your total JPY holdings convert back to
 * exactly the GBP you originally spent (net deployed).
 * If you have 1,900,000 JPY and spent 10,000 GBP (1,000,000 pence), break-even = 1900000 / 10000 = 190
 */
export function calculateBreakEven(
  totalJpyHeld: number,
  netGbpDeployedPence: number
): number {
  if (netGbpDeployedPence <= 0) return 0;
  const gbpPounds = netGbpDeployedPence / 100;
  return totalJpyHeld / gbpPounds;
}

/**
 * Compare three strategies for converting a given GBP amount over N months:
 * 1. Lump sum: convert everything now at current rate
 * 2. Monthly drip: convert equal amounts each month (use base rate as avg estimate)
 * 3. Thermostat: weighted towards favourable rates (use between base and best as estimate)
 *
 * These are illustrative projections, not predictions.
 */
export function compareStrategies(
  gbpToConvertPence: number,
  currentRate: number,
  settings: Settings,
  months: number
): StrategyComparison {
  const gbpPounds = gbpToConvertPence / 100;

  // Lump sum: all at current rate
  const lumpSumJpy = Math.round(gbpPounds * currentRate);

  // Monthly drip: equal amounts at base rate (average expected)
  const dripRate = settings.scenario_base_rate;
  const dripJpy = Math.round(gbpPounds * dripRate);

  // Thermostat: weighted average between base and best (converts more when rate is high)
  // Estimate: 60% at better-than-base rates, 40% at base
  const thermostatRate = settings.scenario_base_rate * 0.4 + settings.scenario_best_rate * 0.6;
  const thermostatJpy = Math.round(gbpPounds * thermostatRate);

  return {
    lumpSum: {
      label: 'Lump Sum',
      description: `Convert all ${formatPounds(gbpToConvertPence)} now at ${currentRate.toFixed(2)}`,
      totalJpy: lumpSumJpy,
      avgRate: currentRate,
      riskLevel: 'High',
    },
    monthlyDrip: {
      label: 'Monthly Drip',
      description: `Convert ${formatPounds(Math.round(gbpToConvertPence / months))} monthly over ${months} months`,
      totalJpy: dripJpy,
      avgRate: dripRate,
      riskLevel: 'Low',
    },
    thermostat: {
      label: 'Thermostat (This Strategy)',
      description: 'Convert more when rate is favourable, hold when not',
      totalJpy: thermostatJpy,
      avgRate: thermostatRate,
      riskLevel: 'Medium',
    },
  };
}

function formatPounds(pence: number): string {
  return `\u00a3${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
