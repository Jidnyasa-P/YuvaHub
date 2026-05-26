# Yuvahub - Scalable Ingestion & Scraping Architecture

## 1. Introduction
To sustainably extract data from diverse opportunity platforms (hackathons, scholarships, jobs) without hitting anti-bot walls or crippling server performance, Yuvahub requires a **Decoupled Scraping Infrastructure**.

## 2. Updated Directory Structure (scraper_backend)
```text
scraper_backend/
├── scraper_engine/
│   ├── core/
│   │   ├── base_scraper.py      (Retry, formatting, proxy interface)
│   │   ├── scraper_manager.py   (Orchestration, semaphore limits)
│   │   └── fp_deduplicator.py   (Fingerprinting & hash comparisons)
│   ├── sources/
│   │   ├── internships/         (Internshala, LinkedIn, Wellfound)
│   │   ├── hackathons/          (Devfolio, Devpost, MLH)
│   │   ├── scholarships/        (Buddy4Study, NSP, MyScheme)
│   │   └── events/              (Eventbrite, Meetup, GDG)
│   └── pipeline/
│       ├── cleaner.py           (Regex html stripping, formatting)
│       └── tag_extractor.py     (NLP-based auto-tagging of raw descriptions)
├── scheduler/
│   ├── cron_tasks.py            (Celery beat schedule registry)
│   └── health_monitor.py        (Webhook alerts to Slack/Discord on failures)
└── live_opportunity_intelligence.md
```

## 3. Scraper Manager Architecture
The `ScraperManager` (in `core/scraper_manager.py`) acts as the single entry point.
- **Batched Concurrency:** Instead of launching 20 scrapers simultaneously and destroying RAM, it uses `asyncio.Semaphore()` to limit active browsers or API pools.
- **Unified Health Reports:** Emits a dictionary containing `{ successful: 18, failed: 2, total_items: 4500 }`.
- **Database Indirection:** The manager hands normalized data to the `pipeline` for deduping before touching the database.

## 4. Source Monitoring & Failure Handling System
- Every scraper inherits `fetch_with_retry` from `BaseScraper`. 
- Implements Exponential Backoff: Failed attempts wait 2s -> 4s -> 8s.
- **Circuit Breaker Pattern:** If a scraper throws 3 consecutive exceptions or gets blocked (e.g. `HTTP 403 Forbidden` from Cloudflare), it immediately flags its `status` as "failed" in the Health Report and shuts down gracefully to avoid proxy burn.
- **Alerting:** The Manager checks the status object. If a major source like 'LinkedIn' fails, `health_monitor.py` pings the engineering team channel.

## 5. Scaling Strategy
As we push from 2 to 20+ sources, running scrapers via FastApi background tasks is dangerous.
1. **Queueing (Celery + Redis):** Scrapes are atomic Celery tasks pushed to queues. Fast (API-based) scrapers go to `high_priority` queue. Slow (Playwright headless browser) scrapers go to `heavy_queue`.
2. **Horizontal Scaling:** Deploy workers dynamically on platforms like Render or AWS ECS. If queue length > 10, autoscale workers.

## 6. Anti-Bot Strategy (Critical)
Sites like **Wellfound**, **Internshala**, and **LinkedIn** cannot be scraped cleanly.
1. **Residential Proxy Networks:** Integrate BrightData or Oxylabs rotating proxy endpoints into `httpx` and `Playwright`.
2. **Stealth Headless:** Use `playwright-stealth` in Python to spoof Chrome fingerprints, inject generic WebGL contexts, and strip `webdriver=true` attributes.
3. **Session Cookies Management:** For high-security sites, use a dedicated worker to manually login once, capture the `session_store` cookie, and inject it into the scraper HTTP headers.
4. **Human-like Delays:** Don't request 50 pages a second. Use randomized `asyncio.sleep(random.uniform(1.5, 4.0))` between pagination loops.

## 7. Recommended Deployment Setup
- **Master Scheduler (App Engine / Cloud Run Job):** Kicks off messages to Pub/Sub or Redis at specific cron intervals.
- **Scraper Workers (Cloud Run / DigitalOcean Apps):** Ephemeral containers that wake up, read queue, fire Playwright/Httpx, save to MongoDB, and shut down.
- **Vector/Feed Engine (FastAPI on Render):** Stays isolated from scraping. Only serves API queries to the frontend based on the MongoDB Database. 
- **Database:** MongoDB Atlas (M10+) with Search Indexes.

This decoupling guarantees that if LinkedIn bans your scraper IPs, your FastAPI service serving the frontend remains 100% unaffected.
