import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { stripMarkup, LLM_TEXT_MAX_CHARS } from "../../server/untrusted-text";

describe("stripMarkup (LLM output is text, not markup)", () => {
  it("removes tags, script bodies and javascript: schemes", () => {
    expect(stripMarkup('Turnout is <b>high</b><script>fetch("//evil")</script> today')).toBe("Turnout is high today");
    expect(stripMarkup('<img src=x onerror=alert(1)>Results')).toBe("Results");
    expect(stripMarkup('see <a href="javascript:alert(1)">this</a>')).toBe("see this");
    expect(stripMarkup("&lt;svg onload=alert(1)&gt;ok")).toBe("ok");
  });

  it("caps length and tolerates non-strings", () => {
    expect(stripMarkup("x".repeat(LLM_TEXT_MAX_CHARS + 50)).length).toBe(LLM_TEXT_MAX_CHARS);
    expect(stripMarkup(undefined)).toBe("");
    expect(stripMarkup({ toString: () => "<b>x</b>" } as any)).toBe("");
  });

  it("is applied at both Perplexity sites in server/routes.ts and the response is labelled", () => {
    const routes = readFileSync(join(__dirname, "..", "..", "server", "routes.ts"), "utf8");
    expect(routes).not.toMatch(/aiAnalysis = data\.choices\[0\]\?\.message\?\.content \|\| aiAnalysis/);
    expect(routes).not.toMatch(/const aiAnalysis = data\.choices\[0\]\?\.message\?\.content \|\| ''/);
    expect((routes.match(/stripMarkup\(data\.choices\[0\]\?\.message\?\.content/g) ?? []).length).toBe(2);
    expect(routes).toContain("aiAnalysisProvenance: LLM_PROVENANCE");
  });
});
