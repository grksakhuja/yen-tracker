import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { conversions } from '@/lib/db/schema';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const numericId = Number(id);

    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { error: 'Invalid conversion ID' },
        { status: 400 }
      );
    }

    db.delete(conversions).where(eq(conversions.id, numericId)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete conversion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
