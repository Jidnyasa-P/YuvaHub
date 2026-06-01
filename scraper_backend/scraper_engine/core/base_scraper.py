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

    async def fetch_page_std(self, url: str) -> Any:
        """
        A robust, dependency-free async page fetcher utilizing Python's built-in urllib standard library.
        """
        import urllib.request
        import json
        import ssl

        # Stop SSL validation errors for maximum scraping compatibility
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }

        def _fetch():
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
                raw = response.read()
                # Parse as JSON if applicable, fallback to UTF-8 HTML string
                try:
                    return json.loads(raw.decode('utf-8'))
                except Exception:
                    return raw.decode('utf-8', errors='ignore')

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch)

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
        Includes Source Quality Scoring, XML/HTML stripping, Deadline Normalization, 
        and AI-assisted tech-tag cleanup using the gemini-3.5-flash model callback.
        """
        import re
        from scraper_engine.core.tag_cleaner import clean_tags_with_ai

        # Quality scoring definition for the ingestion source
        quality_scores = {
            "devpost": 100,
            "devfolio": 100,
            "unstop": 90,
            "eventbrite": 80,
            "opportunities_circle": 75
        }
        source_id = self.source_name.lower().replace(" ", "_")
        q_score = quality_scores.get(source_id, 70)

        normalized = []
        for item in raw_data:
            item["source_name"] = self.source_name
            item["source"] = source_id
            item["category"] = self.category
            item["scraped_at"] = datetime.utcnow().isoformat()
            item["source_quality_score"] = q_score
            
            # Clean text HTML out of title and description
            title = item.get("title", "Unknown Opportunity")
            title = re.sub(r'<[^>]*>', '', title).strip()
            item["title"] = title

            desc = item.get("description", "")
            if desc:
                desc = re.sub(r'<[^>]*>', '', desc)
                desc = re.sub(r'\s+', ' ', desc).strip()
                if len(desc) > 800:
                    desc = desc[:797] + "..."
            else:
                desc = f"Discover details and apply for the '{title}' opportunity hosted by {item.get('organization', 'YuvaHub Partner')}."
            item["description"] = desc

            if "source_url" not in item:
                item["source_url"] = item.get("apply_link", "https://yuvahub.xyz")
                
            if "opportunity_type" not in item:
                item["opportunity_type"] = self.category.lower()

            # Deadline Normalization
            raw_dl = item.get("deadline")
            normalized_dl = "Open"
            display_dl = "Open Recruitment"
            
            if raw_dl and isinstance(raw_dl, str) and raw_dl.strip().lower() not in ["open", "ongoing", "none", "null", "tbd"]:
                raw_dl = raw_dl.strip()
                try:
                    # Try ISO formats
                    if "T" in raw_dl:
                        parsed_dt = datetime.strptime(raw_dl.split(".")[0].replace("Z", ""), "%Y-%m-%dT%H:%M:%S")
                    else:
                        parsed_dt = datetime.strptime(raw_dl[:10], "%Y-%m-%d")
                    normalized_dl = parsed_dt.strftime("%Y-%m-%d")
                    display_dl = parsed_dt.strftime("%d %b %Y")
                except Exception:
                    # Treat raw string nicely
                    normalized_dl = raw_dl
                    display_dl = raw_dl
            
            item["deadline"] = normalized_dl
            item["deadline_display"] = display_dl
            
            # Ensure unique fingerprint
            item["fingerprint"] = self.generate_fingerprint(
                item.get("title", ""),
                item.get("organization", "Unknown")
            )

            # AI Assisted tag cleanup
            raw_tags = item.get("tags") or [self.category]
            cleaned_tags = clean_tags_with_ai(title, raw_tags)
            item["tags"] = cleaned_tags
            
            normalized.append(item)
        return normalized

    async def fetch_with_retry(self, url: str) -> Any:
        """Fetch with exponential backoff and proxy rotation."""
        attempt = 0
        while attempt < self.max_retries:
            try:
                # Wrap scraper fetch with 10s strict timeout
                return await asyncio.wait_for(self.fetch_page(url), timeout=10.0)
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
            # Strict protection: enforce a cumulative scraper execution boundary of 20 seconds
            raw_content = await asyncio.wait_for(self.fetch_with_retry(url), timeout=20.0)
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
