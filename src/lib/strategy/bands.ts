import type { Band, BandResult } from '@/types';

interface BandThresholds {
  aggressiveAbove: number;
  normalAbove: number;
  holdAbove: number;
}

export function determineBand(rate: number, thresholds: BandThresholds): BandResult {
  let band: Band;
  let suggestion: string;

  if (rate >= thresholds.aggressiveAbove) {
    band = 'AGGRESSIVE_BUY';
    suggestion = 'Rate is excellent. Convert up to your aggressive monthly cap.';
  } else if (rate >= thresholds.normalAbove) {
    band = 'NORMAL_BUY';
    suggestion = 'Rate is favourable. Convert up to your normal monthly cap.';
  } else if (rate >= thresholds.holdAbove) {
    band = 'HOLD';
    suggestion = 'Rate is below your buy threshold. Hold and wait for improvement.';
  } else {
    band = 'REVERSE';
    suggestion = 'Rate is very low. Consider converting JPY back to GBP if needed.';
  }

  return {
    band,
    rate,
    thresholds: {
      aggressiveAbove: thresholds.aggressiveAbove,
      normalAbove: thresholds.normalAbove,
      holdAbove: thresholds.holdAbove,
    },
    suggestion,
  };
}

export function getBandLabel(band: Band | string | null): string {
  switch (band) {
    case 'AGGRESSIVE_BUY': return 'Aggressive Buy';
    case 'NORMAL_BUY': return 'Normal Buy';
    case 'HOLD': return 'Hold';
    case 'REVERSE': return 'Reverse Zone';
    default: return band ?? '--';
  }
}

/** Returns bg + text classes, optionally with border classes for pill variants */
export function getBandClasses(band: Band | string | null, withBorder = false): string {
  const base = (() => {
    switch (band) {
      case 'AGGRESSIVE_BUY': return withBorder
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        : 'bg-emerald-500/20 text-emerald-400';
      case 'NORMAL_BUY': return withBorder
        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        : 'bg-blue-500/20 text-blue-400';
      case 'HOLD': return withBorder
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        : 'bg-amber-500/20 text-amber-400';
      case 'REVERSE': return withBorder
        ? 'bg-red-500/20 text-red-400 border-red-500/30'
        : 'bg-red-500/20 text-red-400';
      default: return withBorder
        ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        : 'bg-gray-500/20 text-gray-400';
    }
  })();
  return base;
}

/** bg + text classes for band badges (no border) */
export function getBandBadgeClasses(band: Band | string | null): string {
  return getBandClasses(band, false);
}

/** bg + text + border classes for band pills */
export function getBandFullClasses(band: Band | string | null): string {
  return getBandClasses(band, true);
}
