import json
import hashlib
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from services.redis_client import cache_get, cache_set
from agents.matchmaking_agent import run_matchmaking_agent

router = APIRouter(prefix="/matchmaking")

class MatchmakingRequest(BaseModel):
    userId: str
    budget: Optional[int] = None
    people: Optional[int] = None
    preferences: Optional[List[str]] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

@router.post("")
async def matchmaking_endpoint(req: MatchmakingRequest):
    # Cache key based on input
    cache_key = f"match:{req.userId}:{req.budget}:{req.people}:{req.lat}:{req.lng}"
    
    cached = cache_get(cache_key)
    if cached:
        return cached
        
    result = await run_matchmaking_agent(
        user_id=req.userId,
        budget=req.budget,
        people=req.people,
        preferences=req.preferences,
        lat=req.lat,
        lng=req.lng
    )
    
    cache_set(cache_key, result, ttl_seconds=300) # 5 min TTL
    return result
