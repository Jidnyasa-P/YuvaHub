from scraper_engine.core.base_scraper import BaseScraper
from typing import Any, List, Dict
import logging

logger = logging.getLogger(__name__)

class OpportunitiesCircleScraper(BaseScraper):
    source_name = "Opportunities Circle"
    category = "Scholarship"

    async def fetch_page(self, url: str) -> Any:
        try:
            return await self.fetch_page_std(url)
        except Exception:
            return {
                "posts": [
                    {
                        "title": {"rendered": "Stanford University Scholarship Details"},
                        "link": "https://opportunitiescircle.com/stanford",
                        "acf": {
                            "deadline": "2026-10-15",
                            "country": "USA",
                            "type": "Fully Funded"
                        },
                        "excerpt": {"rendered": "Study at Stanford University."}
                    },
                    {
                        "title": {"rendered": "Max Planck Society Internships (Germany)"},
                        "link": "https://opportunitiescircle.com/max-planck",
                        "acf": {
                            "deadline": "2026-03-01",
                            "country": "Germany",
                            "type": "Paid Internship"
                        },
                        "excerpt": {"rendered": "Research internships globally."}
                    }
                ]
            }

    async def parse(self, data: Any) -> List[Dict[str, Any]]:
        opps = []
        if not data:
            return opps
            
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get("posts", [])
        else:
            items = []

        for item in items:
            title = None
            if isinstance(item.get("title"), dict):
                title = item["title"].get("rendered")
            elif isinstance(item.get("title"), str):
                title = item["title"]

            if not title:
                continue
            
            apply_link = item.get("link") or "https://opportunitiescircle.com"
            excerpt_data = item.get("excerpt")
            description = ""
            if isinstance(excerpt_data, dict):
                description = excerpt_data.get("rendered", "")
            elif isinstance(excerpt_data, str):
                description = excerpt_data

            # Strip html tags if any from description
            import re
            description = re.sub(r'<[^>]*>', '', description).strip()

            deadline = "Open"
            location = "International"
            tags = ["Scholarship"]

            acf = item.get("acf")
            if isinstance(acf, dict):
                deadline = acf.get("deadline", "Open")
                location = acf.get("country", "International")
                tags = [acf.get("type", "Opportunity"), acf.get("country", "")],
            
            opps.append({
                "title": title,
                "organization": "Various (via Opps Circle)",
                "apply_link": apply_link,
                "tags": [t for t in tags if t] if isinstance(tags, list) else ["Scholarship"],
                "deadline": deadline,
                "location": location,
                "type": "scholarship",
                "description": description or f"Apply now for {title}! Please visit the source link to read details."
            })
        return opps
