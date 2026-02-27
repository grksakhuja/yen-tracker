import { describe, it, expect } from 'vitest';
import { conversionSchema, settingsSchema } from '@/lib/validators';

describe('conversionSchema', () => {
  it('accepts a valid conversion input', () => {
    const result = conversionSchema.safeParse({
      date: '2026-02-25',
      direction: 'GBP_TO_JPY',
      gbpPence: 100000,
      jpyAmount: 190000,
      rate: 190,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid date format', () => {
    const result = conversionSchema.safeParse({
      date: '25/02/2026',
      direction: 'GBP_TO_JPY',
      gbpPence: 100000,
      jpyAmount: 190000,
      rate: 190,
    });
    expect(result.success).toBe(false);
  });
});

describe('settingsSchema', () => {
  const validSettings = {
    aggressive_above: 200,
    normal_above: 190,
    hold_above: 175,
    cap_aggressive_gbp: 200000,
    cap_normal_gbp: 100000,
    total_gbp_savings_pence: 5000000,
    max_fx_exposure_pct: 50,
    monthly_jpy_expenses: 300000,
    monthly_jpy_salary_net: 500000,
    nisa_monthly_jpy: 100000,
    nisa_return_pct: 5,
    circuit_breaker_loss_pence: 500000,
    gbp_safety_net_months: 6,
    scenario_best_rate: 210,
    scenario_base_rate: 195,
    scenario_worst_rate: 170,
    review_interval_days: 30,
  };

  it('accepts valid settings with correct threshold ordering', () => {
    const result = settingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it('rejects settings where hold_above >= normal_above', () => {
    const result = settingsSchema.safeParse({
      ...validSettings,
      hold_above: 195,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path);
      expect(paths.some((p) => p?.includes('hold_above'))).toBe(true);
    }
  });

  it('rejects NaN values for numeric fields', () => {
    const result = settingsSchema.safeParse({
      ...validSettings,
      aggressive_above: NaN,
    });
    expect(result.success).toBe(false);
  });

  it('validates last_band_review format when provided', () => {
    const validResult = settingsSchema.safeParse({
      ...validSettings,
      last_band_review: '2026-02-27',
    });
    expect(validResult.success).toBe(true);

    const invalidResult = settingsSchema.safeParse({
      ...validSettings,
      last_band_review: '27/02/2026',
    });
    expect(invalidResult.success).toBe(false);
  });

  it('accepts null and undefined for last_band_review', () => {
    const nullResult = settingsSchema.safeParse({
      ...validSettings,
      last_band_review: null,
    });
    expect(nullResult.success).toBe(true);

    const omittedResult = settingsSchema.safeParse(validSettings);
    expect(omittedResult.success).toBe(true);
  });

  it('rejects settings where normal_above > aggressive_above', () => {
    const result = settingsSchema.safeParse({
      ...validSettings,
      normal_above: 210,
      aggressive_above: 200,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path);
      expect(paths.some((p) => p?.includes('normal_above'))).toBe(true);
    }
  });
});

describe('conversionSchema — edge cases', () => {
  it('rejects negative gbpPence', () => {
    const result = conversionSchema.safeParse({
      date: '2026-02-25',
      direction: 'GBP_TO_JPY',
      gbpPence: -100,
      jpyAmount: 190000,
      rate: 190,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid direction', () => {
    const result = conversionSchema.safeParse({
      date: '2026-02-25',
      direction: 'USD_TO_JPY',
      gbpPence: 100000,
      jpyAmount: 190000,
      rate: 190,
    });
    expect(result.success).toBe(false);
  });

  it('accepts when optional fields are omitted', () => {
    const result = conversionSchema.safeParse({
      date: '2026-02-25',
      direction: 'GBP_TO_JPY',
      gbpPence: 100000,
      jpyAmount: 190000,
      rate: 190,
    });
    expect(result.success).toBe(true);
  });
});
