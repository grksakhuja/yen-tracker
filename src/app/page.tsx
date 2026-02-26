'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  BandResult,
  ConversionDirection,
  ConversionRecord,
  Provider,
  RateInfo,
  Settings,
} from '@/types';

interface ThermostatResult {
  band: string;
  monthlyCap: number;
  convertedThisMonth: number;
  remainingBudget: number;
  suggestedAmount: number;
  suggestion: string;
  atCap: boolean;
  exposurePct: number;
  overExposed: boolean;
}

interface ThermostatResponse {
  thermostat: ThermostatResult;
  rate: RateInfo;
  band: BandResult;
  fallback: boolean;
}

interface RatesResponse {
  rate: RateInfo;
  band: BandResult;
  fallback: boolean;
}

interface PortfolioDisplay {
  totalGbpConverted: number;
  totalJpyAcquired: number;
  weightedAvgRate: number;
  currentValueGbp: number;
  unrealisedPnlGbp: number;
  unrealisedPnlPct: number;
  conversionCount: number;
}

function formatGbp(pence: number): string {
  return `\u00a3${(pence / 100).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatJpy(jpy: number): string {
  return `\u00a5${jpy.toLocaleString()}`;
}

function formatRate(rate: number): string {
  return rate.toFixed(2);
}

function bandColorClasses(band: string): string {
  switch (band) {
    case 'AGGRESSIVE_BUY':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'NORMAL_BUY':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'HOLD':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'REVERSE':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function bandLabel(band: string): string {
  switch (band) {
    case 'AGGRESSIVE_BUY':
      return 'Aggressive Buy';
    case 'NORMAL_BUY':
      return 'Normal Buy';
    case 'HOLD':
      return 'Hold';
    case 'REVERSE':
      return 'Reverse Zone';
    default:
      return band;
  }
}

function calculatePortfolio(
  conversions: ConversionRecord[],
  currentRate: number
): PortfolioDisplay {
  const gbpToJpy = conversions.filter((c) => c.direction === 'GBP_TO_JPY');
  const jpyToGbp = conversions.filter((c) => c.direction === 'JPY_TO_GBP');

  const totalGbpConverted = gbpToJpy.reduce(
    (sum, c) => sum + c.gbp_amount,
    0
  );
  const gbpReceived = jpyToGbp.reduce((sum, c) => sum + c.gbp_amount, 0);
  const netGbpDeployed = totalGbpConverted - gbpReceived;
  const jpyAcquired = gbpToJpy.reduce((sum, c) => sum + c.jpy_amount, 0);
  const jpyReturned = jpyToGbp.reduce((sum, c) => sum + c.jpy_amount, 0);
  const totalJpyAcquired = jpyAcquired - jpyReturned;

  let weightedAvgRate = 0;
  if (gbpToJpy.length > 0) {
    let totalWeighted = 0;
    let totalGbp = 0;
    for (const c of gbpToJpy) {
      totalWeighted += c.exchange_rate * c.gbp_amount;
      totalGbp += c.gbp_amount;
    }
    if (totalGbp > 0) {
      weightedAvgRate = totalWeighted / totalGbp;
    }
  }

  const currentValueGbp =
    currentRate > 0 ? Math.round((totalJpyAcquired / currentRate) * 100) : 0;
  const unrealisedPnlGbp = currentValueGbp - netGbpDeployed;
  const unrealisedPnlPct =
    netGbpDeployed > 0 ? (unrealisedPnlGbp / netGbpDeployed) * 100 : 0;

  return {
    totalGbpConverted,
    totalJpyAcquired,
    weightedAvgRate,
    currentValueGbp,
    unrealisedPnlGbp,
    unrealisedPnlPct,
    conversionCount: conversions.length,
  };
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 animate-pulse">
      <div className="h-4 bg-gray-800 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-800 rounded w-2/3" />
    </div>
  );
}

export default function DashboardPage() {
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [conversions, setConversions] = useState<ConversionRecord[] | null>(
    null
  );
  const [settings, setSettings] = useState<Settings | null>(null);
  const [thermostat, setThermostat] = useState<ThermostatResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick convert form state
  const [direction, setDirection] = useState<ConversionDirection>('GBP_TO_JPY');
  const [gbpPounds, setGbpPounds] = useState('');
  const [jpyAmount, setJpyAmount] = useState('');
  const [provider, setProvider] = useState<Provider>('WISE');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [ratesRes, conversionsRes, settingsRes, thermostatRes] = await Promise.all([
        fetch('/api/rates'),
        fetch('/api/conversions'),
        fetch('/api/settings'),
        fetch('/api/thermostat'),
      ]);

      if (!ratesRes.ok || !conversionsRes.ok || !settingsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [ratesData, conversionsData, settingsData] = await Promise.all([
        ratesRes.json() as Promise<RatesResponse>,
        conversionsRes.json() as Promise<ConversionRecord[]>,
        settingsRes.json() as Promise<Settings>,
      ]);

      setRates(ratesData);
      setConversions(conversionsData);
      setSettings(settingsData);

      if (thermostatRes.ok) {
        const thermostatData = await thermostatRes.json() as ThermostatResponse;
        setThermostat(thermostatData.thermostat);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auto-calculate JPY when GBP changes (or vice versa)
  useEffect(() => {
    if (!rates) return;
    const rate = rates.rate.rate;

    if (direction === 'GBP_TO_JPY' && gbpPounds) {
      const pounds = parseFloat(gbpPounds);
      if (!isNaN(pounds)) {
        setJpyAmount(Math.round(pounds * rate).toString());
      }
    } else if (direction === 'JPY_TO_GBP' && jpyAmount) {
      const jpy = parseFloat(jpyAmount);
      if (!isNaN(jpy) && rate > 0) {
        setGbpPounds((jpy / rate).toFixed(2));
      }
    }
  }, [gbpPounds, jpyAmount, direction, rates]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rates || submitting) return;

    const pounds = parseFloat(gbpPounds);
    const jpy = parseFloat(jpyAmount);
    if (isNaN(pounds) || isNaN(jpy) || pounds <= 0 || jpy <= 0) {
      setToast({ type: 'error', message: 'Please enter valid amounts.' });
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          direction,
          gbpPence: Math.round(pounds * 100),
          jpyAmount: Math.round(jpy),
          rate: rates.rate.rate,
          spotRate: rates.rate.rate,
          provider,
          bandAtTime: rates.band?.band ?? null,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string } | null)?.error ?? 'Failed to log conversion'
        );
      }

      setToast({ type: 'success', message: 'Conversion logged successfully.' });
      setGbpPounds('');
      setJpyAmount('');
      setNotes('');
      // Refresh conversions and thermostat
      const [freshConversions, freshThermostat] = await Promise.all([
        fetch('/api/conversions'),
        fetch('/api/thermostat'),
      ]);
      if (freshConversions.ok) {
        setConversions(await freshConversions.json());
      }
      if (freshThermostat.ok) {
        const thermostatData = await freshThermostat.json() as ThermostatResponse;
        setThermostat(thermostatData.thermostat);
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to log conversion',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !rates) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-red-400 text-lg">Failed to load data</div>
        <p className="text-gray-500 text-sm">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchData();
          }}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const portfolio =
    conversions && rates
      ? calculatePortfolio(conversions, rates.rate.rate)
      : null;

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Rate & Band Section */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : rates ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rate Display */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="text-sm text-gray-500 mb-1">GBP / JPY</div>
            <div className="text-5xl font-mono font-bold tracking-tight">
              {formatRate(rates.rate.rate)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-gray-500">{rates.rate.date}</span>
              <span className="text-gray-700">|</span>
              <span className="text-gray-500">{rates.rate.source}</span>
              {rates.rate.isStale && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs border border-amber-500/30">
                  Markets closed &mdash; showing {rates.rate.date} rate
                </span>
              )}
            </div>
          </div>

          {/* Band Display */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-2">Strategy Band</div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${bandColorClasses(rates.band.band)}`}
              >
                {bandLabel(rates.band.band)}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              {rates.band.suggestion}
            </p>
          </div>
        </div>
      ) : null}

      {/* Quick Convert Section */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Convert</h2>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Direction Toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Direction</label>
              <button
                type="button"
                onClick={() =>
                  setDirection((d) =>
                    d === 'GBP_TO_JPY' ? 'JPY_TO_GBP' : 'GBP_TO_JPY'
                  )
                }
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-mono border border-gray-700 transition-colors whitespace-nowrap"
              >
                {direction === 'GBP_TO_JPY'
                  ? 'GBP \u2192 JPY'
                  : 'JPY \u2192 GBP'}
              </button>
            </div>

            {/* GBP Amount */}
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">
                GBP (\u00a3 pounds)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={gbpPounds}
                onChange={(e) => {
                  setGbpPounds(e.target.value);
                  if (direction === 'JPY_TO_GBP') return;
                  if (rates && e.target.value) {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) {
                      setJpyAmount(Math.round(v * rates.rate.rate).toString());
                    }
                  }
                }}
                placeholder="100.00"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* JPY Amount */}
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">
                JPY (\u00a5)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={jpyAmount}
                onChange={(e) => {
                  setJpyAmount(e.target.value);
                  if (direction === 'GBP_TO_JPY') return;
                  if (rates && e.target.value) {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && rates.rate.rate > 0) {
                      setGbpPounds((v / rates.rate.rate).toFixed(2));
                    }
                  }
                }}
                placeholder="19245"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Provider */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="WISE">Wise</option>
                <option value="REVOLUT">Revolut</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Monthly transfer"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !rates}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              {submitting ? 'Logging...' : 'Log Conversion'}
            </button>
          </div>
          {/* Budget Warning */}
          {thermostat && direction === 'GBP_TO_JPY' && gbpPounds && (() => {
            const pence = Math.round(parseFloat(gbpPounds) * 100);
            if (!isNaN(pence) && pence > 0 && pence > thermostat.remainingBudget && thermostat.monthlyCap > 0) {
              return (
                <div className="mt-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                  This conversion ({formatGbp(pence)}) would exceed your monthly remaining budget of {formatGbp(thermostat.remainingBudget)}
                </div>
              );
            }
            return null;
          })()}
        </form>
      </div>

      {/* Monthly Budget (Thermostat) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : thermostat ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Monthly Budget</h2>
            <div className="flex items-center gap-2">
              {thermostat.atCap && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Monthly cap reached
                </span>
              )}
              {thermostat.overExposed && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                  Over exposure limit
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Cap Progress */}
            <div>
              <div className="text-xs text-gray-500 mb-2">Monthly Conversion Cap</div>
              <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all ${
                    thermostat.band === 'AGGRESSIVE_BUY'
                      ? 'bg-emerald-500'
                      : thermostat.band === 'NORMAL_BUY'
                        ? 'bg-blue-500'
                        : 'bg-gray-600'
                  }`}
                  style={{
                    width: thermostat.monthlyCap > 0
                      ? `${Math.min(100, (thermostat.convertedThisMonth / thermostat.monthlyCap) * 100)}%`
                      : '0%',
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">
                  {formatGbp(thermostat.convertedThisMonth)} of {formatGbp(thermostat.monthlyCap)} used
                </span>
                <span className="text-gray-500">
                  {formatGbp(thermostat.remainingBudget)} remaining
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-3">{thermostat.suggestion}</p>
            </div>

            {/* FX Exposure */}
            <div>
              <div className="text-xs text-gray-500 mb-2">FX Exposure</div>
              <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all ${
                    thermostat.overExposed
                      ? 'bg-red-500'
                      : thermostat.exposurePct >= (settings?.max_fx_exposure_pct ?? 80) * 0.8
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, thermostat.exposurePct)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className={`${
                  thermostat.overExposed
                    ? 'text-red-400'
                    : thermostat.exposurePct >= (settings?.max_fx_exposure_pct ?? 80) * 0.8
                      ? 'text-amber-400'
                      : 'text-gray-400'
                }`}>
                  {thermostat.exposurePct.toFixed(1)}% of {settings?.max_fx_exposure_pct ?? 80}% max
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Portfolio Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Portfolio Summary</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : portfolio ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total GBP Converted"
              value={formatGbp(portfolio.totalGbpConverted)}
            />
            <StatCard
              label="Total JPY Acquired"
              value={formatJpy(portfolio.totalJpyAcquired)}
            />
            <StatCard
              label="Weighted Avg Rate"
              value={
                portfolio.weightedAvgRate > 0
                  ? formatRate(portfolio.weightedAvgRate)
                  : '--'
              }
              mono
            />
            <StatCard
              label="Current Value (GBP)"
              value={formatGbp(portfolio.currentValueGbp)}
            />
            <StatCard
              label="Unrealised P&L"
              value={formatGbp(portfolio.unrealisedPnlGbp)}
              color={
                portfolio.unrealisedPnlGbp > 0
                  ? 'text-emerald-400'
                  : portfolio.unrealisedPnlGbp < 0
                    ? 'text-red-400'
                    : undefined
              }
            />
            <StatCard
              label="P&L %"
              value={`${portfolio.unrealisedPnlPct >= 0 ? '+' : ''}${portfolio.unrealisedPnlPct.toFixed(2)}%`}
              color={
                portfolio.unrealisedPnlPct > 0
                  ? 'text-emerald-400'
                  : portfolio.unrealisedPnlPct < 0
                    ? 'text-red-400'
                    : undefined
              }
              mono
            />
            <StatCard
              label="Conversions"
              value={portfolio.conversionCount.toString()}
              mono
            />
            {settings && (
              <StatCard
                label="Monthly Cap"
                value={
                  rates?.band.band === 'AGGRESSIVE_BUY'
                    ? formatGbp(settings.cap_aggressive_gbp)
                    : formatGbp(settings.cap_normal_gbp)
                }
              />
            )}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center text-gray-500">
            No conversion data available.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  mono,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={`text-xl font-semibold ${mono ? 'font-mono' : ''} ${color ?? 'text-gray-100'}`}
      >
        {value}
      </div>
    </div>
  );
}
