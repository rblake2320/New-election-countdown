"""Retain a portable exact-byte canonical-helper patch and send-log rows."""
import difflib
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CANONICAL = Path("C:/Users/techai/PKA testing/scripts/seat_send.py")
before = ROOT / "seat_send.before.py"
after = ROOT / "seat_send.after.py"
if after.read_bytes() != CANONICAL.read_bytes():
    raise SystemExit("Canonical helper changed after reviewed snapshot; refusing seal")
patch = "".join(difflib.unified_diff(before.read_text("utf-8").splitlines(True),
                                     after.read_text("utf-8").splitlines(True),
                                     fromfile="scripts/seat_send.py.before", tofile="scripts/seat_send.py"))
(ROOT / "seat_send.patch").write_text(patch, encoding="utf-8")
log = Path("C:/Users/techai/PKA testing/Team/workmap/send-log.jsonl")
rows = []
for line in log.read_text("utf-8").splitlines():
    record = json.loads(line)
    if record.get("acknowledgement", {}).get("marker") == "C-B-86merged2":
        rows.append(record)
(ROOT / "send-log-retained.json").write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
bound = [p for p in ROOT.iterdir() if p.is_file() and p.name not in ("SHA256SUMS", "packet.json")]
packet = {"canonicalHelper": str(CANONICAL), "beforeSha256": hashlib.sha256(before.read_bytes()).hexdigest(),
          "afterSha256": hashlib.sha256(after.read_bytes()).hexdigest(), "acknowledgedSends": len(rows),
          "untrackedCanonicalHelper": True, "unrelatedPkaChangesCommitted": False,
          "files": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(bound)}}
(ROOT / "packet.json").write_text(json.dumps(packet, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"beforeSha256": packet["beforeSha256"], "afterSha256": packet["afterSha256"],
                  "acknowledgedSends": len(rows)}))
