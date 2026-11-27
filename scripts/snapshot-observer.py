import argparse
from hmac import compare_digest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import re
import socket


RUN_ID = r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
UNKNOWN = {"state": "unknown"}


def read_proof(path, run):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as connection:
        connection.settimeout(5)
        connection.connect(path)
        connection.sendall(run.encode("ascii") + b"\n")
        with connection.makefile("rb") as stream:
            line = stream.readline(512)
    if not line.endswith(b"\n"):
        return 503, UNKNOWN
    status, proof = json.loads(line)
    if status == 409:
        return 409, UNKNOWN
    if status != 200 or not isinstance(proof, dict):
        return 503, UNKNOWN
    replica = proof.get("replica_id")
    if (
        not isinstance(replica, str) or not re.fullmatch(RUN_ID, replica)
        or proof.get("run_id") != run or proof.get("state") != "stopped"
        or proof.get("children_stopped") is not True or proof.get("restart_excluded") is not True
    ):
        return 503, UNKNOWN
    return 200, {
        "run_id": run, "replica_id": replica, "state": "stopped",
        "children_stopped": True, "restart_excluded": True,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--proof-socket", required=True)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8793)
    args = parser.parse_args()
    token = os.environ.get("SNAPSHOT_REPLICA_INSPECTOR_TOKEN", "")
    if len(token) < 32 or not token.isascii():
        parser.error("Set SNAPSHOT_REPLICA_INSPECTOR_TOKEN to at least 32 ASCII characters")
    expected = f"Bearer {token}".encode()

    class Observer(BaseHTTPRequestHandler):
        timeout = 8

        def log_message(self, *_):
            pass

        def respond(self, status, data):
            body = json.dumps(data).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if not compare_digest(self.headers.get("Authorization", "").encode("latin-1"), expected):
                return self.respond(401, UNKNOWN)
            match = re.fullmatch(f"/runs/({RUN_ID})", self.path)
            if not match:
                return self.respond(404, UNKNOWN)
            try:
                status, proof = read_proof(args.proof_socket, match[1])
            except (OSError, TypeError, ValueError):
                status, proof = 503, UNKNOWN
            return self.respond(status, proof)

    with ThreadingHTTPServer((args.bind, args.port), Observer) as server:
        print(json.dumps({"port": server.server_port}), flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
