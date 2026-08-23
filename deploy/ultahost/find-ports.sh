#!/usr/bin/env bash
# Find free TCP ports on the host (does not touch other services).
set -euo pipefail

candidates_web=(3010 3011 3012 3020 3021 3030)
candidates_api=(4010 4011 4012 4020 4021 4030)
candidates_minio=(9010 9011 9012 9020)

port_free() {
  local p="$1"
  if command -v ss >/dev/null 2>&1; then
    ! ss -tln | awk '{print $4}' | grep -qE ":${p}$"
  else
    ! netstat -tln 2>/dev/null | awk '{print $4}' | grep -qE ":${p}$"
  fi
}

pick_free() {
  local -n arr=$1
  for p in "${arr[@]}"; do
    if port_free "$p"; then
      echo "$p"
      return 0
    fi
  done
  echo ""
  return 1
}

echo "=== Listening ports (sample) ==="
if command -v ss >/dev/null 2>&1; then
  ss -tln | head -40
else
  netstat -tln 2>/dev/null | head -40 || true
fi
echo ""

WEB=$(pick_free candidates_web) || { echo "No free WEB port found"; exit 1; }
API=$(pick_free candidates_api) || { echo "No free API port found"; exit 1; }
MINIO=$(pick_free candidates_minio) || { echo "No free MINIO port found"; exit 1; }

echo "=== Suggested REOS ports (localhost only) ==="
echo "WEB_HOST_PORT=$WEB   -> nginx -> pointstepup.com"
echo "API_HOST_PORT=$API   -> nginx -> api.pointstepup.com"
echo "MINIO_HOST_PORT=$MINIO -> nginx -> media.pointstepup.com"
echo ""
echo "Export for current shell:"
echo "export WEB_HOST_PORT=$WEB API_HOST_PORT=$API MINIO_HOST_PORT=$MINIO"
