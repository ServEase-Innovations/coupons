# Coupons API

Node.js + Express service for managing coupons and coupon redemption tracking, with PostgreSQL (Prisma), Swagger docs, Prometheus metrics, and Grafana/Loki monitoring.

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
- Metrics endpoint: `http://localhost:3000/metrics`

## Coupon APIs

Base path: `/api/coupons`

- `POST /create` - create coupon
- `GET /all` - list active coupons
- `PUT /update/:coupon_id` - update coupon by ID
- `DELETE /delete/:coupon_code` - deactivate coupon

## Redemption APIs (customer checkout flow)

- `POST /validate` - preview eligibility/discount (no reservation)
- `POST /reserve` - create temporary reservation before payment
- `POST /confirm` - mark reservation as applied after payment success
- `POST /release` - release reservation on failure/cancel/timeout

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
- Grafana: `http://localhost:3001` (admin/admin)

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

## Notes

- Existing DB is used in safe mode (no destructive reset)
- Coupon redemptions are tracked per customer in `coupon_redemptions`
- Prisma client generation:

```bash
npm run prisma:generate
```
