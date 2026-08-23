# Production deployment

Deploy the full stack with Docker Compose: Postgres, Redis, MinIO, API, background worker, and Next.js web.

## Prerequisites

- Docker + Docker Compose v2
- A server with 2 GB+ RAM (4 GB recommended)
- Domain names for app and API (or single domain with reverse proxy)

## 1. Configure environment

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set at minimum:

| Variable | Notes |
| -------- | ----- |
| `POSTGRES_PASSWORD` | Strong database password |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 32+ chars (`openssl rand -base64 48`) |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | MinIO credentials |
| `API_CORS_ORIGINS` | Your web app URL, e.g. `https://app.example.com` |
| `NEXT_PUBLIC_API_URL` | Public API URL, e.g. `https://api.example.com/api/v1` |
| `NEXT_PUBLIC_WS_URL` | Public WebSocket URL, e.g. `https://api.example.com` |
| `S3_PUBLIC_URL` | Public media URL (MinIO or CDN) |

**First deploy:** set `RUN_SEED=true` once to load demo users, then set back to `false` and redeploy.

## 2. Build and start

```bash
npm run prod:build
npm run prod:up
```

Check status:

```bash
npm run prod:ps
curl http://localhost:4000/api/v1/health
curl -I http://localhost:3000/login
```

Logs:

```bash
npm run prod:logs
```

Stop:

```bash
npm run prod:down
```

## 3. Services

| Container | Role | Default port |
| --------- | ---- | ------------ |
| `reos-postgres` | Database | internal |
| `reos-redis` | Queues / cache | internal |
| `reos-minio` | Media storage | internal |
| `reos-api` | REST + WebSocket API | 4000 |
| `reos-worker` | BullMQ jobs + cron | — |
| `reos-web` | Next.js frontend | 3000 |

Migrations run automatically on API startup (`prisma migrate deploy`).

Swagger is **disabled** when `NODE_ENV=production`.

## 4. Reverse proxy (recommended)

Put **nginx** or **Caddy** in front:

- `app.example.com` → `web:3000`
- `api.example.com` → `api:4000` (include WebSocket upgrade headers)
- `media.example.com` → MinIO or S3

Example Caddy:

```caddy
app.example.com {
  reverse_proxy localhost:3000
}

api.example.com {
  reverse_proxy localhost:4000
}
```

Set `API_CORS_ORIGINS` and `NEXT_PUBLIC_*` to the public HTTPS URLs before building the web image.

## 5. Cloud alternatives

You can replace managed services instead of containerized Postgres/Redis/MinIO:

- **Database:** set `DATABASE_URL` to your hosted PostgreSQL
- **Redis:** set `REDIS_HOST` / password to ElastiCache, Upstash, etc.
- **Storage:** set `S3_*` to AWS S3 or Cloudflare R2 (`S3_FORCE_PATH_STYLE=false`)

Remove unused services from `docker-compose.prod.yml` if you use external providers.

## 6. Default login (after seed)

| Email | Password |
| ----- | -------- |
| owner@adriatic.me | Passw0rd! |

Change passwords immediately in production.

## 7. CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, tests, and Docker builds on push to `main`.

## 8. Updates

```bash
git pull
npm run prod:build
npm run prod:up
```

Database schema updates apply automatically via migrations on API restart.
