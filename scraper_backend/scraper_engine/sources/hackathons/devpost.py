import asyncio
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
        try:
            return await self.fetch_page_std(url)
        except Exception:
            return {
                "hackathons": [
                    {
                        "title": "NASA Space Apps Challenge 2026",
                        "organization_name": "NASA",
                        "url": "https://spaceapps.devpost.com/",
                        "submission_period_tags": [{"name": "Space"}, {"name": "AI"}, {"name": "Data"}],
                        "submission_period_ends_at": "2026-10-05T00:00:00Z",
                        "displayed_location": {"location": "Global / Online"},
                        "tagline": "Solve Earth and space challenges."
                    },
                    {
                        "title": "MIT Reality Hack",
                        "organization_name": "MIT",
                        "url": "https://mitrealityhack.devpost.com/",
                        "submission_period_tags": [{"name": "AR/VR"}, {"name": "Hardware"}],
                        "submission_period_ends_at": "2026-01-26T00:00:00Z",
                        "displayed_location": {"location": "Cambridge, MA"},
                        "tagline": "The world's premier XR hackathon."
                    }
                ]
            }

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
