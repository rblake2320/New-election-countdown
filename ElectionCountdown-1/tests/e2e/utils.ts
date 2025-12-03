import { expect, Page } from "@playwright/test";

export const API = process.env.API_BASE || process.env.BASE_URL || "http://localhost:5000";

export async function j<T=any>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${path}`);
  return r.json() as Promise<T>;
}

export async function headOk(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch { return false; }
}

export async function assertNoMSW(page: Page) {
  const swCount = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    return regs.filter(r => /msw|mock/i.test(r.active?.scriptURL ?? "")).length;
  });
  expect(swCount, "Mock SW should not be active in prod").toBe(0);
}

export function pickSample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr.slice();
  const step = Math.max(1, Math.floor(arr.length / n));
  const out: T[] = [];
  for (let i=0; i<arr.length && out.length<n; i+=step) out.push(arr[i]);
  return out;
}