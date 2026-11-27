import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path
import re
from signal import SIGTERM, signal
from socketserver import StreamRequestHandler, UnixStreamServer
import sqlite3
import subprocess
from sys import exit
from uuid import uuid4


RUN_ID = r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
CONTAINER_ID = r"[0-9a-f]{64}"
LABEL = "propertyscore.snapshot"


class Unconfirmed(Exception):
    pass


def docker(args, *command):
    try:
        return subprocess.run(
            ["docker", "--host", f"unix://{args.socket}", *command],
            check=True, capture_output=True, text=True, timeout=45,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        raise Unconfirmed("Docker did not confirm the operation") from None


def engine(args):
    operating_system, _, identity = docker(args, "info", "--format", "{{.OSType}} {{.ID}}").partition(" ")
    if operating_system != "linux" or not identity:
        raise Unconfirmed("A local Linux Docker engine is required")
    return identity


@contextmanager
def store(args, read_only=False):
    target = f"{Path(args.state).resolve().as_uri()}?mode=ro" if read_only else args.state
    db = sqlite3.connect(target, uri=read_only, timeout=5)
    db.row_factory = sqlite3.Row
    try:
        with db:
            if not read_only:
                db.execute("PRAGMA synchronous = FULL")
                db.execute("""
                    create table if not exists runs (
                        run_id text primary key, replica_id text not null unique,
                        engine text not null, container_id text unique,
                        retired integer not null default 0
                    )
                """)
            yield db
    finally:
        db.close()


def launch(args):
    image = docker(args, "image", "inspect", "--format", "{{.Id}}", "--", args.image)
    if not re.fullmatch(r"sha256:" + CONTAINER_ID, image):
        raise Unconfirmed("A single cached image is required")
    network = "none"
    if args.network != "none":
        internal, driver, network = docker(
            args, "network", "inspect", "--format", "{{.Internal}} {{.Driver}} {{.Id}}", "--", args.network,
        ).split()
        if internal != "true" or driver != "bridge" or not re.fullmatch(CONTAINER_ID, network):
            raise Unconfirmed("Only an internal Docker bridge or no network is supported")
    run, replica = str(uuid4()), str(uuid4())
    daemon = engine(args)
    with store(args) as db:
        db.execute("insert into runs (run_id, replica_id, engine) values (?, ?, ?)", (run, replica, daemon))
    print(json.dumps({"run_id": run, "replica_id": replica}), flush=True)
    options = []
    if args.env_file:
        options.extend(("--env-file", args.env_file))
    if args.artifacts:
        directory = Path(args.artifacts).resolve(strict=True)
        if not directory.is_dir() or any(char in str(directory) for char in ',\"\n'):
            raise Unconfirmed("An existing artifact directory without mount delimiters is required")
        if any(Path(path).resolve().is_relative_to(directory) for path in (args.socket, args.state)):
            raise Unconfirmed("The Docker socket and observer state must not be mounted in the runner")
        options.extend(("--mount", f"type=bind,source={directory},target=/snapshot-artifacts"))
    container = docker(
        args, "create", "--pull", "never", "--name", f"snapshot-{replica}",
        "--init", "--restart", "no", "--network", network,
        "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
        "--label", f"{LABEL}.run={run}", "--label", f"{LABEL}.replica={replica}",
        *options, "--env", f"SNAPSHOT_EXECUTION_ID={run}", "--env", f"SNAPSHOT_REPLICA_ID={replica}",
        image, *args.command,
    )
    if not re.fullmatch(CONTAINER_ID, container) or engine(args) != daemon:
        raise Unconfirmed("The container identity was not confirmed")
    with store(args) as db:
        db.execute("update runs set container_id = ? where run_id = ?", (container, run))
    docker(args, "start", container)


def lookup(db, run):
    return db.execute("select * from runs where run_id = ?", (run,)).fetchone()


def stopped_state(args, row):
    fmt = ' '.join([
        '{{.Id}}', '{{.HostConfig.PidMode}}', '{{.HostConfig.RestartPolicy.Name}}',
        '{{.HostConfig.AutoRemove}}', '{{.HostConfig.Init}}',
        '{{index .Config.Labels "' + LABEL + '.run"}}',
        '{{index .Config.Labels "' + LABEL + '.replica"}}',
        '{{.State.Status}}', '{{.State.Pid}}',
    ])
    result = docker(args, "container", "inspect", "--format", fmt, row["container_id"]).split(" ")
    if result[:7] != [
        row["container_id"], "", "no", "false", "true", row["run_id"], row["replica_id"],
    ] or len(result) != 9:
        raise Unconfirmed("Container identity or isolation policy differs")
    return result[7:] == ["exited", "0"]


def is_retired(args, row):
    if engine(args) != row["engine"]:
        raise Unconfirmed("Docker engine identity differs")
    present = docker(
        args, "container", "ls", "--all", "--no-trunc", "--filter", f"id={row['container_id']}",
        "--format", "{{.ID}}",
    )
    return not present and engine(args) == row["engine"]


def retire(args):
    with store(args) as db:
        db.execute("begin immediate")
        row = lookup(db, args.run)
        if not row or not row["container_id"] or engine(args) != row["engine"]:
            raise Unconfirmed("Run or Docker engine identity is unknown")
        if row["retired"]:
            if not is_retired(args, row):
                raise Unconfirmed("Previously retired container exists")
            return
        if not stopped_state(args, row):
            docker(args, "stop", "--timeout", "5", row["container_id"])
        if not stopped_state(args, row):
            raise Unconfirmed("PID namespace exit was not confirmed")
        if docker(args, "rm", "--volumes", row["container_id"]) != row["container_id"] or not is_retired(args, row):
            raise Unconfirmed("Container removal was not confirmed")
        db.execute("update runs set retired = 1 where run_id = ?", (args.run,))


def verify(args):
    class Verifier(StreamRequestHandler):
        timeout = 2

        def handle(self):
            line = self.rfile.readline(38)
            if not re.fullmatch((RUN_ID + "\n").encode(), line):
                return
            run = line[:-1].decode("ascii")
            status = 409
            data = {"state": "unknown"}
            try:
                with store(args, read_only=True) as db:
                    row = lookup(db, run)
                    if row and row["retired"] and row["container_id"] and is_retired(args, row):
                        status = 200
                        data = {
                            "run_id": run, "replica_id": row["replica_id"], "state": "stopped",
                            "children_stopped": True, "restart_excluded": True,
                        }
            except (Unconfirmed, sqlite3.Error):
                status = 503
            self.wfile.write(json.dumps([status, data]).encode() + b"\n")

    path = Path(args.proof_socket)
    with UnixStreamServer(str(path), Verifier) as server:
        try:
            path.chmod(0o660)
            signal(SIGTERM, lambda *_: exit(0))
            print(json.dumps({"listening": True}), flush=True)
            server.serve_forever()
        finally:
            path.unlink()


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", required=True)
    parser.add_argument("--socket", default="/var/run/docker.sock")
    commands = parser.add_subparsers(required=True)
    start = commands.add_parser("launch")
    start.add_argument("--network", default="none")
    start.add_argument("--env-file")
    start.add_argument("--artifacts")
    start.add_argument("image")
    start.add_argument("command", nargs=argparse.REMAINDER)
    start.set_defaults(action=launch)
    stop = commands.add_parser("retire")
    stop.add_argument("run")
    stop.set_defaults(action=retire)
    verifier = commands.add_parser("verify")
    verifier.add_argument("--proof-socket", required=True)
    verifier.set_defaults(action=verify)
    args = parser.parse_args()
    try:
        args.action(args)
    except (Unconfirmed, sqlite3.Error, ValueError, OSError) as error:
        parser.exit(1, f"Observer operation unconfirmed: {error}\n")


if __name__ == "__main__":
    main()
