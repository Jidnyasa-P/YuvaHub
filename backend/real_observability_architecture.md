# Yuvahub.xyz - Real Production Observability Architecture

## 1. Observability Architecture
To move away from frontend-simulated telemetry, Yuvahub now uses a **Backend-Driven Observability Pipeline**.
1. **Telemetry Middleware:** FastAPI middleware intercepts all incoming requests to calculate API latency, track 5xx errors, and monitor endpoint usage.
2. **Event Bus (In-Memory / Redis):** An internal event emitter broadcasts metrics (scraper updates, incidents) to connected SSE (Server-Sent Events) clients.
3. **Storage (MongoDB):** Time-series collections in MongoDB store historical metrics (`api_latencies`, `scraping_jobs`, `system_incidents`).
4. **Health Probes:** Background tasks periodically ping MongoDB, Gemini API, and cache to determine subsystem health.

## 2. FastAPI Monitoring Endpoints
* `GET /api/v1/admin/health` - Instant snapshot of DB, Cache, and CPU health.
* `GET /api/v1/admin/metrics` - Historical metrics (opportunities ingested last 24h, fallback rate).
* `GET /api/v1/admin/scrapers` - Real status of scrapers from the DB.
* `GET /api/v1/admin/incidents` - Paginated list of recent incidents.
* `POST /api/v1/admin/scrapers/trigger` - Manually queue a scraper.

## 3. SSE Implementation (`/api/v1/admin/stream`)
We use Server-Sent Events (SSE) because telemetry is unidirectional (Backend -> Admin Client). 
- Admins subscribe to `GET /api/v1/admin/stream/telemetry`.
- The backend yields JSON payloads containing live updates (`{ type: "INCIDENT", data: {...} }`).

## 4. MongoDB Metrics Integration
```python
# MongoDB Time-Series Collection Example
db.create_collection(
    "api_metrics",
    timeseries={
        "timeField": "timestamp",
        "metaField": "endpoint",
        "granularity": "minutes"
    }
)
```

## 5. Incident Generation System
Incidents are automatically created by:
- **Scraper Manager:** Emits `CRITICAL` if proxy returns 403, `WARNING` if yield is 0.
- **Feed Engine:** Emits `WARNING` if fallback list is activated.
- **Telemetry Middleware:** Emits `CRITICAL` if database query takes > 2000ms.

## 6. Frontend Live Integration
- React `useEffect` establishes an `EventSource` connection to `/stream/telemetry`.
- Instead of `setInterval` generating fake data, the React state is updated by `event.data`.

## 7. Migration Steps from Simulation
1. Remove `setInterval` mock generators from React.
2. Extract initial state from standard `GET` requests (SWR/React Query).
3. Open `EventSource` connection and merge live updates into existing state.
4. Replace hardcoded "amber/green" proxy health with actual status mapped from MongoDB.

## 8. Scaling Considerations
- For 1-3 admin users, in-memory `asyncio.Queue` broadcast is sufficient.
- When expanding to multiple backend instances, we must introduce **Redis Pub/Sub** to fan-out telemetry events to all SSE clients across different pods.
