import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

// ET-22 follow-up (found by Sol while fixing C13): server/congress-bill-service.ts fell back
// from process.env.CONGRESS_API_KEY to a hard-coded key literal, so the service never
// refused when unconfigured and the source carried credential material. This guard fails
// on any `process.env.<KEY|TOKEN|SECRET|PASSWORD> || '<long literal>'` fallback and on any
// long opaque literal assigned to a key-like identifier anywhere under server/.
const ROOT = join(__dirname, "..", "..");
const SERVER = join(ROOT, "server");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const ENV_FALLBACK = /process\.env\.[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|PASS)[A-Z0-9_]*\s*(\|\||\?\?)\s*['"`][A-Za-z0-9_\-]{16,}['"`]/;
const KEYISH_ASSIGN = /\b(apiKey|api_key|token|secret|password|authToken|accessKey|clientSecret)\s*[:=]\s*['"`][A-Za-z0-9_\-]{24,}['"`]/i;
// Legitimate opaque literals that are not credentials.
const ALLOW = [/sha256/i, /PLACEHOLDER|EXAMPLE|CHANGE_?ME|your[-_ ]?api[-_ ]?key|test-only/i];

describe("no embedded credentials in server source", () => {
  const files = walk(SERVER);
  it("scans a meaningful number of files", () => expect(files.length).toBeGreaterThan(50));

  it("has no env-or-literal credential fallbacks", () => {
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        if (ENV_FALLBACK.test(line) && !ALLOW.some(a => a.test(line))) hits.push(`${relative(ROOT, f)}:${i + 1}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it("has no long opaque literals assigned to key-like identifiers", () => {
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        if (KEYISH_ASSIGN.test(line) && !ALLOW.some(a => a.test(line))) hits.push(`${relative(ROOT, f)}:${i + 1}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it("getCongressBillService returns null when CONGRESS_API_KEY is unset", async () => {
    const saved = process.env.CONGRESS_API_KEY;
    delete process.env.CONGRESS_API_KEY;
    try {
      const { getCongressBillService } = await import("../../server/congress-bill-service");
      expect(getCongressBillService()).toBeNull();
    } finally {
      if (saved !== undefined) process.env.CONGRESS_API_KEY = saved;
    }
  });
});
