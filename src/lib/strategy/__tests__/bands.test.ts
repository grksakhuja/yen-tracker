import { describe, it, expect } from 'vitest';
import { determineBand, getBandColor, getBandLabel } from '@/lib/strategy/bands';

const thresholds = { aggressiveAbove: 200, normalAbove: 190, holdAbove: 175 };

describe('determineBand', () => {
  it('returns AGGRESSIVE_BUY when rate is above aggressive threshold', () => {
    expect(determineBand(210, thresholds).band).toBe('AGGRESSIVE_BUY');
  });

  it('returns AGGRESSIVE_BUY when rate equals aggressive threshold', () => {
    expect(determineBand(200, thresholds).band).toBe('AGGRESSIVE_BUY');
  });

  it('returns NORMAL_BUY when rate is between normal and aggressive thresholds', () => {
    expect(determineBand(195, thresholds).band).toBe('NORMAL_BUY');
  });

  it('returns NORMAL_BUY when rate equals normal threshold', () => {
    expect(determineBand(190, thresholds).band).toBe('NORMAL_BUY');
  });

  it('returns HOLD when rate is between hold and normal thresholds', () => {
    expect(determineBand(180, thresholds).band).toBe('HOLD');
  });

  it('returns HOLD when rate equals hold threshold', () => {
    expect(determineBand(175, thresholds).band).toBe('HOLD');
  });

  it('returns REVERSE when rate is below hold threshold', () => {
    expect(determineBand(170, thresholds).band).toBe('REVERSE');
  });
});

describe('getBandColor', () => {
  it('returns a color string for each band', () => {
    expect(typeof getBandColor('AGGRESSIVE_BUY')).toBe('string');
  });
});

describe('getBandLabel', () => {
  it('returns a label string for each band', () => {
    expect(typeof getBandLabel('HOLD')).toBe('string');
  });
});
