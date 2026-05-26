from fastapi import APIRouter, Depends
from pydantic import BaseModel
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class InteractionPayload(BaseModel):
    opportunity_id: str
    action_type: str # view, click, save, apply

async def get_current_user(user_id: str = "demo_user"):
    return {"user_id": user_id}

@router.post("/track")
async def track_interaction(
    payload: InteractionPayload,
    user: dict = Depends(get_current_user)
):
    """
    Log an interaction. This updates the user's interaction graph.
    """
    logger.info(f"User {user['user_id']} performed {payload.action_type} on {payload.opportunity_id}")
    # TODO: In production, push to MongoDB / Kafka
    return {"status": "success", "recorded": True}
