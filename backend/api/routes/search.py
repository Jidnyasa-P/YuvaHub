from fastapi import APIRouter, Query, Depends
from typing import List, Optional
from pydantic import BaseModel
from services.recommendation_engine import RecommendationEngine

router = APIRouter()
rec_engine = RecommendationEngine()

class SearchResult(BaseModel):
    id: str
    title: str
    organization: str
    type: str
    tags: List[str]
    apply_link: str
    description: str
    deadline: Optional[str]
    match_reason: Optional[str]
    verified: bool = True

class SearchResponse(BaseModel):
    results: List[SearchResult]
    meta: dict

@router.get("/", response_model=SearchResponse)
async def search_opportunities(
    q: str = Query(..., min_length=1),
    type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50)
):
    """
    Search for opportunities based on query and filters.
    """
    # In production, this would query MongoDB or an ElasticSearch index
    # For now, we reuse some logic from recommendation engine or return mock
    results = [
        {
            "id": f"search_{i}",
            "title": f"Result for {q} #{i}",
            "organization": "Yuvahub Network",
            "type": type or "internship",
            "tags": [q, "Tech"],
            "apply_link": "https://yuvahub.xyz",
            "description": f"A search result matched to your query: {q}",
            "deadline": "30 May 2025",
            "match_reason": "Matched via semantic search query."
        } for i in range(5)
    ]
    
    return {
        "results": results,
        "meta": {
            "query": q,
            "total_found": len(results),
            "agent_note": f"Found {len(results)} matches for '{q}'"
        }
    }
