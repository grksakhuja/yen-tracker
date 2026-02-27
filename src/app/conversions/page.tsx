'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ConversionRecord } from '@/types';
import { formatGBP, formatJPY, formatRate, calculateEffectiveRate } from '@/lib/finance/currency';
import { getBandBadgeClasses, getBandLabel } from '@/lib/strategy/bands';
import { ErrorRetry } from '@/components/ui/ErrorRetry';

function directionLabel(direction: string): string {
  return direction === 'GBP_TO_JPY' ? 'GBP \u2192 JPY' : 'JPY \u2192 GBP';
}

function getCurrentTaxYears(): { label: string; value: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // UK tax year: 6 Apr - 5 Apr
  const ukCurrentStart = month >= 3 ? year : year - 1; // April = month 3
  const ukPreviousStart = ukCurrentStart - 1;

  // JP tax year: 1 Jan - 31 Dec (calendar year)
  const jpCurrent = year;
  const jpPrevious = year - 1;

  return [
    {
      label: `UK ${ukCurrentStart}-${ukCurrentStart + 1}`,
      value: `${ukCurrentStart}-${ukCurrentStart + 1}`,
    },
    {
      label: `UK ${ukPreviousStart}-${ukPreviousStart + 1}`,
      value: `${ukPreviousStart}-${ukPreviousStart + 1}`,
    },
    {
      label: `JP ${jpCurrent}`,
      value: `${jpCurrent}-${jpCurrent}`,
    },
    {
      label: `JP ${jpPrevious}`,
      value: `${jpPrevious}-${jpPrevious}`,
    },
  ];
}

export default function ConversionsPage() {
  const [conversions, setConversions] = useState<ConversionRecord[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [exportTaxYear, setExportTaxYear] = useState(
    getCurrentTaxYears()[0].value
  );

  const fetchConversions = useCallback(async () => {
    try {
      const res = await fetch('/api/conversions');
      if (!res.ok) throw new Error('Failed to fetch conversions');
      const data: ConversionRecord[] = await res.json();
      setConversions(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch conversions'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversions();
  }, [fetchConversions]);

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/conversions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete conversion');
      setConversions((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
      setDeleteConfirm(null);
    } catch {
      setError('Failed to delete conversion');
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  }

  function handleExport() {
    const taxYearOptions = getCurrentTaxYears();
    const selected = taxYearOptions.find((t) => t.value === exportTaxYear);
    const taxSystem = selected?.label.startsWith('JP') ? 'jp' : 'uk';
    window.open(
      `/api/export?taxYear=${exportTaxYear}&taxSystem=${taxSystem}`,
      '_blank'
    );
  }

  if (error && !conversions) {
    return (
      <ErrorRetry
        title="Failed to load conversions"
        message={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
          fetchConversions();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Conversion History</h1>
        <div className="flex items-center gap-3">
          <select
            value={exportTaxYear}
            onChange={(e) => setExportTaxYear(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          >
            {getCurrentTaxYears().map((ty) => (
              <option key={ty.value} value={ty.value}>
                {ty.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 animate-pulse">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-800 rounded" />
            ))}
          </div>
        </div>
      ) : conversions && conversions.length > 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GBP
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    JPY
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eff. Rate
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spot
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spread
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Band
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {conversions.map((c) => {
                  const effRate = calculateEffectiveRate(c.jpy_amount, c.gbp_amount);
                  const spotRate = c.spot_rate;
                  const spread = spotRate != null ? effRate - spotRate : null;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-gray-300">
                        {c.date}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {directionLabel(c.direction)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-100">
                        {formatGBP(c.gbp_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-100">
                        {formatJPY(c.jpy_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-100">
                        {formatRate(effRate)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">
                        {spotRate != null ? formatRate(spotRate) : '--'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {spread != null && Math.abs(spread) >= 0.01 ? (
                          <span className={`text-xs ${spread > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {spread > 0 ? '+' : ''}{spread.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-600">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {c.provider ?? '--'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getBandBadgeClasses(c.band_at_time)}`}
                        >
                          {getBandLabel(c.band_at_time)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                        {c.notes ?? ''}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {deleteConfirm === c.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deleting === c.id}
                              className="px-2 py-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 rounded text-xs font-medium transition-colors"
                            >
                              {deleting === c.id ? '...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(c.id)}
                            className="px-2 py-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded text-xs font-medium transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-500 text-lg">No conversions yet.</p>
          <p className="text-gray-600 text-sm mt-2">
            Log your first conversion on the{' '}
            <a href="/" className="text-emerald-400 hover:underline">
              dashboard
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
