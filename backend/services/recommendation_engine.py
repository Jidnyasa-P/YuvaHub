import time
import logging
from services.database import db

class RecommendationEngine:
    """
    Core feed scoring engine querying real data from MongoDB.
    """
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    async def get_personalized_feed(self, user_id: str, page: int, limit: int):
        """
        Fetches opportunities from MongoDB.
        """
        if not db.db:
            return self._get_mock_response(user_id, page)

        skip = (page - 1) * limit
        cursor = db.db.opportunities.find({}).sort("created_at", -1).skip(skip).limit(limit)
        items = []
        async for doc in cursor:
            doc['id'] = str(doc.get('_id', ''))
            if '_id' in doc: del doc['_id']
            items.append(doc)

        return {
            "num_results": len(items),
            "next_page": page + 1 if len(items) == limit else None,
            "items": items
        }

    async def get_trending_feed(self, page: int, limit: int):
        if not db.db:
            return self._get_mock_trending(page)

        skip = (page - 1) * limit
        # In real scenario, filter for 'trending' flag or sort by saves
        cursor = db.db.opportunities.find({}).sort("created_at", -1).skip(skip).limit(limit)
        items = []
        async for doc in cursor:
            doc['id'] = str(doc.get('_id', ''))
            if '_id' in doc: del doc['_id']
            items.append(doc)

        return {
            "num_results": len(items),
            "next_page": page + 1 if len(items) == limit else None,
            "items": items
        }

    def _get_mock_response(self, user_id, page):
        return {
            "num_results": 2,
            "next_page": page + 1,
            "items": [
                {
                    "id": f"real_data_pending_{page}",
                    "title": "Awaiting Live Ingestion...",
                    "organization": "Yuvahub System",
                    "type": "status",
                    "tags": ["system", "startup"],
                    "apply_link": "https://yuvahub.xyz"
                }
            ]
        }

    def _get_mock_trending(self, page):
         return self._get_mock_response("trending", page)

    def get_fallback_feed(self):
        """
        Tier 5 Fallback.
        """
        return [
            {
                "id": "fallback_1",
                "title": "Global Tech Fellowship",
                "organization": "Yuvahub Network",
                "type": "fellowship",
                "tags": ["Remote", "Leadership"],
                "apply_link": "https://yuvahub.xyz"
            }
        ]
