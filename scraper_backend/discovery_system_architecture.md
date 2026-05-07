# Yuvahub.xyz - Smart Search & Recommendation Architecture

This document describes the design and implementation of the dual-mode discovery system for Yuvahub.xyz, providing both hyper-personalized ("Smart Search") and serendipitous ("Explore") discovery experiences.

## 1. UX Flow

**The Core Interaction:**
- Users land on the `Dashboard/Feed` view.
- At the top of the feed is a prominent, modern **Mode Toggle** (e.g., a pill-shaped sliding toggle: `[ ✨ Smart Match | 🌍 Explore ]`).
- **Smart Match Mode (Default):** The feed feels highly curated. Sections like "Best Matches for You", "Expiring Soon", and "Near You".
- **Explore Mode:** The feed opens up. Sections like "Trending Worldwide", "Hidden Gems", "Popular in Other Fields".
- **Interaction Feedback:** As the user scrolls (Infinite Scroll), the system loads more. Clicking, saving, or hiding cards immediately sends telemetry to the backend to update their preference vector.

## 2. Recommendation Architecture

The system uses a **Rule-Based + Weighted Scoring Engine** (Content-Based Filtering and implicit Tracking) rather than heavy LLMs.

**Components:**
1. **Interaction Tracker:** Logs clicks, saves, application outbound clicks.
2. **Preference Vector:** A dynamic user profile updated nightly (or real-time via Redis) that weights tags (e.g., `{"AI/ML": 0.8, "Web Dev": 0.2}`).
3. **Scoring Engine:** Calculates a match score for user-opportunity pairs.
4. **Feed Aggregator:** Combines queries (e.g., top scored, nearest, trending) and interleaves them based on the active mode limiters.

## 3. Scoring Formulas

**Smart Search Score (0.0 to 1.0):**
`Total Score = (W1 * TagMatch) + (W2 * LocationMatch) + (W3 * UrgencyScore) + (W4 * InteractionBoost)`

*   **TagMatch (W1 = 0.50):** Overlap between Opportunity Tags and User Preference Vector.
*   **LocationMatch (W2 = 0.20):** 1.0 if Online or City matches. 0.0 otherwise.
*   **UrgencyScore (W3 = 0.15):** Closer deadlines score higher (e.g., 1.0 for < 3 days, decaying to 0.0 for > 30 days).
*   **InteractionBoost (W4 = 0.15):** If the opportunity is from an organizer the user previously liked.

**Explore Score (Trending/Popularity):**
`Total Score = (W1 * Velocity) + (W2 * RandomSerendipity) + (W3 * TagMatch_LowWeight)`

*   **Velocity:** `(Views in last 24h * 1) + (Saves in last 24h * 5) / time_since_posted_hours`
*   **RandomSerendipity:** A random float between 0 and 0.2 to shuffle the feed.

## 4. Feed Generation Logic

**Smart Search Mode (/api/v1/feed/smart):**
- Query DB for opportunities `status = open`.
- Apply Scoring Formula (Smart Search Score).
- Group into sections:
  - Top 10 by Score -> "Best Matches"
  - High urgency, score > 0.5 -> "Expiring Soon"
  - Location match, Offline mode -> "Nearby Opportunities"

**Explore Mode (/api/v1/feed/explore):**
- Query DB for opportunities `status = open`.
- Sort by Velocity score.
- Inject "Random Discovery" (random sample query from DB).
- Group into sections:
  - Top Velocity -> "Trending Worldwide"
  - Newest sorted by time -> "New Arrivals"
  - Random sample -> "Hidden Gems"

## 5. Backend APIs

```python
# FastAPI Endpoints
@app.get("/api/v1/feed/smart")
async def get_smart_feed(user_id: str, page: int = 1, limit: int = 20):
    # Calculates personalized scored feed
    pass

@app.get("/api/v1/feed/explore")
async def get_explore_feed(page: int = 1, limit: int = 20):
    # Returns trending and diverse results
    pass

@app.post("/api/v1/interactions")
async def log_interaction(user_id: str, opportunity_id: str, action: str):
    # action in ['view', 'save', 'apply_click', 'dismiss']
    pass
```

## 6. MongoDB Schema Updates

```python
class UserProfile(Document):
    # Existing fields...
    
    # New Fields for Personalization Memory
    tag_weights: dict = {}  # e.g., {"python": 1.5, "hackathon": 2.0}
    ignored_opportunities: List[str] = [] # ObjectIds
    liked_organizations: List[str] = []

class Opportunity(Document):
    # Existing fields...
    
    # New Fields for Explore mode velocity
    views_24h: int = 0
    saves_24h: int = 0
    trending_score: float = 0.0

class InteractionLogs(Document):
    user_id: str
    opportunity_id: str
    action: str  # view, save, apply, hide
    timestamp: datetime
```

## 7. Optimization & Caching Strategy

1. **Denormalized Pre-computation:** Run a nightly Cron job to update `trending_score` for all open opportunities and cache the top 100 in Redis (`EXPLORE_FEED_CACHE`).
2. **User Cache:** Cache the user's `tag_weights` in Redis so the scoring engine can instantly access them without a DB hit.
3. **Pagination:** Use cursor-based pagination (using the calculated Score as the cursor alongside ObjectId) rather than `skip()` and `limit()`.

## 8. Scalability Strategy

- **Stateless APIs:** The scoring math is done in memory on the API nodes after fetching raw documents.
- **Read Replicas:** Read heavily from MongoDB secondary nodes to keep the primary node free for the interaction writes.
- **Batch Writes:** Instead of writing every interaction to MongoDB instantly, push them to a Redis Stream or RabbitMQ, and batch-insert to MongoDB every 10 seconds.
