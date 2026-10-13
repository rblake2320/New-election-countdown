"""Package public inputs and code provenance only; never read database rows/secrets."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/source-gap-private-sd'
HEADS = {'green': '72f7e8e6e5ac3fb93a7d31993c094565c1de1310',
         'red': '9e10c4cf472a860489e97eb6f18f023abba1378f'}
MODULES = [p for p in json.loads((OUT / 'reproduction-imports.json').read_text())['inputs']
           if p.startswith(('server/', 'shared/')) or p == 'scripts/source_data_rollback.ts']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


provenance = {'version': 1, 'modules': [], 'normalization': 'CRLF to LF for comparison only; captured bytes remain unchanged',
              'executedBinary': 'full-private-gate.mjs',
              'reproductionBinary': 'reproducible-full-gate.mjs',
              'reproductionBinaryExecuted': False,
              'reproductionDifference': 'Reproduction source adds the offline source-pin guard, reviewed apply-count assertion, and actual profile count summary from full before/after snapshots; no additional database run claimed.'}
for label, head in HEADS.items():
    for module in MODULES:
        git_bytes = subprocess.check_output(['git', 'show', head + ':' + module], cwd=ROOT)
        captured = OUT / 'runtime-source' / label / module
        captured.parent.mkdir(parents=True, exist_ok=True)
        captured.write_bytes(git_bytes)
        item = {'case': label, 'runtimeHead': head, 'path': module,
                'gitBlob': subprocess.check_output(['git', 'rev-parse', head + ':' + module], cwd=ROOT).decode().strip(),
                'gitBytesSha256': sha(git_bytes), 'snapshot': captured.relative_to(OUT).as_posix()}
        if label == 'green':
            physical = (ROOT / module).read_bytes()
            same = physical.replace(b'\r\n', b'\n') == git_bytes.replace(b'\r\n', b'\n')
            if not same:
                raise SystemExit('Physical runtime drift: ' + module)
            physical_copy = OUT / 'runtime-source' / 'executed-physical' / module
            physical_copy.parent.mkdir(parents=True, exist_ok=True)
            physical_copy.write_bytes(physical)
            item.update(physicalSha256=sha(physical), physicalSnapshot=physical_copy.relative_to(OUT).as_posix(),
                        sameExceptCRLF=True)
        provenance['modules'].append(item)
(OUT / 'runtime-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n', encoding='utf-8')
files = []
for path in sorted(OUT.rglob('*')):
    if path.is_file() and path.name != 'delivery-index.json':
        raw = path.read_bytes()
        files.append({'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': sha(raw)})
for path in sorted((ROOT / 'scripts').glob('*source_gap*sd*')):
    if path.is_file():
        raw = path.read_bytes()
        files.append({'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': sha(raw)})
index = {'version': 1, 'owningRuntime': HEADS['green'], 'oldFailedRuntime': HEADS['red'],
         'manifestSha256': sha((OUT / 'incremental-manifest.json').read_bytes()),
         'privateBaseline': '1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2',
         'guardChecks': 15, 'fullPrivateChecks': 17, 'offlineProvenanceChecks': 8,
         'unitTests': 1016, 'unitFiles': 112, 'typecheckExitCode': 0, 'buildExitCode': 0,
         'sharedWrites': 0, 'rawPrivateSnapshotsCommitted': False, 'files': files}
(OUT / 'delivery-index.json').write_text(json.dumps(index, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'outcome': 'Worked', 'files': len(files), 'runtimeModules': len(MODULES),
                  'indexSha256': sha((OUT / 'delivery-index.json').read_bytes())}))
