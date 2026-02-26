'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ── Types for API response ────────────────────────────────────────────

interface ScenarioResult {
  label: string;
  rate: number;
  totalJpyIfConvertNow: number;
  monthlyJpyBudget: number;
  jpyPerPound: number;
}

interface StrategyResult {
  label: string;
  description: string;
  totalJpy: number;
  avgRate: number;
  riskLevel: string;
}

interface StrategyComparison {
  lumpSum: StrategyResult;
  monthlyDrip: StrategyResult;
  thermostat: StrategyResult;
}

interface NisaYear {
  year: number;
  contributed: number;
  growth: number;
  totalValue: number;
}

interface NisaProjection {
  years: NisaYear[];
  totalContributed: number;
  totalValue: number;
  totalGrowth: number;
  growthPct: number;
}

interface RateHistoryPoint {
  date: string;
  rate: number;
}

interface RateRange {
  high: number;
  low: number;
  highDate: string;
  lowDate: string;
  current: number;
  percentile: number;
}

interface PortfolioSummary {
  totalGbpConverted: number;
  netGbpDeployed: number;
  totalJpyAcquired: number;
  weightedAvgRate: number;
  currentRate: number;
  currentValueGbp: number;
  unrealisedPnlGbp: number;
  unrealisedPnlPct: number;
  conversionCount: number;
}

interface ProjectionsData {
  scenarios: {
    best: ScenarioResult;
    base: ScenarioResult;
    worst: ScenarioResult;
  };
  breakEvenRate: number;
  strategyComparison: StrategyComparison;
  nisaProjection: NisaProjection;
  rateHistory: RateHistoryPoint[];
  range52Week: RateRange | null;
  currentRate: number;
  portfolio: PortfolioSummary;
}

// ── Formatters ────────────────────────────────────────────────────────

function formatJpy(jpy: number): string {
  return `\u00a5${jpy.toLocaleString()}`;
}

function formatRate(rate: number): string {
  return rate.toFixed(2);
}

