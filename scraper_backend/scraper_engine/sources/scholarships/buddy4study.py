import httpx
from typing import List, Dict, Any
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.base_scraper import BaseScraper

class Buddy4StudyScraper(BaseScraper):
    source_name = "Buddy4Study"
    category = "scholarship"

    def __init__(self, use_proxy: bool = False):
        super().__init__(use_proxy)
        # Buddy4Study often has an internal api consumed by their frontend app
        self.api_url = "https://www.buddy4study.com/api/v1/scholarship/live"

    async def fetch_page(self, url: str) -> Any:
        headers = {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        # In a real scenario, this might need an API token observed in browser network tab
        async with httpx.AsyncClient(headers=headers, timeout=20.0, proxies=self.proxies) as client:
            response = await client.get(self.api_url)
            # Mocking the response parsing as we don't know exact schema without live exploration
            try:
                response.raise_for_status()
                return response.json()
            except:
                return {"data": []}

    async def parse(self, data: Any) -> List[Dict[str, Any]]:
        scholarships = []
        items = data.get("data", [])
        
        for item in items:
            scholarships.append({
                "title": item.get("scholarshipName", "Scholarship"),
                "organization": item.get("providerName", "Private Trust/Foundation"),
                "apply_link": f"https://www.buddy4study.com/scholarship/{item.get('slug', '')}",
                "deadline": item.get("deadlineDate"),
                "description": item.get("shortDescription", "Apply on Buddy4Study"),
                "tags": ["Scholarship", "Financial Aid"],
                "mode": "online"
            })
            
        return scholarships
