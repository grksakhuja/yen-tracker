import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { conversions } from '@/lib/db/schema';
import { penceToPounds } from '@/lib/finance/currency';
import type { ConversionRecord } from '@/types';

interface CsvRow {
  Date: string;
  Direction: string;
  'GBP Amount': string;
  'JPY Amount': number;
  'Exchange Rate': number;
  'Spot Rate': string;
  'Fee %': string;
  Provider: string;
  Band: string;
  Notes: string;
}

function parseTaxYearRange(
  taxYear: string,
  taxSystem: string
): { start: string; end: string } | null {
  if (taxSystem === 'jp') {
    const year = parseInt(taxYear, 10);
    if (Number.isNaN(year)) return null;
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
  }

  // UK tax year: "2025-2026" means Apr 6 2025 to Apr 5 2026
  const parts = taxYear.split('-');
  if (parts.length !== 2) return null;

  const startYear = parseInt(parts[0], 10);
  const endYear = parseInt(parts[1], 10);
  if (Number.isNaN(startYear) || Number.isNaN(endYear)) return null;

  return {
    start: `${startYear}-04-06`,
    end: `${endYear}-04-05`,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const taxYear = searchParams.get('taxYear');
    const taxSystem = searchParams.get('taxSystem') ?? 'uk';

    let rows: ConversionRecord[] = db
      .select()
      .from(conversions)
      .orderBy(desc(conversions.date), desc(conversions.created_at))
      .all() as ConversionRecord[];

    if (taxYear) {
      const range = parseTaxYearRange(taxYear, taxSystem);
      if (range) {
        rows = rows.filter(
          (row) => row.date >= range.start && row.date <= range.end
        );
      }
    }

    const csvData: CsvRow[] = rows.map((row) => ({
      Date: row.date,
      Direction: row.direction,
      'GBP Amount': penceToPounds(row.gbp_amount).toFixed(2),
      'JPY Amount': row.jpy_amount,
      'Exchange Rate': row.exchange_rate,
      'Spot Rate': row.spot_rate != null ? row.spot_rate.toString() : '',
      'Fee %': row.fee_pct != null ? row.fee_pct.toString() : '',
      Provider: row.provider ?? '',
      Band: row.band_at_time ?? '',
      Notes: row.notes ?? '',
    }));

    const csv = Papa.unparse(csvData);

    const safeTaxYear = (taxYear ?? '').replace(/[^a-zA-Z0-9\-]/g, '');
    const safeTaxSystem = (taxSystem ?? '').replace(/[^a-zA-Z0-9]/g, '');
    const filename = safeTaxYear
      ? `yen-tracker-${safeTaxSystem}-${safeTaxYear}.csv`
      : 'yen-tracker-export.csv';

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to export conversions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