// ── Skeleton ──────────────────────────────────────────────────────────

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-gray-900 rounded-xl border border-gray-800 p-6 animate-pulse ${className}`}
    >
      <div className="h-4 bg-gray-800 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-800 rounded w-2/3 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-1/2" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function ProjectionsPage() {
  const [data, setData] = useState<ProjectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/projections');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string } | null)?.error ??
            'Failed to fetch projections'
        );
      }
      const json = (await res.json()) as ProjectionsData;
      setData(json);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch projections'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Error state ───────────────────────────────────────────────────

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-red-400 text-lg">Failed to load projections</div>
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

  // ── Loading state ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard className="h-48" />
        <SkeletonCard />
        <SkeletonCard className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  const {
    scenarios,
    breakEvenRate,
    strategyComparison,
    nisaProjection,
    rateHistory,
    range52Week,
    currentRate,
    portfolio,
  } = data;

  const inProfit = currentRate > breakEvenRate && breakEvenRate > 0;

  return (
    <div className="space-y-8">
      {/* Section 1: Break-Even & Current Position */}
      <BreakEvenSection
        breakEvenRate={breakEvenRate}
        currentRate={currentRate}
        inProfit={inProfit}
      />

      {/* Section 2: 3-Scenario Projections */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Scenario Projections</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScenarioCard scenario={scenarios.best} color="emerald" />
          <ScenarioCard scenario={scenarios.base} color="blue" />
          <ScenarioCard scenario={scenarios.worst} color="amber" />
        </div>
      </div>

      {/* Section 3: Strategy Comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Strategy Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StrategyCard strategy={strategyComparison.lumpSum} />
          <StrategyCard strategy={strategyComparison.monthlyDrip} />
          <StrategyCard
            strategy={strategyComparison.thermostat}
            highlighted
          />
        </div>
      </div>

      {/* Section 4: NISA Projection */}
      <NisaSection projection={nisaProjection} />

      {/* Section 5: 52-Week Range */}
      <RangeSection range={range52Week} />

      {/* Section 6: Rate History Chart */}
      <RateHistoryChart
        history={rateHistory}
        breakEvenRate={breakEvenRate}
      />
    </div>
  );
}

// ── Section 1: Break-Even ─────────────────────────────────────────────

function BreakEvenSection({
  breakEvenRate,
  currentRate,
  inProfit,
}: {
  breakEvenRate: number;
  currentRate: number;
  inProfit: boolean;
}) {
  // Calculate the position of current rate on the bar
  // Use break-even as center, show range +/- 20%
  const center = breakEvenRate > 0 ? breakEvenRate : currentRate;
  const rangeMin = center * 0.9;
  const rangeMax = center * 1.1;
  const clampedRate = Math.max(rangeMin, Math.min(rangeMax, currentRate));
  const positionPct =
    rangeMax > rangeMin
      ? ((clampedRate - rangeMin) / (rangeMax - rangeMin)) * 100
      : 50;
  const breakEvenPct =
    rangeMax > rangeMin
      ? ((center - rangeMin) / (rangeMax - rangeMin)) * 100
      : 50;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h2 className="text-lg font-semibold mb-4">
        Break-Even & Current Position
      </h2>

      {breakEvenRate > 0 ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">
                Break-even rate
              </div>
              <div className="text-3xl font-mono font-bold">
                {formatRate(breakEvenRate)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Current rate</div>
              <div
                className={`text-3xl font-mono font-bold ${
                  inProfit ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatRate(currentRate)}
              </div>
              <div
                className={`text-sm font-medium mt-1 ${
                  inProfit ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {inProfit ? 'In profit' : 'In loss'}
              </div>
            </div>
          </div>

          {/* Visual bar */}
          <div className="relative h-4 bg-gray-800 rounded-full overflow-visible">
            {/* Break-even marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-500 z-10"
              style={{ left: `${breakEvenPct}%` }}
            />
            <div
              className="absolute -top-6 text-xs text-gray-500 whitespace-nowrap"
              style={{
                left: `${breakEvenPct}%`,
                transform: 'translateX(-50%)',
              }}
            >
              Break-even
            </div>

            {/* Colored fill up to current rate position */}
            <div
              className={`absolute top-0 h-full rounded-full ${
                inProfit ? 'bg-emerald-500/40' : 'bg-red-500/40'
              }`}
              style={{
                left: `${Math.min(positionPct, breakEvenPct)}%`,
                width: `${Math.abs(positionPct - breakEvenPct)}%`,
              }}
            />

            {/* Current rate dot */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-20 ${
                inProfit
                  ? 'bg-emerald-500 border-emerald-300'
                  : 'bg-red-500 border-red-300'
              }`}
              style={{
                left: `${positionPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
            <div
              className={`absolute top-6 text-xs font-mono font-semibold whitespace-nowrap ${
                inProfit ? 'text-emerald-400' : 'text-red-400'
              }`}
              style={{
                left: `${positionPct}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {formatRate(currentRate)}
            </div>
          </div>
          <div className="h-6" /> {/* Spacer for label below bar */}
        </>
      ) : (
        <div className="text-gray-500 text-sm">
          Log some conversions to see your break-even rate.
        </div>
      )}
    </div>
  );
}

// ── Section 2: Scenario Card ──────────────────────────────────────────

function ScenarioCard({
  scenario,
  color,
}: {
  scenario: ScenarioResult;
  color: 'emerald' | 'blue' | 'amber';
}) {
  const borderMap = {
    emerald: 'border-emerald-500/30',
    blue: 'border-blue-500/30',
    amber: 'border-amber-500/30',
  };
  const textMap = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  };
  const bgMap = {
    emerald: 'bg-emerald-500/10',
    blue: 'bg-blue-500/10',
    amber: 'bg-amber-500/10',
  };

  return (
    <div
      className={`bg-gray-900 rounded-xl border p-6 ${borderMap[color]}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bgMap[color]} ${borderMap[color]} ${textMap[color]}`}
        >
          {scenario.label}
        </span>
      </div>
      <div className={`text-2xl font-mono font-bold mb-1 ${textMap[color]}`}>
        {formatRate(scenario.rate)}
      </div>
      <div className="text-sm text-gray-400 mb-3">
        Your remaining GBP converts to{' '}
        <span className="font-mono font-semibold text-gray-200">
          {formatJpy(scenario.totalJpyIfConvertNow)}
        </span>
      </div>
      <div className="text-sm text-gray-500">
        Covers{' '}
        <span className="font-mono font-semibold text-gray-300">
          {scenario.monthlyJpyBudget}
        </span>{' '}
        months of expenses
      </div>
    </div>
  );
}

