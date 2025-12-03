import { test, expect } from "@playwright/test";
import { j, pickSample } from "./utils";

test("120 sample elections all must have ≥1 candidate", async () => {
  const all = await j<any[]>("/api/elections?limit=2000");
  const sample = pickSample(all, 120);
  
  const empty: any[] = [];
  for (const e of sample) {
    const cs = await j<any[]>(`/api/elections/${e.id}/candidates`);
    if (!cs.length) empty.push(e);
  }
  
  expect(empty, `${empty.length} elections have no candidates: ${empty.map(e => e.title).join(", ")}`).toHaveLength(0);
});