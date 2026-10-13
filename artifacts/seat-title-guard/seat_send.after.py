"""Serialized guarded seat delivery, with separate overlay recovery and ACK evidence.

Only the canonical helper performs input. Native queue acceptance alone is not
an ACK. Transcript/finder echoes never qualify as delivery. Use --recover-only
for control-only recovery without changing or submitting the composer draft.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from pka_lib import FileLock
SHIM = ROOT / "selfconnect" / "sc_cli.py"
LOCK_TARGET = ROOT / "Team" / "workmap" / "send"
LOG = ROOT / "Team" / "workmap" / "send-log.jsonl"
MSG_DIR = ROOT / "Team" / "workmap" / "msg"


def shim(*args: str, timeout: int = 90) -> str:
    done = subprocess.run([sys.executable, str(SHIM), *args], capture_output=True,
                          text=True, encoding="utf-8", errors="replace", timeout=timeout)
    if done.returncode:
        raise RuntimeError(f"SelfConnect {args[0]} refused (exit {done.returncode})")
    return done.stdout


def resolve_binding(query: str) -> dict:
    rows = json.loads(shim("windows", "--json"))
    if re.fullmatch(r"(?:0x[0-9a-f]+|\d+)", query, re.I):
        hwnd = int(query, 16 if query.lower().startswith("0x") else 10)
        rows = [r for r in rows if r["hwnd"] == hwnd]
    else:
        rows = [r for r in rows if query.lower() in r["title"].lower()]
    if len(rows) != 1:
        raise RuntimeError(f"resolve: {len(rows)} windows match {query!r}")
    return rows[0]


def resolve(query: str) -> tuple[int, int]:
    binding = resolve_binding(query)
    return binding["hwnd"], binding["pid"]


def stable_title(title: str) -> str:
    # Only activity prefixes actually observed on the selected Codex seat.
    # Do not trim, case-fold, strip arbitrary punctuation or reduce to a role.
    return title[2:] if title[:2] in ("\u25d0 ", "\u25d1 ", "\u2733 ") else title


def assert_current_binding(binding: dict) -> str:
    title = stable_title(binding["title"])
    if not title:
        raise RuntimeError("Empty target title refused")
    rows = json.loads(shim("windows", "--json"))
    current = [row for row in rows if row["hwnd"] == binding["hwnd"]]
    if len(current) != 1 or any(
        current[0][key] != binding[key] for key in ("pid", "exe_name", "class_name")
    ) or stable_title(current[0]["title"]) != title:
        raise RuntimeError("Fresh exact target identity changed")
    if len([row for row in rows if stable_title(row["title"]) == title]) != 1:
        raise RuntimeError("Fresh normalized target title is not unique")
    return title


def guard_args(binding: dict) -> list[str]:
    title = assert_current_binding(binding)
    args = ["--hwnd", str(binding["hwnd"]), "--expect-pid", str(binding["pid"]),
            "--expect-exe", binding["exe_name"], "--expect-class", binding["class_name"],
            "--expect-title", title]
    guarded = json.loads(shim("guard", *args))
    if not guarded.get("ok") or stable_title(guarded.get("title", "")) != title:
        raise RuntimeError("Target identity guard refused input")
    return args


def send_guarded(binding: dict, text: str, *, submit: bool = False) -> None:
    args = ["send", *guard_args(binding), "--allow-input", "--text=" + text]
    if submit:
        args.append("--submit")
    if not json.loads(shim(*args)).get("ok"):
        raise RuntimeError("Native target input refused")


def move_composer_key(binding: dict, key: str) -> None:
    if key not in ("home", "end"):
        raise RuntimeError("Unsupported composer navigation")
    guard_args(binding)
    sys.path.insert(0, str(SHIM.parent))
    import self_connect as sc
    target = sc.find_child_by_class(binding["hwnd"], sc.WT_INPUT_CLASS) or binding["hwnd"]
    sc.send_keys_to(target, key)
    time.sleep(0.2)
    # Actual native probe lost the first WM_CHAR after a handled keydown.
    # A separator space is harmless if retained, and prevents loss of payload.
    send_guarded(binding, " ")


def uia_text(binding: dict) -> str:
    guard_args(binding)
    value = json.loads(shim("read", "--hwnd", str(binding["hwnd"])))
    if value.get("hwnd") != binding["hwnd"] or stable_title(value.get("title", "")) != stable_title(binding["title"]):
        raise RuntimeError("Readback target changed")
    return value.get("text", "")


def ack_readback(binding: dict, marker: str, screen: str) -> dict | None:
    if transcript_find_open(screen) or transcript_open(screen):
        return None
    if processed_ack(screen, marker):
        return {"method": "visible_ocr", "marker": marker}
    text = uia_text(binding)
    if processed_ack(text, marker):
        return {"method": "native_uia_exact_response_line", "marker": marker,
                "readback_sha256": hashlib.sha256(text.encode()).hexdigest()}
    return None


def seat_text(hwnd: int) -> str:
    out = shim("observe", "--hwnd", str(hwnd), "--no-text", "--ocr-mode", "always")
    observed = json.loads(out[out.index("{"):])
    if not observed.get("ok") or not observed.get("target_stable") or not observed["ocr"].get("ok"):
        raise RuntimeError("Fresh stable target observation unavailable")
    return observed["ocr"]["text"]


def squash(text: str) -> str:
    return re.sub(r"\s+", "", text)


def transcript_find_open(screen: str) -> bool:
    return re.search(r"(?:no matches|\d+[^\n]*matches)[^\n]*full transcript[^\n]*esc cancel",
                     screen[-350:], re.I) is not None


def transcript_open(screen: str) -> bool:
    # Active header/border, never a quoted historical mention in the body.
    return any(re.search(r"^.{0,2}TRANSCRIPT(?:[/\u2500\u2501\u2550-]{2,}|\s*$)", line, re.I)
               for line in [squash(value) for value in screen.splitlines()[:8]])


def recover_view(binding: dict, screen: str, record: dict) -> str:
    if transcript_find_open(screen):
        send_guarded(binding, "\u001b")
        time.sleep(0.5)
        screen = seat_text(binding["hwnd"])
        record["cleared_transcript_find"] = not transcript_find_open(screen)
        if transcript_find_open(screen):
            raise RuntimeError("Transcript finder remains open; no message typed")
    if transcript_open(screen):
        # Installed 0.162.1 PagerKeymap.close_transcript is Ctrl+T. Escape is
        # backtracking/edit previous in the viewer and must not be used here.
        if re.search(r"\bq\s+(?:close|quit)\b", screen[-350:], re.I):
            send_guarded(binding, "q")  # Supported live pager footer; finder already closed.
            record["transcript_close_key"] = "q (observed pager footer)"
        else:
            raise RuntimeError("Transcript close key is not confirmed by live footer; no message typed")
        time.sleep(0.5)
        screen = seat_text(binding["hwnd"])
        record["cleared_transcript_view"] = not transcript_open(screen)
    if transcript_find_open(screen) or transcript_open(screen):
        raise RuntimeError("Transcript viewer remains open; no message typed")
    return screen


def seen(screen: str, text: str) -> bool:
    if transcript_find_open(screen) or transcript_open(screen):
        return False
    needle, hay = squash(text).lower()[-60:], squash(screen).lower()
    return SequenceMatcher(None, hay, needle, autojunk=False).find_longest_match(
        0, len(hay), 0, len(needle)).size >= min(28, len(needle)) and bool(needle)


def processed_ack(screen: str, marker: str) -> bool:
    if transcript_find_open(screen) or transcript_open(screen):
        return False
    # The request must not start with ACK. Require an independent response
    # line, not the echoed request containing "please reply ACK <nonce>".
    return any(re.fullmatch(r"\s*(?:[\u2022*\u00b7]\s+)?(?:\*\*)?ACK\s+" + re.escape(marker) + r"(?:\*\*)?[.!]?\s*",
                        line, re.I) is not None for line in screen.splitlines())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--to", required=True)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--text")
    group.add_argument("--file")
    group.add_argument("--recover-only", action="store_true")
    group.add_argument("--ack-only", action="store_true", help="read a delayed ACK without sending or changing any target UI")
    parser.add_argument("--wait", type=int, default=20)
    parser.add_argument("--append-existing", action="store_true", help="preserve the known existing draft and append a delimited update before submit")
    parser.add_argument("--ack", help="require a new response line ACK <unique marker>; never include that as a request line")
    parser.add_argument("--from", dest="sender", default=os.environ.get("SC_SEAT", "unknown"))
    args = parser.parse_args()
    if args.ack_only and not args.ack:
        parser.error("--ack-only requires --ack")
    text = "" if args.recover_only or args.ack_only else " ".join((args.text if args.text is not None else Path(args.file).read_text("utf-8")).split())
    record = {"at": datetime.now().isoformat(timespec="seconds"), "from": args.sender,
              "to": args.to, "chars": len(text), "text_sha256": hashlib.sha256(text.encode()).hexdigest()}
    state = "missing"
    try:
        binding = resolve_binding(args.to)
        record["target"] = binding
        if len(text) > 700:
            MSG_DIR.mkdir(parents=True, exist_ok=True)
            path = MSG_DIR / f"{datetime.now():%Y%m%d-%H%M%S}-to-{re.sub(r'[^A-Za-z0-9]+', '-', args.to).strip('-')}.md"
            path.write_text(text + "\n", encoding="utf-8")
            text = f"LONG MESSAGE saved at {path} (read it fully, then act): {text[:160]}"
        if not args.ack_only:
            with FileLock(LOCK_TARGET, retries=1200, delay=0.25):
                guard_args(binding)
                screen = recover_view(binding, seat_text(binding["hwnd"]), record)
                if args.recover_only:
                    state = "recovered"
                else:
                    if "reverse-i-search" in screen:
                        send_guarded(binding, "\u001b")
                        time.sleep(0.5)
                        screen = seat_text(binding["hwnd"])
                        if "reverse-i-search" in screen:
                            raise RuntimeError("Reverse search remains open; no message typed")
                        record["cleared_isearch"] = True
                    if args.ack and ack_readback(binding, args.ack, screen):
                        raise RuntimeError("ACK marker already exists; choose a fresh nonce")
                    if args.append_existing:
                        move_composer_key(binding, "end")
                    send_guarded(binding, (" | " if args.append_existing else "") + text, submit=True)
                    record["preserved_existing_draft"] = args.append_existing
        else:
            record["input_performed"] = False
        # Input stays serialized; response observation does not hold the global
        # lock and prevent a peer from sending its own ACK through this helper.
        if not args.recover_only:
            deadline = time.time() + args.wait
            while True:
                receiving = seat_text(binding["hwnd"])
                if args.ack:
                    ack = ack_readback(binding, args.ack, receiving)
                    if ack:
                        record["acknowledgement"] = ack
                        state = "acknowledged"
                        break
                elif seen(receiving, text):
                    state = "delivered"
                    break
                if time.time() >= deadline:
                    break
                time.sleep(3)
    except (RuntimeError, ValueError, subprocess.TimeoutExpired) as error:
        state = "refused"
        record["error"] = str(error)
    record["state"] = state
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record) + "\n")
    print(json.dumps(record))
    return 0 if state in ("delivered", "recovered", "acknowledged") else 1


if __name__ == "__main__":
    raise SystemExit(main())
