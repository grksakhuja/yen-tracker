'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '@/types';
import { penceToPounds, poundsToPence } from '@/lib/finance/currency';
import { settingsSchema } from '@/lib/validators';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';
import { ErrorRetry } from '@/components/ui/ErrorRetry';
import { FieldInput } from '@/components/ui/FieldInput';

function penceToPoundsDisplay(pence: number): string {
  return penceToPounds(pence).toFixed(2);
}

function parsePoundsToPence(pounds: string): number {
  const val = parseFloat(pounds);
  return isNaN(val) ? 0 : poundsToPence(val);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useToast();

  // Form state (strings for controlled inputs)
  const [aggressiveAbove, setAggressiveAbove] = useState('');
  const [normalAbove, setNormalAbove] = useState('');
  const [holdAbove, setHoldAbove] = useState('');
  const [capAggressive, setCapAggressive] = useState('');
  const [capNormal, setCapNormal] = useState('');
  const [totalSavings, setTotalSavings] = useState('');
  const [maxExposure, setMaxExposure] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [nisaMonthly, setNisaMonthly] = useState('');
  const [nisaReturn, setNisaReturn] = useState('');
  const [circuitBreaker, setCircuitBreaker] = useState('');
  const [safetyNetMonths, setSafetyNetMonths] = useState('');
  const [scenarioBest, setScenarioBest] = useState('');
  const [scenarioBase, setScenarioBase] = useState('');
  const [scenarioWorst, setScenarioWorst] = useState('');
  const [reviewInterval, setReviewInterval] = useState('');
  const [lastReview, setLastReview] = useState('');

  const populateForm = useCallback((s: Settings) => {
    setAggressiveAbove(s.aggressive_above.toString());
    setNormalAbove(s.normal_above.toString());
    setHoldAbove(s.hold_above.toString());
    setCapAggressive(penceToPoundsDisplay(s.cap_aggressive_gbp));
    setCapNormal(penceToPoundsDisplay(s.cap_normal_gbp));
    setTotalSavings(penceToPoundsDisplay(s.total_gbp_savings_pence));
    setMaxExposure(s.max_fx_exposure_pct.toString());
    setMonthlyExpenses(s.monthly_jpy_expenses.toString());
    setMonthlySalary(s.monthly_jpy_salary_net.toString());
    setNisaMonthly(s.nisa_monthly_jpy.toString());
    setNisaReturn(s.nisa_return_pct.toString());
    setCircuitBreaker(penceToPoundsDisplay(s.circuit_breaker_loss_pence));
    setSafetyNetMonths(s.gbp_safety_net_months.toString());
    setScenarioBest(s.scenario_best_rate.toString());
    setScenarioBase(s.scenario_base_rate.toString());
    setScenarioWorst(s.scenario_worst_rate.toString());
    setReviewInterval(s.review_interval_days.toString());
    setLastReview(s.last_band_review ?? '');
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data: Settings = await res.json();
      setSettings(data);
      populateForm(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch settings'
      );
    } finally {
      setLoading(false);
    }
  }, [populateForm]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const body = {
        aggressive_above: parseFloat(aggressiveAbove),
        normal_above: parseFloat(normalAbove),
        hold_above: parseFloat(holdAbove),
        cap_aggressive_gbp: parsePoundsToPence(capAggressive),
        cap_normal_gbp: parsePoundsToPence(capNormal),
        total_gbp_savings_pence: parsePoundsToPence(totalSavings),
        max_fx_exposure_pct: parseInt(maxExposure, 10),
        monthly_jpy_expenses: parseInt(monthlyExpenses, 10),
        monthly_jpy_salary_net: parseInt(monthlySalary, 10),
        nisa_monthly_jpy: parseInt(nisaMonthly, 10),
        nisa_return_pct: parseFloat(nisaReturn),
        circuit_breaker_loss_pence: parsePoundsToPence(circuitBreaker),
        gbp_safety_net_months: parseInt(safetyNetMonths, 10),
        scenario_best_rate: parseFloat(scenarioBest),
        scenario_base_rate: parseFloat(scenarioBase),
        scenario_worst_rate: parseFloat(scenarioWorst),
        review_interval_days: parseInt(reviewInterval, 10),
        last_band_review: lastReview || null,
      };

      // Client-side validation before sending to server
      const validation = settingsSchema.safeParse(body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw new Error(firstIssue?.message ?? 'Invalid settings values');
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const resBody = await res.json().catch(() => null);
        throw new Error(
          (resBody as { error?: string } | null)?.error ?? 'Failed to save settings'
        );
      }

      const updated: Settings = await res.json();
      setSettings(updated);
      setToast({ type: 'success', message: 'Settings saved successfully.' });
    } catch (err) {
      setToast({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) {
    return (
      <ErrorRetry
        title="Failed to load settings"
        message={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
          fetchSettings();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 animate-pulse">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Band number line values
  const ha = parseFloat(holdAbove) || 0;
  const na = parseFloat(normalAbove) || 0;
  const aa = parseFloat(aggressiveAbove) || 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast toast={toast} />}

      <h1 className="text-2xl font-bold">Settings</h1>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Band Thresholds */}
        <section className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Band Thresholds</h2>
          <p className="text-sm text-gray-500">GBP/JPY rate thresholds that determine the current strategy band. Rates above Aggressive trigger maximum buying; between Normal and Aggressive is standard buying; between Hold and Normal means wait; below Hold enters the reverse zone.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldInput
              label="Aggressive Buy Above"
              value={aggressiveAbove}
              onChange={setAggressiveAbove}
              type="number"
              step="0.01"
              hint="Default: 200"
            />
            <FieldInput
              label="Normal Buy Above"
              value={normalAbove}
              onChange={setNormalAbove}
              type="number"
              step="0.01"
              hint="Default: 190"
            />
            <FieldInput
              label="Hold Above"
              value={holdAbove}
              onChange={setHoldAbove}
              type="number"
              step="0.01"
              hint="Default: 175"
            />
          </div>

          {/* Visual number line */}
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Band Zones</div>
            <div className="flex items-center h-8 rounded-lg overflow-hidden text-xs font-medium">
              <div className="flex-1 bg-red-500/30 text-red-400 flex items-center justify-center px-2 truncate">
                REVERSE
              </div>
              <div className="flex-shrink-0 bg-gray-700 text-gray-300 px-2 py-1 text-xs font-mono">
                {ha.toFixed(1)}
              </div>
              <div className="flex-1 bg-amber-500/30 text-amber-400 flex items-center justify-center px-2 truncate">
                HOLD
              </div>
              <div className="flex-shrink-0 bg-gray-700 text-gray-300 px-2 py-1 text-xs font-mono">
                {na.toFixed(1)}
              </div>
              <div className="flex-1 bg-blue-500/30 text-blue-400 flex items-center justify-center px-2 truncate">
                NORMAL BUY
              </div>
              <div className="flex-shrink-0 bg-gray-700 text-gray-300 px-2 py-1 text-xs font-mono">
                {aa.toFixed(1)}
              </div>
              <div className="flex-1 bg-emerald-500/30 text-emerald-400 flex items-center justify-center px-2 truncate">
                AGGRESSIVE BUY
              </div>
            </div>
          </div>
        </section>

        {/* Monthly Caps */}
        <section className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Monthly Caps</h2>
          <p className="text-sm text-gray-500">Maximum GBP to convert per month in each band. The aggressive cap applies when the rate is above the aggressive threshold; the normal cap applies otherwise.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput
              label="Aggressive Cap (GBP \u00a3)"
              value={capAggressive}
              onChange={setCapAggressive}
              type="number"
              step="0.01"
              hint="Default: \u00a32,000"
            />
            <FieldInput
              label="Normal Cap (GBP \u00a3)"
              value={capNormal}
              onChange={setCapNormal}
              type="number"
              step="0.01"
              hint="Default: \u00a31,000"
            />
          </div>
        </section>

        {/* Personal Finance */}
        <section className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Personal Finance</h2>
          <p className="text-sm text-gray-500">Your financial baseline used to calculate FX exposure limits and safety net requirements.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldInput
              label="Total GBP Savings (\u00a3)"
              value={totalSavings}
              onChange={setTotalSavings}
              type="number"
              step="0.01"
              hint="Default: \u00a350,000"
            />
            <FieldInput
              label="Max FX Exposure %"
              value={maxExposure}
              onChange={setMaxExposure}
              type="number"
              step="1"
              hint="Default: 80%"
            />
            <FieldInput
              label="Monthly JPY Expenses (\u00a5)"
              value={monthlyExpenses}
              onChange={setMonthlyExpenses}
              type="number"
              step="1"
              hint="Default: \u00a5250,000"
            />
            <FieldInput
              label="Monthly JPY Salary (\u00a5)"
              value={monthlySalary}
              onChange={setMonthlySalary}
              type="number"
              step="1"
              hint="Default: \u00a5300,000"
            />
            <FieldInput
              label="NISA Monthly (\u00a5)"
              value={nisaMonthly}
              onChange={setNisaMonthly}
              type="number"
              step="1"
              hint="Default: \u00a5100,000"
            />
            <FieldInput
              label="NISA Return %"
              value={nisaReturn}
              onChange={setNisaReturn}
              type="number"
              step="0.1"
              hint="Default: 5%"
            />
          </div>
        </section>

        {/* Risk Management */}
        <section className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Risk Management</h2>
          <p className="text-sm text-gray-500">Pause conversions if unrealised losses exceed the circuit breaker threshold. Safety net ensures you keep enough GBP to cover this many months of living expenses.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput
              label="Circuit Breaker Loss (\u00a3)"
              value={circuitBreaker}
              onChange={setCircuitBreaker}
              type="number"
              step="0.01"
              hint="Default: \u00a35,000"
            />
            <FieldInput
              label="GBP Safety Net (months)"
              value={safetyNetMonths}
              onChange={setSafetyNetMonths}
              type="number"
              step="1"
              hint="Default: 6"
            />
          </div>
        </section>

        {/* Scenarios */}
        <section className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Scenarios</h2>
          <p className="text-sm text-gray-500">GBP/JPY rate assumptions used in scenario planning calculations.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldInput
              label="Best Case Rate"
              value={scenarioBest}
              onChange={setScenarioBest}
              type="number"
              step="0.01"
              hint="Default: 210"
            />
            <FieldInput
              label="Base Case Rate"
              value={scenarioBase}
              onChange={setScenarioBase}
              type="number"
              step="0.01"
              hint="Default: 190"
            />
            <FieldInput
              label="Worst Case Rate"
              value={scenarioWorst}
              onChange={setScenarioWorst}
              type="number"
              step="0.01"
              hint="Default: 170"
            />
          </div>
        </section>

        {/* Review */}
        <section className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Review Schedule</h2>
          <p className="text-sm text-gray-500">How often to review and potentially adjust band thresholds. The last review date tracks when thresholds were last evaluated.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput
              label="Review Interval (days)"
              value={reviewInterval}
              onChange={setReviewInterval}
              type="number"
              step="1"
              hint="Default: 90"
            />
            <FieldInput
              label="Last Review Date"
              value={lastReview}
              onChange={setLastReview}
              type="date"
            />
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
