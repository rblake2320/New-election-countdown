import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Regression (2026-10-11): five notification routes read `req.user?.id`, which the cookie
// session never sets (isAuthenticated sets req.userId and req.user.claims.sub). The id was
// always undefined, so /api/notifications/deliveries fell back to the UNSCOPED query and
// returned every user's deliveries. Route code must take the identity from req.userId.
const ROOT = join(__dirname, "..", "..", "server");
const files = ["routes.ts", ...readdirSync(join(ROOT, "routes")).filter(f => f.endsWith(".ts")).map(f => `routes/${f}`)];

describe("session identity in route code", () => {
  it("no route reads req.user.id / req.user?.id", () => {
    const offenders: string[] = [];
    for (const f of files) {
      readFileSync(join(ROOT, f), "utf8").split("\n").forEach((line, i) => {
        if (/\breq\.user\??\.id\b/.test(line)) offenders.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
