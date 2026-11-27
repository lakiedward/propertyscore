import argparse
from concurrent.futures import ThreadPoolExecutor
import fcntl
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
from secrets import compare_digest
import socket
import sqlite3
import subprocess
from tempfile import NamedTemporaryFile
from threading import BoundedSemaphore, Lock
from uuid import uuid4


RUN_PATH = re.compile(r"/runs/([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})(?:/([a-z_]+))?")
ACTION_METHODS = {"status": "GET", "route": "POST", "sources_to_targets": "POST", "isochrone": "POST"}
TOKEN_NAMES = {role: f"VALHALLA_{role.upper()}_TOKEN" for role in ("control", "routing", "status")}
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_-]{43,128}")
CONTROL = {
    ("PUT", None): ("control", "register"),
    ("GET", None): ("status", "read"),
    ("PUT", "fence"): ("control", "fence"),
}


def load_tokens():
    tokens = {role: os.environ.get(name, "") for role, name in TOKEN_NAMES.items()}
    if len(set(tokens.values())) != len(tokens) or not all(
        TOKEN_PATTERN.fullmatch(token) for token in tokens.values()
    ):
        raise ValueError("Configure three distinct Valhalla tokens (43–128 base64url characters).")
    return {role: ("Bearer " + token).encode("ascii") for role, token in tokens.items()}


def unknown(run_id, reason, ledger_id=None, admission=None):
    return {
        "run_id": run_id, "ledger_id": ledger_id, "admission": admission,
        "state": "unknown", "reason": reason, "queued": None, "running": None,
        "finished": None, "succeeded": None, "drained": False,
    }


