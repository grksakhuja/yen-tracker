import { describe, it, expect } from 'vitest';
import { determineBand, getBandLabel, getBandClasses, getBandBadgeClasses, getBandFullClasses } from '@/lib/strategy/bands';

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

  it('includes rate and thresholds in result', () => {
    const result = determineBand(195, thresholds);
    expect(result.rate).toBe(195);
    expect(result.thresholds).toEqual(thresholds);
  });

  it('includes a suggestion string', () => {
    const result = determineBand(210, thresholds);
    expect(result.suggestion).toContain('aggressive');
  });
});

describe('getBandLabel', () => {
  it('returns human-readable labels for each band', () => {
    expect(getBandLabel('AGGRESSIVE_BUY')).toBe('Aggressive Buy');
    expect(getBandLabel('NORMAL_BUY')).toBe('Normal Buy');
    expect(getBandLabel('HOLD')).toBe('Hold');
    expect(getBandLabel('REVERSE')).toBe('Reverse Zone');
  });

  it('returns the raw string for unknown bands', () => {
    expect(getBandLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('returns -- for null', () => {
    expect(getBandLabel(null)).toBe('--');
  });
});

describe('getBandClasses', () => {
  it('returns classes without border by default', () => {
    const classes = getBandClasses('AGGRESSIVE_BUY');
    expect(classes).toContain('bg-emerald');
    expect(classes).toContain('text-emerald');
    expect(classes).not.toContain('border-');
  });

  it('returns classes with border when requested', () => {
    const classes = getBandClasses('AGGRESSIVE_BUY', true);
    expect(classes).toContain('border-emerald');
  });

  it('returns gray classes for null/unknown', () => {
    expect(getBandClasses(null)).toContain('bg-gray');
    expect(getBandClasses('UNKNOWN')).toContain('bg-gray');
  });
});

describe('getBandBadgeClasses / getBandFullClasses', () => {
  it('getBandBadgeClasses returns classes without border', () => {
    const classes = getBandBadgeClasses('NORMAL_BUY');
    expect(classes).toContain('text-blue');
    expect(classes).not.toContain('border-');
  });

  it('getBandFullClasses returns classes with border', () => {
    const classes = getBandFullClasses('NORMAL_BUY');
    expect(classes).toContain('text-blue');
    expect(classes).toContain('border-blue');
  });
});
