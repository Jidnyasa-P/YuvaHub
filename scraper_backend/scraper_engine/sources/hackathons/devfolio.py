import asyncio
import httpx
from typing import List, Dict, Any

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.base_scraper import BaseScraper

class DevfolioScraper(BaseScraper):
    source_name = "Devfolio"
    category = "hackathon"

    def __init__(self):
        super().__init__()
        # Devfolio often exposes a GraphQL or REST API behind the scenes.
        # Alternatively, Playwright would be used here. For speed, we simulate a REST call.
        self.api_url = "https://api.devfolio.co/api/hackathons?filter=all"
        
    async def fetch_page(self, url: str) -> Any:
        # If API is protected, we would launch Playwright here.
        # Example using HTTPX for a simulated open API
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Note: actual Devfolio requires more complex graphQL payloads or proxy headers.
            response = await client.get(self.api_url) 
            try:
                response.raise_for_status()
                return response.json()
            except:
                return [] # Mock response for architecture demo

    async def parse(self, data: Any) -> List[Dict[str, Any]]:
        hackathons = []
        if not data:
            return hackathons
            
        items = data.get("hits", []) # Assuming an Algolia or Elasticsearch response structure
        for item in items:
            title = item.get("name")
            if not title: continue
            
            hackathons.append({
                "title": title,
                "organization": item.get("host", "Devfolio Host"),
                "apply_link": item.get("url", f"https://devfolio.co/hackathons/{item.get('slug')}"),
                "tags": item.get("tags", ["Hackathon", "Web3", "AI"]),
                "deadline": item.get("ends_at"),
                "mode": item.get("location_type", "online").lower(),
                "description": item.get("description", "Devfolio Hackathon")
            })
        return hackathons
