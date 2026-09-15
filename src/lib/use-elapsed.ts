"use client";

import { useEffect, useState } from "react";

export function useTicker(active: boolean): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [active]);

  return now;
}

export function secondsSince(startedAt: number, now: number): number {
  return now > startedAt ? Math.round((now - startedAt) / 1000) : 0;
}
