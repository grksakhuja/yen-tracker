import { describe, it, expect } from 'vitest';
import { calculateNisaProjection } from '@/lib/strategy/nisa';

describe('calculateNisaProjection', () => {
  it('calculates correct contributions with 0% return', () => {
    // ¥100,000/month, 0% return, 1 year → ¥1,200,000 contributed = value
    const result = calculateNisaProjection(100000, 0, 1);
    expect(result.totalContributed).toBe(1200000);
    expect(result.totalValue).toBe(1200000);
    expect(result.totalGrowth).toBe(0);
    expect(result.years).toHaveLength(1);
  });

  it('compound growth exceeds simple interest', () => {
    // ¥100,000/month, 5% return, 10 years
    const result = calculateNisaProjection(100000, 5, 10);
    const totalContributed = 100000 * 12 * 10; // ¥12,000,000
    expect(result.totalContributed).toBe(totalContributed);
    expect(result.totalValue).toBeGreaterThan(totalContributed);
    expect(result.totalGrowth).toBeGreaterThan(0);
    expect(result.growthPct).toBeGreaterThan(0);
  });

  it('20-year projection produces reasonable growth', () => {
    // ¥100,000/month, 5% annual, 20 years
    // Expected ~¥41M total (well-known compound interest result)
    const result = calculateNisaProjection(100000, 5, 20);
    expect(result.totalContributed).toBe(24000000); // ¥24M
    expect(result.totalValue).toBeGreaterThan(40000000); // should exceed ¥40M
    expect(result.totalValue).toBeLessThan(45000000); // sanity cap
    expect(result.years).toHaveLength(20);
  });

  it('yearly snapshots are cumulative and increasing', () => {
    const result = calculateNisaProjection(100000, 5, 5);
    for (let i = 1; i < result.years.length; i++) {
      expect(result.years[i].contributed).toBeGreaterThan(result.years[i - 1].contributed);
      expect(result.years[i].value).toBeGreaterThan(result.years[i - 1].value);
    }
  });
});
