"""Narrow actual compiled receiving; disposable internal Docker network, no ports."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid

root = Path(__file__).resolve().parent.parent
image = os.environ["TEST_IMAGE"]
builder = os.environ["TEST_BUILDER_IMAGE"]
evidence = root / os.environ["PROVIDER_EVIDENCE_DIR"]
evidence.mkdir(parents=True, exist_ok=True)
fixture = root / "scripts/fixtures/provider-deadline"
suffix = str(os.getpid()) + "-" + uuid.uuid4().hex[:6]
network, database = "et-provider-net-" + suffix, "et-provider-db-" + suffix
password = uuid.uuid4().hex + uuid.uuid4().hex
database_url = "postgresql://et_test:" + password + "@" + database + ":5432/et_test"
containers = []
receipt = {"capturedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
           "network": "internal; no published ports",
           "fixture": "explicit synthetic local profiles in real owned PostgreSQL; real compiled routes/storage; provider transport only maps VoteSmart to internal broken/hanging HTTP fixture",
           "sourceHead": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
           "image": image, "builder": builder, "stages": [], "passed": False}

def docker(*args, timeout=180):
    result = subprocess.run(["docker", *args], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    if result.returncode:
        raise RuntimeError("docker " + args[0] + " failed: " + result.stderr.replace(password, "[redacted]"))
    return ((result.stdout or "") + (result.stderr or "") if args[0] == "logs" else (result.stdout or "")).strip()

def sql(query):
    return docker("exec", database, "psql", "-U", "et_test", "-d", "et_test", "-Atc", query)

def node(app, script):
    return json.loads(docker("exec", app, "node", "--input-type=module", "-e", script))

def save(name, value):
    (evidence / name).write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")

try:
    receipt["imageId"] = docker("image", "inspect", "--format", "{{.Id}}", image)
    receipt["builderImageId"] = docker("image", "inspect", "--format", "{{.Id}}", builder)
    receipt["clientTreeSha256"] = hashlib.sha256(subprocess.check_output(["git", "ls-tree", "-r", "HEAD", "client/src"], cwd=root)).hexdigest()
    pinned_main = os.environ.get("PROVIDER_MAIN_HEAD", "7cae771061b1835df432bd95dccc768fd53f7824")
    receipt["pinnedMain"] = pinned_main
    receipt["harnessSha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    receipt["mainClientTreeSha256"] = hashlib.sha256(subprocess.check_output(["git", "ls-tree", "-r", pinned_main, "client/src"], cwd=root)).hexdigest()
    assert receipt["clientTreeSha256"] == receipt["mainClientTreeSha256"], "B client tree drift"
    receipt["fixtureFiles"] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in fixture.glob("*.mjs")}
    docker("network", "create", "--internal", network)
    docker("run", "-d", "--name", database, "--network", network,
           "-e", "POSTGRES_USER=et_test", "-e", "POSTGRES_PASSWORD=" + password,
           "-e", "POSTGRES_DB=et_test", "postgres:16-alpine")
    containers.append(database)
    for _ in range(30):
        try:
            docker("exec", database, "pg_isready", "-U", "et_test", "-d", "et_test")
            break
        except RuntimeError:
            time.sleep(1)
    else:
        raise RuntimeError("Private database did not become ready")
    schema_log = docker("run", "--rm", "--network", network, "-e", "DATABASE_URL=" + database_url,
                        "--entrypoint", "npx", builder, "drizzle-kit", "push", "--force")
    (evidence / "schema.log").write_text(schema_log, encoding="utf-8")
    initial_digest = None
    modes = os.environ.get("PROVIDER_STAGES", "baseline,broken,hanging_headers,hanging_body").split(",")
    assert modes and set(modes) <= {"baseline", "broken", "hanging_headers", "hanging_body"}, "Unknown private fixture stage"
    for index, mode in enumerate(modes):
        app, provider = "et-provider-app-" + suffix + "-" + str(index), "et-provider-upstream-" + suffix + "-" + str(index)
        mount = "type=bind,source=" + fixture.as_posix() + ",target=/fixture,readonly"
        if mode != "baseline":
            docker("run", "-d", "--name", provider, "--network", network, "--mount", mount,
                   "-e", "PROVIDER_FIXTURE_MODE=" + mode, "--entrypoint", "node", image, "/fixture/upstream.mjs")
            containers.append(provider)
        args = ["run", "-d", "--name", app, "--network", network, "--mount", mount,
                "-e", "DATABASE_URL=" + database_url, "-e", "JWT_SECRET=" + password,
                "-e", "CANDIDATE_JWT_SECRET=" + password, "-e", "APP_ORIGIN=http://127.0.0.1:5000"]
        if mode != "baseline":
            args += ["-e", "VOTESMART_API_KEY=explicit-synthetic-fixture-key",
                     "-e", "NODE_OPTIONS=--import=/fixture/preload.mjs",
                     "-e", "PROVIDER_FIXTURE_ORIGIN=http://" + provider + ":8080"]
        docker(*args, image)
        containers.append(app)
        health = {"status": None, "body": {"ok": False}}
        for _ in range(45):
            try:
                health = node(app, "const r=await fetch('http://127.0.0.1:5000/api/health'); console.log(JSON.stringify({status:r.status,body:await r.json()}));")
                if health["status"] == 200 and health["body"]["ok"]:
                    receipt.pop("lastStartupError", None)
                    break
            except RuntimeError as error:
                receipt["lastStartupError"] = str(error).replace(password, "[redacted]")
            if docker("inspect", "--format", "{{.State.Running}}", app) != "true":
                break
            time.sleep(1)
        else:
            pass
        if not (health["status"] == 200 and health["body"]["ok"]):
            try:
                (evidence / (mode + "-startup.log")).write_text(docker("logs", app).replace(password, "[redacted]"), encoding="utf-8")
                receipt["lastStartupHealth"] = health
            except Exception:
                pass
            raise RuntimeError("Packaged app did not become ready in " + mode)
        if initial_digest is None:
            context = json.loads(sql("select json_agg(e) from (select id,title,state,type,offices from elections where id in (2,37) order by id) e"))
            receipt["electionContext"] = context
            assert len(context) == 2 and context[1]["id"] == 37 and context[1]["state"] == "AK" and "Governor" in context[1]["offices"], "Fixture requires canonical Alaska Governor37/Senate2"
            sql("""INSERT INTO candidates(id,election_id,name,party,description,campaign_bio,website,profile_image_url,is_verified,data_source,source_status,ballot_status,fec_status,source_file_sha256)
              VALUES (900001,37,'Explicit Fixture Governor A','R','Private synthetic local biography A','Private synthetic campaign biography A','https://fixture.invalid/a','https://fixture.invalid/a.png',false,'fixture_local','fixture_editorial','unknown',NULL,repeat('a',64)),
                     (900002,37,'Explicit Fixture Governor B','D','Private synthetic local biography B',NULL,'https://fixture.invalid/b',NULL,false,'fixture_local','fixture_editorial','unknown',NULL,repeat('b',64)),
                     (900003,37,'Explicit Fixture Governor Unknown','','Private synthetic unknown-party biography',NULL,NULL,NULL,false,'fixture_local','fixture_unknown','unknown',NULL,repeat('c',64)),
                     (900010,2,'Explicit Foreign Senate Control','D','This profile must never appear on Governor37',NULL,NULL,NULL,false,'fixture_local','fixture_foreign_control','unknown',NULL,repeat('d',64));""")
            initial_digest = sql("select md5(string_agg(row_to_json(c)::text,'' order by id)) from candidates c;")
        controls = json.loads(sql("select json_agg(c order by id) from candidates c where election_id=37;"))
        stage = {"mode": mode, "providerBoundary": "no key/no provider work" if mode == "baseline" else "real internal HTTP fault server; VoteSmart URL transport mapping; synthetic key; no external egress"}
        stage["http"] = json.loads(docker("exec", "-e", "PROFILE_CONTROLS=" + json.dumps(controls), app, "node", "/fixture/probe.mjs"))
        if mode != "baseline":
            stats_code = "console.log(JSON.stringify(await fetch('http://" + provider + ":8080/stats').then(r=>r.json())));"
            stage["atHttpReturn"] = node(app, stats_code)
            time.sleep(.5)
            stage["after500ms"] = node(app, stats_code)
            time.sleep(5)
            stage["after5500ms"] = node(app, stats_code)
            stage["resourceSettled"] = stage["after5500ms"]["active"] == 0 and stage["after5500ms"]["requests"] == stage["after500ms"]["requests"]
            stage["wholeBudgetCancellation"] = stage["after500ms"]["active"] == 0 and stage["after500ms"]["requests"] == stage["atHttpReturn"]["requests"]
        else:
            stage["resourceSettled"] = True
        stage["fullCandidateRowsUnchanged"] = sql("select md5(string_agg(row_to_json(c)::text,'' order by id)) from candidates c;") == initial_digest
        receipt["stages"].append(stage)
        save(mode + ".json", stage)
        (evidence / (mode + "-application.log")).write_text(docker("logs", app).replace(password, "[redacted]"), encoding="utf-8")
        docker("rm", "-f", app)
        containers.remove(app)
        if mode != "baseline":
            docker("rm", "-f", provider)
            containers.remove(provider)
    receipt["passed"] = all(s["http"]["passed"] and s["resourceSettled"] and s["fullCandidateRowsUnchanged"] for s in receipt["stages"])
except Exception as error:
    receipt["error"] = str(error).replace(password, "[redacted]")
finally:
    for name in reversed(containers):
        try:
            docker("rm", "-f", name)
        except Exception:
            pass
    try:
        docker("network", "rm", network)
    except Exception:
        pass
    receipt["cleanupAttempted"] = True
    save("receipt.json", receipt)
print(json.dumps({k: v for k, v in receipt.items() if k != "stages"}))
print(json.dumps([{"mode": s["mode"], "httpPassed": s["http"]["passed"], "maxMs": s["http"]["maxMs"],
                   "resourceSettled": s["resourceSettled"], "unchanged": s["fullCandidateRowsUnchanged"]} for s in receipt["stages"]]))
raise SystemExit(0 if receipt["passed"] else 1)
