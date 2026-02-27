'use client';

import { useEffect, useState } from 'react';
import type { Toast as ToastType } from '@/hooks/useToast';

export function Toast({ toast }: { toast: ToastType }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation on next frame
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [toast]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${
        toast.type === 'success'
          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
          : 'bg-red-500/20 border-red-500/30 text-red-400'
      }`}
    >
      {toast.message}
    </div>
  );
}
