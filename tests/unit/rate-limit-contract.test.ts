import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const { rateLimitedHandler, RATE_LIMITED_ERROR } = await import("../../server/security-middleware");

function res() {
  const r: any = { statusCode: 200, headers: {} as Record<string, string>, body: undefined,
    status(c: number) { r.statusCode = c; return r; }, json(b: any) { r.body = b; return r; }, setHeader(k: string, v: string) { r.headers[k] = v; } };
  return r;
}

describe("429 contract (UX review P1: 429 must never read as Not Found)", () => {
  it("emits error=rate_limited, scope, retryAfterSeconds and Retry-After from the window reset time", () => {
    const r = res();
    const resetTime = new Date(Date.now() + 42_000);
    rateLimitedHandler("api")({ rateLimit: { resetTime } }, r, () => {}, { windowMs: 60_000, max: 300 });
    expect(r.statusCode).toBe(429);
    expect(r.body).toMatchObject({ error: RATE_LIMITED_ERROR, scope: "api", limit: 300 });
    expect(r.body.retryAfterSeconds).toBeGreaterThanOrEqual(41);
    expect(r.body.retryAfterSeconds).toBeLessThanOrEqual(43);
    expect(r.headers["Retry-After"]).toBe(String(r.body.retryAfterSeconds));
    expect(r.body.message).toMatch(/not checked/);
  });

  it("falls back to the window length when no reset time is known", () => {
    const r = res();
    rateLimitedHandler("search")({}, r, () => {}, { windowMs: 60_000, max: 60 });
    expect(r.body.retryAfterSeconds).toBe(60);
    expect(r.body.scope).toBe("search");
  });

  it("both public limiters use the shared handler and keep their limits", () => {
    const src = readFileSync(join(__dirname, "..", "..", "server", "security-middleware.ts"), "utf8").replace(/\r\n/g, "\n");
    expect(src).toMatch(/max: 60,\n\s+handler: rateLimitedHandler\('search'\)/);
    expect(src).toMatch(/max: 300,\n\s+handler: rateLimitedHandler\('api'\)/);
  });
});
