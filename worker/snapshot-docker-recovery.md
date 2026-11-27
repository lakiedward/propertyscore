# Smart Check recovery on a controlled Docker host

This is an opt-in way to prove that a specific Linux Docker execution has stopped. It does not change the default worker command, schedules, deployment, or native Railway replica control. Checkpointed and resume runs still require a dedicated session connection to Postgres, shared persistent artifacts, private Valhalla with its run ledger, and the normal ADS reconciliation rules.

## Keep the roles separate

| Role                          | Access                                                                                                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operator (`launch`, `retire`) | Docker socket and private, persistent SQLite registry. Docker access is privileged. Do not expose these commands over HTTP.                                                                                                        |
| Verifier (`verify`)           | Privileged side of the boundary. Reads the registry and checks the same Docker engine and the exact removed container ID. Its Unix socket accepts only a single execution UUID and offers no launch, stop or write operation.      |
| HTTP observer                 | Unprivileged OS account, outside the Docker group, with access only to the verifier socket. No Docker socket, registry, database, Valhalla or ADS credentials. Only authenticated `GET /runs/<execution-id>` returns a stop proof. |
| Worker                        | Private HTTP observer endpoint and its token, plus only worker credentials. No Docker socket, SQLite registry or verifier socket.                                                                                                  |

On the Docker host, prepare a directory owned by the operator with an observer-only group and mode `2750`, for example `/run/smart-check-proof`; the reader must not be able to replace files there. Keep the registry outside that directory in an operator-only persistent directory. Keep both outside the worker's artifact mount. Use a controlled Docker daemon: no other privileged operator may independently start or clone that execution. Use a protected private HTTP endpoint (TLS or an equally protected transport); loopback is the observer default. Supply the same dedicated `SNAPSHOT_REPLICA_INSPECTOR_TOKEN` through protected environment configuration to the observer and worker, not the verifier.

```sh
python3 scripts/snapshot-runner.py --state "$REGISTRY" verify --proof-socket "$PROOF_SOCKET"
python3 scripts/snapshot-observer.py --proof-socket "$PROOF_SOCKET"
```

Run those commands in separate operating-system accounts with the roles above. The verifier creates a group-accessible socket. After an unclean verifier exit, check that the old process is gone before removing a stale socket; the reader fails closed while unavailable.

```sh
python3 scripts/snapshot-runner.py --state "$REGISTRY" launch \
  --network "$INTERNAL_NETWORK" --env-file "$WORKER_ENV" --artifacts "$ARTIFACTS" \
  "$CACHED_IMAGE" node src/main.ts build-snapshot --checkpointed --period YYYY-MM
python3 scripts/snapshot-runner.py --state "$REGISTRY" retire "$PREVIOUS_EXECUTION_ID"
python3 scripts/snapshot-runner.py --state "$REGISTRY" launch \
  --network "$INTERNAL_NETWORK" --env-file "$WORKER_ENV" --artifacts "$ARTIFACTS" \
  "$CACHED_IMAGE" node src/main.ts build-snapshot --resume "$SNAPSHOT_ID"
```

Use the exact execution ID recorded in the journal, not a container name, a snapshot ID, or elapsed time. The launcher injects the execution and replica IDs into the worker. The operator confirms the PID namespace exited, removes the exact container, and only then records retirement. An unknown run, lost verifier, unavailable engine, or unremoved container cannot authorize a takeover. Valhalla drain, ADS reconciliation and verified artifacts remain separate prerequisites. Use `inspect-snapshot-progress` with the dedicated database reader for journal status; it cannot operate Docker.

## Next isolated probe

Use an existing controlled Linux Docker host, an internal bridge, a cached worker image, disposable Postgres with migrations, a synthetic city with a scored reference station, private Valhalla on synthetic tiles, a persistent test artifact directory, and a local ADS simulator. Force stop during a real score subprocess, confirm the reader refuses proof before retirement, then measure to the replacement subprocess and local publication. An existing host needs no new service or cloud provisioning; this test does not estimate any hosted cost or prove a two-hour production bound. Do not use Railway, real ADS, live data or the historical snapshot for this probe.