class Ledger:
    def __init__(self, path):
        self.lockfile = open(path.with_name(path.name + ".lock"), "a")
        fcntl.flock(self.lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("PRAGMA synchronous = FULL")
        self.lock = Lock()
        with self.db:
            self.db.execute("CREATE TABLE IF NOT EXISTS identity (id TEXT NOT NULL)")
            row = self.db.execute("SELECT id FROM identity").fetchone()
            self.identity = row[0] if row else str(uuid4())
            if row is None:
                self.db.execute("INSERT INTO identity VALUES (?)", (self.identity,))
            self.db.execute("""
                CREATE TABLE IF NOT EXISTS runs (
                    id TEXT PRIMARY KEY, fenced INTEGER NOT NULL DEFAULT 0,
                    queued INTEGER NOT NULL DEFAULT 0 CHECK (queued >= 0),
                    running INTEGER NOT NULL DEFAULT 0 CHECK (running >= 0),
                    finished INTEGER NOT NULL DEFAULT 0 CHECK (finished >= 0),
                    succeeded INTEGER NOT NULL DEFAULT 0 CHECK (succeeded BETWEEN 0 AND finished),
                    unknown_reason TEXT
                )
            """)
            self.db.execute("""
                UPDATE runs SET fenced = 1, unknown_reason = 'router_restarted'
                WHERE (queued > 0 OR running > 0) AND unknown_reason IS NULL
            """)

    def state(self, run_id, operation):
        with self.lock, self.db:
            if operation == "register":
                self.db.execute("INSERT OR IGNORE INTO runs (id) VALUES (?)", (run_id,))
            elif operation == "fence":
                self.db.execute("UPDATE runs SET fenced = 1 WHERE id = ?", (run_id,))
            row = self.db.execute(
                "SELECT fenced, queued, running, finished, succeeded, unknown_reason FROM runs WHERE id = ?",
                (run_id,),
            ).fetchone()
            if row is None:
                return 404, unknown(run_id, "unknown_run", self.identity)
            fenced, queued, running, finished, succeeded, reason = row
            admission = "fenced" if fenced else "open"
            if reason:
                return 200, unknown(run_id, reason, self.identity, admission)
            state = "busy" if queued or running else ("drained" if fenced else "idle")
            return 200, {
                "run_id": run_id,
                "ledger_id": self.identity,
                "admission": admission,
                "state": state,
                "queued": queued,
                "running": running,
                "finished": finished,
                "succeeded": succeeded,
                "drained": state == "drained",
            }

    def admit(self, run_id, ledger_id, has_slot):
        with self.lock, self.db:
            if ledger_id != self.identity:
                return 409, "ledger_mismatch"
            row = self.db.execute("SELECT fenced FROM runs WHERE id = ?", (run_id,)).fetchone()
            if row is None:
                return 404, "unknown_run"
            if row[0]:
                return 409, "run_fenced"
            if not has_slot:
                return 503, "routing_at_capacity"
            self.db.execute("UPDATE runs SET queued = queued + 1 WHERE id = ?", (run_id,))
            return 200, None

    def lose(self, run_id):
        with self.lock, self.db:
            self.db.execute("""
                UPDATE runs SET fenced = 1, unknown_reason = COALESCE(unknown_reason, 'accounting_error')
                WHERE id = ?
            """, (run_id,))

    def start(self, run_id):
        with self.lock, self.db:
            self.db.execute(
                "UPDATE runs SET queued = queued - 1, running = running + 1 WHERE id = ?",
                (run_id,),
            )

    def finish(self, run_id, success):
        with self.lock, self.db:
            self.db.execute(
                "UPDATE runs SET running = running - 1, finished = finished + 1, "
                "succeeded = succeeded + ? WHERE id = ?",
                (int(success), run_id),
            )


class Valhalla:
    def __init__(self, ledger, config, concurrency, pending_limit):
        self.ledger = ledger
        self.config = config
        self.tasks = ThreadPoolExecutor(max_workers=concurrency)
        self.slots = BoundedSemaphore(pending_limit)
        self.child_env = {k: v for k, v in os.environ.items() if k not in TOKEN_NAMES.values()}

    def route(self, run_id, ledger_id, action, payload):
        has_slot = self.slots.acquire(blocking=False)
        try:
            status, error = self.ledger.admit(run_id, ledger_id, has_slot)
            if error:
                return status, {"error": error}
            try:
                return self.tasks.submit(self.execute, run_id, action, payload).result()
            except Exception:
                try:
                    self.ledger.lose(run_id)
                except sqlite3.Error:
                    os._exit(1)
                return 503, {"error": "completion_unconfirmed"}
        finally:
            if has_slot:
                self.slots.release()

    def execute(self, run_id, action, payload):
        self.ledger.start(run_id)
        with NamedTemporaryFile() as request:
            request.write(payload)
            request.flush()
            result = subprocess.run(
                ["valhalla_service", self.config, action, request.name],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                env=self.child_env,
            )
        self.ledger.finish(run_id, result.returncode == 0)
        try:
            data = json.loads(result.stdout)
            if not isinstance(data, dict):
                raise ValueError()
        except ValueError:
            return 502, {"error": "invalid_valhalla_response"}
        if result.returncode == 0:
            return 200, data
        code = data.get("status_code")
        return (code if type(code) is int and 400 <= code <= 599 else 502), data


class Handler(BaseHTTPRequestHandler):
    def identify(self):
        headers = self.headers.get_all("Authorization", [])
        value = headers[0].encode("iso-8859-1") if len(headers) == 1 else b""
        matches = [role for role, token in self.server.tokens.items() if compare_digest(value, token)]
        return matches[0] if matches else None

    def require(self, role, expected):
        if role == expected:
            return True
        self.reply(403 if role else 401, {"error": "forbidden" if role else "unauthorized"})
        return False

    def log_request(self, code="-", size="-"):
        pass

    def reply(self, status, data):
        payload = json.dumps(data, separators=(",", ":")).encode()
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            if status == 401:
                self.send_header("WWW-Authenticate", "Bearer")
            self.end_headers()
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass

    def dispatch(self):
        role = self.identify()
        if not role:
            return self.reply(401, {"error": "unauthorized"})
        match = RUN_PATH.fullmatch(self.path)
        if match is None:
            return self.reply(404, {"error": "unknown_endpoint"})
        run_id, action = match.groups()
        service = self.server.valhalla
        control = CONTROL.get((self.command, action))
        if control:
            expected, operation = control
            if self.require(role, expected):
                try:
                    return self.reply(*service.ledger.state(run_id, operation))
                except sqlite3.Error:
                    return self.reply(503, unknown(run_id, "ledger_unavailable"))
            return
        if ACTION_METHODS.get(action) != self.command:
            return self.reply(405, {"error": "unsupported_action_or_method"})
        if not self.require(role, "routing"):
            return

        payload = b"{}"
        if self.command == "POST":
            lengths = self.headers.get_all("Content-Length", [])
            length = lengths[0] if len(lengths) == 1 else ""
            if self.headers.get("Transfer-Encoding") is not None or not re.fullmatch(r"[0-9]{1,7}", length):
                return self.reply(400, {"error": "invalid_content_length"})
            size = int(length)
            if not 0 < size <= 1024 * 1024:
                return self.reply(413, {"error": "invalid_payload_size"})
            try:
                payload = self.rfile.read(size)
            except TimeoutError:
                return self.reply(408, {"error": "body_timeout"})
            try:
                if len(payload) != size or not isinstance(json.loads(payload), dict):
                    raise ValueError()
            except ValueError:
                return self.reply(400, {"error": "invalid_json"})

        ids = self.headers.get_all("X-Valhalla-Ledger", [])
        try:
            return self.reply(*service.route(run_id, ids[0] if len(ids) == 1 else None, action, payload))
        except sqlite3.Error:
            return self.reply(503, {"error": "ledger_unavailable"})

    do_GET = do_POST = do_PUT = dispatch


class Server(ThreadingHTTPServer):
    def __init__(self, bind, port, service, tokens, pending_limit):
        self.address_family = socket.AF_INET6 if ":" in bind else socket.AF_INET
        self.valhalla = service
        self.tokens = tokens
        self.connections = BoundedSemaphore(pending_limit + 32)
        super().__init__((bind, port), Handler)

    def get_request(self):
        connection, address = super().get_request()
        connection.settimeout(10)
        return connection, address

    def process_request(self, request, client_address):
        if not self.connections.acquire(blocking=False):
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self.connections.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.connections.release()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("config")
    parser.add_argument("ledger", type=Path)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8002)
    parser.add_argument("--concurrency", type=int, default=1)
    parser.add_argument("--pending-limit", type=int, default=16)
    options = parser.parse_args()
    try:
        tokens = load_tokens()
    except ValueError as error:
        parser.error(str(error))
    if not 1 <= options.concurrency <= options.pending_limit <= 128:
        parser.error("Require 1 <= concurrency <= pending limit <= 128.")
    ledger = Ledger(options.ledger.resolve())
    service = Valhalla(ledger, options.config, options.concurrency, options.pending_limit)
    with Server(options.bind, options.port, service, tokens, options.pending_limit) as server:
        server.serve_forever()


if __name__ == "__main__":
    main()
