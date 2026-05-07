# Yuvahub.xyz - Backend Architecture & Scraping Engine

This directory contains the scalable Python-based backend architecture for Yuvahub.xyz, designed to ingest, normalize, and serve opportunities from 100+ sources.

## Tech Stack
- **API Framework:** FastAPI (High performance, async native)
- **Database:** MongoDB (via Beanie/Motor for async ODM)
- **Scraping Framework:** Playwright (for dynamic SPAs like LinkedIn, Devfolio) & BeautifulSoup/httpx (for static sites)
- **Task Queue & Scheduling:** Celery + Redis + Celery Beat (for cron jobs)
- **Cache:** Redis (for caching API responses and matching computations)

## Folder Structure
```text
scraper_backend/
├── main.py                          # FastAPI application entry point
├── database/
│   ├── connection.py                # MongoDB async connection
│   └── models.py                    # Beanie ODM models (Schema)
├── scraper_engine/
│   ├── core/
│   │   └── base_scraper.py          # Abstract Base Class for scrapers
│   ├── pipeline/
│   │   ├── cleaner.py               # Deduplication, spelling, formatting
│   │   └── tag_normalizer.py        # Centralized taxonomy
│   └── sources/
│       ├── internships/
│       │   └── internshala.py       # Specific source adapters
│       └── hackathons/
│           └── devfolio.py
├── matching_engine/
│   └── recommender.py               # Scoring & matching logic
├── scheduler/
│   └── cron_tasks.py                # Celery beat tasks (every 6 hours)
├── requirements.txt
└── docker-compose.yml
```

## Scraping Logic Strategy

**BeautifulSoup + httpx (Async HTTP):**
*Best for:* Static HTML sites, SSR pages, simple APIs.
*Sources:* Government portals (MyGov, AICTE), basic job boards.
*Pros:* Extremely fast, low memory footprint.

**Playwright (Async Headless Browser):**
*Best for:* Modern SPAs (React/Angular/Vue), infinite scrolling, bot-protected sites.
*Sources:* LinkedIn Jobs, Wellfound, Devfolio, Unstop (often relies on heavy JS).
*Pros:* Can execute JS, handle Cloudflare loops (with stealth plugins), bypass simple captchas.

**Anti-Bot Handling:**
For sites like Indeed or Glassdoor, proxy rotation (BrightData/ScraperAPI) and rotating User-Agents/Browser fingerprints are mandatory.

## Source Ingestion Workflow
1. **Trigger:** Celery Beat fires a task every 6 hours for a specific category (e.g., `scrape_internships`).
2. **Scraping:** The specific adapter (e.g., `internshala.py`) runs asynchronously, yielding raw opportunity dictionaries.
3. **Pipeline - Normalization:** Text is stripped of HTML, tags are mapped via `TagNormalizer`, and dates are parsed into ISO-8601.
4. **Pipeline - Deduplication:** Creates a deterministic hash based on `title`, `org`, and `location` to detect cross-platform duplicates.
5. **Storage:** Upserts the data into MongoDB.
6. **Post-Processing:** Triggers matching engine update to alert relevant users.

## Deployment Strategy
1. **Containerization:** Dockerize the FastAPI app and Celery workers.
2. **Orchestration:** Deploy on AWS ECS, GKE, or a robust VPS (DigitalOcean Droplet/Render).
3. **Database:** MongoDB Atlas (M10+ cluster) for managed backups and scaling.
4. **Resilience:** Use multiple Celery workers. If a scraper fails, it retries with exponential backoff.
