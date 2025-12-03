import { test, expect } from "@playwright/test";

const API = process.env.API_BASE || "http://localhost:5000";

async function getElectionId(titlePart: string) {
  const list = await fetch(`${API}/api/elections?limit=2000`).then(r=>r.json());
  const hit = list.find((e: any) => (e.title as string).toLowerCase().includes(titlePart));
  if (!hit) throw new Error(`Election not found: ${titlePart}`);
  return hit.id;
}

test("AD-63 shows Shoults & Johnson", async () => {
  const id = await getElectionId("assembly district 63");
  const cs = await fetch(`${API}/api/elections/${id}/candidates`).then(r=>r.json());
  const names = cs.map((c: any)=>c.name.toLowerCase());
  expect(names).toContain("chris shoults");
  expect(names).toContain("natasha johnson");
});

test("Los Banos D1 shows Perez & Sanchez", async () => {
  const id = await getElectionId("los banos district 1");
  const cs = await fetch(`${API}/api/elections/${id}/candidates`).then(r=>r.json());
  const names = cs.map((c: any)=>c.name.toLowerCase());
  expect(names).toContain("mitzy perez");
  expect(names.some((n:string)=>n.includes("sanchez"))).toBeTruthy();
});