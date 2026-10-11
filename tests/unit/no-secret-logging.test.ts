import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

// Regression (2026-10-11, found by Astra): register/password-reset handlers logged the
// raw verification/reset token to stdout when SMTP was absent — including in production.
// Static guard: no console.* call under server/ may print a token/secret/password value.
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!/node_modules|__tests__/.test(name)) walk(p, out);
    } else if (name.endsWith(".ts")) {
      out.push(p);
    }
  }
  return out;
}

const SERVER_DIR = join(__dirname, "..", "..", "server");
// A console call whose arguments include a token/secret/password *value* expression.
const SECRET_LOG = /console\.(log|info|warn|error|debug)\(.*\b(tok(en)?|secret|password(Hash)?|jwt)\b.*(rows\[\d+\]\.(token|secret|password)|\.token\b|\.secret\b|\.passwordHash\b|JWT_SECRET)/i;

describe("no secret values in server logs", () => {
  it("server/ has no console.* call that prints a token, secret or password value", () => {
    const offenders: string[] = [];
    for (const file of walk(SERVER_DIR)) {
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (SECRET_LOG.test(line)) offenders.push(`${relative(SERVER_DIR, file)}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("the guard itself matches the pattern that was shipped", () => {
    expect(SECRET_LOG.test('console.log("Email verify token:", tok.rows[0].token);')).toBe(true);
    expect(SECRET_LOG.test('console.log("Password reset token:", tok.rows[0].token);')).toBe(true);
    expect(SECRET_LOG.test('console.log("Email verification token created (not logged)");')).toBe(false);
  });
});
