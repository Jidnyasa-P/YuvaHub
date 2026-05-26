from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from services.recommendation_engine import RecommendationEngine

router = APIRouter()
rec_engine = RecommendationEngine() # Injected service

class BaseOpportunity(BaseModel):
    id: str
    title: str
    organization: Optional[str] = "Unknown"
    type: Optional[str] = "opportunity"
    tags: Optional[List[str]] = []
    apply_link: Optional[str] = "#"
    deadline: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

    class Config:
        extra = "allow"

class FeedResponse(BaseModel):
    items: List[BaseOpportunity]
    next_page: Optional[int]
    is_fallback: bool = False

# Dummy Dependency for User injection (Replace with Firebase auto-verify)
async def get_current_user(user_id: str = "demo_user"):
    return {"user_id": user_id, "email": "uditt490@gmail.com"}

@router.get("/smart", response_model=FeedResponse)
async def get_smart_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50),
    user: dict = Depends(get_current_user)
):
    """
    Returns personalized opportunity feed based on user interactions.
    """
    try:
        results = await rec_engine.get_personalized_feed(user["user_id"], page, limit)
        return FeedResponse(items=results['items'], next_page=results['next_page'])
    except Exception as e:
        # Fallback layer integrated directly into the backend
        return FeedResponse(items=rec_engine.get_fallback_feed(), next_page=None, is_fallback=True)

@router.get("/explore", response_model=FeedResponse)
async def get_explore_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50)
):
    """
    Returns generic trending/latest opportunities. High cache hit rate.
    """
    results = await rec_engine.get_trending_feed(page, limit)
    return FeedResponse(items=results['items'], next_page=results['next_page'])
