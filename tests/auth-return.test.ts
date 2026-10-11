import { describe, it, expect, beforeEach } from "vitest";
import { safeReturnTo, signInUrl, rememberPendingWatch, takePendingWatch } from "../client/src/lib/auth-return";

describe("safeReturnTo (open-redirect guard)", () => {
  it("keeps same-origin app paths", () => {
    expect(safeReturnTo("/elections/12")).toBe("/elections/12");
    expect(safeReturnTo("/?state=TX")).toBe("/?state=TX");
  });
  it("rejects anything that could leave the site", () => {
    for (const bad of ["//evil.com", String.raw`/\evil.com`, "https://evil.com", "javascript:alert(1)", "", null, undefined]) {
      expect(safeReturnTo(bad as any)).toBe("/dashboard");
    }
  });
  it("builds an encoded sign-in URL", () => {
    expect(signInUrl("/elections/5")).toBe("/auth?returnTo=%2Felections%2F5");
    expect(signInUrl("//evil.com")).toBe("/auth?returnTo=%2F");
  });
});

describe("pending watch", () => {
  beforeEach(() => sessionStorage.clear());
  it("is taken once, only for the matching election", () => {
    rememberPendingWatch(7);
    expect(takePendingWatch(8)).toBe(false);
    expect(takePendingWatch(7)).toBe(true);
    expect(takePendingWatch(7)).toBe(false);
  });
});
