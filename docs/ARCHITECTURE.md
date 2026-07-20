# REOS architecture

Monorepo: `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared` (types, enums, RBAC).

## Stack

- PostgreSQL + Prisma
- Redis + BullMQ for background jobs
- MinIO (S3-compatible) for media
- JWT auth, tenant scoping on every company-scoped query

## Modules

| Module | Responsibility |
|--------|----------------|
| auth / users | Login, JWT, RBAC |
| leads | Lead CRUD, scoring, dedup, assignment |
| call-center | Outbound queue, call results |
| properties | Listings, media, lifecycle |
| onboarding | Owner self-service intake |
| customers | Buyer/tenant CRM |
| matching | Property ↔ customer scoring |
| communication | Campaigns, templates, delivery |
| social | Scheduled posts, reposts |
| tasks | Kanban work items |
| pipeline | Deals and stages |
| rentals | Leases, payments, maintenance |
| automation | Cron jobs + event handlers |
| workers | Scoring, media processing, analytics rollup |
| analytics | Dashboard KPIs |
| finance | Commissions, invoices |

Not every module uses a full DDD folder layout; most logic lives in `*.service.ts` with Prisma.

## Multi-tenancy

- Tenant = `companyId` from JWT (`TenantInterceptor` + Prisma client extension).
- Super admin may override tenant via header (audited).

## Events and queues

Domain events are published in-process (`EventBus`) and consumed via `@OnEvent` handlers or BullMQ workers.

Queues: `scoring`, `dedup`, `matching`, `notifications`, `communication`, `social`, `ai`, `analytics-rollup`, `media-processing`.

### Cron (automation.scheduler)

| Schedule | Job |
|----------|-----|
| Hourly | Rent overdue, rent due reminders, lease expiring |
| Every 15 min | Callback reminders |
| Daily 02:00 | Analytics rollup enqueue |

### Notable events

| Event | Producers | Consumers |
|-------|-----------|-----------|
| `lead.created` | leads | dedup, scoring, auto-assign |
| `lead.status.changed` | leads | pipeline sync |
| `property.published` | properties | matching, social autopost |
| `property.created` | properties | matching (pre-publish) |
| `match.generated` | matching | notifications |
| `deal.closed` | pipeline | commission, social sold repost |
| `delivery.updated` | communication | audit log |

## Local development

```bash
npm run infra:up      # postgres, redis, minio
npm run dev           # api :4000, web :3000
npm run start:worker  # headless queue/cron process (after build)
```

## Production notes

- Run multiple API or worker processes against the same Redis for queue throughput.
- Set real integration keys (`INTEGRATIONS_MODE`, `AI_PROVIDER`) when moving off simulated adapters.
