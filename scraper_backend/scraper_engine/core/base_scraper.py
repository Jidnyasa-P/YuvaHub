import asyncio
import logging
import hashlib
import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class BaseScraper(ABC):
    """
    Abstract Base Class for all Yuvahub opportunity scrapers.
    Forces child classes to implement standard robust logic.
    """
    source_name: str = "Base"
    category: str = "Unknown"
    
    # Retry configuration
    max_retries: int = 3
    base_backoff: float = 2.0

    def __init__(self, use_proxy: bool = False):
        self.use_proxy = use_proxy
        self.proxies = self._load_proxies() if use_proxy else None

    def _load_proxies(self) -> Optional[Dict[str, str]]:
        # In production, load from env vars (e.g. BrightData/Oxylabs)
        # return {"http://": "http://proxy.server:port", "https://": "http://proxy.server:port"}
        return None

    @abstractmethod
    async def fetch_page(self, url: str) -> Any:
        """Fetch the HTML or JSON from the source URL."""
        pass

    @abstractmethod
    async def parse(self, html_or_data: Any) -> List[Dict[str, Any]]:
        """Parse raw data into dictionaries."""
        pass

    def generate_fingerprint(self, title: str, organization: str) -> str:
        """Generate a deterministic deduplication hash."""
        raw = f"{self.source_name}:{title.lower().strip()}:{organization.lower().strip()}"
        return hashlib.md5(raw.encode()).hexdigest()

    def normalize(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Passes data through standard schema rules.
        """
        normalized = []
        for item in raw_data:
            item["source_name"] = self.source_name
            item["category"] = self.category
            item["scraped_at"] = datetime.utcnow().isoformat()
            
            # Ensure unique fingerprint
            item["fingerprint"] = self.generate_fingerprint(
                item.get("title", ""),
                item.get("organization", "Unknown")
            )
            
            # Simple cleanup
            normalized.append(item)
        return normalized

    async def fetch_with_retry(self, url: str) -> Any:
        """Fetch with exponential backoff and proxy rotation."""
        attempt = 0
        while attempt < self.max_retries:
            try:
                return await self.fetch_page(url)
            except Exception as e:
                attempt += 1
                logger.warning(f"[{self.source_name}] Attempt {attempt} failed for {url}: {e}")
                if attempt >= self.max_retries:
                    logger.error(f"[{self.source_name}] Max retries reached for {url}.")
                    raise e
                await asyncio.sleep(self.base_backoff ** attempt)
        return None

    async def run(self, url: str) -> Dict[str, Any]:
        """Orchestrates scraping with monitoring."""
        start_time = time.time()
        result = {
            "source": self.source_name,
            "status": "failed",
            "items_found": 0,
            "duration_sec": 0,
            "error": None,
            "data": []
        }
        try:
            logger.info(f"Starting {self.source_name} scraper on {url}")
            raw_content = await self.fetch_with_retry(url)
            parsed_items = await self.parse(raw_content)
            clean_items = self.normalize(parsed_items)
            
            result["status"] = "success"
            result["items_found"] = len(clean_items)
            result["data"] = clean_items
            logger.info(f"Successfully scraped {len(clean_items)} items from {self.source_name}")
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Error in {self.source_name} scraper: {e}", exc_info=True)
            
        result["duration_sec"] = round(time.time() - start_time, 2)
        return result
