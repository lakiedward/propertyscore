from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from http.client import HTTPConnection
import json
import os
from pathlib import Path
from secrets import token_urlsafe
import signal
import socket
import subprocess
import sys
import time
from uuid import uuid4


HERE = Path(__file__).resolve().parent.parent
TOKEN_KEYS = {role: f"VALHALLA_{role.upper()}_TOKEN" for role in ("control", "routing", "status")}
A, B = (str(uuid4()) for _ in range(2))
START = {"lat": 45.7501, "lon": 21.2201}
END = {"lat": 45.7519, "lon": 21.2219}
ROUTE = {"locations": [START, END], "costing": "pedestrian", "directions_type": "none"}
MATRIX = {"sources": [START], "targets": [END], "costing": "pedestrian", "verbose": True}
ISOCHRONE = {"locations": [START], "costing": "pedestrian", "contours": [{"time": 5}]}


def request(port, method, path, payload=None, headers=None, *, host="127.0.0.1"):
    conn = HTTPConnection(host, port, timeout=10)
    try:
        conn.request(method, path, None if payload is None else json.dumps(payload), {
            "Content-Type": "application/json", **(headers or {}),
        })
        response = conn.getresponse()
        return response.status, json.loads(response.read())
    finally:
        conn.close()


def expect(port, method, path, status, payload=None, headers=None, *, host="127.0.0.1"):
    observed, body = request(port, method, path, payload, headers, host=host)
    assert observed == status, (method, path, observed, body)
    return body


def authorize(role, ledger_id=None):
    headers = {"Authorization": "Bearer " + os.environ[TOKEN_KEYS[role]]}
    if ledger_id:
        headers["X-Valhalla-Ledger"] = ledger_id
    return headers


def control(port, path, status=200):
    return expect(port, "PUT", path, status, headers=authorize("control"))


def read(port, path, status=200):
    return expect(port, "GET", path, status, headers=authorize("status"))


def until(probe, ready=bool, timeout=10):
    deadline = time.monotonic() + timeout
    while True:
        try:
            latest = probe()
            if ready(latest):
                return latest
        except (ConnectionError, FileNotFoundError) as error:
            latest = repr(error)
        assert time.monotonic() < deadline, latest
        time.sleep(0.02)


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def emit(event, **fields):
    print(json.dumps({"event": event, **fields}), flush=True)


@contextmanager
def process(args, env=None):
    child = subprocess.Popen(args, env=env, stdout=subprocess.DEVNULL)
    try:
        yield child
    finally:
        if child.poll() is None:
            child.kill()
        child.wait(timeout=5)


def stock(config):
    port = free_port()
    config_json = json.loads(config.read_text())
    config_json["httpd"]["service"]["listen"] = f"tcp://127.0.0.1:{port}"
    stock_config = config.with_name("stock.json")
    stock_config.write_text(json.dumps(config_json))
    with process(["valhalla_service", str(stock_config), "1"]):
        status = until(lambda: expect(port, "GET", "/status", 200))
        assert status["version"] == "3.9.1"
        assert "tileset_last_modified" in status and "available_actions" in status
        assert not {"run_id", "ledger_id", "drained", "queued", "running"} & status.keys()
        read_code, _ = request(port, "GET", f"/runs/{A}")
        fence_code, _ = request(port, "PUT", f"/runs/{A}/fence")
        assert read_code >= 400 and fence_code >= 400
        route = expect(port, "POST", "/route", 200, ROUTE, {"X-Smart-Check-Run": A})
        assert route["trip"]["summary"]["length"] > 0
        emit("stock_valhalla", version=status["version"], status_fields=sorted(status),
             run_read_http=read_code, fence_http=fence_code, tagged_route_http=200,
             distance_km=route["trip"]["summary"]["length"])


def worker(port, run, ledger_id, expect_disconnect=False):
    paths = {"route": ROUTE, "sources_to_targets": MATRIX}
    with ThreadPoolExecutor(max_workers=2) as pool:
        jobs = [
            pool.submit(request, port, "POST", f"/runs/{run}/{action}", payload,
                        authorize("routing", ledger_id))
            for action, payload in paths.items()
        ]
        for job in jobs:
            try:
                job.result()
            except ConnectionError:
                if not expect_disconnect:
                    raise
            else:
                assert not expect_disconnect, "Router returned a response after it was killed"


