import asyncio
import logging
import time
from typing import Dict, Any, List, Optional
from scraper_engine.core.base_scraper import BaseScraper

logger = logging.getLogger(__name__)

class ScraperRegistry:
    """
    Centralized Scraper Registry.
    Ensures addition of new scrapers never removes/overwrites older ones.
    Supports concurrent multi-source execution.
    """
    def __init__(self):
        self._scrapers: Dict[str, Dict[str, Any]] = {}

    def register(self, scraper: Any, default_url: str) -> None:
        """
        Registers a scraper persistently.
        """
        if not hasattr(scraper, "source_name") or not hasattr(scraper, "run"):
            raise ValueError(f"Scraper must implement standard BaseScraper interface, got {type(scraper)}")
            
        source_id = scraper.source_name.lower().replace(" ", "_")
        
        if source_id in self._scrapers:
            logger.info(f"[{source_id}] Updating URL for existing scraper: {scraper.source_name}")
        else:
            logger.info(f"[Registry] New scraper added: {scraper.source_name}. Total scrapers: {len(self._scrapers)+1}")
            
        self._scrapers[source_id] = {
            "instance": scraper,
            "url": default_url,
            "last_run": None,
            "health": "unknown",
            "ingestion_count": 0,
            "failed_scrapes": 0
        }

    def get_all(self) -> List[Dict[str, Any]]:
        return list(self._scrapers.values())

    def get_admin_metrics(self) -> List[Dict[str, Any]]:
        metrics = []
        for sid, sdata in self._scrapers.items():
            metrics.append({
                "id": sid,
                "name": sdata["instance"].source_name,
                "status": sdata["health"],
                "lastRun": sdata["last_run"],
                "items": sdata["ingestion_count"],
                "failures": sdata["failed_scrapes"],
                "proxyHealth": "green" if sdata["health"] in ["healthy", "unknown"] else "red"
            })
        return metrics

    async def execute_all(self, ingestor_callback=None) -> List[Any]:
        """
        Concurrently executes all registered scrapers.
        """
        logger.info(f"[Registry] Executing {len(self._scrapers)} scrapers concurrently...")
        tasks = []
        
        for sid, sdata in self._scrapers.items():
            scraper: BaseScraper = sdata["instance"]
            url = sdata["url"]
            tasks.append(self._run_single_scraper(sid, scraper, url, ingestor_callback))
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

    async def _run_single_scraper(self, sid: str, scraper: BaseScraper, url: str, ingestor_callback=None):
        try:
            result = await scraper.run(url)
            self._scrapers[sid]["last_run"] = time.time()
            if result.get("status") == "success":
                self._scrapers[sid]["health"] = "healthy"
                items_cnt = result.get("items_found", 0)
                self._scrapers[sid]["ingestion_count"] += items_cnt
                if ingestor_callback:
                    ingestor_callback(result, scraper.source_name)
            else:
                self._scrapers[sid]["health"] = "degraded"
                self._scrapers[sid]["failed_scrapes"] += 1
            return result
        except Exception as e:
            logger.error(f"[Registry] Scraper {sid} catastrophic failure: {e}")
            self._scrapers[sid]["health"] = "failed"
            self._scrapers[sid]["failed_scrapes"] += 1
            self._scrapers[sid]["last_run"] = time.time()
            return {"source": scraper.source_name, "status": "failed", "error": str(e)}

# Singleton 
registry = ScraperRegistry()
