import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Any
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.base_scraper import BaseScraper

class MLHScraper(BaseScraper):
    source_name = "MLH"
    category = "hackathon"

    def __init__(self, use_proxy: bool = False):
        super().__init__(use_proxy)
        self.url = "https://mlh.io/seasons/2026/events"

    async def fetch_page(self, url: str) -> str:
        url = url if url else self.url
        headers = {"User-Agent": "Mozilla/5.0"}
        async with httpx.AsyncClient(headers=headers, timeout=10.0, proxies=self.proxies) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.text

    async def parse(self, html: str) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        events = []
        
        event_wrappers = soup.find_all("div", class_="event-wrapper")
        for wrapper in event_wrappers:
            try:
                title = wrapper.find("h3", class_="event-name").text.strip()
                link = wrapper.find("a", class_="event-link")["href"]
                date_str = wrapper.find("p", class_="event-date").text.strip()
                location = wrapper.find("div", class_="event-location").text.strip()
                
                events.append({
                    "title": title,
                    "organization": "Major League Hacking",
                    "apply_link": link,
                    "deadline": date_str,
                    "mode": "hybrid" if "Online" not in location else "online",
                    "location": location,
                    "tags": ["Hackathon", "MLH", "Student"],
                    "description": f"MLH Certified Hackathon - {title}"
                })
            except AttributeError:
                continue
                
        return events
