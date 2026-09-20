import { useEffect, useRef } from 'react';

// Keeps data in step with the database when the *other* side of the app (admin
// vs. tenant portal) changes it. Calls `callback`:
//   - every `intervalMs` while the tab is visible, and
//   - right away whenever the tab becomes visible / regains focus.
// The latest `callback` is always used, so callers don't need to memoise it.
export function useAutoRefresh(callback, { intervalMs = 15000, enabled = true } = {}) {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    if (!enabled) return undefined;

    let lastRun = Date.now();
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      // focus + visibilitychange often fire together; don't fetch twice.
      if (Date.now() - lastRun < 1000) return;
      lastRun = Date.now();
      latest.current();
    };

    const timer = setInterval(run, intervalMs);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, [enabled, intervalMs]);
}
