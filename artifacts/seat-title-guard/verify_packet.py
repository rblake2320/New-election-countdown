"""Verify working and git-index bytes against the retained packet digests."""
import hashlib
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent
packet = json.loads((root / "packet.json").read_text("utf-8"))
for name, expected in packet["files"].items():
    path = root / name
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit("Retained file digest mismatch: " + name)
    relative = "artifacts/seat-title-guard/" + name
    indexed = subprocess.run(["git", "show", ":" + relative], check=True, capture_output=True, cwd=root)
    if hashlib.sha256(indexed.stdout).hexdigest() != expected:
        raise SystemExit("Git index changed retained bytes: " + name)
print(json.dumps({"verifiedFiles": len(packet["files"]), "workingAndIndexMatch": True,
                  "beforeSha256": packet["beforeSha256"], "afterSha256": packet["afterSha256"]}))
