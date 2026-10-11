/**
 * Required-secret loader. In production a missing secret aborts startup;
 * in development a per-process random value is generated with a loud warning
 * so local runs still work but sessions do not survive a restart.
 */
import crypto from "crypto";

const generated = new Map<string, string>();

export function getRequiredSecret(name: string): string {
  const v = process.env[name];
  if (v && v.trim().length >= 16) return v;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`[config] ${name} must be set (>=16 chars) in production`);
  }
  if (!generated.has(name)) {
    generated.set(name, crypto.randomBytes(32).toString("hex"));
    console.warn(`[config] ${name} not set - using a random per-process value (dev only)`);
  }
  return generated.get(name)!;
}
