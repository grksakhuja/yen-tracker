import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { alerts } from '@/lib/db/schema';
import type { AlertType, Band } from '@/types';

export interface AlertRecord {
  id: number;
  type: AlertType;
  message: string;
  rate: number | null;
  band: string | null;
  acknowledged: number;
  created_at: string;
}

export function createAlert(
  type: AlertType,
  message: string,
  rate?: number,
  band?: string
): AlertRecord {
  return db
    .insert(alerts)
    .values({
      type,
      message,
      rate: rate ?? null,
      band: band ?? null,
    })
    .returning()
    .get() as AlertRecord;
}

export function getUnacknowledgedAlerts(): AlertRecord[] {
  return db
    .select()
    .from(alerts)
    .where(eq(alerts.acknowledged, 0))
    .orderBy(desc(alerts.created_at))
    .all() as AlertRecord[];
}

export function getRecentAlerts(limit: number = 20): AlertRecord[] {
  return db
    .select()
    .from(alerts)
    .orderBy(desc(alerts.created_at))
    .limit(limit)
    .all() as AlertRecord[];
}

export function acknowledgeAlert(id: number): void {
  db.update(alerts)
    .set({ acknowledged: 1 })
    .where(eq(alerts.id, id))
    .run();
}

export function acknowledgeAllAlerts(): void {
  db.update(alerts)
    .set({ acknowledged: 1 })
    .where(eq(alerts.acknowledged, 0))
    .run();
}

/**
 * Check if a band change alert should be created.
 * Only create if the most recent band_change alert has a different band.
 */
export function checkAndCreateBandChangeAlert(
  currentBand: Band,
  currentRate: number
): AlertRecord | null {
  const lastBandAlert = db
    .select()
    .from(alerts)
    .where(eq(alerts.type, 'band_change'))
    .orderBy(desc(alerts.created_at))
    .limit(1)
    .all();

  if (lastBandAlert.length > 0 && lastBandAlert[0].band === currentBand) {
    return null; // same band, no alert needed
  }

  const bandLabels: Record<Band, string> = {
    AGGRESSIVE_BUY: 'Aggressive Buy',
    NORMAL_BUY: 'Normal Buy',
    HOLD: 'Hold',
    REVERSE: 'Reverse Zone',
  };

  return createAlert(
    'band_change',
    `Band changed to ${bandLabels[currentBand]} at rate ${currentRate.toFixed(2)}`,
    currentRate,
    currentBand
  );
}

/**
 * Check if a recalibration reminder is due based on settings.
 */
export function checkRecalibrationDue(
  lastReview: string | null,
  intervalDays: number
): boolean {
  if (!lastReview) return true;
  const last = new Date(lastReview);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= intervalDays;
}
