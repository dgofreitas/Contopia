# Monitoring

**Contopia** — Observability setup: health checks, logs, metrics, and alerts.

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   nginx      │────▶│   frontend   │     │   backend    │
│   :8088      │     │   :80        │     │   :8000      │
│   /health ◀──│     │   /          │     │   /health ◀──│
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                         │
       │                                         │
       ▼                                         ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  MongoDB │  │  Redis   │  │  MinIO   │  │  Metrics │
│  :27017  │  │  :6379   │  │  :9000   │  │ Collector│
│  ping    │  │  PING    │  │  /health │  │ (future) │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## Health Checks

### nginx — `/health` endpoint

The nginx reverse proxy exposes a composite health check at `GET /health`:

```bash
# External check
curl -f http://localhost:8088/health

# Returns 200 if nginx + backend are reachable
# Returns 502 if backend is down
```

Rate-limited to 10 req/min per IP (lightweight polling). Health responses are not logged (reduces noise).

### Backend — `/health` endpoint (Liveness)

The Express backend exposes `GET /health` as a lightweight liveness probe. It returns:

```json
{
  "status": "ok",
  "timestamp": "2026-05-15T10:30:00Z"
}
```

Always returns `200` as long as the Node.js process is running.

### Backend — `/api/v1/ready` endpoint (Readiness)

The readiness probe at `GET /api/v1/ready` checks connectivity to all dependencies:

```json
{
  "status": "ok",
  "timestamp": "2026-05-15T10:30:00Z",
  "checks": {
    "mongodb": { "status": "ok", "latencyMs": 3 },
    "redis": { "status": "ok", "latencyMs": 1 },
    "minio": { "status": "ok", "latencyMs": 5 }
  }
}
```

Returns `503` if any dependency (MongoDB, Redis, or MinIO) is unreachable.

### Docker Health Checks

All services have built-in Docker health checks. View status:

```bash
# Quick overview
docker compose ps

# Detailed health status (JSON)
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps --format json | jq '.[] | {Name:.Name, Health:.Health}'

# Per-service health
docker compose exec backend wget --spider http://localhost:8000/health
docker compose exec redis redis-cli ping
docker compose exec mongodb mongosh --quiet --eval 'db.runCommand("ping")'
```

### Health Check Intervals

| Service | Base Interval | Prod Interval | Timeout | Retries |
|---------|--------------|---------------|---------|---------|
| nginx | 30s | 15s | 3s | 3 |
| frontend | 30s | 15s | 3s | 3 |
| backend | 30s | 15s | 3s | 3 |
| mongodb | 10s | 10s | 5s | 5 |
| redis | 10s | 10s | 3s | 5 |
| minio | 10s | 10s | 5s | 5 |

---

## Logging

### Access Logs

All services use `json-file` driver with rotation:

| Environment | Max Size | Max Files | Compression |
|-------------|----------|-----------|-------------|
| Base (dev) | 10 MB | 3 | No |
| Staging | 20 MB | 5 | No |
| Production | 10 MB | 3 | Yes |

### Viewing Logs

```bash
# Tail all logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Specific service
docker compose logs -f --tail=100 backend

# Filter by time (requires timestamps)
docker compose logs --since 10m backend

# grep for errors across all services
docker compose logs 2>&1 | grep -i error
```

### nginx Access Log Format

Custom format includes upstream timing for performance monitoring:

```
$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent
"$http_referer" "$http_user_agent" "$http_x_forwarded_for"
rt=$request_time uct="$upstream_connect_time" uht="$upstream_header_time" urt="$upstream_response_time"
```

Key fields for monitoring:
- `rt` — total request time (client-side latency)
- `urt` — upstream response time (backend latency)
- `status` — HTTP status code

### Log Shipping (Future)

For centralized logging, add a sidecar (Filebeat/Fluentd) shipping to:
- **ELK Stack** (Elasticsearch + Logstash + Kibana)
- **Grafana Loki** (simpler, pairs well with Prometheus)
- **Datadog** (SaaS, best for small teams)

---

## Metrics & APM (Future)

### Planned: Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml (future)
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
```

### Key Metrics to Track

| Metric | Source | Dashboard |
|--------|--------|-----------|
| Request latency (p50/p95/p99) | nginx access log | Latency heatmap |
| Error rate (5xx %) | nginx access log | Error rate graph |
| Active connections | nginx stub_status | Connection gauge |
| MongoDB slow queries | MongoDB profiler | Slow query table |
| Redis hit rate | `redis-cli INFO stats` | Cache hit rate |
| Container CPU/Memory | Docker stats / cAdvisor | Resource dashboard |
| Disk usage (volumes) | `df -h` on host | Disk gauge |

### Uptime Check (External)

Set up an external uptime monitor (UptimeRobot, Better Uptime, or Healthchecks.io) pinging:

```
GET https://contopia.com/health
```

- Alert if: 3 consecutive failures, 5 min apart
- Notify: Email + PagerDuty

---

## Alert Thresholds

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| Service down | Health check fails > 3x | Critical | PagerDuty + Slack |
| High error rate | 5xx > 5% of requests in 5 min | Warning | Slack |
| High latency | p95 > 500ms for 5 min | Warning | Slack |
| Disk > 80% | Any volume usage > 80% | Warning | Slack |
| Disk > 95% | Any volume usage > 95% | Critical | PagerDuty + Slack |
| SSL cert expiring | Expires < 14 days | Warning | Email |
| Backup failure | Last backup > 36h ago | Critical | PagerDuty + Slack |

---

## Quick Diagnostic Commands

```bash
# Check all container status
docker compose ps

# CPU/Memory per container
docker stats --no-stream

# Disk usage on volumes
docker system df -v

# Network connectivity from backend to mongo
docker compose exec backend wget --spider http://mongodb:27017 || echo "Mongo unreachable"

# Network connectivity from backend to redis
docker compose exec backend wget --spider http://redis:6379 || echo "Redis unreachable"

# Check if any container is restarting excessively
docker compose ps --filter "status=restarting"

# Recent container restarts
docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
```

---

## Dashboard Links

| Dashboard | URL | Access |
|-----------|-----|--------|
| nginx /health | `https://contopia.com/health` | Public (rate-limited) |
| Docker health | `docker compose ps` | SSH only |
| Grafana (future) | `http://monitoring.contopia.com:3000` | VPN / SSO |
| MinIO Console | `http://contopia.com:9001` | Admin credentials |
| Uptime Status (future) | `https://status.contopia.com` | Public |
