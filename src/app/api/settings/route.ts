import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';
import { settingsSchema } from '@/lib/validators';

const SETTINGS_DEFAULTS = {
  id: 1,
  aggressive_above: 200,
  normal_above: 190,
  hold_above: 175,
  cap_aggressive_gbp: 200000,
  cap_normal_gbp: 100000,
  total_gbp_savings_pence: 5000000,
  max_fx_exposure_pct: 80,
  monthly_jpy_expenses: 250000,
  monthly_jpy_salary_net: 300000,
  nisa_monthly_jpy: 100000,
  nisa_return_pct: 5.0,
  circuit_breaker_loss_pence: 500000,
  gbp_safety_net_months: 6,
  scenario_best_rate: 210,
  scenario_base_rate: 190,
  scenario_worst_rate: 170,
  review_interval_days: 90,
} as const;

export async function GET(): Promise<NextResponse> {
  try {
    const rows = db.select().from(settings).all();

    if (rows.length > 0) {
      return NextResponse.json(rows[0]);
    }

    const inserted = db
      .insert(settings)
      .values(SETTINGS_DEFAULTS)
      .returning()
      .get();

    return NextResponse.json(inserted);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const result = settingsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.issues },
        { status: 400 }
      );
    }

    const data = result.data;

    const updated = db
      .update(settings)
      .set({
        aggressive_above: data.aggressive_above,
        normal_above: data.normal_above,
        hold_above: data.hold_above,
        cap_aggressive_gbp: data.cap_aggressive_gbp,
        cap_normal_gbp: data.cap_normal_gbp,
        total_gbp_savings_pence: data.total_gbp_savings_pence,
        max_fx_exposure_pct: data.max_fx_exposure_pct,
        monthly_jpy_expenses: data.monthly_jpy_expenses,
        monthly_jpy_salary_net: data.monthly_jpy_salary_net,
        nisa_monthly_jpy: data.nisa_monthly_jpy,
        nisa_return_pct: data.nisa_return_pct,
        circuit_breaker_loss_pence: data.circuit_breaker_loss_pence,
        gbp_safety_net_months: data.gbp_safety_net_months,
        scenario_best_rate: data.scenario_best_rate,
        scenario_base_rate: data.scenario_base_rate,
        scenario_worst_rate: data.scenario_worst_rate,
        review_interval_days: data.review_interval_days,
        updated_at: new Date().toISOString(),
      })
      .where(eq(settings.id, 1))
      .returning()
      .get();

    if (!updated) {
      return NextResponse.json({ error: 'Settings not found. Run GET /api/settings first to initialize.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
