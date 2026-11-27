#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${VALHALLA_CONTROL_TOKEN:?Configure the control token}"
: "${VALHALLA_ROUTING_TOKEN:?Configure the routing token}"
: "${VALHALLA_STATUS_TOKEN:?Configure the read-only status token}"

if [[ "${RAILWAY_VOLUME_MOUNT_PATH:-}" != /custom_files ]] || ! mountpoint -q /custom_files; then
  printf '%s\n' 'Mount a persistent volume at /custom_files.' >&2
  exit 1
fi
if [[ -n "${path_extension:-}" ]]; then
  printf '%s\n' 'Leave path_extension empty for this service.' >&2
  exit 1
fi

env -u VALHALLA_CONTROL_TOKEN -u VALHALLA_ROUTING_TOKEN -u VALHALLA_STATUS_TOKEN \
  serve_tiles=False /valhalla/scripts/docker-entrypoint.sh build_tiles

state_dir=/custom_files/.propertyscore-state
install -d -m 0700 "$state_dir"
exec python3 /opt/propertyscore-valhalla/server.py /custom_files/valhalla.json "$state_dir/runs.sqlite" \
  --bind :: --port "${PORT:-8002}" --concurrency "${VALHALLA_ROUTING_CONCURRENCY:-2}" \
  --pending-limit "${VALHALLA_PENDING_LIMIT:-16}"