def paused_at_tile(marker):
    parts = marker.read_text().split()
    if len(parts) != 2:
        return None
    pid, tile = parts
    status = Path(f"/proc/{pid}/status").read_text().splitlines()
    if any(line.startswith("State:") and "stopped" in line for line in status):
        assert Path(f"/proc/{pid}/exe").resolve().name == "valhalla_service"
        assert tile.endswith(".gph")
        return int(pid), tile
    return None


def real_drain(config, data, preload):
    port = free_port()
    path_a, path_b = f"/runs/{A}", f"/runs/{B}"
    marker = data / "graph-tile.open"
    ledger_path = data / "run.sqlite"
    env = {**os.environ, "LD_PRELOAD": str(preload), "VALHALLA_TEST_TILE_MARKER": str(marker)}

    def command(db):
        return [sys.executable, str(HERE / "server.py"), str(config), str(db), "--port", str(port),
                "--pending-limit", "2"]

    def read_a():
        return read(port, path_a)

    with process(command(ledger_path), env):
        absent = until(lambda: read(port, path_a, 404))
        assert absent["state"] == "unknown" and absent["reason"] == "unknown_run"
        assert control(port, path_a + "/fence", 404) == absent
        expect(port, "GET", path_a, 401)
        expect(port, "GET", path_a, 401, headers={"Authorization": "Bearer rejected"})
        expect(port, "PUT", path_a, 403, headers=authorize("status"))
        expect(port, "PUT", path_a + "/fence", 403, headers=authorize("status"))
        expect(port, "POST", path_a + "/route", 403, ROUTE, authorize("status"))
        expect(port, "GET", path_a + "/status", 403, headers=authorize("status"))
        expect(port, "PUT", path_a + "/fence", 403, headers=authorize("routing"))
        emit("authorization", missing_http=401, invalid_http=401, status_cannot_register_or_fence=True,
             status_cannot_route=True, routing_cannot_fence=True, absent=absent)
        registered = control(port, path_a)
        assert registered["admission"] == "open" and registered["state"] == "idle"
        assert not registered["drained"]
        ledger_id = registered["ledger_id"]
        headers = authorize("routing", ledger_id)
        expect(port, "POST", "/route", 404, ROUTE, headers)
        control(port, path_b)
        with process([sys.executable, __file__, "worker", str(port), A, ledger_id]) as client:
            pid, tile = until(lambda: paused_at_tile(marker))
            try:
                busy = until(read_a, lambda s: s["queued"] == 1 and s["running"] == 1)
                assert busy["finished"] == 0 and not busy["drained"]
                assert busy["state"] == "busy"
                at_capacity = expect(port, "POST", path_b + "/route", 503, ROUTE, headers)
                assert at_capacity["error"] == "routing_at_capacity"
                assert read(port, path_b)["state"] == "idle"
                assert client.poll() is None
                client.kill()
                assert client.wait(timeout=5) == -signal.SIGKILL
                emit("worker_sigkill", worker_pid=client.pid, exit=client.returncode,
                     native_pid=pid, native_tile=tile, state=busy, delivered_responses=0)
                pending = control(port, path_a + "/fence")
                assert pending == (busy | {"admission": "fenced"})
                assert expect(port, "POST", path_a + "/route", 409, ROUTE, headers) == {
                    "error": "run_fenced",
                }
                assert control(port, path_a) == pending
                emit("fenced_but_not_drained", state=pending, late_route_http=409, other_run_at_capacity=503)
            finally:
                os.kill(pid, signal.SIGCONT)
            drained = until(read_a, lambda s: s["drained"])
            assert drained == (pending | {"queued": 0, "running": 0, "finished": 2,
                                          "succeeded": 2, "drained": True, "state": "drained"})
            assert not Path(f"/proc/{pid}").exists()
            assert control(port, path_a + "/fence") == drained
            assert expect(port, "GET", path_a + "/status", 409, headers=headers) == {
                "error": "run_fenced",
            }
            emit("drained_after_native_exit", state=drained, native_pid_reaped=True,
                 repeat_fence_equal=True, late_status_http=409)
        b_status = expect(port, "GET", path_b + "/status", 200, headers=headers)
        assert b_status["version"] == "3.9.1" and "tileset_last_modified" in b_status
        b_iso = expect(port, "POST", path_b + "/isochrone", 200, ISOCHRONE, headers)
        assert b_iso["features"]
        error = expect(port, "POST", path_b + "/route", 400, {}, headers)
        assert "error_code" in error
        b_drain = control(port, path_b + "/fence")
        assert b_drain["drained"] and b_drain["finished"] == 3 and b_drain["succeeded"] == 2
        emit("other_run", run_id=B, status_version=b_status["version"], isochrone_http=200,
             valhalla_error_http=400, state=b_drain)
    with process(command(ledger_path)):
        restored = until(read_a)
        assert restored == drained
        assert expect(port, "POST", path_a + "/route", 409, ROUTE, headers)["error"] == "run_fenced"
        emit("restart_same_ledger", state=restored, late_route_http=409)
    with process(command(data / "replacement.sqlite")):
        assert until(lambda: read(port, path_a, 404))["state"] == "unknown"
        control(port, path_a + "/fence", 404)
        replacement = control(port, path_a)
        assert replacement["ledger_id"] != ledger_id and not replacement["drained"]
        assert expect(port, "POST", path_a + "/route", 409, ROUTE, headers)["error"] == "ledger_mismatch"
        emit("replacement_ledger", unknown_http=404, old_ledger_route_http=409,
             replacement_ledger_id=replacement["ledger_id"])


