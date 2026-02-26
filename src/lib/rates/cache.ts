import { eq, desc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { rateHistory } from '@/lib/db/schema';
import type * as schema from '@/lib/db/schema';
import type { RateInfo } from '@/types';

type DB = BetterSQLite3Database<typeof schema>;

export function getCachedRate(db: DB, date: string): RateInfo | null {
  const rows = db
    .select()
    .from(rateHistory)
    .where(eq(rateHistory.date, date))
    .all();

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    rate: row.rate,
    date: row.date,
    source: row.source,
    isStale: false,
    fetchedAt: row.fetched_at,
  };
}

export function cacheRate(db: DB, rateInfo: RateInfo): void {
  db.insert(rateHistory)
    .values({
      date: rateInfo.date,
      rate: rateInfo.rate,
      source: rateInfo.source,
      fetched_at: rateInfo.fetchedAt,
    })
    .onConflictDoUpdate({
      target: rateHistory.date,
      set: {
        rate: rateInfo.rate,
        source: rateInfo.source,
        fetched_at: rateInfo.fetchedAt,
      },
    })
    .run();
}

export function getLatestCachedRate(db: DB): RateInfo | null {
  const rows = db
    .select()
    .from(rateHistory)
    .orderBy(desc(rateHistory.date))
    .limit(1)
    .all();

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    rate: row.rate,
    date: row.date,
    source: row.source,
    isStale: false,
    fetchedAt: row.fetched_at,
  };
}
