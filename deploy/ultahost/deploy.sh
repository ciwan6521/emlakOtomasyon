#!/usr/bin/env bash
# Run on UltaHost server from project root after git clone.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "== REOS deploy helper (pointstepup.com) =="

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install Docker first."
  exit 1
fi

bash deploy/ultahost/find-ports.sh | tee /tmp/reos-ports.txt

read -r -p "WEB_HOST_PORT [3010]: " WEB_HOST_PORT
WEB_HOST_PORT=${WEB_HOST_PORT:-3010}
read -r -p "API_HOST_PORT [4010]: " API_HOST_PORT
API_HOST_PORT=${API_HOST_PORT:-4010}
read -r -p "MINIO_HOST_PORT [9010]: " MINIO_HOST_PORT
MINIO_HOST_PORT=${MINIO_HOST_PORT:-9010}

for p in "$WEB_HOST_PORT" "$API_HOST_PORT" "$MINIO_HOST_PORT"; do
  if ss -tln 2>/dev/null | grep -qE ":${p}$"; then
    echo "Port $p is already in use. Pick another port."
    exit 1
  fi
done

if [ ! -f .env.production ]; then
  cp deploy/ultahost/pointstepup.env .env.production
  echo "Created .env.production from template — edit secrets before continuing."
  echo "  nano .env.production"
  exit 0
fi

grep -q "^WEB_HOST_PORT=" .env.production && sed -i "s/^WEB_HOST_PORT=.*/WEB_HOST_PORT=${WEB_HOST_PORT}/" .env.production || echo "WEB_HOST_PORT=${WEB_HOST_PORT}" >> .env.production
grep -q "^API_HOST_PORT=" .env.production && sed -i "s/^API_HOST_PORT=.*/API_HOST_PORT=${API_HOST_PORT}/" .env.production || echo "API_HOST_PORT=${API_HOST_PORT}" >> .env.production
grep -q "^MINIO_HOST_PORT=" .env.production && sed -i "s/^MINIO_HOST_PORT=.*/MINIO_HOST_PORT=${MINIO_HOST_PORT}/" .env.production || echo "MINIO_HOST_PORT=${MINIO_HOST_PORT}" >> .env.production

export WEB_HOST_PORT API_HOST_PORT MINIO_HOST_PORT

echo "Building images (may take several minutes)..."
docker compose --env-file .env.production -f docker-compose.prod.yml build

echo "Starting stack..."
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

sleep 5
echo "Health check:"
curl -sf "http://127.0.0.1:${API_HOST_PORT}/api/v1/health" && echo " API OK" || echo " API not ready yet"
curl -sf -o /dev/null -w "Web HTTP %{http_code}\n" "http://127.0.0.1:${WEB_HOST_PORT}/login" || true

echo ""
echo "Next: configure nginx with deploy/ultahost/nginx-pointstepup.conf"
echo "  Replace __WEB_PORT__=${WEB_HOST_PORT}, __API_PORT__=${API_HOST_PORT}, __MINIO_PORT__=${MINIO_HOST_PORT}"
echo "  Then: sudo certbot --nginx -d pointstepup.com -d www.pointstepup.com -d api.pointstepup.com -d media.pointstepup.com"
