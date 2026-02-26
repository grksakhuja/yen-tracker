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
      reverseBelow: thresholds.holdAbove,
    },
    suggestion,
  };
}

export function getBandColor(band: Band): string {
  switch (band) {
    case 'AGGRESSIVE_BUY': return 'emerald';
    case 'NORMAL_BUY': return 'blue';
    case 'HOLD': return 'amber';
    case 'REVERSE': return 'red';
  }
}

export function getBandLabel(band: Band): string {
  switch (band) {
    case 'AGGRESSIVE_BUY': return 'Aggressive Buy';
    case 'NORMAL_BUY': return 'Normal Buy';
    case 'HOLD': return 'Hold';
    case 'REVERSE': return 'Reverse Zone';
  }
}
