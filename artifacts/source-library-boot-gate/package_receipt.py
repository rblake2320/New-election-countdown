"""Retain actual phase events and complete compressed test-reporter evidence."""
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = "5fe2423963e2c0dce9c34448acaa9b1e9b7ddeb3"
summary = {"base": BASE, "testOnly": True, "childBudgetMs": 5000, "fullRuns": []}
runtime_diff = subprocess.run(["git", "diff", "--name-only", BASE, "--", "server", "client", "shared", "scripts",
                               "package.json", "package-lock.json", "vitest.config.ts"], capture_output=True, check=True, cwd=ROOT)
if runtime_diff.stdout.strip():
    raise SystemExit("Unexpected runtime/config/package delta")
for name in ("full", "full-repeat"):
    raw = (ROOT / (name + ".json")).read_bytes()
    report = json.loads(raw)
    if not report["success"] or report["numFailedTests"] or report["numFailedTestSuites"]:
        raise SystemExit("Failed full-suite receipt: " + name)
    compressed = gzip.compress(raw, mtime=0)
    (ROOT / (name + ".json.gz")).write_bytes(compressed)
    boot = next(row for row in report["testResults"] if row["name"].endswith("official-source-library-boot.test.ts"))
    summary["fullRuns"].append({"name": name, "success": report["success"], "passed": report["numPassedTests"],
        "failed": report["numFailedTests"], "testFiles": len(report["testResults"]),
        "rawSha256": hashlib.sha256(raw).hexdigest(), "gzipSha256": hashlib.sha256(compressed).hexdigest(),
        "bootCases": [{"title": case["title"], "status": case["status"], "durationMs": case["duration"]}
                      for case in boot["assertionResults"]]})
events = []
for line in (ROOT / "full-repeat.txt").read_text("utf-8").splitlines():
    if line.startswith('{"phase":'):
        events.append(json.loads(line))
if len(events) != 3 or [event["phase"] for event in events] != ["compile", "runtime", "runtime"]:
    raise SystemExit("Expected exactly one compiler phase and two runtime phases")
if [event["status"] for event in events] != [0, 1, 0]:
    raise SystemExit("Unexpected probe outcomes")
for event in events:
    if event["budgetMs"] != 5000 or event["elapsedMs"] >= 5000 or event["error"] is not None:
        raise SystemExit("Budget/outcome failure")
summary["fullRepeatPhaseEvents"] = events
summary["compilerInvocationsPerSuite"] = 1
summary["wrapperSha256"] = events[0]["wrapperSha256"]
(ROOT / "receipt.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"fullRuns": len(summary["fullRuns"]), "passedEach": report["numPassedTests"],
                  "phaseEvents": events, "runtimeDelta": False}))
