"""Retain the measured old-route red and current-route receiving evidence."""
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
receipt = {"baseline": "5fe2423963e2c0dce9c34448acaa9b1e9b7ddeb3",
           "runtimeCore": "8a678c4698994d6c0975b0458e4380ab06900682",
           "boundaries": "real Express/loopback HTTP; isolated storage and provider fixtures; no PostgreSQL/provider calls",
           "runs": {}}
for name in ("red", "green", "full"):
    raw = (ROOT / (name + ".json")).read_bytes()
    data = json.loads(raw)
    receipt["runs"][name] = {"success": data["success"], "passed": data["numPassedTests"],
                             "failed": data["numFailedTests"], "testFiles": len(data["testResults"]),
                             "rawSha256": hashlib.sha256(raw).hexdigest()}
    if name != "red" and (not data["success"] or data["numFailedTests"]):
        raise SystemExit("Unexpected failed " + name + " receipt")
    if name == "full":
        compressed = gzip.compress(raw, mtime=0)
        (ROOT / "full.json.gz").write_bytes(compressed)
        receipt["runs"][name]["gzipSha256"] = hashlib.sha256(compressed).hexdigest()
if receipt["runs"]["red"]["failed"] != 5:
    raise SystemExit("Expected all five old-route scenarios to reproduce the clock defect")
usage = subprocess.run(["rg", "-n", "last_data_update|lastDataUpdate", "client", "shared", "-g", "*.ts", "-g", "*.tsx"],
                       capture_output=True, check=False, cwd=ROOT.parents[1])
if usage.returncode not in (0, 1):
    raise SystemExit("Client usage search failed")
receipt["clientUsageSearch"] = {"returnCode": usage.returncode, "matches": usage.stdout.decode().splitlines()}
(ROOT / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt))
