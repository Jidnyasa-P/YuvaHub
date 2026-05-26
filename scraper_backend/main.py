import asyncio
import logging
import sys
import os

# Setup paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper_engine"))

from scraper_engine.sources.hackathons.devfolio import DevfolioScraper
from scraper_engine.sources.hackathons.devpost import DevpostScraper
from scraper_engine.core.ingestor import Ingestor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("YuvahubPipeline")

async def run_pipeline():
    logger.info("--- Starting Yuvahub Real Data Pipeline ---")
    
    ingestor = Ingestor()
    
    scrapers = [
        (DevfolioScraper(), "https://api.devfolio.co/api/hackathons?filter=all"),
        (DevpostScraper(), "https://devpost.com/api/hackathons"),
    ]
    
    for scraper, url in scrapers:
        try:
            result = await scraper.run(url)
            if result["status"] == "success":
                stats = ingestor.save_batch(result["data"])
                logger.info(f"[{scraper.source_name}] Ingestion Stats: {stats}")
            else:
                logger.error(f"[{scraper.source_name}] Scrape failed: {result['error']}")
        except Exception as e:
            logger.error(f"Failed to process {scraper.source_name}: {e}")

    ingestor.close()
    logger.info("--- Pipeline Completed ---")

if __name__ == "__main__":
    asyncio.run(run_pipeline())
