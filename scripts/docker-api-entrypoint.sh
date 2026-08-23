#!/bin/sh
set -e

if [ "${SKIP_MIGRATE:-false}" != "true" ]; then
  echo "[entrypoint] Applying migrations..."
  until npx prisma migrate deploy; do
    echo "[entrypoint] Database not ready, retrying in 3s..."
    sleep 3
  done

  if [ "${RUN_SEED:-false}" = "true" ]; then
    echo "[entrypoint] Seeding database..."
    npx prisma db seed
  fi
fi

process="${REOS_PROCESS:-main}"
echo "[entrypoint] Starting ${process}..."
exec node "dist/${process}.js"
