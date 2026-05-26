# Yuvahub.xyz - Admin Monitoring & Issue Reporting System

## 1. Monitoring Architecture
The observability platform consists of four layers:
1. **Telemetry Emitters:** Every scraper module, FastAPI endpoint, and Celery task wraps its execution block in a telemetry emitter that captures duration, success state, and metadata.
2. **Central Logging Stream:** Logs are pushed to an asynchronous sink (e.g., Redis Streams or directly to MongoDB timeseries collections) to prevent blocking the main execution loop.
3. **Health Monitor Daemon:** A background cron job that evaluates the state of the system against defined thresholds (e.g., "is Internshala 12 hours stale?").
4. **Admin Dashboard (UI):** A protected frontend console querying aggregated health metrics from the backend.

## 2. Admin Dashboard Design
The dashboard acts as the system's "cockpit," organized into focused cards:
- **System Vitals:** (Top row) DB Ping, Redis Ping, Gemini API Quota Usage (Estimate), Node CPU/RAM.
- **Scraper Matrix:** A grid showing each source (LinkedIn, Devfolio, etc.), Status Badge (Active/Failing/Stale), Last Scrape Time, and "Manual Trigger" button.
- **Feed Health:** Metrics on "Empty Feeds Generated", "Fallback Mode Triggers", and "Average Items per Feed".
- **Real-time Incident Stream:** A scrolling table of recent WARNING/CRITICAL issues.

## 3. Database Schemas (Observability)

```python
from datetime import datetime
from pydantic import Field
from beanie import Document
from typing import Optional, Dict, Any

class SystemIssueLog(Document):
    severity: str  # INFO, WARNING, CRITICAL
    component: str # scraper, api, feed_engine, auth
    source: Optional[str] = None # e.g., "Internshala" 
    message: str
    details: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    resolved: bool = False
    
    class Settings:
        name = "system_issue_logs"
        timeseries = {"timeField": "timestamp", "metaField": "component"}

class ScraperHealthStatus(Document):
    source_name: str
    status: str # HEALTHY, DEGRADED, BLOCKED, OFFLINE
    last_success_at: Optional[datetime]
    recent_failures: int = 0
    items_extracted_24h: int = 0
    avg_duration_sec: float = 0.0
    anti_bot_blocks: int = 0
```

## 4. Health-Check System
- **Endpoint Lifeline:** The backend exposes a `/api/health` endpoint that checks MongoDB, Redis, and API connections.
- **Scraper Dead Man's Switch:** If the scraper manager doesn't run `ScraperHealthStatus.update("MLH")` within a 24-hour window, the daemon automatically creates a `CRITICAL` issue for "Scraper Silent Failure."

## 5. Alert System
- **INFO:** Standard operational metrics (e.g., "Devfolio scraper finished, 45 items added"). Logged to DB only.
- **WARNING:** Recoverable issues or minor degradation (e.g., "Gemini API took >5000ms", "Feed returned < 5 items"). Logged to DB, displayed on Admin UI.
- **CRITICAL:** Total failures (e.g., "LinkedIn Scraper IP Blocked - 403 Forbidden", "MongoDB Connection Lost", "Fallback Mode active for >10% of users"). Triggers a Discord/Slack webhook immediately to the engineering team.

## 6. Scraper Observability
Tracked metrics per source:
- `extraction_yield_rate`: How many items parsed vs total payload.
- `captcha_interrupts`: Count of proxy blocks or captcha challenges.
- `stale_ratio`: Number of items scraped that we already have in the DB.

## 7. Feed Observability
Metrics tracked to detect invisible recommendation failures:
- **Fallback Penetration:** The percentage of feed requests served by "Tier 4/5" fallback lists instead of the personalized cache.
- **Duplicate Density:** Checks if the feed algorithm is reusing the same 10 opportunities for users who scroll deep.
- **Zero-State Frequency:** How often a user sees "No opportunities found."

## 8. Error Logging System
All `try...except` blocks in the workers push generalized JSON formats to the `SystemIssueLog` collection.
```python
def log_critical(component, message, details=None):
    # Emit to DB & notify Slack
    pass
```

## 9. Recommended Monitoring Stack (Production)
For a startup moving beyond MVP, building a custom admin dashboard from scratch is time-consuming. We recommend augmenting custom React UI with:
- **Error Tracking:** Sentry.io (Catches raw Python/JS stack traces instantly).
- **APM & Logs:** Datadog or New Relic (Visualizes API latency and database bottlenecks out-of-the-box).
- **Uptime:** BetterUptime / UptimeRobot.
- **Custom Admin UI:** Retool (or our custom React AdminDashboard if budget is constrained).

## 10. Example Admin UI Mockup (Implementation)
(See `src/components/Admin/AdminDashboard.tsx`)
