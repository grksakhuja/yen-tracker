import type { RateInfo } from '@/types';

interface FrankfurterLatestResponse {
  amount: number;
  base: string;
  date: string;
  rates: {
    JPY: number;
  };
}

interface FrankfurterTimeSeriesResponse {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, { JPY: number }>;
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export async function fetchCurrentRate(): Promise<RateInfo> {
  const response = await fetch(
    'https://api.frankfurter.dev/v1/latest?base=GBP&symbols=JPY'
  );

  if (!response.ok) {
    throw new Error(
      `Frankfurter API error: ${response.status} ${response.statusText}`
    );
  }

  const data: FrankfurterLatestResponse = await response.json();
  const today = new Date();
  const todayStr = today.toLocaleDateString('sv'); // 'YYYY-MM-DD' in local timezone

  let isStale = false;
  if (data.date !== todayStr && isWeekday(today)) {
    isStale = true;
  }

  return {
    rate: data.rates.JPY,
    date: data.date,
    source: 'frankfurter',
    isStale,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchHistoricalRates(
  from: string,
  to: string
): Promise<Record<string, number>> {
  const response = await fetch(
    `https://api.frankfurter.dev/v1/${from}..${to}?base=GBP&symbols=JPY`
  );

  if (!response.ok) {
    throw new Error(
      `Frankfurter API error: ${response.status} ${response.statusText}`
    );
  }

  const data: FrankfurterTimeSeriesResponse = await response.json();

  const rates: Record<string, number> = {};
  for (const [date, rateObj] of Object.entries(data.rates)) {
    rates[date] = rateObj.JPY;
  }

  return rates;
}
