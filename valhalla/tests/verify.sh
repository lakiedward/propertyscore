#!/usr/bin/env bash
set -euo pipefail

here="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"
data="$(mktemp -d)"
trap 'rm -rf "$data"' EXIT
image='ghcr.io/valhalla/valhalla-scripted@sha256:6238809f9dc3057743d70a20efd3911ec38e458bfa13a0601909b58f68dfd956'
mode="${1:-prove}"
case "$mode" in
  operator)
    if [[ $# != 4 ]]; then
      printf 'Usage: bash %s operator local.osm.pbf origin_lat,lon destination_lat,lon\n' "$0" >&2
      exit 2
    fi
    cp "$2" "$data/fixture.osm.pbf"
    operator_image="$(docker build --quiet --pull=false --network none "$(dirname "$here")")"
    export VALHALLA_CONTROL_TOKEN="$(openssl rand -hex 32)"
    export VALHALLA_ROUTING_TOKEN="$(openssl rand -hex 32)"
    export VALHALLA_STATUS_TOKEN="$(openssl rand -hex 32)"
    auth=(--env VALHALLA_CONTROL_TOKEN --env VALHALLA_ROUTING_TOKEN --env VALHALLA_STATUS_TOKEN)
    if docker run --rm --network none --env RAILWAY_VOLUME_MOUNT_PATH=/custom_files "${auth[@]}" \
      "$operator_image" > "$data/missing-volume.log" 2>&1; then
      exit 1
    fi
    grep -qF 'Mount a persistent volume' "$data/missing-volume.log"
    volume="$(docker volume create)"
    container=""
    cleanup_operator() {
      if [[ -n "$container" ]]; then docker rm -f "$container" >/dev/null 2>&1 || true; fi
      docker volume rm "$volume" >/dev/null
      rm -rf "$data"
    }
    trap cleanup_operator EXIT
    docker run --rm --network none --volume "$volume:/custom_files" --volume "$data:/fixture:ro" \
      --entrypoint cp "$operator_image" /fixture/fixture.osm.pbf /custom_files/fixture.osm.pbf
    options=(--rm --init --network none --volume "$volume:/custom_files"
      --env RAILWAY_VOLUME_MOUNT_PATH=/custom_files "${auth[@]}" --env server_threads=1
      --env build_admins=False --env build_time_zones=False --env use_default_speeds_config=False
      --env build_tar=False)
    container="$(docker run -d "${options[@]}" "$operator_image")"
    docker exec -i "$container" python3 - operator 8002 "$3" "$4" < "$here/proof.py" \
      | tee "$data/operator.ndjson" || { docker logs "$container" >&2; exit 1; }
    ledger_id="$(python3 -c 'import json, sys; print(json.load(sys.stdin)["state"]["ledger_id"])' < "$data/operator.ndjson")"
    docker rm -f "$container" >/dev/null
    container="$(docker run -d "${options[@]}" "$operator_image")"
    docker exec -i "$container" python3 - operator-restart 8002 "$ledger_id" < "$here/proof.py" \
      || { docker logs "$container" >&2; exit 1; }
    exit
    ;;
  prove | serve) ;;
  *)
    printf 'Usage: bash %s [prove | serve [local.osm.pbf] | operator local.osm.pbf origin_lat,lon destination_lat,lon]\n' "$0" >&2
    exit 2
    ;;
esac

if [[ "$mode" == serve && -n "${2:-}" ]]; then
  cp "$2" "$data/fixture.osm.pbf"
else
  cat > "$data/fixture.osm" <<'OSM'
<osm version="0.6" generator="propertyscore-valhalla-local">
  <node id="1" version="1" lat="45.750" lon="21.220"/>
  <node id="2" version="1" lat="45.751" lon="21.221"/>
  <node id="3" version="1" lat="45.752" lon="21.222"/>
  <way id="10" version="1">
    <nd ref="1"/>
    <nd ref="2"/>
    <nd ref="3"/>
    <tag k="highway" v="residential"/>
    <tag k="name" v="Fixture Road"/>
  </way>
</osm>
OSM

  if command -v osmium >/dev/null; then
    osmium cat "$data/fixture.osm" -o "$data/fixture.osm.pbf"
  else
    python3 - "$data/fixture.osm" "$data/fixture.osm.pbf" <<'PY'
import sys
import osmium

with osmium.SimpleWriter(sys.argv[2]) as writer:
    for item in osmium.FileProcessor(sys.argv[1]):
        writer.add(item)
PY
  fi
fi

runtime=(--rm --init --user "$(id -u):$(id -g)" -v "$(dirname "$here"):/proof:ro" -v "$data:/work" --entrypoint python3)
if [[ "$mode" == serve ]]; then
  docker run "${runtime[@]}" --network host \
    -e VALHALLA_CONTROL_TOKEN -e VALHALLA_ROUTING_TOKEN -e VALHALLA_STATUS_TOKEN \
    "$image" /proof/tests/proof.py serve /work "${VALHALLA_LOCAL_PORT:-18002}"
else
  cc -Wall -Wextra -Werror -shared -fPIC "$here/pause-tile.c" -o "$data/pause-tile.so" -ldl
  docker run "${runtime[@]}" --network none "$image" /proof/tests/proof.py prove /work /work/pause-tile.so
fi
