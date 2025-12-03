#!/usr/bin/env node
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

console.log("🧪 Running comprehensive E2E test suite...\n");

const tests = [
  "api.truth.spec.ts",
  "ui.grid-and-compare.spec.ts", 
  "ui.consistency-and-errors.spec.ts",
  "ui.data-management-and-trends.spec.ts",
  "ui.candidate-coverage.spec.ts"
];

let failures = 0;
const results: any[] = [];

for (const test of tests) {
  const testPath = path.join("tests/e2e", test);
  if (!fs.existsSync(testPath)) {
    console.log(`⚠️  Skipping ${test} (not found)`);
    continue;
  }

  console.log(`📝 Running: ${test}`);
  
  try {
    execSync(`npx playwright test ${testPath} --reporter=list`, {
      stdio: "inherit",
      cwd: process.cwd()
    });
    console.log(`✅ ${test} passed\n`);
    results.push({ test, status: "passed" });
  } catch (error) {
    console.log(`❌ ${test} failed\n`);
    results.push({ test, status: "failed" });
    failures++;
  }
}

console.log("\n📊 Test Summary:");
console.log("================");
results.forEach(r => {
  const icon = r.status === "passed" ? "✅" : "❌";
  console.log(`${icon} ${r.test}: ${r.status}`);
});

console.log(`\nTotal: ${results.length} tests, ${failures} failures`);

if (failures > 0) {
  console.log("\n⚠️  Some tests failed. Review the output above for details.");
  process.exit(1);
} else {
  console.log("\n🎉 All tests passed!");
  process.exit(0);
}