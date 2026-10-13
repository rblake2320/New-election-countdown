# Canonical seat title guard repair

The canonical deployment is the existing untracked PKA helper at
`C:/Users/techai/PKA testing/scripts/seat_send.py`. This branch retains its
before/after bytes, a portable patch and executable proof; it does not introduce
a second operational helper or commit unrelated PKA changes.

Before SHA256: `6033333a0841bca3f525d5eb3b493ce85e9b19a49b617baa88e64cf990022e3f`.
After SHA256: `41abc31626e3753a0051b642a114323d8d05368745cc7c8ffcf1f7708f8c193d`.

The old helper passed the entire fresh activity-bearing title as the native
substring guard and compared UIA readback against the same literal title. A
prefix change between discovery and guarding/readback therefore refused a
valid target. Its existing substring check also accepted a changed base that
contained the original title. Existing guard coverage did not exercise the
animation or the helper's stricter desired full-base identity.

The repair removes only one leading observed U+25D0, U+25D1 or U+2733 glyph
followed by one ASCII space. It performs no trimming, case folding, arbitrary
punctuation stripping or role-only comparison. Before every guarded input,
fresh enumeration must have the same HWND/PID/executable/class and exact full
normalized base, uniquely. The native guard retains all four expectation fields
and its returned full normalized title is checked before input. UIA readback
checks the HWND and the same normalized full title. Existing delivery, submit,
locking, pager/composer and ACK behavior is unchanged.

`verify_title_guard.py` exercises isolated synthetic transport boundaries only:
12 test methods, including all 16 combinations of the three observed prefixes
and no prefix; hostile base extensions; duplicate discovery and action targets;
identity drift; exact guard-result title change; UIA change; unknown glyphs and
meaningful spaces. The retained old executable fails (9 assertion failures and
10 subcase exceptions); the new executable passes all 12 methods. These probes
perform no native input or capture.

`verify_live_guard.py` executed eight real native guard checks and four real UIA
reads against the freshly unique B title. All retained live observations in that
probe have U+2733; the probe does not claim to have observed a live cycle between
the other glyphs. `verify_processed_ack.py` independently retained a real UIA
response line after the single requested send. Full terminal contents were not
retained: only hashes, marker references and the exact ACK line.

The canonical send on 2026-10-13 at 15:36:43 local used the fresh binding for
`Site design tool access review`, requested B's PR83 rebase onto main ad5419,
and returned `acknowledged` for `C-B-86merged2`. The audit row is retained in
`send-log-retained.json`; `processed-ack-uia.json` independently confirms the
separate exact response line. No resend, other terminal input, application/DB
change, browser action or full pipeline run was performed.

Reproduce offline:

```
python artifacts/seat-title-guard/verify_title_guard.py artifacts/seat-title-guard/seat_send.before.py --receipt artifacts/seat-title-guard/red.json
python artifacts/seat-title-guard/verify_title_guard.py artifacts/seat-title-guard/seat_send.after.py --receipt artifacts/seat-title-guard/green.json
```

The first command intentionally exits nonzero. `packet.json` binds retained
files to SHA256; `package_proof.py` refuses if the deployed canonical helper no
longer matches the reviewed after snapshot. Do not run a retained snapshot as
the operational helper: its filesystem root intentionally differs.
