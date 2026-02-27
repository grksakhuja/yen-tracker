import type { Band, ConversionRecord, Settings, ThermostatResult } from '@/types';
import { formatGBP } from '@/lib/finance/currency';

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
    default:
      monthlyCap = 0;
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
  const overExposed = netDeployed > maxExposure;

  // Cap the suggested amount by exposure limit too
  const exposureRemaining = Math.max(0, maxExposure - netDeployed);
  const suggestedAmount = Math.min(remainingBudget, exposureRemaining);

  const atCap = monthlyCap > 0 && remainingBudget === 0;

  // Build suggestion string
  let suggestion: string;
  if (band === 'HOLD') {
    suggestion = 'Hold zone — no conversions recommended this month.';
  } else if (band === 'REVERSE') {
    suggestion = 'Reverse zone — consider converting JPY back to GBP if needed.';
  } else if (overExposed) {
    suggestion = `FX exposure at ${exposurePct.toFixed(1)}% \u2014 over your ${settings.max_fx_exposure_pct}% limit. Hold further conversions.`;
  } else if (atCap) {
    suggestion = `Monthly cap reached. You've converted ${formatGBP(convertedThisMonth)} of ${formatGBP(monthlyCap)} this month.`;
  } else if (suggestedAmount > 0) {
    suggestion = `Convert up to ${formatGBP(suggestedAmount)} more this month (${formatGBP(convertedThisMonth)} of ${formatGBP(monthlyCap)} used).`;
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
