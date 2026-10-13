"""Owner-restricted, DPAPI-protected actual PostgreSQL source deployment backup."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import uuid
from urllib.parse import urlparse, unquote
from dotenv import dotenv_values
import win32crypt

source = dotenv_values(os.environ.get('ELECTION_ENV_FILE', 'D:/projects/New-election-countdown/.env')).get('DATABASE_URL')
url = urlparse(source or '')
if url.hostname not in ('localhost', '127.0.0.1') or (url.port or 5432) != 5432 or url.path != '/elections':
    raise SystemExit('Approved local elections source required')
label = 'et_sol_data_' + uuid.uuid4().hex[:12]
root = Path('C:/Users/techai/.codex/private/election-source-backups') / label
root.mkdir(parents=True, exist_ok=False)
account = subprocess.check_output(['whoami'], text=True).strip()
subprocess.run(['icacls', str(root), '/grant:r', account + ':(OI)(CI)F', 'SYSTEM:(OI)(CI)F', '/inheritance:r'], check=True, capture_output=True)
env = {**os.environ, 'PGHOST': url.hostname, 'PGPORT': str(url.port or 5432), 'PGDATABASE': 'elections', 'PGUSER': unquote(url.username or ''), 'PGPASSWORD': unquote(url.password or '')}
plain = root / 'snapshot.custom'
protected = root / 'snapshot.custom.dpapi'
stage = 'dump'
try:
    subprocess.run([shutil.which('pg_dump.exe') or 'pg_dump', '--no-password', '--format=custom', '--file', str(plain)], env=env, check=True, capture_output=True, timeout=1800)
    raw = plain.read_bytes()
    if len(raw) < 5 or raw[:5] != b'PGDMP':
        raise RuntimeError('Custom PostgreSQL archive signature missing')
    stage = 'protect'
    entropy = label.encode('ascii')
    blob = win32crypt.CryptProtectData(raw, 'ElectionTracker source-data rollback', entropy, None, None, 1)
    protected.write_bytes(blob)
    recovered = win32crypt.CryptUnprotectData(protected.read_bytes(), entropy, None, None, 1)[1]
    if hashlib.sha256(recovered).digest() != hashlib.sha256(raw).digest():
        raise RuntimeError('DPAPI read-back differs')
    plain.unlink()
    stage = 'create-private'
    subprocess.run([shutil.which('createdb.exe') or 'createdb', '--no-password', label], env=env, check=True, capture_output=True, timeout=60)
    stage = 'restore-private'
    subprocess.run([shutil.which('pg_restore.exe') or 'pg_restore', '--no-password', '--no-owner', '--no-privileges', '--dbname', label], input=recovered, env=env, check=True, capture_output=True, timeout=1800)
    receipt = {'outcome': 'Worked', 'source': 'approved local5432/elections', 'privateDatabase': label, 'archive': str(protected), 'plaintextBytes': len(raw), 'archiveSha256': hashlib.sha256(raw).hexdigest(), 'protectedSha256': hashlib.sha256(protected.read_bytes()).hexdigest(), 'protection': 'current Windows user DPAPI plus owner/SYSTEM-only ACL', 'entropy': label, 'dpapiReadback': 'identical', 'privateRestore': 'Worked', 'plaintextFileRetained': False}
    output = root / 'receipt.json'
    output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    Path('artifacts/data-deployment').mkdir(parents=True, exist_ok=True)
    Path('artifacts/data-deployment/backup-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt))
except Exception as exc:
    print(json.dumps({'outcome': 'Failed', 'stage': stage, 'errorType': type(exc).__name__, 'protectedArchiveRetained': protected.exists(), 'privateDatabase': label}))
    raise SystemExit(1)
