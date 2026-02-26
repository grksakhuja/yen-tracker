import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { settings, conversions } from '@/lib/db/schema';
import { fetchCurrentRate } from '@/lib/rates/frankfurter';
import { cacheRate, getLatestCachedRate } from '@/lib/rates/cache';
import { calculatePortfolioSummary } from '@/lib/finance/pnl';
import {
  calculateScenarios,
  calculateBreakEven,
  compareStrategies,
} from '@/lib/strategy/projections';
import { calculateNisaProjection } from '@/lib/strategy/nisa';
import { getRateHistory, calculate52WeekRange } from '@/lib/rates/history';
import type { RateInfo, ConversionRecord } from '@/types';

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Fetch current rate with cache fallback
    let rateInfo: RateInfo | null = null;

    try {
      rateInfo = await fetchCurrentRate();
      cacheRate(db, rateInfo);
    } catch {
      rateInfo = getLatestCachedRate(db);
    }

    if (!rateInfo) {
      return NextResponse.json(
        { error: 'No rate data available' },
        { status: 503 }
      );
    }

    const currentRate = rateInfo.rate;

    // 2. Load settings
    const settingsRows = db.select().from(settings).all();
    const config = settingsRows[0];

    if (!config) {
      return NextResponse.json(
        { error: 'Settings not configured' },
        { status: 500 }
      );
    }

    // 3. Load all conversions
    const allConversions = db.select().from(conversions).all() as ConversionRecord[];

    // 4. Calculate portfolio summary
    const portfolio = calculatePortfolioSummary(allConversions, currentRate);

    // 5. Calculate remaining GBP (not below 0)
    const remainingGbpPence = Math.max(
      0,
      config.total_gbp_savings_pence - portfolio.netGbpDeployed
    );

    // 6. Calculate scenarios
    const scenarios = calculateScenarios(
      config,
      remainingGbpPence,
      config.monthly_jpy_expenses
    );

    // 7. Calculate break-even rate
    const breakEvenRate = calculateBreakEven(
      portfolio.totalJpyAcquired,
      portfolio.netGbpDeployed
    );

    // 8. Strategy comparison over 12 months
    const strategyComparison = compareStrategies(
      remainingGbpPence,
      currentRate,
      config,
      12
    );

    // 9. NISA projection over 20 years
    const nisaProjection = calculateNisaProjection(
      config.nisa_monthly_jpy,
      config.nisa_return_pct,
      20
    );

    // 10. Rate history (365 days)
    const rateHistory = getRateHistory(db, 365);

    // 11. 52-week range
    const range52Week = calculate52WeekRange(rateHistory, currentRate);

    return NextResponse.json({
      scenarios,
      breakEvenRate,
      strategyComparison,
      nisaProjection,
      rateHistory,
      range52Week,
      currentRate,
      portfolio,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load projections';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
