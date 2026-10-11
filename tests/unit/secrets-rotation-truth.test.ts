import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Y-01 / Y-02 (security-yellow.md): the vault never encrypts with a public default key,
// and "rotation" never fabricates a provider credential or claims an unchanged key rotated.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const calls: Record<string, any[][]> = {};
const fakeStorage: any = new Proxy({}, {
  get(target: any, prop: string) {
    if (!(prop in target)) target[prop] = vi.fn(async (...args: any[]) => { (calls[prop] ??= []).push(args); return undefined; });
    return target[prop];
  },
});
vi.mock("../../server/storage", () => ({ storage: fakeStorage, storageFactory: fakeStorage }));

const { SecretsRotationService, VaultNotConfiguredError } = await import("../../server/services/secrets-rotation-service");
const SRC = readFileSync(join(__dirname, "..", "..", "server", "services", "secrets-rotation-service.ts"), "utf8");
const GOOD_KEY = "k".repeat(32);

beforeEach(() => { for (const k of Object.keys(calls)) delete calls[k]; });

describe("Y-01: vault key material", () => {
  it("is unavailable without BACKUP_ENCRYPTION_KEY and refuses to encrypt or decrypt", () => {
    const saved = process.env.BACKUP_ENCRYPTION_KEY; delete process.env.BACKUP_ENCRYPTION_KEY;
    try {
      const svc = new SecretsRotationService();
      expect(svc.vaultStatus().ready).toBe(false);
      expect(svc.vaultStatus().reason).toMatch(/BACKUP_ENCRYPTION_KEY/);
      expect(() => (svc as any).encryptSecret("value")).toThrow(VaultNotConfiguredError);
      expect(() => (svc as any).decryptSecret("a:b:c:d")).toThrow(VaultNotConfiguredError);
    } finally { if (saved !== undefined) process.env.BACKUP_ENCRYPTION_KEY = saved; }
  });

  it("rejects short keys and round-trips with a real one", () => {
    expect(new SecretsRotationService({ encryptionKey: "short" }).vaultStatus().ready).toBe(false);
    const svc = new SecretsRotationService({ encryptionKey: GOOD_KEY });
    expect(svc.vaultStatus()).toEqual({ ready: true, reason: null });
    const enc = (svc as any).encryptSecret("sg.real-looking-value");
    expect(enc).not.toContain("sg.real");
    expect((svc as any).decryptSecret(enc)).toBe("sg.real-looking-value");
  });

  it("initializeSecretsVault writes nothing when the vault is not ready", async () => {
    const saved = process.env.BACKUP_ENCRYPTION_KEY; delete process.env.BACKUP_ENCRYPTION_KEY;
    try {
      await new SecretsRotationService().initializeSecretsVault();
      expect(calls.createSecret ?? []).toHaveLength(0);
    } finally { if (saved !== undefined) process.env.BACKUP_ENCRYPTION_KEY = saved; }
  });

  it("source carries no default key", () => {
    expect(SRC).not.toContain("default-key-change-me");
  });
});

describe("Y-02: rotation honesty", () => {
  it("no provider is advertised as auto-rotatable and no handler fabricates credentials", () => {
    const svc = new SecretsRotationService({ encryptionKey: GOOD_KEY });
    const configs: Map<string, any> = (svc as any).serviceConfigs;
    expect(configs.size).toBeGreaterThan(0);
    for (const [name, cfg] of configs) {
      expect(cfg.rotationSupported, name).toBe(false);
      expect(cfg.customRotationHandler, name).toBeUndefined();
    }
    expect(SRC).not.toMatch(/customRotationHandler: async/);
    expect(SRC).not.toMatch(/return `sg\.\$\{nanoid/);
  });

  it("rotating a manual-only secret returns manual_required and changes nothing", async () => {
    const svc = new SecretsRotationService({ encryptionKey: GOOD_KEY });
    const encrypted = (svc as any).encryptSecret("SG.current");
    fakeStorage.getSecretById = vi.fn(async () => ({ id: 42, secretName: "SENDGRID_API_KEY", serviceName: "sendgrid", currentValue: encrypted, metadata: {} }));
    const result = await svc.rotateSecret(42, "manual");
    expect(result.status).toBe("manual_required");
    expect(result).not.toHaveProperty("newValue");
    expect(result).not.toHaveProperty("oldValue");
    expect(calls.updateSecret ?? []).toHaveLength(0);                 // vault value untouched
    const history = (calls.updateSecretRotationHistory ?? []).map(a => a[1]?.status);
    expect(history).toContain("manual_required");
    expect(history).not.toContain("completed");
  });

  it("rotation results never include plaintext fields (type + source)", () => {
    expect(SRC).toMatch(/oldValueHash: string;/);
    expect(SRC).not.toMatch(/oldValue: currentValue/);
    expect(SRC).not.toMatch(/newValue,\n\s+validationResults/);
  });
});
