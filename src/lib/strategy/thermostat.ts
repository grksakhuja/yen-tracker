import type { Band, ConversionRecord, Settings } from '@/types';

export interface ThermostatResult {
  band: Band;
  monthlyCap: number;          // pence - the cap for current band
  convertedThisMonth: number;  // pence - GBP already converted this month
  remainingBudget: number;     // pence - how much more can convert this month
  suggestedAmount: number;     // pence - suggested conversion amount
  suggestion: string;          // human-readable suggestion
  atCap: boolean;              // true if monthly cap reached
  exposurePct: number;         // current FX exposure percentage
  overExposed: boolean;        // true if over max_fx_exposure_pct
}

export function calculateThermostat(
  band: Band,
  settings: Settings,
  conversions: ConversionRecord[],
  currentMonth?: string  // YYYY-MM format, defaults to current month
): ThermostatResult {
  const month = currentMonth ?? new Date().toISOString().slice(0, 7);

  // Filter conversions to current month, GBP_TO_JPY only
  const thisMonthConversions = conversions.filter(
    c => c.date.startsWith(month) && c.direction === 'GBP_TO_JPY'
  );

  const convertedThisMonth = thisMonthConversions.reduce(
    (sum, c) => sum + c.gbp_amount, 0
  );

  // Determine monthly cap based on band
  let monthlyCap: number;
  switch (band) {
    case 'AGGRESSIVE_BUY':
      monthlyCap = settings.cap_aggressive_gbp;
      break;
    case 'NORMAL_BUY':
      monthlyCap = settings.cap_normal_gbp;
      break;
    case 'HOLD':
    case 'REVERSE':
      monthlyCap = 0; // Don't convert in hold/reverse
      break;
  }

  const remainingBudget = Math.max(0, monthlyCap - convertedThisMonth);

  // Calculate total FX exposure
  const totalConverted = conversions
    .filter(c => c.direction === 'GBP_TO_JPY')
    .reduce((sum, c) => sum + c.gbp_amount, 0);
  const totalReverted = conversions
    .filter(c => c.direction === 'JPY_TO_GBP')
    .reduce((sum, c) => sum + c.gbp_amount, 0);
  const netDeployed = totalConverted - totalReverted;

  const maxExposure = Math.round(
    settings.total_gbp_savings_pence * settings.max_fx_exposure_pct / 100
  );
  const exposurePct = settings.total_gbp_savings_pence > 0
    ? (netDeployed / settings.total_gbp_savings_pence) * 100
    : 0;
  const overExposed = netDeployed >= maxExposure;

  // Cap the suggested amount by exposure limit too
  const exposureRemaining = Math.max(0, maxExposure - netDeployed);
  const suggestedAmount = Math.min(remainingBudget, exposureRemaining);

  const atCap = remainingBudget === 0;

  // Build suggestion string
  let suggestion: string;
  if (band === 'HOLD') {
    suggestion = 'Hold zone — no conversions recommended this month.';
  } else if (band === 'REVERSE') {
    suggestion = 'Reverse zone — consider converting JPY back to GBP if needed.';
  } else if (overExposed) {
    suggestion = `FX exposure at ${exposurePct.toFixed(1)}% — over your ${settings.max_fx_exposure_pct}% limit. Hold further conversions.`;
  } else if (atCap) {
    suggestion = `Monthly cap reached. You've converted ${formatPence(convertedThisMonth)} of ${formatPence(monthlyCap)} this month.`;
  } else if (suggestedAmount > 0) {
    suggestion = `Convert up to ${formatPence(suggestedAmount)} more this month (${formatPence(convertedThisMonth)} of ${formatPence(monthlyCap)} used).`;
  } else {
    suggestion = 'No budget remaining for conversions this month.';
  }

  return {
    band,
    monthlyCap,
    convertedThisMonth,
    remainingBudget,
    suggestedAmount,
    suggestion,
    atCap,
    exposurePct,
    overExposed,
  };
}

function formatPence(pence: number): string {
  return `\u00a3${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
