import { describe, it, expect } from 'vitest';
import {
  penceToPounds,
  poundsToPence,
  formatGBP,
  formatJPY,
  formatRate,
  convertGbpToJpy,
  convertJpyToGbp,
  calculateEffectiveRate,
} from '@/lib/finance/currency';

describe('penceToPounds', () => {
  it('converts pence to pounds correctly', () => {
    expect(penceToPounds(10000)).toBe(100);
    expect(penceToPounds(150)).toBe(1.5);
  });

  it('handles zero and small values', () => {
    expect(penceToPounds(0)).toBe(0);
    expect(penceToPounds(1)).toBe(0.01);
  });
});

describe('poundsToPence', () => {
  it('converts pounds to pence correctly', () => {
    expect(poundsToPence(100)).toBe(10000);
    expect(poundsToPence(1.5)).toBe(150);
  });

  it('rounds fractional pence', () => {
    expect(poundsToPence(99.999)).toBe(10000);
  });
});

describe('formatGBP', () => {
  it('formats pence as a GBP currency string', () => {
    expect(formatGBP(100000)).toBe('\u00A31,000.00');
    expect(formatGBP(150)).toBe('\u00A31.50');
    expect(formatGBP(0)).toBe('\u00A30.00');
  });
});

describe('formatJPY', () => {
  it('formats yen as a JPY currency string', () => {
    expect(formatJPY(210000)).toBe('\u00A5210,000');
    expect(formatJPY(0)).toBe('\u00A50');
  });
});

describe('convertGbpToJpy', () => {
  it('converts GBP pence to JPY at the given rate', () => {
    expect(convertGbpToJpy(100000, 190)).toBe(190000);
  });
});

describe('convertJpyToGbp', () => {
  it('converts JPY to GBP pence at the given rate', () => {
    expect(convertJpyToGbp(190000, 190)).toBe(100000);
  });
});

describe('formatRate', () => {
  it('returns a string with 2 decimal places', () => {
    expect(formatRate(190)).toBe('190.00');
    expect(formatRate(190.123)).toBe('190.12');
    expect(formatRate(190.999)).toBe('191.00');
  });
});

describe('formatJPY — edge cases', () => {
  it('rounds a float input', () => {
    expect(formatJPY(210000.7)).toBe('\u00A5210,001');
    expect(formatJPY(210000.3)).toBe('\u00A5210,000');
  });
});

describe('calculateEffectiveRate', () => {
  it('calculates rate from JPY and GBP pence', () => {
    // £1000 (100000 pence) -> 190000 JPY = rate 190
    expect(calculateEffectiveRate(190000, 100000)).toBe(190);
  });

  it('returns 0 when gbpPence is zero (division by zero)', () => {
    expect(calculateEffectiveRate(190000, 0)).toBe(0);
  });
});

describe('penceToPounds — edge cases', () => {
  it('handles floating point correctly (33 pence = 0.33)', () => {
    expect(penceToPounds(33)).toBe(0.33);
  });
});

describe('poundsToPence — edge cases', () => {
  it('handles negative input', () => {
    expect(poundsToPence(-5)).toBe(-500);
  });
});

