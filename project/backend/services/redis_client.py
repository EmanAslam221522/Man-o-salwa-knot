import json
import logging
from upstash_redis import Redis
from config import settings

logger = logging.getLogger(__name__)

def get_redis_client():
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        logger.warning("Upstash Redis credentials missing. Cache disabled.")
        return None
    try:
        return Redis(url=settings.UPSTASH_REDIS_REST_URL, token=settings.UPSTASH_REDIS_REST_TOKEN)
    except Exception as e:
        logger.error(f"Failed to connect to Upstash Redis: {e}")
        return None

redis_client = get_redis_client()

def cache_set(key: str, value, ttl_seconds: int = None):
    if not redis_client: return None
    try:
        val = json.dumps(value)
        if ttl_seconds:
            redis_client.setex(key, ttl_seconds, val)
        else:
            redis_client.set(key, val)
    except Exception as e:
        logger.error(f"Redis cache_set error: {e}")

def cache_get(key: str):
    if not redis_client: return None
    try:
        val = redis_client.get(key)
        return json.loads(val) if val else None
    except Exception as e:
        logger.error(f"Redis cache_get error: {e}")
        return None

def cache_conversation(user_id: str, messages: list):
    if not redis_client: return
    try:
        key = f"chat:{user_id}"
        # Keep last 10 messages
        val = json.dumps(messages[-10:])
        redis_client.setex(key, 86400, val) # 24h TTL
    except Exception as e:
        logger.error(f"Redis cache_conversation error: {e}")

def get_conversation(user_id: str) -> list:
    if not redis_client: return []
    try:
        val = redis_client.get(f"chat:{user_id}")
        return json.loads(val) if val else []
    except Exception as e:
        logger.error(f"Redis get_conversation error: {e}")
        return []

def push_to_workspace(food_post_id: str, message: dict):
    if not redis_client: return
    try:
        key = f"workspace:{food_post_id}"
        val = json.dumps(message)
        redis_client.rpush(key, val)
        redis_client.expire(key, 604800) # 7d TTL
    except Exception as e:
        logger.error(f"Redis push_to_workspace error: {e}")

def get_workspace_messages(food_post_id: str) -> list:
    if not redis_client: return []
    try:
        key = f"workspace:{food_post_id}"
        vals = redis_client.lrange(key, 0, -1)
        return [json.loads(v) for v in vals] if vals else []
    except Exception as e:
        logger.error(f"Redis get_workspace_messages error: {e}")
        return []
