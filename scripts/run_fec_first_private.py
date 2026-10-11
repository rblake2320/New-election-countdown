"""Create and clean up only this runner's disposable FEC-first PostgreSQL fixture."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time
import uuid

MODES = {
    "producer": "scripts/verify_fec_source_proof_private.ts",
    
}
if len(sys.argv) != 2 or sys.argv[1] not in MODES:
    raise SystemExit("Choose producer, acceptance or original")
root = Path(__file__).resolve().parent.parent
source_env = Path(os.environ.get("ELECTION_ENV_FILE", "D:/projects/New-election-countdown/.env"))
if not source_env.is_file():
    raise SystemExit("Approved source environment file is absent")
fixture_id = None
label = "sol-fec-private-" + uuid.uuid4().hex
password = secrets.token_urlsafe(32)
container_env = {**os.environ, "POSTGRES_PASSWORD": password}
try:
    created = subprocess.run([
        "docker", "run", "--detach", "--name", label, "--label", "owner="+label,
        "--publish", "127.0.0.1:5571:5432", "--env", "POSTGRES_PASSWORD",
        "--env", "POSTGRES_USER=etfixture", "--env", "POSTGRES_DB=et_sol_fec_first", "postgres:16",
    ], env=container_env, capture_output=True, text=True, check=True)
    fixture_id = created.stdout.strip()
    if len(fixture_id) != 64 or not all(c in "0123456789abcdef" for c in fixture_id):
        raise RuntimeError("Unexpected fixture container identity")
    for attempt in range(30):
        ready = subprocess.run(["docker", "exec", fixture_id, "pg_isready", "--username", "etfixture", "--dbname", "et_sol_fec_first"], capture_output=True)
        if ready.returncode == 0:
            break
        time.sleep(1)
    else:
        raise RuntimeError("Dedicated fixture did not become ready")
    child_env = {**os.environ, "ELECTION_ENV_FILE": str(source_env), "DATABASE_URL": "postgresql://etfixture:"+password+"@127.0.0.1:5571/et_sol_fec_first", "FEC_FIRST_PRIVATE_TEST": "1"}
    result = subprocess.run(["npx.cmd", "tsx", MODES[sys.argv[1]]], cwd=root, env=child_env)
    if result.returncode:
        raise SystemExit(result.returncode)
finally:
    if fixture_id:
        inspected = subprocess.run(["docker", "inspect", fixture_id], capture_output=True, text=True, check=True)
        container = json.loads(inspected.stdout)[0]
        if container["Id"] != fixture_id or container["Config"]["Labels"].get("owner") != label:
            raise RuntimeError("Fixture cleanup identity guard refused")
        subprocess.run(["docker", "rm", "--force", "--volumes", fixture_id], capture_output=True, check=True)
