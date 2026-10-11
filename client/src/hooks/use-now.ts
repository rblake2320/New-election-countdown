import { useSyncExternalStore } from "react";

// Shared clocks: one timer per interval for the whole page. Countdowns use the
// 1 s clock (each card used to run its own 50 ms interval); list membership
// (which races are still upcoming) uses the 60 s clock so the home page rolls
// over at midnight without re-rendering every second.

interface Clock { now: number; timer: ReturnType<typeof setInterval> | null; listeners: Set<() => void> }
const clocks = new Map<number, Clock>();

function clockFor(intervalMs: number): Clock {
  let c = clocks.get(intervalMs);
  if (!c) {
    c = { now: Date.now(), timer: null, listeners: new Set() };
    clocks.set(intervalMs, c);
  }
  return c;
}

function subscribeTo(intervalMs: number) {
  return (listener: () => void) => {
    const c = clockFor(intervalMs);
    c.listeners.add(listener);
    if (!c.timer) {
      c.now = Date.now();
      c.timer = setInterval(() => {
        c.now = Date.now();
        c.listeners.forEach(l => l());
      }, intervalMs);
    }
    return () => {
      c.listeners.delete(listener);
      if (c.listeners.size === 0 && c.timer) {
        clearInterval(c.timer);
        c.timer = null;
      }
    };
  };
}

const subscribers = new Map<number, (l: () => void) => () => void>();

export function useNow(intervalMs = 1000): number {
  let subscribe = subscribers.get(intervalMs);
  if (!subscribe) {
    subscribe = subscribeTo(intervalMs);
    subscribers.set(intervalMs, subscribe);
  }
  const snapshot = () => clockFor(intervalMs).now;
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
