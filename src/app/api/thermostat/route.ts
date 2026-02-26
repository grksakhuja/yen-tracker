import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { settings, conversions } from '@/lib/db/schema';
import { fetchCurrentRate } from '@/lib/rates/frankfurter';
import { cacheRate, getLatestCachedRate } from '@/lib/rates/cache';
import { determineBand } from '@/lib/strategy/bands';
import { calculateThermostat } from '@/lib/strategy/thermostat';
import type { RateInfo, BandResult, ConversionRecord } from '@/types';

export async function GET(): Promise<NextResponse> {
  try {
    // Fetch current rate (same pattern as /api/rates)
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

    // Load settings
    const settingsRows = db.select().from(settings).all();
    const config = settingsRows[0];

    if (!config) {
      return NextResponse.json(
        { error: 'Settings not configured' },
        { status: 500 }
      );
    }

    // Determine band
    const band: BandResult = determineBand(rateInfo.rate, {
      aggressiveAbove: config.aggressive_above,
      normalAbove: config.normal_above,
      holdAbove: config.hold_above,
    });

    // Load all conversions
    const allConversions: ConversionRecord[] = db
      .select()
      .from(conversions)
      .all() as ConversionRecord[];

    // Calculate thermostat
    const thermostat = calculateThermostat(
      band.band,
      config,
      allConversions
    );

    return NextResponse.json({
      thermostat,
      rate: rateInfo,
      band,
      fallback,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to calculate thermostat';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
