import { NextRequest, NextResponse } from 'next/server';
import {
  getUnacknowledgedAlerts,
  getRecentAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
} from '@/lib/alerts';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true';

    if (showAll) {
      const recent = getRecentAlerts();
      return NextResponse.json({ alerts: recent });
    }

    const unacknowledged = getUnacknowledgedAlerts();
    return NextResponse.json({ alerts: unacknowledged });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch alerts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const data = body as { id?: number; all?: boolean };

    if (data.all === true) {
      acknowledgeAllAlerts();
      return NextResponse.json({ success: true, message: 'All alerts acknowledged' });
    }

    if (typeof data.id === 'number') {
      acknowledgeAlert(data.id);
      return NextResponse.json({ success: true, message: `Alert ${data.id} acknowledged` });
    }

    return NextResponse.json(
      { error: 'Provide { id: number } or { all: true }' },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to acknowledge alert';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
