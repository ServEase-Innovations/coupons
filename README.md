# Coupons API

Node.js + Express service for managing coupons and coupon redemption tracking, with PostgreSQL (Prisma), Swagger docs, Prometheus metrics, and Grafana/Loki monitoring.

## Observability quick reference

| What | Where |
|------|--------|
| **Metrics** | `GET /metrics` (Prometheus text); scrape job name **`coupons-api`** (see `monitoring/prometheus/prometheus.yml`) |
| **Logs (file)** | `logs/app.log` (JSON lines via `src/utils/logger.js`) |
| **Logs (Grafana)** | Explore → **Loki** → `{job="coupons-app"}` |
| **Stack (Docker)** | `npm run monitoring:up` or `npm run monitoring:up:auto` |
| **URLs** | Prometheus `http://localhost:9090`, Grafana `http://localhost:3101` (admin/admin) |

Grafana provisioning wires **Prometheus** (UID `prometheus`) and **Loki**; dashboard **Coupons API Monitoring** is auto-loaded.

## What this app does

- Manages coupon lifecycle (create, list, update, deactivate)
- Validates coupon eligibility during checkout
- Tracks coupon usage per customer via reservation flow:
  - `validate` -> `reserve` -> `confirm` or `release`
- Exposes metrics for Prometheus at `/metrics`
- Writes app logs to `logs/app.log` (JSON format)
- Streams logs to Loki (via Promtail) for Grafana Explore

## Tech stack

- Runtime: Node.js (ESM), Express
- Database: PostgreSQL
- ORM: Prisma (with `@prisma/adapter-pg`)
- API docs: Swagger (`/api-docs`)
- Monitoring:
  - Prometheus (metrics scrape)
  - Grafana (dashboards)
  - Loki + Promtail (logs)

## Project structure (key files)

- `src/server.js` - app bootstrap, routes, `/metrics`
- `src/routes/coupon.routes.js` - coupon + redemption routes
- `src/controllers/coupon.controller.js` - response handling
- `src/services/coupon.service.js` - business logic
- `src/middleware/errorHandler.js` - UI-friendly error payload
- `src/monitoring/prometheus.js` - metric definitions
- `src/middleware/requestMetrics.js` - HTTP metric middleware
- `src/utils/logger.js` - JSON file logger (`logs/app.log`)
- `prisma/schema.prisma` - Prisma schema
- `prisma/migrations/...` - SQL migrations
- `docker-compose.monitoring.yml` - Prometheus/Grafana/Loki/Promtail stack

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL accessible via `DATABASE_URL`
- Docker Desktop (for monitoring stack)

## Environment setup

Create/update `.env` with:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<db>"
PORT=3000
```

## Install and run app

```bash
npm install
npm run prisma:generate
npm run dev
```

App endpoints:

- API root: `http://localhost:3000/`
- Swagger docs: `http://localhost:3000/api-docs`
- OpenAPI JSON (dynamic server URL): `http://localhost:3000/api-docs.json`
- Metrics endpoint: `http://localhost:3000/metrics`

### Swagger “servers” URL on AWS EC2 / behind nginx or ALB

Swagger’s base URL is chosen **per request**:

1. If you set **`SWAGGER_SERVER_URL`** or **`APP_URL`** / **`BASE_URL`** / **`PUBLIC_URL`**, that value is used (best if you use a fixed domain).
2. Otherwise it uses **`Host`** plus **`X-Forwarded-Proto`** (or **`X-Forwarded-Host`**) so it matches how the client opened the docs (works on EC2 behind a load balancer or reverse proxy).

Ensure your proxy forwards headers, for example:

- `X-Forwarded-Proto` (https when TLS terminates at ALB/nginx)
- `Host` or `X-Forwarded-Host`

## Coupon APIs

Base path: `/api/coupons`

- `POST /create` - create coupon (optional `booking_condition`, `nth_booking`)
- `GET /all` - list active coupons
- `GET /id/:coupon_id` - get one coupon by UUID
- `GET /customer/:customer_id` - coupons applicable to this customer (by engagement/booking count + date window)
- `PUT /update/:coupon_id` - update coupon by ID
- `DELETE /delete/:coupon_code` - deactivate coupon

### Booking-based coupons (admin)

When creating/updating a coupon:

- `booking_condition`: `ANY` (default) | `FIRST_BOOKING` | `NTH_BOOKING`
- `nth_booking`: required if `NTH_BOOKING` — e.g. `5` means the customer’s **5th** booking (they must already have **4** rows in `engagements`).

