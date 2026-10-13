"""Offline adversarial probe of the exact retained canonical-helper bytes.

Run with seat_send.before.py for the retained red, seat_send.after.py for green.
No native windows, file locks, terminal input, captures or provider calls occur.
"""
import argparse
import hashlib
import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("helper", type=Path)
parser.add_argument("--receipt", type=Path, required=True)
options = parser.parse_args()
fake_lib = types.ModuleType("pka_lib")
fake_lib.FileLock = object
sys.modules["pka_lib"] = fake_lib
spec = importlib.util.spec_from_file_location("retained_seat_send", options.helper)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
BASE = "Site design tool access review"


class Transport:
    def __init__(self, original="\u25d0 " + BASE, current="\u25d1 " + BASE):
        self.binding = {"hwnd": 101, "pid": 202, "exe_name": "WindowsTerminal.exe",
                        "class_name": "CASCADIA_HOSTING_WINDOW_CLASS", "title": original}
        self.rows = [dict(self.binding, title=current)]
        self.calls = []
        self.read_title = current
        self.guard_title = None

    def shim(self, command, *args, **kwargs):
        self.calls.append((command, args))
        if command == "windows":
            return json.dumps(self.rows)
        if command in ("guard", "send"):
            flags = dict(zip(args[::2], args[1::2])) if command == "guard" else {}
            row = self.rows[0]
            title = self.guard_title if self.guard_title is not None else row["title"]
            if command == "guard":
                ok = (flags["--expect-title"].casefold() in title.casefold()
                      and str(row["pid"]) == flags["--expect-pid"]
                      and row["exe_name"].casefold() == flags["--expect-exe"].casefold()
                      and row["class_name"].casefold() == flags["--expect-class"].casefold())
                return json.dumps({"ok": ok, "title": title})
            return json.dumps({"ok": True})
        if command == "read":
            return json.dumps({"hwnd": 101, "title": self.read_title, "text": "ACK nonce"})
        raise AssertionError("Unexpected operation " + command)

    def install(self):
        helper.shim = self.shim
        return self

    def input_count(self):
        return sum(command == "send" for command, _ in self.calls)


class TitleGuards(unittest.TestCase):
    def test_prefix_only_change_all_observed_pairs_allowed(self):
        for original in ("", "\u25d0 ", "\u25d1 ", "\u2733 "):
            for current in ("", "\u25d0 ", "\u25d1 ", "\u2733 "):
                with self.subTest(original=original, current=current):
                    tx = Transport(original + BASE, current + BASE).install()
                    helper.send_guarded(tx.binding, "probe")
                    self.assertEqual(tx.input_count(), 1)
                    args = next(args for command, args in tx.calls if command == "send")
                    self.assertEqual(args[args.index("--expect-title") + 1], BASE)
                    for flag, expected in (("--expect-pid", "202"), ("--expect-exe", "WindowsTerminal.exe"),
                                           ("--expect-class", "CASCADIA_HOSTING_WINDOW_CLASS")):
                        self.assertEqual(args[args.index(flag) + 1], expected)

    def test_uia_prefix_only_change_allowed(self):
        tx = Transport(BASE, BASE).install()
        tx.read_title = "\u25d1 " + BASE
        self.assertEqual(helper.uia_text(tx.binding), "ACK nonce")

    def test_hostile_base_suffix_refuses_before_input(self):
        tx = Transport(BASE, BASE + " - foreign seat").install()
        with self.assertRaises(RuntimeError):
            helper.send_guarded(tx.binding, "must never send")
        self.assertEqual(tx.input_count(), 0)

    def test_hostile_base_prefix_refuses_before_input(self):
        tx = Transport(BASE, "foreign seat " + BASE).install()
        with self.assertRaises(RuntimeError):
            helper.send_guarded(tx.binding, "must never send")
        self.assertEqual(tx.input_count(), 0)

    def test_guard_observation_base_change_refuses_before_input(self):
        tx = Transport(BASE, BASE).install()
        tx.guard_title = BASE + " - changed after enumeration"
        with self.assertRaises(RuntimeError):
            helper.send_guarded(tx.binding, "must never send")
        self.assertEqual(tx.input_count(), 0)

    def test_duplicate_window_at_action_refuses_before_input(self):
        tx = Transport(BASE, BASE).install()
        tx.rows.append(dict(tx.rows[0], hwnd=303, title="\u2733 " + BASE))
        with self.assertRaises(RuntimeError):
            helper.send_guarded(tx.binding, "must never send")
        self.assertEqual(tx.input_count(), 0)

    def test_duplicate_query_resolution_refuses(self):
        tx = Transport(BASE, BASE).install()
        tx.rows.append(dict(tx.rows[0], hwnd=303, title="\u25d0 " + BASE))
        with self.assertRaises(RuntimeError):
            helper.resolve_binding(BASE)
        self.assertEqual(tx.input_count(), 0)

    def test_unique_query_keeps_exact_binding(self):
        tx = Transport(BASE, "\u25d0 " + BASE).install()
        self.assertEqual(helper.resolve_binding(BASE), tx.rows[0])

    def test_pid_exe_class_change_refuses_before_input(self):
        for key, value in (("pid", 909), ("exe_name", "Other.exe"), ("class_name", "OtherClass")):
            with self.subTest(key=key):
                tx = Transport(BASE, BASE).install()
                tx.rows[0][key] = value
                with self.assertRaises(RuntimeError):
                    helper.send_guarded(tx.binding, "must never send")
                self.assertEqual(tx.input_count(), 0)

    def test_uia_changed_full_base_refuses(self):
        tx = Transport(BASE, BASE).install()
        tx.read_title = BASE + " foreign"
        with self.assertRaises(RuntimeError):
            helper.uia_text(tx.binding)

    def test_narrow_normalization_preserves_unobserved_glyph_space_and_case(self):
        normalize = getattr(helper, "stable_title", lambda value: value)
        for value in ("\u25d2 " + BASE, "! " + BASE, "\u2733\t" + BASE,
                      " " + BASE, BASE + " ", BASE.upper(), "\u25d0" + BASE):
            self.assertEqual(normalize(value), value)
        self.assertEqual(normalize("\u25d0  " + BASE), " " + BASE)
        self.assertEqual(normalize("\u25d0 \u25d1 " + BASE), "\u25d1 " + BASE)

    def test_empty_title_refuses(self):
        tx = Transport("", "").install()
        with self.assertRaises(RuntimeError):
            helper.send_guarded(tx.binding, "must never send")
        self.assertEqual(tx.input_count(), 0)


result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(TitleGuards))
receipt = {"helper": options.helper.name, "sha256": hashlib.sha256(options.helper.read_bytes()).hexdigest(),
           "testsRun": result.testsRun, "success": result.wasSuccessful(),
           "failures": [{"test": str(test), "traceback": detail} for test, detail in result.failures],
           "errors": [{"test": str(test), "traceback": detail} for test, detail in result.errors],
           "nativeInput": False, "transport": "isolated synthetic boundary only"}
options.receipt.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
raise SystemExit(0 if result.wasSuccessful() else 1)
