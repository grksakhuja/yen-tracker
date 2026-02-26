import { describe, it, expect } from 'vitest';
import { calculateWeightedAvgRate, calculatePortfolioSummary } from '@/lib/finance/pnl';
import type { ConversionRecord } from '@/types';

function mockConversion(overrides: Partial<ConversionRecord>): ConversionRecord {
  return {
    id: 1,
    date: '2024-01-01',
    direction: 'GBP_TO_JPY',
    gbp_amount: 100000,
    jpy_amount: 190000,
    exchange_rate: 190,
    spot_rate: null,
    fee_pct: null,
    provider: 'WISE',
    band_at_time: null,
    notes: null,
    created_at: '2024-01-01T00:00:00',
    ...overrides,
  };
}

describe('calculatePortfolioSummary', () => {
  it('returns all zeros for empty conversions', () => {
    const summary = calculatePortfolioSummary([], 200);
    expect(summary.totalGbpConverted).toBe(0);
    expect(summary.netGbpDeployed).toBe(0);
    expect(summary.totalJpyAcquired).toBe(0);
    expect(summary.weightedAvgRate).toBe(0);
    expect(summary.currentValueGbp).toBe(0);
    expect(summary.unrealisedPnlGbp).toBe(0);
    expect(summary.unrealisedPnlPct).toBe(0);
    expect(summary.conversionCount).toBe(0);
  });

  it('calculates P&L for a single GBP to JPY conversion', () => {
    const conversions = [mockConversion({})];
    // £1000 at 190 = ¥190000. Current rate 200 => currentValueGbp = (190000/200)*100 = 95000
    const summary = calculatePortfolioSummary(conversions, 200);

    expect(summary.totalGbpConverted).toBe(100000);
    expect(summary.netGbpDeployed).toBe(100000);
    expect(summary.totalJpyAcquired).toBe(190000);
    expect(summary.currentValueGbp).toBe(95000);
    expect(summary.unrealisedPnlGbp).toBe(-5000);
  });

  it('calculates weighted average rate across two conversions', () => {
    const conversions = [
      mockConversion({ id: 1, gbp_amount: 100000, jpy_amount: 190000, exchange_rate: 190 }),
      mockConversion({ id: 2, gbp_amount: 200000, jpy_amount: 400000, exchange_rate: 200 }),
    ];
    // weightedAvg = (190*100000 + 200*200000) / 300000 = 196.6667
    const summary = calculatePortfolioSummary(conversions, 200);

    expect(summary.weightedAvgRate).toBeCloseTo(196.67, 1);
  });

  it('handles mixed directions with netGbpDeployed', () => {
    const conversions = [
      mockConversion({ id: 1, direction: 'GBP_TO_JPY', gbp_amount: 100000, jpy_amount: 190000, exchange_rate: 190 }),
      mockConversion({ id: 2, direction: 'JPY_TO_GBP', gbp_amount: 26300, jpy_amount: 50000, exchange_rate: 190 }),
    ];
    const summary = calculatePortfolioSummary(conversions, 190);

    // totalJpyAcquired = 190000 - 50000 = 140000
    expect(summary.totalJpyAcquired).toBe(140000);
    // netGbpDeployed = 100000 - 26300 = 73700
    expect(summary.netGbpDeployed).toBe(73700);
    // currentValueGbp = (140000/190)*100 = 73684 (rounded)
    expect(summary.currentValueGbp).toBe(Math.round((140000 / 190) * 100));
  });

  it('handles division by zero when currentRate is 0', () => {
    const conversions = [mockConversion({})];
    const summary = calculatePortfolioSummary(conversions, 0);

    expect(summary.currentValueGbp).toBe(0);
  });
});
