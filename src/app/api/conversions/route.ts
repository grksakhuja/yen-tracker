import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { conversions } from '@/lib/db/schema';
import { conversionSchema } from '@/lib/validators';

export async function GET(): Promise<NextResponse> {
  try {
    const rows = db
      .select()
      .from(conversions)
      .orderBy(desc(conversions.date), desc(conversions.created_at))
      .all();

    return NextResponse.json(rows);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch conversions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const result = conversionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.issues },
        { status: 400 }
      );
    }

    const data = result.data;

    const inserted = db
      .insert(conversions)
      .values({
        date: data.date,
        direction: data.direction,
        gbp_amount: data.gbpPence,
        jpy_amount: data.jpyAmount,
        exchange_rate: data.rate,
        spot_rate: data.spotRate ?? null,
        fee_pct: data.feePct ?? 0,
        provider: data.provider ?? 'WISE',
        band_at_time: data.bandAtTime ?? null,
        notes: data.notes ?? null,
      })
      .returning()
      .get();

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create conversion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
