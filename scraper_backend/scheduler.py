import asyncio
import logging
import time
import os
import sys
from datetime import datetime

# Setup paths relative to script
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(base_dir)
sys.path.append(os.path.join(base_dir, "scraper_engine"))

from scraper_engine.sources.hackathons.devfolio import DevfolioScraper
from scraper_engine.sources.hackathons.devpost import DevpostScraper
from scraper_engine.sources.hackathons.unstop import UnstopScraper
from scraper_engine.sources.events.eventbrite import EventbriteScraper
from scraper_engine.sources.scholarships.opportunities_circle import OpportunitiesCircleScraper
from scraper_engine.core.ingestor import Ingestor
from registry.scraper_registry import registry

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] ScraperScheduler: %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger("Scheduler")

async def run_scrape_cycle():
    logger.info("Starting scheduled scraper execution cycle...")
    ingestor = Ingestor()
    db = ingestor.db

    # Standard registry register
    registry.register(DevfolioScraper(), "https://api.devfolio.co/api/hackathons?filter=all")
    registry.register(DevpostScraper(), "https://devpost.com/api/hackathons")
    registry.register(UnstopScraper(), "https://unstop.com/api/public/opportunity/search-result")
    registry.register(EventbriteScraper(), "https://www.eventbrite.com/api/v3/events/search/")
    registry.register(OpportunitiesCircleScraper(), "https://opportunitiescircle.com/wp-json/wp/v2/posts")

    results = await registry.execute_all()

    # Track metrics and save to MongoDB
    for res in results:
        if not isinstance(res, dict):
            continue
        
        source_name = res.get("source", "Unknown")
        status = res.get("status", "failed")
        items_found = res.get("items_found", 0)
        duration = res.get("duration_sec", 0)
        error_msg = res.get("error")

        source_id = source_name.lower().replace(" ", "_")
        
        inserted = 0
        updated = 0
        duplicate_pct = 0.0

        if status == "success" and items_found > 0:
            stats = ingestor.save_batch(res.get("data", []))
            inserted = stats.get("inserted", 0)
            updated = stats.get("updated", 0)
            if items_found > 0:
                duplicate_pct = round((updated / items_found) * 100.0, 1)

        # Map source quality score
        quality_scores = {
            "devpost": 100,
            "devfolio": 100,
            "unstop": 90,
            "eventbrite": 80,
            "opportunities_circle": 75
        }
        source_yield_quality = quality_scores.get(source_id, 70)

        # Save metrics document in database
        if db is not None:
            try:
                db.scraper_metrics.update_one(
                    {"id": source_id},
                    {
                        "$set": {
                            "id": source_id,
                            "name": source_name,
                            "status": "healthy" if status == "success" else "failed",
                            "lastRun": datetime.utcnow().isoformat() + "Z",
                            "items": items_found,
                            "inserted": inserted,
                            "duplicates": updated,
                            "duplicate_percentage": duplicate_pct,
                            "failures": 1 if status == "failed" else 0,
                            "duration_sec": duration,
                            "error": error_msg,
                            "yield_quality": source_yield_quality,
                            "ops_per_hour": round(items_found * 1.5, 1), # estimated items/hour
                            "proxyHealth": "green" if status == "success" else "red"
                        }
                    },
                    upsert=True
                )
                logger.info(f"Persisted metrics for [{source_id}] (Inserted: {inserted}, Duplicates: {updated})")
            except Exception as dberr:
                logger.error(f"Failed to record scraper metrics: {dberr}")

    ingestor.close()
    logger.info("Scheduled cycle execution complete.")

async def scheduler_loop():
    logger.info("Initializing YuvaHub Ingestion Scheduler...")
    
    # Run immediate scrape on startup to ensure fresh data
    try:
        await run_scrape_cycle()
    except Exception as e:
        logger.error(f"Startup run failed: {e}")

    # Standard cycle: Run every 60 minutes
    interval_sec = 60 * 60 
    while True:
        logger.info(f"Sleeping for {interval_sec}s until next cycle...")
        await asyncio.sleep(interval_sec)
        try:
            await run_scrape_cycle()
        except Exception as e:
            logger.error(f"Error during periodic scrape: {e}")

if __name__ == "__main__":
    asyncio.run(scheduler_loop())
