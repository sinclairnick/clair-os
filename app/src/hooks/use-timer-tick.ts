import { useState, useEffect } from "react";

/**
 * A hook that forces a re-render at a regular interval when enabled.
 * Useful for "live" UI components like timers that calculate their 
 * display values based on the current wall clock time.
 * 
 * @param isEnabled - Whether the ticking should be active
 * @param intervalMs - How often to force a re-render (default 50ms for 20fps)
 */
export function useTimerTick(isEnabled: boolean, intervalMs: number = 50) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      setTick((s) => s + 1);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isEnabled, intervalMs]);
}
