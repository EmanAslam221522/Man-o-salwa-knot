from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import time
from services.redis_client import get_conversation, cache_conversation
from agents.salwa_agent import run_salwa_agent
from services.supabase_client import supabase_client

router = APIRouter(prefix="/chat")

class ChatRequest(BaseModel):
    message: str
    userId: Optional[str] = 'anonymous'
    language: Optional[str] = 'en'

@router.post("")
async def chat_endpoint(req: ChatRequest):
    history = get_conversation(req.userId)
    
    reply = await run_salwa_agent(req.message, req.userId, req.language, history)
    
    # Update history
    history.append({"role": "user", "content": req.message})
    history.append({"role": "assistant", "content": reply})
    cache_conversation(req.userId, history)
    
    # Save to Supabase if not anonymous
    if req.userId != 'anonymous' and supabase_client:
        try:
            supabase_client.table('chat_messages').insert([
                {"user_id": req.userId, "role": "user", "content": req.message},
                {"user_id": req.userId, "role": "assistant", "content": reply}
            ]).execute()
        except Exception as e:
            print(f"Error saving chat to Supabase: {e}")
            
    return {
        "reply": reply,
        "language": req.language,
        "postsFound": 0 # simplified
    }
