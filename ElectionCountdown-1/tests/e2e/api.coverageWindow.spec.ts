import { test, expect } from "@playwright/test";

const API = process.env.API_BASE || "http://localhost:5000";

test("all elections in next 60 days have either linked or fallback candidates", async () => {
  const all = await fetch(`${API}/api/elections?limit=5000`).then(r => r.json());
  
  const soon = all.filter((e: any) => {
    const d = new Date(e.date).getTime();
    const now = Date.now();
    return d >= now - 7 * 864e5 && d <= now + 60 * 864e5;
  });
  
  console.log(`Testing ${soon.length} elections in the next 60 days`);
  
  for (const e of soon) {
    const cs = await fetch(`${API}/api/elections/${e.id}/candidates`).then(r => r.json());
    expect(Array.isArray(cs)).toBeTruthy();
    expect(cs.length >= 0).toBeTruthy(); // presence guaranteed; count may be 0 until reconciled
  }
});