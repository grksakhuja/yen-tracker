import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const conversions = sqliteTable('conversions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  direction: text('direction').notNull().default('GBP_TO_JPY'),
  gbp_amount: integer('gbp_amount').notNull(),
  jpy_amount: integer('jpy_amount').notNull(),
  exchange_rate: real('exchange_rate').notNull(),
  spot_rate: real('spot_rate'),
  fee_pct: real('fee_pct').default(0),
  provider: text('provider').default('WISE'),
  band_at_time: text('band_at_time'),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey().default(1),
  aggressive_above: real('aggressive_above').notNull().default(200),
  normal_above: real('normal_above').notNull().default(190),
  hold_above: real('hold_above').notNull().default(175),
  cap_aggressive_gbp: integer('cap_aggressive_gbp').notNull().default(200000),
  cap_normal_gbp: integer('cap_normal_gbp').notNull().default(100000),
  total_gbp_savings_pence: integer('total_gbp_savings_pence').notNull().default(5000000),
  max_fx_exposure_pct: integer('max_fx_exposure_pct').notNull().default(80),
  monthly_jpy_expenses: integer('monthly_jpy_expenses').notNull().default(250000),
  monthly_jpy_salary_net: integer('monthly_jpy_salary_net').notNull().default(300000),
  nisa_monthly_jpy: integer('nisa_monthly_jpy').notNull().default(100000),
  nisa_return_pct: real('nisa_return_pct').notNull().default(5.0),
  circuit_breaker_loss_pence: integer('circuit_breaker_loss_pence').notNull().default(500000),
  gbp_safety_net_months: integer('gbp_safety_net_months').notNull().default(6),
  scenario_best_rate: real('scenario_best_rate').notNull().default(210),
  scenario_base_rate: real('scenario_base_rate').notNull().default(190),
  scenario_worst_rate: real('scenario_worst_rate').notNull().default(170),
  last_band_review: text('last_band_review'),
  review_interval_days: integer('review_interval_days').notNull().default(90),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const rateHistory = sqliteTable('rate_history', {
  date: text('date').primaryKey(),
  rate: real('rate').notNull(),
  source: text('source').notNull().default('frankfurter'),
  fetched_at: text('fetched_at').notNull().default(sql`(datetime('now'))`),
});

export const alerts = sqliteTable('alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  message: text('message').notNull(),
  rate: real('rate'),
  band: text('band'),
  acknowledged: integer('acknowledged').notNull().default(0),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
