import asyncio
import logging
import sys
import os

# Setup paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper_engine"))

from scraper_engine.sources.hackathons.devfolio import DevfolioScraper
from scraper_engine.sources.hackathons.devpost import DevpostScraper
from scraper_engine.sources.hackathons.unstop import UnstopScraper
from scraper_engine.sources.events.eventbrite import EventbriteScraper
from scraper_engine.sources.scholarships.opportunities_circle import OpportunitiesCircleScraper
from scraper_engine.sources.internships.internshala import InternshalaScraper
from scraper_engine.core.ingestor import Ingestor
from registry.scraper_registry import registry

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger("YuvahubPipeline")

def ingestor_callback(result, source_name, ingestor):
    if result["status"] == "success":
        stats = ingestor.save_batch(result["data"])
        logger.info(f"[{source_name}] Ingestion Stats: {stats}")
    else:
        logger.error(f"[{source_name}] Scrape failed: {result['error']}")

async def run_pipeline():
    logger.info("--- Starting Yuvahub Real Data Pipeline ---")
    
    ingestor = Ingestor()
    db = ingestor.db
    
    # 1. Register Scrapers centrally so they are never overwritten
    registry.register(DevfolioScraper(), "https://api.devfolio.co/api/hackathons?filter=all")
    registry.register(DevpostScraper(), "https://devpost.com/api/hackathons")
    registry.register(UnstopScraper(), "https://unstop.com/api/public/opportunity/search-result")
    registry.register(EventbriteScraper(), "https://www.eventbrite.com/api/v3/events/search/")
    registry.register(OpportunitiesCircleScraper(), "https://opportunitiescircle.com/wp-json/wp/v2/posts")
    registry.register(InternshalaScraper(), "https://internshala.com/internships/")
    
    # 2. Execute all registered scrapers concurrently
    results = await registry.execute_all(lambda res, src: ingestor_callback(res, src, ingestor))

    # Persist live metrics in MongoDB for admin dashboard read
    from datetime import datetime
    for res in results:
        if not isinstance(res, dict):
            continue
        
        source_name = res.get("source", "Unknown")
        status = res.get("status", "failed")
        items_found = res.get("items_found", 0)
        duration = res.get("duration_sec", 0)
        error_msg = res.get("error")

        source_id = source_name.lower().replace(" ", "_")
        
        # Calculate duplicates/inserts
        inserted = 0
        updated = 0
        duplicate_pct = 0.0

        if status == "success" and items_found > 0:
            # Re-read or estimate stats
            stats = ingestor.save_batch(res.get("data", []))
            inserted = stats.get("inserted", 0)
            updated = stats.get("updated", 0)
            if items_found > 0:
                duplicate_pct = round((updated / items_found) * 100.0, 1)

        quality_scores = {
            "devpost": 100,
            "devfolio": 100,
            "unstop": 90,
            "eventbrite": 80,
            "opportunities_circle": 75,
            "internshala": 85
        }
        source_yield_quality = quality_scores.get(source_id, 70)

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
                            "ops_per_hour": round(items_found * 1.5, 1),
                            "proxyHealth": "green" if status == "success" else "red"
                        }
                    },
                    upsert=True
                )
            except Exception as dberr:
                logger.error(f"Failed to record live telemetry: {dberr}")

    ingestor.close()
    
    # Log registry metrics
    metrics = registry.get_admin_metrics()
    logger.info(f"--- Pipeline Completed. Scraper Metrics: {metrics} ---")

    # Serialize all successfully scraped items for parent process capture
    all_opportunities = []
    for r in results:
        if isinstance(r, dict) and r.get("status") == "success":
            all_opportunities.extend(r.get("data", []))
            
    print("=== SCRAPE_RESULTS_JSON_START ===")
    import json
    print(json.dumps(all_opportunities))
    print("=== SCRAPE_RESULTS_JSON_END ===")

if __name__ == "__main__":
    asyncio.run(run_pipeline())
