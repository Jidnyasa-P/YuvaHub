import asyncio
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class BaseScraper(ABC):
    """
    Abstract Base Class for all Yuvahub opportunity scrapers.
    Forces child classes to implement standard scraping logic.
    """
    source_name: str = "Base"
    category: str = "Unknown"

    def __init__(self):
        self.session = None  # Could be httpx.AsyncClient or Playwright browser

    @abstractmethod
    async def fetch_page(self, url: str) -> Any:
        """Fetch the HTML or JSON from the source URL."""
        pass

    @abstractmethod
    async def parse(self, html_or_data: Any) -> List[Dict[str, Any]]:
        """Parse the raw data into a list of generic opportunity dictionaries."""
        pass

    def normalize(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Passes data through the centralized pipeline:
        1. Cleans text.
        2. Normalizes tags.
        3. Standardizes dates.
        """
        # In a real app, this integrates with scraper_engine/pipeline
        from ...scraper_engine.pipeline.cleaner import clean_text
        from ...scraper_engine.pipeline.tag_normalizer import normalize_tags
        
        normalized = []
        for item in raw_data:
            item["title"] = clean_text(item.get("title", ""))
            item["description"] = clean_text(item.get("description", ""))
            item["tags"] = normalize_tags(item.get("tags", []))
            item["source_name"] = self.source_name
            item["category"] = self.category
            item["scraped_at"] = datetime.utcnow().isoformat()
            normalized.append(item)
        return normalized

    async def run(self, url: str) -> List[Dict[str, Any]]:
        """Main execution flow for a scraper."""
        try:
            logger.info(f"Starting {self.source_name} scraper on {url}")
            raw_content = await self.fetch_page(url)
            parsed_items = await self.parse(raw_content)
            clean_items = self.normalize(parsed_items)
            logger.info(f"Successfully scraped {len(clean_items)} items from {self.source_name}")
            return clean_items
        except Exception as e:
            logger.error(f"Error in {self.source_name} scraper: {e}", exc_info=True)
            return []
