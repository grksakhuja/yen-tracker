'use client';

import { useEffect, useRef, useState } from 'react';

interface Alert {
  id: number;
  type: string;
  message: string;
  rate: number | null;
  band: string | null;
  acknowledged: number;
  created_at: string;
}

const typeStyles: Record<string, { dot: string; label: string }> = {
  band_change: { dot: 'bg-blue-400', label: 'Band Change' },
  circuit_breaker: { dot: 'bg-red-400', label: 'Circuit Breaker' },
  reverse_zone: { dot: 'bg-amber-400', label: 'Reverse Zone' },
  recalibrate: { dot: 'bg-gray-400', label: 'Recalibrate' },
};

function getTypeStyle(type: string) {
  return typeStyles[type] ?? { dot: 'bg-gray-400', label: type };
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso + 'Z');
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AlertsBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/alerts');
        if (res.ok) {
          const data = (await res.json()) as { alerts: Alert[] };
          setAlerts(data.alerts);
        }
      } catch {
        // silently fail - alerts are non-critical
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function acknowledgeOne(id: number) {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function acknowledgeAll() {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setAlerts([]);
    setOpen(false);
  }

  const count = alerts.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 transition-colors"
        aria-label={`Alerts${count > 0 ? ` (${count} unread)` : ''}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 shadow-xl z-50">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200">
              Alerts {count > 0 && `(${count})`}
            </h3>
            {count > 0 && (
              <button
                type="button"
                onClick={acknowledgeAll}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Dismiss All
              </button>
            )}
          </div>

          {count === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No unacknowledged alerts.
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {alerts.map((alert) => {
                const style = getTypeStyle(alert.type);
                return (
                  <li
                    key={alert.id}
                    className="px-4 py-3 flex items-start gap-3 hover:bg-gray-800/40 transition-colors"
                  >
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`}
                      title={style.label}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 leading-snug">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(alert.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => acknowledgeOne(alert.id)}
                      className="shrink-0 text-xs text-gray-500 hover:text-gray-300 transition-colors mt-0.5"
                      aria-label="Dismiss alert"
                    >
                      &times;
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
