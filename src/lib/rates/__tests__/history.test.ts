import { describe, it, expect } from 'vitest';
import { calculate52WeekRange } from '@/lib/rates/history';
import type { RateHistoryPoint } from '@/lib/rates/history';

describe('calculate52WeekRange', () => {
  it('returns null for empty history', () => {
    expect(calculate52WeekRange([], 190)).toBeNull();
  });

  it('finds correct high/low and dates', () => {
    const history: RateHistoryPoint[] = [
      { date: '2024-01-01', rate: 185 },
      { date: '2024-03-15', rate: 210 },
      { date: '2024-06-01', rate: 190 },
      { date: '2024-09-01', rate: 175 },
    ];
    const result = calculate52WeekRange(history, 195);

    expect(result).not.toBeNull();
    expect(result!.high).toBe(210);
    expect(result!.highDate).toBe('2024-03-15');
    expect(result!.low).toBe(175);
    expect(result!.lowDate).toBe('2024-09-01');
  });

  it('calculates percentile correctly', () => {
    const history: RateHistoryPoint[] = [
      { date: '2024-01-01', rate: 180 },
      { date: '2024-06-01', rate: 200 },
    ];
    // Range = 200-180 = 20. Current 190 → (190-180)/20 = 50%
    const result = calculate52WeekRange(history, 190);
    expect(result!.percentile).toBe(50);
  });

  it('handles single data point (range=0) gracefully', () => {
    const history: RateHistoryPoint[] = [
      { date: '2024-01-01', rate: 190 },
    ];
    const result = calculate52WeekRange(history, 190);
    expect(result!.percentile).toBe(50); // default when range is 0
  });
});
