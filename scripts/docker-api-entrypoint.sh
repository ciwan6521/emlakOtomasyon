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
    set +e
    npx prisma db seed
    seed_exit=$?
    set -e
    if [ "$seed_exit" -ne 0 ]; then
      echo "[entrypoint] WARN: seed failed (exit $seed_exit); starting API anyway"
    fi
  fi
fi

process="${REOS_PROCESS:-main}"
echo "[entrypoint] Starting ${process}..."
exec node "dist/${process}.js"
