import { gte, asc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { rateHistory } from '@/lib/db/schema';
import type * as schema from '@/lib/db/schema';

type DB = BetterSQLite3Database<typeof schema>;

export interface RateRange {
  high: number;
  low: number;
  highDate: string;
  lowDate: string;
  current: number;
  percentile: number;   // where current sits in the range (0-100)
}

export interface RateHistoryPoint {
  date: string;
  rate: number;
}

/**
 * Get rate history for the last N days from DB cache.
 */
export function getRateHistory(db: DB, days: number = 365): RateHistoryPoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return db
    .select({ date: rateHistory.date, rate: rateHistory.rate })
    .from(rateHistory)
    .where(gte(rateHistory.date, cutoffStr))
    .orderBy(asc(rateHistory.date))
    .all();
}

/**
 * Calculate 52-week high/low range from cached history.
 */
export function calculate52WeekRange(history: RateHistoryPoint[], currentRate: number): RateRange | null {
  if (history.length === 0) return null;

  let high = history[0].rate;
  let low = history[0].rate;
  let highDate = history[0].date;
  let lowDate = history[0].date;

  for (const point of history) {
    if (point.rate > high) {
      high = point.rate;
      highDate = point.date;
    }
    if (point.rate < low) {
      low = point.rate;
      lowDate = point.date;
    }
  }

  const range = high - low;
  const percentile = range > 0 ? ((currentRate - low) / range) * 100 : 50;

  return { high, low, highDate, lowDate, current: currentRate, percentile };
}
