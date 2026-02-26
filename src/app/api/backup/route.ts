import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { conversions, settings, rateHistory, alerts } from '@/lib/db/schema';

export async function GET(): Promise<NextResponse> {
  try {
    const allConversions = db.select().from(conversions).all();
    const allSettings = db.select().from(settings).all();
    const allRateHistory = db.select().from(rateHistory).all();
    const allAlerts = db.select().from(alerts).all();

    const today = new Date().toISOString().split('T')[0];

    const backup = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        tables: {
          conversions: allConversions.length,
          settings: allSettings.length,
          rate_history: allRateHistory.length,
          alerts: allAlerts.length,
        },
      },
      conversions: allConversions,
      settings: allSettings,
      rate_history: allRateHistory,
      alerts: allAlerts,
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="yen-tracker-backup-${today}.json"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to export backup';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
