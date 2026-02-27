import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/db/schema';

let _db: BetterSQLite3Database<typeof schema> | null = null;

function getDb() {
  if (!_db) {
    const sqlite = new Database('./data/yen-tracker.db');
    sqlite.pragma('journal_mode = WAL');
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