def router_crash(config, data, preload):
    port = free_port()
    path = f"/runs/{uuid4()}"
    marker = data / "crash-tile.open"
    db = data / "router-crash.sqlite"
    command = [sys.executable, str(HERE / "server.py"), str(config), str(db), "--port", str(port)]
    env = {**os.environ, "LD_PRELOAD": str(preload), "VALHALLA_TEST_TILE_MARKER": str(marker)}
    with process(command, env) as router:
        until(lambda: read(port, path, 404))
        ledger_id = control(port, path)["ledger_id"]
        with process([sys.executable, __file__, "worker", str(port), path.split("/")[-1],
                      ledger_id, "expect-disconnect"]) as client:
            pid, _ = until(lambda: paused_at_tile(marker))
            try:
                busy = until(lambda: read(port, path), lambda s: s["queued"] == s["running"] == 1)
                assert busy["admission"] == "open" and busy["state"] == "busy"
                router.kill()
                assert router.wait(timeout=5) == -signal.SIGKILL
                assert client.wait(timeout=5) == 0
                with process(command):
                    restored = until(lambda: read(port, path))
                    assert restored == (busy | {
                        "admission": "fenced", "state": "unknown", "reason": "router_restarted",
                        "queued": None, "running": None, "finished": None, "succeeded": None,
                    })
                    assert control(port, path) == restored and control(port, path + "/fence") == restored
                    headers = authorize("routing", ledger_id)
                    assert expect(port, "POST", path + "/route", 409, ROUTE, headers)["error"] == "run_fenced"
                    assert paused_at_tile(marker) is not None
                    emit("router_sigkill_unconfirmed", router_exit=router.returncode,
                         client_disconnected=True, native_still_stopped=True, state=restored)
            finally:
                os.kill(pid, signal.SIGKILL)


def build_tiles(data, tiny_fixture):
    config = data / "valhalla.json"
    overrides = ["--mjolnir-id-table-size", "1000"] if tiny_fixture else []
    with config.open("wb") as output:
        subprocess.run([
            "valhalla_build_config", "--mjolnir-tile-dir", str(data / "tiles"),
            "--mjolnir-tile-extract", str(data / "absent.tar"), *overrides,
        ], stdout=output, check=True)
    build = subprocess.run([
        "valhalla_build_tiles", "-c", str(config), "-j", "1", str(data / "fixture.osm.pbf"),
    ], capture_output=True)
    if build.returncode:
        sys.stderr.buffer.write(build.stdout + build.stderr)
        build.check_returncode()
    return config


