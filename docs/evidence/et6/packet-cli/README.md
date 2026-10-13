# Standalone canonical packet CLI emitter — 2026-10-13

Base source: `94015bb7647415c43f01834d99cf63ced71dc6ab`. Implementation change: add `scripts/parse_official_source_packet.ts` to the existing esbuild entrypoints. All existing build semantics and the canonical CLI remain unchanged. The ESM direct-execution guard runs when invoked as `node dist/parse_official_source_packet.js`.

## Requested shipped WA Lands initial/recount packets

Both actual production-image paths were executed successfully without mounting any packet/raw-source directory. Only target metadata (`wa-lands-target.json`, extracted from the reviewed targetBinding) was mounted read-only. Canonical emitted CLI, no alternative parser:

- `/app/data/official-results/live/replay/wa/initial.packet.json`, SHA256 `c829680c33da6d5e1eb8a4caf1b3ac489d2906d5284aade91d1bf24bea747660`: Worked / dry_run_only / exit 0, **1,903,073 votes, 8 options**.
- `/app/data/official-results/live/replay/wa/recount.packet.json`, SHA256 `637e7671bc1cbc71c859e160aac2393c26a646342f9c81f292be0d838066bff2`: Worked / dry_run_only / exit 0, **1,903,115 votes, 8 options**.

Raw outputs: `wa-lands-initial-production.json`, `wa-lands-recount-production.json`; exits in corresponding `wa-lands-*-exit.txt`. Same production image ID as images.txt. Invocation for each used `docker run --rm --mount type=bind,source=<wa-lands-target.json>,target=/input/target.json,readonly electiontracker:et6-d-packet-cli node dist/parse_official_source_packet.js --packet <absolute packaged path above> --sha256 <digest above> --target /input/target.json`.

The earlier WA Senate checks below are retained as an additional, different-contest check; they were not the requested shipped Lands replay packets.

## Additional WA Senate packaging checks

| Scenario | Observed outcome | Evidence |
| --- | --- | --- |
| Builder and production Docker builds | Worked, exit 0 each | builder.txt, production.txt and exit files |
| Compiled CLI `--help` | Refused, CLI_ARGUMENT, exit 1, existing usage message | help.json / help-exit.txt |
| Builder CLI with internally packaged WA source packet | Worked, dry_run_only, exit 0 | wa-builder.json / wa-builder-exit.txt |
| Production CLI with reviewed WA packet mounted read-only | Worked, dry_run_only, exit 0 | wa-production.json / wa-production-exit.txt |
| Production CLI with all-zero manifest digest | Refused, MANIFEST_HASH_MISMATCH, exit 1 | wrong-hash.json / wrong-hash-exit.txt |

Both positive parses returned exactly **1,948,716 votes and 12 candidates**. The official historical packet and target come from `artifacts/source-packet/wa-senate/`; expected manifest SHA256 `53bbf16f29747778e55307ac6446c7c2fc9944ff0976934cff967a54eca43aa4`. Builder execution used that directory inside the image; production execution used the same directory mounted at `/input/wa`. Production intentionally receives a portable packet as an input; the runtime Dockerfile does not package the research artifact directory.

```text
docker build --target builder --tag electiontracker:et6-d-packet-cli-builder .
docker build --tag electiontracker:et6-d-packet-cli .
docker run --rm electiontracker:et6-d-packet-cli-builder node dist/parse_official_source_packet.js --help
docker run --rm electiontracker:et6-d-packet-cli-builder node dist/parse_official_source_packet.js --packet artifacts/source-packet/wa-senate/packet.json --sha256 53bbf16f29747778e55307ac6446c7c2fc9944ff0976934cff967a54eca43aa4 --target artifacts/source-packet/wa-senate/target-binding.json
docker run --rm --mount type=bind,source=D:/projects/et-wt/astra-packet-cli/artifacts/source-packet/wa-senate,target=/input/wa,readonly electiontracker:et6-d-packet-cli node dist/parse_official_source_packet.js --packet /input/wa/packet.json --sha256 53bbf16f29747778e55307ac6446c7c2fc9944ff0976934cff967a54eca43aa4 --target /input/wa/target-binding.json
```

Wrong-hash check uses the final command with 64 zeroes for `--sha256`. Image IDs are retained in `images.txt`. No database credentials, web service, replay/apply operation, or database container was used. C76 LA-order and private-URI guard reviews remain separate and uncleared by this packaging check.
