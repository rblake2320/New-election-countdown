"""Own and remove the dedicated synthetic FEC PostgreSQL fixture."""
import json
import os
import secrets
import subprocess
import time
from pathlib import Path

root = Path(__file__).resolve().parents[1]
name = 'et-sol-c-fec-test'
environment = dict(os.environ, POSTGRES_PASSWORD=secrets.token_urlsafe(32))
started = False
try:
    subprocess.run(['docker', 'run', '--rm', '-d', '--name', name, '--cpus', '1', '--memory', '512m',
                    '--label', 'codex.owner=sol-ec-162924912', '--label', 'codex.scope=synthetic-fec-test',
                    '-p', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data',
                    '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB=et_sol_c_fec_test', 'postgres:16'],
                   check=True, capture_output=True, text=True, env=environment)
    started = True
    deadline = time.monotonic() + 30
    while subprocess.run(['docker', 'exec', name, 'pg_isready', '-U', 'postgres'], capture_output=True).returncode:
        if time.monotonic() >= deadline:
            raise RuntimeError('Disposable FEC PostgreSQL did not become ready')
        time.sleep(0.25)
    data = json.loads(subprocess.check_output(['docker', 'inspect', name], text=True))[0]
    assert data['Config']['Labels']['codex.owner'] == 'sol-ec-162924912'
    port = data['NetworkSettings']['Ports']['5432/tcp'][0]['HostPort']
    environment['DATABASE_URL'] = 'postgresql://postgres:' + environment['POSTGRES_PASSWORD'] + '@127.0.0.1:' + port + '/et_sol_c_fec_test'
    command = 'npx.cmd' if os.name == 'nt' else 'npx'
    result = subprocess.run([command, 'tsx', 'scripts/verify_fec_sync.ts'], cwd=root, env=environment)
    if result.returncode:
        raise RuntimeError('FEC acceptance returned exit ' + str(result.returncode))
finally:
    if started:
        subprocess.run(['docker', 'stop', name], check=True, capture_output=True, text=True)
