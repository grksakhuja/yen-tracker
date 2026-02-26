import { describe, it, expect } from 'vitest';
import { calculateThermostat } from '@/lib/strategy/thermostat';
import type { ConversionRecord, Settings } from '@/types';

function mockSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 1,
    aggressive_above: 200,
    normal_above: 190,
    hold_above: 175,
    cap_aggressive_gbp: 200000,  // £2000
    cap_normal_gbp: 100000,       // £1000
    total_gbp_savings_pence: 5000000, // £50k
    max_fx_exposure_pct: 80,
    monthly_jpy_expenses: 250000,
    monthly_jpy_salary_net: 300000,
    nisa_monthly_jpy: 100000,
    nisa_return_pct: 5,
    circuit_breaker_loss_pence: 500000,
    gbp_safety_net_months: 6,
    scenario_best_rate: 210,
    scenario_base_rate: 190,
    scenario_worst_rate: 170,
    last_band_review: null,
    review_interval_days: 90,
    updated_at: '2024-01-01T00:00:00',
    ...overrides,
  };
}

function mockConversion(overrides: Partial<ConversionRecord> = {}): ConversionRecord {
  return {
    id: 1,
    date: '2024-01-15',
    direction: 'GBP_TO_JPY',
    gbp_amount: 100000, // £1000
    jpy_amount: 190000,
    exchange_rate: 190,
    spot_rate: null,
    fee_pct: null,
    provider: 'WISE',
    band_at_time: null,
    notes: null,
    created_at: '2024-01-15T00:00:00',
    ...overrides,
  };
}

describe('calculateThermostat', () => {
  it('returns full aggressive cap with no conversions', () => {
    const result = calculateThermostat('AGGRESSIVE_BUY', mockSettings(), [], '2024-01');

    expect(result.monthlyCap).toBe(200000);
    expect(result.convertedThisMonth).toBe(0);
    expect(result.remainingBudget).toBe(200000);
    expect(result.suggestedAmount).toBe(200000);
    expect(result.atCap).toBe(false);
    expect(result.overExposed).toBe(false);
  });

  it('reduces remaining budget after conversions this month', () => {
    const conversions = [
      mockConversion({ date: '2024-01-10', gbp_amount: 80000 }), // £800
    ];
    const result = calculateThermostat('AGGRESSIVE_BUY', mockSettings(), conversions, '2024-01');

    expect(result.convertedThisMonth).toBe(80000);
    expect(result.remainingBudget).toBe(120000); // £2000 - £800 = £1200
    expect(result.atCap).toBe(false);
  });

  it('returns atCap when monthly cap is reached', () => {
    const conversions = [
      mockConversion({ date: '2024-01-10', gbp_amount: 200000 }), // £2000 = full aggressive cap
    ];
    const result = calculateThermostat('AGGRESSIVE_BUY', mockSettings(), conversions, '2024-01');

    expect(result.remainingBudget).toBe(0);
    expect(result.atCap).toBe(true);
    expect(result.suggestedAmount).toBe(0);
  });

  it('uses normal cap for NORMAL_BUY band', () => {
    const result = calculateThermostat('NORMAL_BUY', mockSettings(), [], '2024-01');

    expect(result.monthlyCap).toBe(100000); // £1000 normal cap
    expect(result.remainingBudget).toBe(100000);
  });

  it('returns zero cap for HOLD band', () => {
    const result = calculateThermostat('HOLD', mockSettings(), [], '2024-01');

    expect(result.monthlyCap).toBe(0);
    expect(result.remainingBudget).toBe(0);
    expect(result.suggestedAmount).toBe(0);
    expect(result.suggestion).toContain('Hold zone');
  });

  it('ignores conversions from other months', () => {
    const conversions = [
      mockConversion({ date: '2024-02-10', gbp_amount: 100000 }), // different month
    ];
    const result = calculateThermostat('AGGRESSIVE_BUY', mockSettings(), conversions, '2024-01');

    expect(result.convertedThisMonth).toBe(0);
    expect(result.remainingBudget).toBe(200000);
  });

  it('detects over-exposure and caps suggested amount', () => {
    // £50k savings, 80% max = £40k max exposure
    // Already converted £40k
    const conversions = [
      mockConversion({ date: '2024-01-01', gbp_amount: 4000000 }), // £40k
    ];
    const result = calculateThermostat('AGGRESSIVE_BUY', mockSettings(), conversions, '2024-02');

    expect(result.overExposed).toBe(true);
    expect(result.exposurePct).toBe(80);
    expect(result.suggestedAmount).toBe(0);
    expect(result.suggestion).toContain('exposure');
  });

  it('caps suggested by exposure remaining when near limit', () => {
    // £50k savings, 80% max = £40k max exposure
    // Already converted £39k, so only £1k exposure remaining
    const conversions = [
      mockConversion({ date: '2023-12-01', gbp_amount: 3900000 }), // £39k last month
    ];
    const result = calculateThermostat('AGGRESSIVE_BUY', mockSettings(), conversions, '2024-01');

    // Monthly cap = £2000, but exposure remaining = £1000
    expect(result.monthlyCap).toBe(200000); // £2000
    expect(result.suggestedAmount).toBe(100000); // min(£2000 remaining, £1000 exposure) = £1000
  });
});
