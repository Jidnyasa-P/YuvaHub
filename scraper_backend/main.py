from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List

# Assume models are imported
# from database.models import Opportunity
# from matching_engine.recommender import MatchingEngine

app = FastAPI(title="Yuvahub Core Backend", version="1.0")

@app.get("/health")
async def health_check():
    return {"status": "ok", "system": "yuvahub-scraper-engine"}

@app.post("/api/v1/opportunities/trigger")
async def trigger_source_scrape(source_id: str, background_tasks: BackgroundTasks):
    """Admin endpoint to manually trigger a scrape for a source."""
    if source_id == "internshala":
        from scheduler.cron_tasks import run_internshala_scraper
        background_tasks.add_task(run_internshala_scraper.delay)
    elif source_id == "devfolio":
        from scheduler.cron_tasks import run_devfolio_scraper
        background_tasks.add_task(run_devfolio_scraper.delay)
    else:
        raise HTTPException(status_code=404, detail="Source not recognized")
        
    return {"status": "triggered", "source": source_id}

@app.get("/api/v1/recommendations")
async def get_user_recommendations(user_id: str):
    """
    Returns personalized opportunities.
    In real app, this calls MatchingEngine.
    """
    return {"user_id": user_id, "results": []} # Mock

@app.get("/api/v1/trending")
async def get_trending_opportunities():
    """
    Returns opportunities with high view/save metrics in the last 48 hours.
    """
    # Ex: return await Opportunity.find({"status": "open"}).sort(-Opportunity.views).limit(20).to_list()
    return []

@app.get("/api/v1/opportunities/nearby")
async def get_nearby_opportunities(lat: float, lon: float):
    """
    Geospatial Mongo query for offline/hybrid events.
    """
    return []
