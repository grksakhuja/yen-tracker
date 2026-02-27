'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  ConversionDirection,
  ConversionRecord,
  Provider,
  RatesResponse,
  Settings,
  ThermostatResponse,
  ThermostatResult,
} from '@/types';
import { formatGBP, formatJPY, formatRate, calculateEffectiveRate } from '@/lib/finance/currency';
import { getBandFullClasses, getBandLabel } from '@/lib/strategy/bands';
import { calculatePortfolioSummary } from '@/lib/finance/pnl';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';
import { ErrorRetry } from '@/components/ui/ErrorRetry';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { StatCard } from '@/components/ui/StatCard';

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
  const [toast, setToast] = useToast();

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

  // Compute effective rate from manual amounts
  const parsedPounds = parseFloat(gbpPounds);
  const parsedJpy = parseFloat(jpyAmount);
  const effectiveRate =
    !isNaN(parsedPounds) && !isNaN(parsedJpy) && parsedPounds > 0 && parsedJpy > 0
      ? parsedJpy / parsedPounds
      : null;

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
          rate: jpy / pounds,
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
      // Refresh all data
      await fetchData();
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
      <ErrorRetry
        title="Failed to load data"
        message={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
          fetchData();
        }}
      />
    );
  }

  const portfolio =
    conversions && rates
      ? calculatePortfolioSummary(conversions, rates.rate.rate)
      : null;

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && <Toast toast={toast} />}

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
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getBandFullClasses(rates.band.band)}`}
              >
                {getBandLabel(rates.band.band)}
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
          {/* Effective Rate Display */}
          {effectiveRate !== null && rates && (
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-gray-500">Effective rate:</span>
              <span className="font-mono font-semibold text-gray-200">{effectiveRate.toFixed(2)}</span>
              {Math.abs(effectiveRate - rates.rate.rate) > 0.01 && (
                <span className={`text-xs ${effectiveRate > rates.rate.rate ? 'text-emerald-400' : 'text-red-400'}`}>
                  ({effectiveRate > rates.rate.rate ? '+' : ''}{(effectiveRate - rates.rate.rate).toFixed(2)} vs spot {formatRate(rates.rate.rate)})
                </span>
              )}
            </div>
          )}
          {/* Budget Warning */}
          {thermostat && direction === 'GBP_TO_JPY' && gbpPounds &&
            !isNaN(parsedPounds) && parsedPounds > 0 &&
            Math.round(parsedPounds * 100) > thermostat.remainingBudget &&
            thermostat.monthlyCap > 0 && (
              <div className="mt-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                This conversion ({formatGBP(Math.round(parsedPounds * 100))}) would exceed your monthly remaining budget of {formatGBP(thermostat.remainingBudget)}
              </div>
            )}
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
                  {formatGBP(thermostat.convertedThisMonth)} of {formatGBP(thermostat.monthlyCap)} used
                </span>
                <span className="text-gray-500">
                  {formatGBP(thermostat.remainingBudget)} remaining
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
              value={formatGBP(portfolio.totalGbpConverted)}
            />
            <StatCard
              label="Total JPY Acquired"
              value={formatJPY(portfolio.totalJpyAcquired)}
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
              value={formatGBP(portfolio.currentValueGbp)}
            />
            <StatCard
              label="Unrealised P&L"
              value={formatGBP(portfolio.unrealisedPnlGbp)}
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
                    ? formatGBP(settings.cap_aggressive_gbp)
                    : formatGBP(settings.cap_normal_gbp)
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
