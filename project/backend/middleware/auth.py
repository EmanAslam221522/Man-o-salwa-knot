from fastapi import Request, Depends
from services.supabase_client import supabase_client
import logging

logger = logging.getLogger(__name__)

async def get_current_user(request: Request):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        logger.warning("No valid authorization header found, allowing for hackathon.")
        return None
        
    token = auth_header.split(' ')[1]
    
    if not supabase_client:
        return None
        
    try:
        user_resp = supabase_client.auth.get_user(token)
        if user_resp.user:
            return user_resp.user
    except Exception as e:
        logger.warning(f"Auth error: {e}")
        
    return None