def prove(data, preload):
    for key in TOKEN_KEYS.values():
        os.environ[key] = token_urlsafe(32)
    config = build_tiles(data, tiny_fixture=True)
    stock(config)
    real_drain(config, data, preload)
    router_crash(config, data, preload)


def operator(port, first, second=None):
    run_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    path = f"/runs/{run_id}"

    def call(method, endpoint, code, role=None, payload=None, ledger_id=None):
        return expect(port, method, endpoint, code, payload,
                      authorize(role, ledger_id) if role else None, host="::1")

    until(lambda: call("GET", path, 401), timeout=180)
    if second is None:
        state = call("GET", path, 200, "status")
        assert state["ledger_id"] == first and state["state"] == "drained"
        assert state["finished"] == 4 and state["succeeded"] == 4
        emit("operator_volume_restart", **state)
        return

    def location(pair):
        lat, lon = map(float, pair.split(","))
        return {"lat": lat, "lon": lon}

    start, end = location(first), location(second)
    assert call("GET", path, 404, "status")["state"] == "unknown"
    state = call("PUT", path, 200, "control")
    assert state["state"] == "idle"
    ledger_id = state["ledger_id"]
    call("PUT", path + "/fence", 403, "status")

    native = call("GET", path + "/status", 200, "routing", ledger_id=ledger_id)
    assert native["version"] == "3.9.1"
    options = {"costing": "pedestrian", "units": "kilometers"}
    route = call("POST", path + "/route", 200, "routing", {
        **options, "locations": [start, end], "directions_type": "none",
    }, ledger_id)
    distance = route["trip"]["summary"]["length"]
    assert distance > 0 and route["trip"]["legs"][0]["shape"]
    matrix = call("POST", path + "/sources_to_targets", 200, "routing", {
        **options, "sources": [start], "targets": [end], "verbose": True,
    }, ledger_id)
    cell = matrix["sources_to_targets"][0][0]
    assert cell["distance"] > 0 and cell["time"] > 0
    isochrone = call("POST", path + "/isochrone", 200, "routing", {
        **options, "locations": [start], "contours": [{"time": 5}], "polygons": True,
    }, ledger_id)
    features = isochrone["features"]
    assert isochrone["type"] == "FeatureCollection" and features
    assert all(feature["geometry"]["type"] in {"Polygon", "MultiPolygon"}
               and feature["geometry"]["coordinates"] and feature["properties"]["contour"] == 5
               for feature in features)
    fenced = call("PUT", path + "/fence", 200, "control")
    assert fenced["finished"] == fenced["succeeded"] == 4
    assert call("GET", path, 200, "status") == fenced
    assert fenced["state"] == "drained" and fenced["queued"] == fenced["running"] == 0
    call("POST", path + "/route", 409, "routing", {**options, "locations": [start, end]}, ledger_id)
    emit("operator_native_geometry", version=native["version"], anonymous=401, status_write=403,
         route_km=distance, matrix_km=cell["distance"], matrix_seconds=cell["time"],
         isochrone_geometry=features[0]["geometry"]["type"], isochrone_count=len(features),
         state=fenced, late_route=409)


if __name__ == "__main__":
    if sys.argv[1] == "worker":
        worker(int(sys.argv[2]), sys.argv[3], sys.argv[4],
               expect_disconnect=sys.argv[5:] == ["expect-disconnect"])
    elif sys.argv[1] in {"operator", "operator-restart"}:
        operator(int(sys.argv[2]), *sys.argv[3:])
    elif sys.argv[1] == "serve":
        data = Path(sys.argv[2])
        config = build_tiles(data, tiny_fixture=(data / "fixture.osm").exists())
        os.execv(sys.executable, [
            sys.executable, str(HERE / "server.py"), str(config), str(data / "run.sqlite"),
            "--port", sys.argv[3],
        ])
    else:
        prove(Path(sys.argv[2]), Path(sys.argv[3]))
