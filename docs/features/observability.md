# Observability, Error Classification & Rate Limiting

**Epic:** Phase 6 (Hardening). **Tickets:** T-501, T-502, T-503.

Provides correlation IDs, structured request logging, in-memory request metrics, an expanded health check, standardized error codes, and API rate limiting. All implemented without external dependencies.

---

## Correlation IDs

Every HTTP request receives a unique `x-request-id` header (generated as `ct_<uuid>`). If the caller passes `x-request-id` or `x-correlation-id`, the middleware forwards it as-is.

**Middleware:** `apps/api/src/common/middleware/correlation-id.middleware.ts`

---

## Request Logging

Every HTTP request is logged with:
- Method, URL path
- HTTP status code
- Duration (ms)
- Correlation ID (x-request-id)

**Interceptor:** `apps/api/src/common/interceptors/logging.interceptor.ts`

---

## Metrics

In-memory, per-endpoint counters exposed via `GET /api/v1/metrics`. No external monitoring library.

### Collected per endpoint (`method:path`)
- `count` — total number of requests
- `avgMs` — average response time in ms
- `maxMs` — maximum response time in ms
- `errorCount` — number of 5xx responses

### Global snapshot
- `uptimeSeconds` — seconds since service creation
- `totalRequests` — sum across all endpoints
- `totalErrors` — sum of 5xx across all endpoints

**Service:** `apps/api/src/modules/metrics/metrics.service.ts`
**Controller:** `apps/api/src/modules/metrics/metrics.controller.ts`
**Interceptor:** `apps/api/src/common/interceptors/metrics.interceptor.ts`

---

## Health Check

`GET /api/v1/health` returns:

```json
{
  "status": "ok" | "degraded",
  "timestamp": "ISO-8601",
  "version": "0.1.0",
  "checks": {
    "database": { "status": "connected", "error": null, "pingMs": 2 },
    "metrics": { "uptimeSeconds": 123, "totalRequests": 42, "totalErrors": 0 }
  }
}
```

**Service:** `apps/api/src/modules/health/health.service.ts`

---

---

## Error Classification (T-502)

Every error response includes a machine-readable `errorCode` field alongside the HTTP status code and human-readable `message`.

### Domain exception

All services throw `DomainException` (extends `HttpException`) with a typed `ErrorCode`:

```ts
throw new DomainException(ErrorCode.PROJECT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Project not found.');
```

### Error codes

The `ErrorCode` enum in `@constructtrack/types` defines 40+ codes grouped by domain:

| Domain | Codes |
|---|---|
| **Auth** | `AUTH_INVALID_CREDENTIALS`, `AUTH_DISABLED_ACCOUNT`, `AUTH_NO_MEMBERSHIP`, `AUTH_INVALID_REFRESH_TOKEN`, `AUTH_REFRESH_TOKEN_REVOKED`, `AUTH_DUPLICATE_EMAIL`, `AUTH_WEAK_PASSWORD`, `AUTH_USER_NOT_FOUND` |
| **Projects** | `PROJECT_NOT_FOUND`, `PROJECT_DUPLICATE_CODE`, `PROJECT_INVALID_STATUS_TRANSITION`, `PROJECT_LAST_MANAGER`, `PROJECT_MEMBER_NOT_FOUND`, `PROJECT_DUPLICATE_MEMBER` |
| **Tasks** | `TASK_NOT_FOUND`, `TASK_INVALID_STATUS_TRANSITION`, `TASK_PROJECT_ON_HOLD`, `TASK_PREDECESSOR_INCOMPLETE`, `TASK_SELF_DEPENDENCY`, `TASK_DUPLICATE_DEPENDENCY`, `TASK_CYCLE_DETECTED`, `TASK_DEPENDENCY_NOT_FOUND`, `TASK_ASSIGNEE_NOT_MEMBER`, `TASK_CREW_LIMITED` |
| **Equipment** | `EQUIPMENT_NOT_FOUND`, `EQUIPMENT_DUPLICATE_SERIAL`, `EQUIPMENT_ASSIGNMENT_CONFLICT`, `EQUIPMENT_WRONG_STATUS`, `EQUIPMENT_ASSIGNMENT_NOT_FOUND`, `MAINTENANCE_RECORD_NOT_FOUND` |
| **Inventory** | `MATERIAL_NOT_FOUND`, `MATERIAL_DUPLICATE_SKU`, `STOCK_LEVEL_NOT_FOUND`, `INSUFFICIENT_STOCK`, `DELIVERY_NOT_FOUND` |
| **Notifications** | `NOTIFICATION_NOT_FOUND` |
| **Reports** | `REPORT_TEMPLATE_NOT_FOUND`, `REPORT_RUN_NOT_FOUND` |
| **AI** | `AI_JOB_NOT_FOUND` |
| **Common** | `FORBIDDEN`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `RATE_LIMITED`, `BAD_REQUEST` |

**Service:** `apps/api/src/common/exceptions/domain.exception.ts`
**Enum:** `packages/types/src/index.ts` → `ErrorCode`

---

---

## API Rate Limiting (T-503)

Every request is rate-limited by a global `RateLimitGuard` (registered after `JwtAuthGuard` and `RolesGuard`). The guard uses an in-memory sliding-window counter keyed by:

- **Authenticated users** → `user:<userId>` (default: 100 requests per 60s)
- **Anonymous users** → `ip:<clientIp>` (default: 20 requests per 60s)

### Configuration

Set via environment variables (defaults shown):

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_AUTH_LIMIT` | `100` | Max requests per window for authenticated users |
| `RATE_LIMIT_AUTH_TTL` | `60000` | Window duration in ms for authenticated users |
| `RATE_LIMIT_PUBLIC_LIMIT` | `20` | Max requests per window for anonymous users |
| `RATE_LIMIT_PUBLIC_TTL` | `60000` | Window duration in ms for anonymous users |

### Per-route overrides

Use the `@RateLimit({ limit, ttl })` decorator on controllers or individual handlers:

```ts
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

@Controller('api/v1/slow-endpoint')
@RateLimit({ limit: 5, ttl: 60000 })   // class-level: applies to all routes
export class SlowController {}
```

### Response

When the limit is exceeded, the API returns `429 Too Many Requests`:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later."
  }
}
```

### Implementation

- **Service:** `apps/api/src/common/rate-limiter/rate-limiter.service.ts`
- **Guard:** `apps/api/src/common/rate-limiter/rate-limit.guard.ts`
- **Decorator:** `apps/api/src/common/decorators/rate-limit.decorator.ts`
- **Module:** `apps/api/src/common/rate-limiter/rate-limit.module.ts`

---

## Future Work

- Expose metrics in Prometheus format (`/api/v1/metrics/prometheus`) for scraping
- Export to OpenTelemetry exporter for distributed tracing
- Add application performance monitoring (slow query tracking, memory usage)
- Add distributed rate limiting via Redis (shared state across API instances)
