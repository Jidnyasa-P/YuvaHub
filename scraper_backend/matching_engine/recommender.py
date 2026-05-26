from typing import List, Dict, Any
import datetime

class MatchingEngine:
    def __init__(self, db_session):
        self.db = db_session

    async def get_score(self, user_profile: Dict[str, Any], opportunity: Dict[str, Any]) -> float:
        """
        Calculates a recommendation score (0.0 to 1.0) based on multiple factors.
        """
        score = 0.0
        weights = {
            "tags": 0.5,
            "location": 0.2,
            "category": 0.2,
            "freshness": 0.1
        }
        
        # 1. Tag Match (Cosine similarity or Jaccard in a real ML model. Here: Jaccard overlap)
        user_tags = set([t.lower() for t in user_profile.get("interests", [])])
        opp_tags = set([t.lower() for t in opportunity.get("tags", [])])
        if user_tags and opp_tags:
            intersection = len(user_tags.intersection(opp_tags))
            score += (intersection / len(user_tags)) * weights["tags"]
            
        # 2. Location Match
        if opportunity.get("mode") == "online":
            score += weights["location"] # Online is always a match
        elif str(user_profile.get("location")).lower() == str(opportunity.get("location")).lower():
            score += weights["location"]
            
        # 3. Category/Goal Match (e.g. Goal "Find Internship" matches Category "internship")
        goals = [g.lower() for g in user_profile.get("goals", [])]
        if opportunity.get("category") in goals:
            score += weights["category"]
            
        # 4. Freshness penalty (Decays over time)
        created_at_str = opportunity.get("created_at")
        if created_at_str:
            if isinstance(created_at_str, str):
                created_at = datetime.datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            else:
                created_at = created_at_str # assume datetime
            days_old = (datetime.datetime.now(datetime.timezone.utc) - created_at).days
            freshness_score = max(0.0, 1.0 - (days_old / 30.0)) # Drops to 0 after 30 days
            score += freshness_score * weights["freshness"]
            
        return score

    async def get_recommendations(self, user_id: str, limit: int = 10):
        """
        Fetches top N opportunities for a user.
        In production: Uses Vector Search (MongoDB Atlas Vector Search or Pinecone) + Redis Cache.
        """
        # Pseudo-code for aggregation:
        # profile = await self.db.users.find_one({"user_id": user_id})
        # opps = await self.db.opportunities.find({"status": "open"}).to_list(100)
        # scored = [(opp, await self.get_score(profile, opp)) for opp in opps]
        # scored.sort(key=lambda x: x[1], reverse=True)
        # return [op[0] for op in scored[:limit]]
        pass
