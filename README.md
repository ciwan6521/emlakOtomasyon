# REOS

Real estate operations platform for lead management, portfolio, rentals, communication, and reporting.

Monorepo: NestJS API, Next.js web app, shared TypeScript package.

## Stack

- PostgreSQL + Prisma
- Redis + BullMQ
- MinIO (S3-compatible storage)
- JWT auth with multi-tenant RBAC

## Project layout

```
reos/
├── apps/api/          NestJS backend
├── apps/web/          Next.js frontend
├── packages/shared/   Shared types, enums, RBAC
├── docs/              Internal architecture notes
└── docker-compose.yml
```

## Local setup

```bash
cp .env.example .env
npm install
npm run infra:up
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

- API: http://localhost:4000/api/v1 (Swagger at `/api/v1/docs`)
- Web: http://localhost:3000

### Dev accounts

| Role           | Email                  | Password  |
| -------------- | ---------------------- | --------- |
| Company Owner  | owner@adriatic.me      | Passw0rd! |
| Branch Manager | manager@adriatic.me    | Passw0rd! |
| Sales Agent    | agent@adriatic.me      | Passw0rd! |
| Call Center    | callcenter@adriatic.me | Passw0rd! |

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for production deployment with Docker.

## Scripts

| Command | Description |
| -------------------- | ------------------------------ |
| `npm run dev` | Start API and web in dev mode |
| `npm run build` | Build all workspaces |
| `npm run typecheck` | TypeScript check |
| `npm run infra:up` | Start Postgres, Redis, MinIO (dev) |
| `npm run infra:down` | Stop dev Docker services |
| `npm run prod:build` | Build production Docker images |
| `npm run prod:up` | Start production stack |
| `npm run prod:down` | Stop production stack |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for module overview and event flow.
