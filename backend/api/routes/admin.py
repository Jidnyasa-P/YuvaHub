from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import asyncio
import random
from datetime import datetime
from sse_starlette.sse import EventSourceResponse

router = APIRouter()

async def verify_admin(user_email: str = "uditt490@gmail.com"):
    # Mock admin check
    if user_email != "uditt490@gmail.com":
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

@router.get("/health")
async def get_system_health(admin: bool = Depends(verify_admin)):
    """ Returns overall system health vitals """
    return {
        "status": "healthy",
        "database": "connected",
        "cache": "connected",
        "api_latency_ms": 120, # In production, compute from middleware
        "uptime_sec": 3600
    }

@router.get("/metrics")
async def get_metrics(admin: bool = Depends(verify_admin)):
    """ Returns aggregated metrics """
    return {
        "activeUsers": 1500, # Query DB
        "opportunitiesAdded": 312, # Query DB for last 24h
        "fallbackRate": 2.1,
        "apiLatency": 120
    }

@router.get("/scrapers")
async def get_scrapers_status(admin: bool = Depends(verify_admin)):
    """ Status of the scraper fleet """
    return [
        {"name": "Internshala", "status": "degraded", "lastRun": 120, "items": 45, "failures": 3, "proxyHealth": "amber"},
        {"name": "Devfolio", "status": "healthy", "lastRun": 10, "items": 112, "failures": 0, "proxyHealth": "green"},
        {"name": "Buddy4Study", "status": "failed", "lastRun": 1440, "items": 0, "failures": 5, "proxyHealth": "red"},
        {"name": "MLH", "status": "healthy", "lastRun": 60, "items": 15, "failures": 0, "proxyHealth": "green"}
    ]

@router.get("/incidents")
async def get_incidents(admin: bool = Depends(verify_admin)):
    """ Returns recent incidents """
    return [
        {"id": 1, "type": "CRITICAL", "component": "Scraper: Buddy4Study", "message": "Cloudflare 403 Forbidden. Proxy blocked.", "time": "10 mins ago"},
        {"id": 2, "type": "WARNING", "component": "Feed Engine", "message": "User feed generated with fallback data (Quota Exceeded)", "time": "25 mins ago"}
    ]

class TriggerPayload(BaseModel):
    source_name: str

@router.post("/scrapers/trigger")
async def trigger_scraper(payload: TriggerPayload, admin: bool = Depends(verify_admin)):
    """ Manually queue a scraper execution """
    return {"status": "queued", "source": payload.source_name}

# Global event queue for SSE (In-memory for MVP, Redis for production)
subscribers = []

@router.post("/test-emit")
async def test_emit_event(admin: bool = Depends(verify_admin)):
    """ Helper to simulate an internal system emitting an event """
    event_data = {
        "event": "INCIDENT",
        "data": {
            "id": int(datetime.utcnow().timestamp()),
            "type": "WARNING",
            "component": "API Gateway",
            "message": "High latency detected > 500ms",
            "time": "Just now"
        }
    }
    for sub in subscribers:
        await sub.put(event_data)
    return {"status": "emitted"}

@router.get("/stream/telemetry")
async def stream_telemetry(request: Request, admin: bool = Depends(verify_admin)):
    """ SSE Endpoint for live dashboard updates """
    queue = asyncio.Queue()
    subscribers.append(queue)
    
    async def event_generator():
        try:
            while True:
                # If client disconnects, stop generator
                if await request.is_disconnected():
                    break
                
                # Wait for an event
                event = await queue.get()
                yield event
        except asyncio.CancelledError:
            pass
        finally:
            subscribers.remove(queue)
            
    return EventSourceResponse(event_generator())
