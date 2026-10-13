"""Independent read-only UIA ACK evidence after the single canonical send."""
import hashlib
import importlib.util
import json
import re
from datetime import datetime, timezone
from pathlib import Path

CANONICAL = Path("C:/Users/techai/PKA testing/scripts/seat_send.py")
spec = importlib.util.spec_from_file_location("ack_seat_send", CANONICAL)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
binding = helper.resolve_binding("Site design tool access review")
text = helper.uia_text(binding)
marker = "C-B-86merged2"
exact = [line for line in text.splitlines() if re.fullmatch(
    r"\s*(?:[\u2022*\u00b7]\s+)?(?:\*\*)?ACK\s+" + re.escape(marker) + r"(?:\*\*)?[.!]?\s*", line, re.I)]
references = [line[:600] for line in text.splitlines() if marker in line]
receipt = {"capturedAt": datetime.now(timezone.utc).isoformat(), "binding": binding,
           "helperSha256": hashlib.sha256(CANONICAL.read_bytes()).hexdigest(),
           "uiaTextSha256": hashlib.sha256(text.encode()).hexdigest(), "uiaTextChars": len(text),
           "processedAck": helper.processed_ack(text, marker), "exactResponseLines": exact,
           "markerReferences": references, "inputPerformed": False, "capturePerformed": False}
Path(__file__).with_name("processed-ack-uia.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"processedAck": receipt["processedAck"], "exactResponseLines": exact,
                  "references": len(references)}))
if not receipt["processedAck"]:
    raise SystemExit(1)
