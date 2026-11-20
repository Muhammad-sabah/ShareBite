import { useEffect, useState } from 'react';
import { computeCountdown, CountdownResult } from '../utils/format';

/**
 * Pure UI 1-second countdown timer hook (FR-TIMER-01 / FR-TIMER-02).
 * Does NOT perform any network requests every second.
 */
export function useCountdown(pickupEndAtIso?: string, pickupDate?: string, pickupEndTime?: string): CountdownResult {
  const [state, setState] = useState<CountdownResult>(() =>
    computeCountdown(pickupEndAtIso, pickupDate, pickupEndTime)
  );

  useEffect(() => {
    setState(computeCountdown(pickupEndAtIso, pickupDate, pickupEndTime));
    const timer = window.setInterval(() => {
      setState(computeCountdown(pickupEndAtIso, pickupDate, pickupEndTime));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pickupEndAtIso, pickupDate, pickupEndTime]);

  return state;
}

