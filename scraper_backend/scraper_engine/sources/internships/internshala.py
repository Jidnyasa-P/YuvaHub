import asyncio
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Any

# Adjust import according to actual deployment path
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.base_scraper import BaseScraper

class InternshalaScraper(BaseScraper):
    source_name = "Internshala"
    category = "internship"

    def __init__(self):
        super().__init__()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

    async def fetch_page(self, url: str) -> str:
        async with httpx.AsyncClient(headers=self.headers, timeout=15.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.text

    async def parse(self, html: str) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        internships = []
        
        # Internshala typically holds items in div class="individual_internship"
        containers = soup.find_all("div", class_="individual_internship")
        
        for container in containers:
            try:
                title_elem = container.find("h3", class_="heading_4_5")
                title = title_elem.text.strip() if title_elem else "Unknown Title"
                
                org_elem = container.find("div", class_="heading_6")
                org = org_elem.text.strip() if org_elem else "Unknown Org"
                
                link_elem = container.find("a", class_="view_detail_button")
                href = link_elem["href"] if link_elem else ""
                full_link = f"https://internshala.com{href}" if href else ""
                
                # Mock extraction of tags and details (requires parsing inner elements)
                tags = ["Internship"] 
                
                internships.append({
                    "title": title,
                    "organization": org,
                    "apply_link": full_link,
                    "tags": tags,
                    "mode": "hybrid", # Needs extraction
                    "location": "Multiple", # Needs extraction
                    "description": "Internshala Opportunity: " + title
                })
            except Exception as e:
                # Log parsing error for this specific item but continue
                continue
                
        return internships
