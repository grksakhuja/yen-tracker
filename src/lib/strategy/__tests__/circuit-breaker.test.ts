import { describe, it, expect } from 'vitest';
import { checkCircuitBreaker } from '@/lib/strategy/circuit-breaker';
import type { ConversionRecord, Settings } from '@/types';

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 1,
    aggressive_above: 200,
    normal_above: 190,
    hold_above: 175,
    cap_aggressive_gbp: 200000,
    cap_normal_gbp: 100000,
    total_gbp_savings_pence: 5000000,
    max_fx_exposure_pct: 80,
    monthly_jpy_expenses: 250000,
    monthly_jpy_salary_net: 300000,
    nisa_monthly_jpy: 100000,
    nisa_return_pct: 5.0,
    circuit_breaker_loss_pence: 500000,
    gbp_safety_net_months: 6,
    scenario_best_rate: 210,
    scenario_base_rate: 190,
    scenario_worst_rate: 170,
    last_band_review: null,
    review_interval_days: 90,
    updated_at: '2024-01-01',
    ...overrides,
  };
}

function makeConversion(overrides: Partial<ConversionRecord> = {}): ConversionRecord {
  return {
    id: 1,
    date: '2024-01-01',
    direction: 'GBP_TO_JPY',
    gbp_amount: 100000, // 1000 GBP in pence
    jpy_amount: 190000,
    exchange_rate: 190,
    spot_rate: null,
    fee_pct: null,
    provider: null,
    band_at_time: null,
    notes: null,
    created_at: '2024-01-01',
    ...overrides,
  };
}

describe('checkCircuitBreaker', () => {
  it('returns no-conversions message when there are no conversions', () => {
    const result = checkCircuitBreaker([], 190, makeSettings());
    expect(result.triggered).toBe(false);
    expect(result.message).toBe('No conversions to monitor.');
  });

  it('does not trigger when portfolio is in profit', () => {
    const conversions = [
      makeConversion({
        gbp_amount: 100000, // 1000 GBP
        jpy_amount: 190000,
        exchange_rate: 190,
      }),
    ];
    // Rate went up to 200, so JPY is worth more in GBP
    // 190000 / 200 * 100 = 95000 pence, net deployed = 100000
    // Actually rate 180 would be loss. Rate 200 means 190000/200*100 = 95000 < 100000
    // Let's use rate 180: 190000/180*100 = 105555 > 100000 = profit
    const result = checkCircuitBreaker(conversions, 180, makeSettings());
    expect(result.triggered).toBe(false);
    expect(result.message).toContain('Portfolio in profit');
  });

  it('does not trigger when loss is below threshold', () => {
    const conversions = [
      makeConversion({
        gbp_amount: 100000,
        jpy_amount: 190000,
        exchange_rate: 190,
      }),
    ];
    // Rate at 195: 190000/195*100 = 97436, loss = 97436-100000 = -2564 pence
    // Threshold is 500000, so not triggered
    const result = checkCircuitBreaker(conversions, 195, makeSettings());
    expect(result.triggered).toBe(false);
    expect(result.currentLoss).toBeLessThan(0);
    expect(result.message).toContain('Unrealised loss');
  });

  it('triggers when loss exceeds threshold', () => {
    const settings = makeSettings({ circuit_breaker_loss_pence: 1000 });
    const conversions = [
      makeConversion({
        gbp_amount: 100000,
        jpy_amount: 190000,
        exchange_rate: 190,
      }),
    ];
    // Rate at 200: 190000/200*100 = 95000, loss = 95000-100000 = -5000
    // Threshold 1000, |loss| = 5000 >= 1000 -> triggered
    const result = checkCircuitBreaker(conversions, 200, makeSettings({ circuit_breaker_loss_pence: 1000 }));
    expect(result.triggered).toBe(true);
    expect(result.message).toContain('Circuit breaker triggered');
  });

  it('handles zero current rate gracefully', () => {
    // With rate=0, currentValuePence=0, loss = 0-100000 = -100000
    // Default threshold is 500000, so |100000| < 500000 -> not triggered
    // But with a small threshold it would trigger
    const conversions = [makeConversion()];
    const result = checkCircuitBreaker(
      conversions,
      0,
      makeSettings({ circuit_breaker_loss_pence: 1000 })
    );
    expect(result.triggered).toBe(true);
    expect(result.currentLoss).toBeLessThan(0);
  });

  it('accounts for JPY_TO_GBP reverse conversions', () => {
    const conversions = [
      makeConversion({
        id: 1,
        direction: 'GBP_TO_JPY',
        gbp_amount: 100000,
        jpy_amount: 190000,
      }),
      makeConversion({
        id: 2,
        direction: 'JPY_TO_GBP',
        gbp_amount: 50000,
        jpy_amount: 95000,
      }),
    ];
    // netDeployed = 100000 - 50000 = 50000
    // jpyHeld = 190000 - 95000 = 95000
    // At rate 190: 95000/190*100 = 50000, loss = 0
    const result = checkCircuitBreaker(conversions, 190, makeSettings());
    expect(result.triggered).toBe(false);
    expect(result.currentLoss).toBe(0);
  });

  it('computes lossPct correctly', () => {
    const conversions = [
      makeConversion({
        gbp_amount: 100000,
        jpy_amount: 190000,
      }),
    ];
    // At rate 200: value=95000, loss=-5000, lossPct = -5000/100000*100 = -5%
    const result = checkCircuitBreaker(conversions, 200, makeSettings());
    expect(result.lossPct).toBeCloseTo(-5, 0);
  });
});
