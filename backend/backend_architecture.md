# Yuvahub.xyz - FastAPI Backend Architecture & Migration Plan

## 1. Final API Architecture
The architecture transitions Yuvahub from a "fat client" (React + Gemini API) to a "thin client" (React) with a centralized FastAPI intelligence layer.

**Layers:**
1. **API Router Layer (`/api/routes`):** Handles HTTP requests, validation (Pydantic), and auth.
2. **Service Layer (`/services`):** Contains business logic (Feed Generation, Recommendation Scoring, Trending Calculation).
3. **Data Access Layer (`/database.py`):** Motor (async MongoDB) queries for fast retrieval.

## 2. Endpoint Structure

### Core User Feeds
* `GET /api/v1/feed/smart` - Gets personalized recommendations based on user vector/interactions.
* `GET /api/v1/feed/explore` - Gets chronologically sorted or trending opportunities.
* `POST /api/v1/feed/refresh` - Forces a feed regeneration.

### Opportunities & Interactions
* `GET /api/v1/opportunities/{id}` - Get full detail for an opportunity.
* `POST /api/v1/interactions/track` - Log view, click, save, or apply (powers the recommendation engine).

### Admin & Observability
* `GET /api/v1/admin/health` - System health check.
* `GET /api/v1/admin/scrapers` - Status of all scrapers.
* `POST /api/v1/admin/scrapers/trigger` - Manually start a source scrape.
* `GET /api/v1/admin/issues` - Stream of WARNING/CRITICAL internal logs.

## 3. Feed Engine Migration Plan
**Current State:** Frontend passes Profile + Cache to Gemini via `@google/genai` to generate the feed.
**Target State:**
1. **Frontend:** React requests `GET /api/v1/feed/smart?page=1`.
2. **Backend (FastAPI):**
   - Fetches User Interactions (liked tags, saved orgs).
   - Queries MongoDB using Aggregation Pipeline: 
     - Filter: Non-expired deadlines.
     - Sort: Weighted score (Tag Match * 0.6 + Org Match * 0.2 + Freshness * 0.2).
   - Returns paginated `OpportunityResponse` schema.
3. **No LLM in Critical Path:** Feed generation latency drops from ~4000ms (Gemini) to ~80ms (MongoDB Aggregation).

## 4. Response Schemas (Pydantic)
```python
class OpportunityResponse(BaseModel):
    id: str
    title: str
    organization: str
    type: str # hackathon, internship
    deadline: datetime
    match_score: Optional[float] = None
    tags: List[str]
    apply_link: str

class FeedResponse(BaseModel):
    items: List[OpportunityResponse]
    next_cursor: Optional[str]
    is_fallback: bool = False
```

## 5. Security & Rate Limiting
- **JWT Auth:** Firebase verify_id_token middleware for all routes.
- **Admin RBAC:** Only `uditt490@gmail.com` (or specified admin emails) can hit `/api/v1/admin/*`.
- **Rate Limiting:** `slowapi` injected into FastAPI to limit `/feed/refresh` to 2 per minute to prevent DB spam.

## 6. Frontend Integration Flow
React components will use `SWR` or `React Query` for data fetching.
```javascript
// Example thin frontend client
const { data, isLoading } = useSWR('/api/v1/feed/smart', fetcher)
if (isLoading) return <FeedSkeleton />
return <FeedList items={data.items} />
```

## 7. Next Scaling Phase
Once these APIs are stable and handling 10k users:
1. Move from Aggregation Pipeline to dedicated Vector Search (MongoDB Atlas Vector Search) using pre-computed embeddings.
2. Introduce Redis for caching `/feed/explore` since it is global for all users.
