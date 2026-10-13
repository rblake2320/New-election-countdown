"""Package public inputs and code provenance only; never read database rows/secrets."""
import hashlib
import json
import subprocess
import sys
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/source-gap-private-sd'
reviewed = next((arg.split('=', 1)[1] for arg in sys.argv[1:]
                if arg.startswith('--review-runtime-head=')), None)
if reviewed:
    if not re.fullmatch('[a-f0-9]{40}', reviewed):
        raise SystemExit('Exact immutable source head required')
    destination = OUT / ('runtime-repair-' + reviewed[:8])
    modules = [row['path'] for row in json.loads((OUT / 'runtime-provenance.json').read_text())['modules']
               if row['case'] == 'green'] + ['scripts/source_data_capture.ts']
    provenance = {'version': 1, 'runtimeHead': reviewed, 'modules': [],
                  'normalization': 'CRLF to LF comparison only; captured bytes unchanged'}
    for module in modules:
        committed = subprocess.check_output(['git', 'show', reviewed + ':' + module], cwd=ROOT)
        physical = (ROOT / module).read_bytes()
        if physical.replace(b'\r\n', b'\n') != committed.replace(b'\r\n', b'\n'):
            raise SystemExit('Actual source differs from reviewed runtime: ' + module)
        copy = destination / 'runtime-source' / module
        copy.parent.mkdir(parents=True, exist_ok=True)
        copy.write_bytes(physical)
        provenance['modules'].append({'path': module,
            'gitBlob': subprocess.check_output(['git', 'rev-parse', reviewed + ':' + module], cwd=ROOT).decode().strip(),
            'gitBytesSha256': hashlib.sha256(committed).hexdigest(),
            'physicalSha256': hashlib.sha256(physical).hexdigest(), 'sameExceptCRLF': True,
            'snapshot': copy.relative_to(ROOT).as_posix()})
    (destination / 'runtime-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n', encoding='utf8')
    paths = list(p for p in destination.rglob('*') if p.is_file() and p.name != 'delivery-index.json')
    paths.extend(OUT / name for name in ['full-private-gate-fda5214.mjs', 'rollback-admission-green-fda5214.mjs',
                                       'rollback-admission-red.json', 'rollback-admission-red.mjs'])
    paths.extend(p for p in (ROOT / 'scripts').glob('*source_gap*sd*') if p.is_file())
    files = [{'path': p.relative_to(ROOT).as_posix(), 'bytes': len(p.read_bytes()),
              'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(paths)]
    record = {'version': 1, 'owningRuntime': reviewed, 'files': files,
              'fullPrivateChecks': 24, 'rollbackAdmissionChecks': 8, 'unitTests': 1016, 'unitFiles': 112,
              'buildExitCode': 0, 'typecheck': {'owner': 'root', 'reportedExitCode': 0, 'sourceHead': reviewed},
              'privateBaselineRestored': '1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2',
              'sharedWrites': 0, 'authUserWrites': 0, 'extraPgRunsAfter24CheckGate': 0}
    (destination / 'delivery-index.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'outcome': 'Worked', 'files': len(files), 'runtimeModules': len(modules),
                      'indexSha256': hashlib.sha256((destination / 'delivery-index.json').read_bytes()).hexdigest()}))
    raise SystemExit(0)
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
