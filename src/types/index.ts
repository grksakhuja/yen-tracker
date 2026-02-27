export type Band = 'AGGRESSIVE_BUY' | 'NORMAL_BUY' | 'HOLD' | 'REVERSE';

export type ConversionDirection = 'GBP_TO_JPY' | 'JPY_TO_GBP';

export type Provider = 'WISE' | 'REVOLUT' | 'OTHER';

export type AlertType = 'band_change' | 'circuit_breaker' | 'reverse_zone' | 'recalibrate';

export interface RateInfo {
  rate: number;
  date: string;
  source: string;
  isStale: boolean;
  fetchedAt: string;
}

export interface BandThresholds {
  aggressiveAbove: number;
  normalAbove: number;
  holdAbove: number;
}

export interface BandResult {
  band: Band;
  rate: number;
  thresholds: BandThresholds;
  suggestion: string;
}

export interface PortfolioSummary {
  totalGbpConverted: number;
  netGbpDeployed: number;
  totalJpyAcquired: number;
  weightedAvgRate: number;
  currentRate: number;
  currentValueGbp: number;
  unrealisedPnlGbp: number;
  unrealisedPnlPct: number;
  conversionCount: number;
}

export interface Settings {
  id: number;
  aggressive_above: number;
  normal_above: number;
  hold_above: number;
  cap_aggressive_gbp: number;
  cap_normal_gbp: number;
  total_gbp_savings_pence: number;
  max_fx_exposure_pct: number;
  monthly_jpy_expenses: number;
  monthly_jpy_salary_net: number;
  nisa_monthly_jpy: number;
  nisa_return_pct: number;
  circuit_breaker_loss_pence: number;
  gbp_safety_net_months: number;
  scenario_best_rate: number;
  scenario_base_rate: number;
  scenario_worst_rate: number;
  last_band_review: string | null;
  review_interval_days: number;
  updated_at: string;
}

export interface RatesResponse {
  rate: RateInfo;
  band: BandResult;
  fallback: boolean;
}

export interface ThermostatResponse {
  thermostat: ThermostatResult;
  rate: RateInfo;
  band: BandResult;
  fallback: boolean;
}

export interface ThermostatResult {
  band: Band;
  monthlyCap: number;
  convertedThisMonth: number;
  remainingBudget: number;
  suggestedAmount: number;
  suggestion: string;
  atCap: boolean;
  exposurePct: number;
  overExposed: boolean;
}

// ── Projection types ─────────────────────────────────────────────────

export interface ScenarioResult {
  label: string;
  rate: number;
  totalJpyIfConvertNow: number;
  monthlyJpyBudget: number;
  jpyPerPound: number;
}

export interface StrategyResult {
  label: string;
  description: string;
  totalJpy: number;
  avgRate: number;
  riskLevel: string;
}

export interface StrategyComparison {
  lumpSum: StrategyResult;
  monthlyDrip: StrategyResult;
  thermostat: StrategyResult;
}

export interface NisaYear {
  year: number;
  contributed: number;
  growth: number;
  totalValue: number;
}

export interface NisaProjection {
  years: NisaYear[];
  totalContributed: number;
  totalValue: number;
  totalGrowth: number;
  growthPct: number;
}

export interface RateHistoryPoint {
  date: string;
  rate: number;
}

export interface RateRange {
  high: number;
  low: number;
  highDate: string;
  lowDate: string;
  current: number;
  percentile: number;
}

export interface ProjectionsData {
  scenarios: {
    best: ScenarioResult;
    base: ScenarioResult;
    worst: ScenarioResult;
  };
  breakEvenRate: number;
  strategyComparison: StrategyComparison;
  nisaProjection: NisaProjection;
  rateHistory: RateHistoryPoint[];
  range52Week: RateRange | null;
  currentRate: number;
  portfolio: PortfolioSummary;
}

// ── Conversion types ─────────────────────────────────────────────────

export interface ConversionRecord {
  id: number;
  date: string;
  direction: ConversionDirection;
  gbp_amount: number;
  jpy_amount: number;
  exchange_rate: number;
  spot_rate: number | null;
  fee_pct: number | null;
  provider: string | null;
  band_at_time: string | null;
  notes: string | null;
  created_at: string;
}
