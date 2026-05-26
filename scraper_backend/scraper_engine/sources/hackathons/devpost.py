import asyncio
import httpx
from typing import List, Dict, Any
import sys
import os

# Adjust sys.path to find core
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, "..", ".."))

from core.base_scraper import BaseScraper

class DevpostScraper(BaseScraper):
    source_name = "Devpost"
    category = "hackathon"

    async def fetch_page(self, url: str) -> Any:
        # Devpost API (Used by their mobile/web app)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()

    async def parse(self, data: Any) -> List[Dict[str, Any]]:
        hackathons = []
        if not data or not isinstance(data, dict):
            return hackathons
            
        items = data.get("hackathons", [])
        for item in items:
            title = item.get("title")
            if not title: continue
            
            hackathons.append({
                "title": title,
                "organization": item.get("organization_name", "various"),
                "apply_link": item.get("url"),
                "tags": [t.get("name") for t in item.get("submission_period_tags", [])] or ["Hackathon"],
                "deadline": item.get("submission_period_ends_at"),
                "location": item.get("displayed_location", {}).get("location", "Online"),
                "type": "hackathon",
                "description": item.get("tagline", "")
            })
        return hackathons