`validate` / `reserve` enforce the same rules using `engagements` count for `customer_id`.

Apply DB migration from the monorepo (includes `096_coupon_booking_conditions.sql`):

```bash
npm run db:migrate
```

## Redemption APIs (customer checkout flow)

- `POST /validate` - preview eligibility/discount (no reservation)
- `POST /reserve` - create temporary reservation before payment
- `POST /confirm` - mark reservation as applied after payment success
- `POST /release` - release reservation on failure/cancel/timeout

## Epoch-first contract

Coupons service now supports epoch mirrors in responses and epoch/alias compatibility in request payloads.

- Coupon response mirrors:
  - `start_date_epoch`, `end_date_epoch`, `created_at_epoch`, `updated_at_epoch`
- Redemption response mirrors:
  - `reserved_at_epoch`, `applied_at_epoch`, `released_at_epoch`, `expires_at_epoch`

Request compatibility aliases:

- Coupon create/update accepts:
  - legacy: `start_date`, `end_date`, `created_at`
  - epoch aliases: `start_date_epoch`, `end_date_epoch`, `created_at_epoch`
- Validate/reserve actions accept camelCase and snake_case:
  - `couponCode`/`coupon_code`
  - `customerId`/`customer_id`
  - `orderValue`/`order_value`
  - `serviceType`/`service_type`
  - `engagementId`/`engagement_id`
- Confirm/release accepts:
  - `redemptionId`/`redemption_id`

### Recommended flow

1. Customer enters coupon -> call `validate`
2. Customer clicks pay -> call `reserve`
3. Payment success -> call `confirm`
4. Payment failed/cancelled -> call `release`

## Response format

### Success

```json
{
  "success": true,
  "message": "Human readable message for UI",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "code": "MACHINE_READABLE_CODE",
  "message": "UI friendly message",
  "debugMessage": "Technical error detail",
  "requestId": "trace-id",
  "errors": null
}
```

## Monitoring setup (Prometheus + Grafana + Loki)

### Start monitoring stack (auto-start Docker on macOS)

```bash
npm run monitoring:up:auto
```

Other commands:

```bash
npm run monitoring:up
npm run monitoring:down
```

Monitoring URLs:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3101` (admin/admin)

## Metrics you can monitor

- `http_requests_total`
- `http_request_duration_ms` (histogram for latency/p95)
- `api_errors_total`
- `coupon_actions_total`

Dashboard is auto-provisioned in Grafana:

- **Coupons API Monitoring**

## How to see logs

### 1) Local file logs

App writes JSON logs to:

- `logs/app.log`

Quick view:

```bash
tail -f logs/app.log
```

### 2) Grafana Loki logs

1. Start app (`npm run dev`)
2. Start monitoring stack (`npm run monitoring:up:auto`)
3. Open Grafana -> **Explore**
4. Select datasource: **Loki**
5. Run query:

```logql
{job="coupons-app"}
```

## Troubleshooting

- Docker error: `Cannot connect to the Docker daemon`
  - Start Docker Desktop, wait until running, then retry `npm run monitoring:up:auto`
- Grafana shows no logs
  - Ensure app is running (`npm run dev`)
  - Ensure `logs/app.log` is receiving entries
  - Ensure `promtail` and `loki` containers are up
- Metrics empty
  - Hit API endpoints first; counters increase with traffic
- API returns `DATABASE_SCHEMA_OUT_OF_SYNC` / Prisma `P2022` (“column does not exist”)
  - Your deployed database is behind the Prisma schema. Set `DATABASE_URL` to the **same** DB the app uses, then run:

```bash
npm run db:apply-coupon-patches
```

  - Or only add missing booking columns on `coupons`:

```bash
npm run db:fix-coupon-columns
```

  - The JSON error may include **`prismaMeta`** — check it for the exact column Prisma expected.

## Notes

- Existing DB is used in safe mode (no destructive reset)
- **Coupons** (`coupons` table) and **redemptions** (`coupon_redemptions`) are managed with **Sequelize** models (`src/models/coupon.model.js`, `src/models/coupon_redemption.model.js`). They are **not** in `prisma/schema.prisma` so Prisma stays aligned with the rest of the DB introspection without duplicate/outdated coupon models.
- **First / Nth booking** rules require `booking_condition` and `nth_booking` on the `coupons` table (migration `096` via `npm run db:migrate`). The Sequelize `Coupon` model includes these fields.
- Customer booking counts for coupon rules still use Prisma **`engagements`** count only.
- Prisma client generation:

```bash
npm run prisma:generate
```
