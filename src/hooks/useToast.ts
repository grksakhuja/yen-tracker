'use client';

import { useEffect, useState } from 'react';

export interface Toast {
  type: 'success' | 'error';
  message: string;
}

export function useToast(duration = 4000) {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(timer);
  }, [toast, duration]);

  return [toast, setToast] as const;
}
