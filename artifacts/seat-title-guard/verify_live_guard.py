"""Read-only native identity/UIA checks; never sends input or captures."""
import hashlib
import importlib.util
import json
import time
from datetime import datetime, timezone
from pathlib import Path

CANONICAL = Path("C:/Users/techai/PKA testing/scripts/seat_send.py")
spec = importlib.util.spec_from_file_location("live_seat_send", CANONICAL)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
binding = helper.resolve_binding("Site design tool access review")
observations = []
for _ in range(4):
    args = helper.guard_args(binding)
    guarded = json.loads(helper.shim("guard", *args))
    read = helper.uia_text(binding)
    observations.append({"at": datetime.now(timezone.utc).isoformat(), "nativeGuard": guarded,
                         "uiaTextSha256": hashlib.sha256(read.encode()).hexdigest(),
                         "uiaTextChars": len(read)})
    time.sleep(0.35)
receipt = {"helperSha256": hashlib.sha256(CANONICAL.read_bytes()).hexdigest(), "binding": binding,
           "stableBase": helper.stable_title(binding["title"]), "observations": observations,
           "inputPerformed": False, "capturePerformed": False}
Path(__file__).with_name("native-guard-readback.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"guardChecks": len(observations) * 2, "uiaChecks": len(observations),
                  "stableBase": receipt["stableBase"], "hwnd": binding["hwnd"], "inputPerformed": False}))
