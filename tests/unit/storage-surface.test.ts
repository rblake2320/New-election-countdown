import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Regression (2026-10-11, Astra): route code called storage methods that exist on
// DatabaseStorage but were never delegated by StorageFactory (the `storage` export),
// so /api/recommendations and friends returned 500 for ordinary users. The factory now
// forwards unknown members to the active storage via a Proxy; this test keeps the
// *referenced* surface honest: every `storage.<method>(` used by route/service code
// must exist on StorageFactory or DatabaseStorage. Known gaps are listed explicitly
// so the list can only shrink.
const ROOT = join(__dirname, "..", "..", "server");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const KNOWN_GAPS = new Set([
  // referenced by routes but implemented nowhere yet (tracked on the team board)
  "updateCandidate",
  "updateElection",
  "updateCandidateResults",
]);

function referencedMethods(): Set<string> {
  const files = ["routes.ts", ...readdirSync(join(ROOT, "routes")).filter(f => f.endsWith(".ts")).map(f => `routes/${f}`),
    ...readdirSync(ROOT).filter(f => /-service\.ts$/.test(f))];
  const out = new Set<string>();
  for (const f of files) for (const m of read(f).matchAll(/\bstorage\.([a-zA-Z]+)\(/g)) out.add(m[1]);
  return out;
}

const KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "return", "await", "constructor", "function", "new", "typeof", "else"]);
// Class methods are declared at two-space indent: `  async name(` / `  name(`. Line-based on
// purpose: a multi-line regex over the 4,400-line storage.ts backtracks catastrophically.
function declaredMethods(file: string): Set<string> {
  const out = new Set<string>();
  for (const line of read(file).split("\n")) {
    const m = /^ {2}(?:(?:public|private|protected|static|async)\s+)*([a-zA-Z_]\w*)\s*(?:<[^>]*>)?\(/.exec(line);
    if (m && !KEYWORDS.has(m[1])) out.add(m[1]);
  }
  return out;
}

describe("storage surface used by routes", () => {
  it("every storage.<method>( referenced by route/service code exists on the factory or DatabaseStorage", () => {
    const factory = declaredMethods("storage-factory.ts");
    const db = declaredMethods("storage.ts");
    const missing = [...referencedMethods()].filter(m => !factory.has(m) && !db.has(m) && !KNOWN_GAPS.has(m)).sort();
    expect(missing).toEqual([]);
  });

  it("known gaps list only contains methods that are still actually missing", () => {
    const factory = declaredMethods("storage-factory.ts");
    const db = declaredMethods("storage.ts");
    const stale = [...KNOWN_GAPS].filter(m => factory.has(m) || db.has(m));
    expect(stale).toEqual([]);
  });

  it("the factory export forwards unknown methods to the active storage (Proxy)", () => {
    const src = read("storage-factory.ts");
    expect(src).toMatch(/export const storageFactory(?::\s*StorageFactory)?\s*=\s*new Proxy\(/);
  });
});
