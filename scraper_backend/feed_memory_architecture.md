# Yuvahub.xyz - Feed Memory & Incremental Update Architecture

This document details the transition from a volatile, replace-everything search feed to a stable, incremental, memory-persisted feed—similar to the experiences found on Instagram, LinkedIn, and YouTube.

## 1. Feed Architecture & Principles

**The Core Challenge:** Whenever an AI/recommendation engine returns new opportunities, replacing the entire UI is jarring. Users lose their place and previous discoveries.

**The Solution:** An Append/Prepend Incremental Feed.
- **Smart Search Mode:** Highly stable. Uses a personalized feed cache. New opportunities are requested incrementally and *prepended* (or placed in a "New Today" section), while older opportunities are pushed down ("Previously Seen").
- **Explore Mode:** More dynamic. Mixes cached results with random high-velocity opportunities. Infinite scrolling *appends* new blocks of serendipitous content.

## 2. Caching Strategy

We utilize a **Two-Tiered Cache Architecture**:
1. **Redis Hot Cache (Memory):** Holds the latest 100 interaction events per user and rapid velocity metrics for opportunities (views/saves in the last hour).
2. **MongoDB Feed Snapshots (Persistent):** Each user has a persisted array of `feed_items` grouped by `mode`. This prevents feed regeneration on every app launch. 

## 3. MongoDB Schema Updates

We introduce the `CachedFeed` and `InteractionHistory` schemas.

```python
from datetime import datetime
from pydantic import Field
from beanie import Document
from typing import List, Optional

class FeedItem(BaseModel):
    opportunity_id: str
    added_at: datetime
    score_at_insertion: float
    source_query: str # e.g., "smart_match", "explore_trending", "explore_random"
    is_seen: bool = False

class CachedFeed(Document):
    user_id: str
    mode: str  # 'smart' or 'explore'
    items: List[FeedItem] = []
    last_refresh: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "cached_feeds"
        indexes = [["user_id", "mode"]]

class UserInteraction(Document):
    user_id: str
    opportunity_id: str
    interaction_type: str # 'view', 'read_more', 'save', 'apply_click', 'dismiss'
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "user_interactions"
```

## 4. Incremental Recommendation Algorithm

Instead of calculating a top-100 list and returning it, the algorithm behaves as follows for a **Manual Refresh** (Pull down) or **Scheduled Refresh**:

### Step 1: Identify "Known" Opportunities
Retrieve `opportunity_id`s already present in the user's `CachedFeed` and `UserInteraction` (specifically 'dismiss' or 'apply').

### Step 2: Fetch Delta (New Candidates)
Query the database for highly scoring opportunities *excluding* the "Known" list.
Apply the `Smart Match Score`.

### Step 3: Incremental Merge
1.  **Decay Old Scores:** For items already in the feed, decay their relevance by 5% per day.
2.  **Prepend New Items:** Take the top `N` (e.g., 5-10) new candidates and insert them at the *top* of the `CachedFeed.items` array.
3.  **Truncate:** If the feed exceeds `MAX_FEED_SIZE` (e.g., 500), drop the lowest-scoring ancient items from the tail.

## 5. Feed Generation Logic & Sections

When the client requests `/api/v1/feed/smart`, the backend groups the `CachedFeed` data:

-   **New Today:** Items added in the last 24 hours that are `is_seen == False`.
-   **Expiring Soon:** Items across the entire feed where `deadline` is < 3 days away.
-   **Recommended for You:** Highest scoring items that are unread.
-   **Previously Seen:** Items where `is_seen == True`, sorted by original insertion date.

## 6. API Changes

```python
@app.post("/api/v1/feed/{mode}/refresh")
async def refresh_feed(user_id: str, mode: str):
    """
    Computes a delta of new recommendations, prepends them to the CachedFeed,
    and returns the NEW items so the frontend can animate them in.
    """
    pass

@app.get("/api/v1/feed/{mode}")
async def get_feed(user_id: str, mode: str, skip: int = 0, limit: int = 20):
    """
    Paginates through the existing CachedFeed for endless scrolling.
    """
    pass

@app.post("/api/v1/feed/mark-seen")
async def mark_items_seen(user_id: str, opportunity_ids: List[str]):
    """
    Called periodically by frontend intersection observers when items scroll into view.
    """
    pass
```

## 7. Frontend Feed Behavior (Implementation Guidance)

1.  **Initial Load:** The frontend fetches the user's persistent feed without triggering an AI search. It renders immediately from cache.
2.  **Pull-to-Refresh / Refresh Button:** Shows a top spinner. Hits `/refresh`. New items are animated in at the top using a slide-down transition.
3.  **Infinite Scroll:** A sentinel `div` at the bottom uses `IntersectionObserver` to hit `/api/v1/feed/{mode}` with `skip=currentLength`. Appends quietly to the bottom.
4.  **View Tracking:** As elements remain in the viewport for $>2$ seconds, an observer collects their IDs and debounces a `/mark-seen` call.
