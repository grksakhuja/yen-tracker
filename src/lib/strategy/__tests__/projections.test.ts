import { describe, it, expect } from 'vitest';
import { calculateScenarios, calculateBreakEven, compareStrategies } from '@/lib/strategy/projections';
import type { Settings } from '@/types';

function mockSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 1, aggressive_above: 200, normal_above: 190, hold_above: 175,
    cap_aggressive_gbp: 200000, cap_normal_gbp: 100000,
    total_gbp_savings_pence: 5000000, max_fx_exposure_pct: 80,
    monthly_jpy_expenses: 250000, monthly_jpy_salary_net: 300000,
    nisa_monthly_jpy: 100000, nisa_return_pct: 5,
    circuit_breaker_loss_pence: 500000, gbp_safety_net_months: 6,
    scenario_best_rate: 210, scenario_base_rate: 190, scenario_worst_rate: 170,
    last_band_review: null, review_interval_days: 90, updated_at: '2024-01-01T00:00:00',
    ...overrides,
  };
}

describe('calculateScenarios', () => {
  it('calculates JPY and months for each scenario', () => {
    // £10,000 remaining (1,000,000 pence), ¥250,000/month expenses
    const result = calculateScenarios(mockSettings(), 1000000, 250000);

    // Best: £10,000 * 210 = ¥2,100,000 → 8 months
    expect(result.best.rate).toBe(210);
    expect(result.best.totalJpyIfConvertNow).toBe(2100000);
    expect(result.best.monthlyJpyBudget).toBe(8);

    // Base: £10,000 * 190 = ¥1,900,000 → 7 months
    expect(result.base.totalJpyIfConvertNow).toBe(1900000);
    expect(result.base.monthlyJpyBudget).toBe(7);

    // Worst: £10,000 * 170 = ¥1,700,000 → 6 months
    expect(result.worst.totalJpyIfConvertNow).toBe(1700000);
    expect(result.worst.monthlyJpyBudget).toBe(6);
  });

  it('handles zero remaining GBP', () => {
    const result = calculateScenarios(mockSettings(), 0, 250000);
    expect(result.best.totalJpyIfConvertNow).toBe(0);
    expect(result.best.monthlyJpyBudget).toBe(0);
  });

  it('handles zero expenses', () => {
    const result = calculateScenarios(mockSettings(), 1000000, 0);
    expect(result.best.totalJpyIfConvertNow).toBe(2100000);
    expect(result.best.monthlyJpyBudget).toBe(0); // can't divide by 0
  });
});

describe('calculateBreakEven', () => {
  it('returns correct break-even rate', () => {
    // Holding ¥1,900,000, deployed £10,000 (1,000,000 pence)
    // Break-even = 1900000 / 10000 = 190
    expect(calculateBreakEven(1900000, 1000000)).toBe(190);
  });

  it('returns 0 when no GBP deployed', () => {
    expect(calculateBreakEven(1900000, 0)).toBe(0);
    expect(calculateBreakEven(0, 0)).toBe(0);
  });
});

describe('compareStrategies', () => {
  it('lump sum uses current rate', () => {
    const result = compareStrategies(1000000, 200, mockSettings(), 12);
    // £10,000 * 200 = ¥2,000,000
    expect(result.lumpSum.totalJpy).toBe(2000000);
    expect(result.lumpSum.avgRate).toBe(200);
    expect(result.lumpSum.riskLevel).toBe('High');
  });

  it('monthly drip uses base rate', () => {
    const result = compareStrategies(1000000, 200, mockSettings(), 12);
    // £10,000 * 190 (base) = ¥1,900,000
    expect(result.monthlyDrip.totalJpy).toBe(1900000);
    expect(result.monthlyDrip.avgRate).toBe(190);
    expect(result.monthlyDrip.riskLevel).toBe('Low');
  });

  it('thermostat uses weighted base+best rate', () => {
    const result = compareStrategies(1000000, 200, mockSettings(), 12);
    // 190*0.4 + 210*0.6 = 76 + 126 = 202
    const expectedRate = 190 * 0.4 + 210 * 0.6;
    expect(result.thermostat.avgRate).toBe(expectedRate);
    expect(result.thermostat.totalJpy).toBe(Math.round(10000 * expectedRate));
    expect(result.thermostat.riskLevel).toBe('Medium');
  });
});
