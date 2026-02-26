import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { settings, conversions, alerts } from '@/lib/db/schema';
import { fetchCurrentRate } from '@/lib/rates/frankfurter';
import { cacheRate, getLatestCachedRate } from '@/lib/rates/cache';
import { determineBand } from '@/lib/strategy/bands';
import { checkCircuitBreaker } from '@/lib/strategy/circuit-breaker';
import type { CircuitBreakerResult } from '@/lib/strategy/circuit-breaker';
import {
  checkAndCreateBandChangeAlert,
  checkRecalibrationDue,
  createAlert,
  getUnacknowledgedAlerts,
} from '@/lib/alerts';
import type { AlertRecord } from '@/lib/alerts';
import type { RateInfo, BandResult, ConversionRecord } from '@/types';

export async function GET(): Promise<NextResponse> {
  try {
    let rateInfo: RateInfo | null = null;
    let fallback = false;

    try {
      rateInfo = await fetchCurrentRate();
      cacheRate(db, rateInfo);
    } catch {
      rateInfo = getLatestCachedRate(db);
      fallback = true;
    }

    if (!rateInfo) {
      return NextResponse.json(
        { error: 'No rate data available' },
        { status: 503 }
      );
    }

    const settingsRows = db.select().from(settings).all();
    const config = settingsRows[0];

    let band: BandResult | null = null;
    let circuitBreaker: CircuitBreakerResult | null = null;
    let unacknowledgedAlerts: AlertRecord[] = [];

    if (config) {
      band = determineBand(rateInfo.rate, {
        aggressiveAbove: config.aggressive_above,
        normalAbove: config.normal_above,
        holdAbove: config.hold_above,
      });

      // Check for band change alert
      checkAndCreateBandChangeAlert(band.band, rateInfo.rate);

      // Check circuit breaker
      const allConversions = db
        .select()
        .from(conversions)
        .all() as ConversionRecord[];

      circuitBreaker = checkCircuitBreaker(
        allConversions,
        rateInfo.rate,
        config
      );

      // Create circuit breaker alert if triggered and no recent unacknowledged one
      if (circuitBreaker.triggered) {
        const lastCbAlert = db
          .select()
          .from(alerts)
          .where(eq(alerts.type, 'circuit_breaker'))
          .orderBy(desc(alerts.created_at))
          .limit(1)
          .all();

        const shouldCreate =
          lastCbAlert.length === 0 || lastCbAlert[0].acknowledged === 1;

        if (shouldCreate) {
          createAlert(
            'circuit_breaker',
            circuitBreaker.message,
            rateInfo.rate
          );
        }
      }

      // Check recalibration reminder
      if (
        checkRecalibrationDue(
          config.last_band_review,
          config.review_interval_days
        )
      ) {
        const existingRecalAlert = db
          .select()
          .from(alerts)
          .where(eq(alerts.type, 'recalibrate'))
          .orderBy(desc(alerts.created_at))
          .limit(1)
          .all();

        const hasUnacknowledged =
          existingRecalAlert.length > 0 &&
          existingRecalAlert[0].acknowledged === 0;

        if (!hasUnacknowledged) {
          createAlert(
            'recalibrate',
            'Band thresholds may need review. Consider recalibrating your strategy.'
          );
        }
      }

      unacknowledgedAlerts = getUnacknowledgedAlerts();
    }

    return NextResponse.json({
      rate: rateInfo,
      band,
      fallback,
      circuitBreaker,
      alerts: unacknowledgedAlerts,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch rate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