// ── Section 3: Strategy Card ──────────────────────────────────────────

function StrategyCard({
  strategy,
  highlighted = false,
}: {
  strategy: StrategyResult;
  highlighted?: boolean;
}) {
  const riskColorMap: Record<string, string> = {
    High: 'bg-red-500/20 text-red-400 border-red-500/30',
    Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  return (
    <div
      className={`bg-gray-900 rounded-xl border p-6 ${
        highlighted
          ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
          : 'border-gray-800'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-100">{strategy.label}</h3>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${
            riskColorMap[strategy.riskLevel] ?? riskColorMap['Medium']
          }`}
        >
          {strategy.riskLevel} Risk
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">{strategy.description}</p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total JPY</span>
          <span className="font-mono font-semibold text-gray-200">
            {formatJpy(strategy.totalJpy)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Effective Avg Rate</span>
          <span className="font-mono font-semibold text-gray-200">
            {formatRate(strategy.avgRate)}
          </span>
        </div>
      </div>
      {highlighted && (
        <div className="mt-4 pt-3 border-t border-emerald-500/20">
          <span className="text-xs font-semibold text-emerald-400">
            Active Strategy
          </span>
        </div>
      )}
    </div>
  );
}

// ── Section 4: NISA Projection ────────────────────────────────────────

function NisaSection({ projection }: { projection: NisaProjection }) {
  const milestones = projection.years.filter(
    (y) => y.year === 5 || y.year === 10 || y.year === 20
  );

  // Derive monthly contribution from first year (totalContributed / years)
  const monthlyJpy =
    projection.years.length > 0
      ? Math.round(projection.years[0].contributed / 12)
      : 0;

  // Derive return percentage from growth pattern
  const returnPct =
    projection.years.length >= 2 && projection.years[0].contributed > 0
      ? (
          ((projection.years[1].totalValue -
            projection.years[1].contributed -
            (projection.years[0].totalValue - projection.years[0].contributed)) /
            projection.years[0].totalValue) *
          100
        ).toFixed(1)
      : '5.0';

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h2 className="text-lg font-semibold mb-4">NISA Projection</h2>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <p className="text-sm text-gray-400">
          Contributing{' '}
          <span className="font-mono font-semibold text-gray-200">
            {formatJpy(monthlyJpy)}
          </span>
          /month at{' '}
          <span className="font-mono font-semibold text-gray-200">
            {returnPct}%
          </span>{' '}
          annual return
        </p>
      </div>

      {/* Key milestones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {milestones.map((m) => (
          <div
            key={m.year}
            className="bg-gray-800/50 rounded-lg p-4 text-center"
          >
            <div className="text-xs text-gray-500 mb-1">Year {m.year}</div>
            <div className="text-xl font-mono font-bold text-gray-100">
              {formatJpy(Math.round(m.totalValue))}
            </div>
          </div>
        ))}
      </div>

      {/* Yearly table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left py-2 font-medium">Year</th>
              <th className="text-right py-2 font-medium">Contributed</th>
              <th className="text-right py-2 font-medium">Growth</th>
              <th className="text-right py-2 font-medium">Total Value</th>
            </tr>
          </thead>
          <tbody>
            {projection.years.map((y) => (
              <tr
                key={y.year}
                className="border-b border-gray-800/50 hover:bg-gray-800/30"
              >
                <td className="py-2 font-mono text-gray-300">{y.year}</td>
                <td className="py-2 text-right font-mono text-gray-400">
                  {formatJpy(Math.round(y.contributed))}
                </td>
                <td className="py-2 text-right font-mono text-emerald-400">
                  {formatJpy(Math.round(y.growth))}
                </td>
                <td className="py-2 text-right font-mono font-semibold text-gray-200">
                  {formatJpy(Math.round(y.totalValue))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-sm text-gray-400">
          Total contributed:{' '}
          <span className="font-mono font-semibold text-gray-200">
            {formatJpy(Math.round(projection.totalContributed))}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          Total growth:{' '}
          <span className="font-mono font-semibold text-emerald-400">
            {formatJpy(Math.round(projection.totalGrowth))} (
            {projection.growthPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Section 5: 52-Week Range ──────────────────────────────────────────

function RangeSection({ range }: { range: RateRange | null }) {
  if (!range) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4">52-Week Range</h2>
        <p className="text-gray-500 text-sm">
          Rate history will build up over time as you use the app.
        </p>
      </div>
    );
  }

  const positionPct = range.percentile;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h2 className="text-lg font-semibold mb-4">52-Week Range</h2>

      <div className="flex justify-between text-sm text-gray-500 mb-2">
        <span>
          52-week low:{' '}
          <span className="font-mono text-gray-300">
            {formatRate(range.low)}
          </span>{' '}
          ({range.lowDate})
        </span>
        <span>
          52-week high:{' '}
          <span className="font-mono text-gray-300">
            {formatRate(range.high)}
          </span>{' '}
          ({range.highDate})
        </span>
      </div>

      {/* Range bar */}
      <div className="relative h-4 bg-gray-800 rounded-full mt-4 mb-8">
        {/* Gradient fill */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/30 via-amber-500/30 to-emerald-500/30" />

        {/* Current rate dot */}
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300 z-10"
          style={{
            left: `${positionPct}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div
          className="absolute top-6 text-xs font-mono font-semibold text-gray-200 whitespace-nowrap"
          style={{
            left: `${positionPct}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {formatRate(range.current)}
        </div>
      </div>

      <p className="text-sm text-gray-400">
        Current rate is at the{' '}
        <span className="font-mono font-semibold text-gray-200">
          {Math.round(range.percentile)}th
        </span>{' '}
        percentile of its 52-week range.
      </p>
    </div>
  );
}

// ── Section 6: Rate History Chart ─────────────────────────────────────

function RateHistoryChart({
  history,
  breakEvenRate,
}: {
  history: RateHistoryPoint[];
  breakEvenRate: number;
}) {
  if (history.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Rate History</h2>
        <p className="text-gray-500 text-sm">
          Rate history will build up over time as you use the app.
        </p>
      </div>
    );
  }

  // Determine Y-axis domain with padding
  const rates = history.map((h) => h.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const padding = (maxRate - minRate) * 0.1 || 2;
  const yMin = Math.floor(minRate - padding);
  const yMax = Math.ceil(maxRate + padding);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h2 className="text-lg font-semibold mb-4">Rate History</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <XAxis
              dataKey="date"
              stroke="#4b5563"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke="#4b5563"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              tickFormatter={(v: number) => v.toFixed(0)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '0.75rem',
                color: '#e5e7eb',
                fontSize: '0.875rem',
              }}
              labelStyle={{ color: '#9ca3af' }}
              formatter={(value: number | undefined) => [
                formatRate(value ?? 0),
                'GBP/JPY',
              ]}
            />
            {breakEvenRate > 0 && (
              <ReferenceLine
                y={breakEvenRate}
                stroke={
                  history[history.length - 1]?.rate >= breakEvenRate
                    ? '#10b981'
                    : '#ef4444'
                }
                strokeDasharray="6 4"
                label={{
                  value: `Break-even ${formatRate(breakEvenRate)}`,
                  fill:
                    history[history.length - 1]?.rate >= breakEvenRate
                      ? '#10b981'
                      : '#ef4444',
                  fontSize: 12,
                  position: 'insideTopRight',
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: '#3b82f6',
                stroke: '#1e40af',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
