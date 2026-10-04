import math
import uuid
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel
from services.supabase_client import supabase_client
from services.email_service import send_food_alert

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email")

class NotifyRequest(BaseModel):
    foodPostId: Optional[str] = None
    foodDetails: Optional[Dict[str, Any]] = None

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.post("/notify")
async def notify_endpoint(req: NotifyRequest):
    food_details = dict(req.foodDetails or {})
    
    # Try fetching real post from database if foodPostId is a valid UUID
    if req.foodPostId and supabase_client:
        is_valid_uuid = False
        try:
            uuid.UUID(str(req.foodPostId))
            is_valid_uuid = True
        except (ValueError, AttributeError):
            is_valid_uuid = False
            
        if is_valid_uuid:
            try:
                post_res = supabase_client.table('food_posts').select('*').eq('id', req.foodPostId).execute()
                if post_res.data:
                    post = post_res.data[0]
                    seller_name = "Local Kitchen"
                    if post.get('user_id'):
                        try:
                            user_res = supabase_client.table('profiles').select('name').eq('id', post['user_id']).execute()
                            if user_res.data:
                                seller_name = user_res.data[0].get('name', 'Local Kitchen')
                        except Exception:
                            pass
                    food_details = {
                        "id": post.get('id', req.foodPostId),
                        "food_name": post.get('food_name', food_details.get('food_name', 'Surplus Food')),
                        "quantity": post.get('quantity', food_details.get('quantity', 1)),
                        "unit": post.get('unit', food_details.get('unit', 'portions')),
                        "price": post.get('price', food_details.get('price', 0)),
                        "location_text": post.get('location_text', food_details.get('location_text', 'Nearby')),
                        "seller_name": seller_name,
                        "expiry_time": post.get('expiry_time', food_details.get('expiry_time', 'Soon'))
                    }
            except Exception as e:
                logger.warning(f"Error fetching post by uuid: {e}")

    # Fallback default values
    if not food_details.get("food_name"):
        food_details["food_name"] = "Fresh Surplus Food Drop"
    if not food_details.get("location_text"):
        food_details["location_text"] = "City Center / Nearby"

    notified_count = 0

    # 1. Fetch real subscribers if database available
    if supabase_client:
        try:
            subs_res = supabase_client.table('food_subscriptions').select('*').eq('email_enabled', True).execute()
            subs = subs_res.data or []
            
            p_lat = food_details.get('lat') or 24.8607
            p_lng = food_details.get('lng') or 67.0011
            
            for sub in subs:
                profile_res = supabase_client.table('profiles').select('email, lat, lng').eq('id', sub['user_id']).execute()
                if not profile_res.data:
                    continue
                profile = profile_res.data[0]
                email = profile.get('email')
                
                # Check radius if both have coordinates, else default to matching
                u_lat = profile.get('lat')
                u_lng = profile.get('lng')
                radius = sub.get('notify_radius_km', 5)
                
                within_radius = True
                if p_lat and p_lng and u_lat and u_lng:
                    dist = haversine_km(p_lat, p_lng, u_lat, u_lng)
                    within_radius = (dist <= radius)
                    
                if within_radius and email:
                    try:
                        send_food_alert(email, food_details)
                        notified_count += 1
                        try:
                            supabase_client.table('notifications').insert({
                                "food_post_id": req.foodPostId or "demo-post",
                                "subscriber_id": sub['user_id'],
                                "channel": "email",
                                "status": "sent"
                            }).execute()
                        except Exception:
                            pass
                    except Exception as err:
                        logger.warning(f"Could not deliver to subscriber {email}: {err}")
        except Exception as e:
            logger.warning(f"Error notifying subscribers: {e}")

    # 2. ALWAYS deliver to registered sandbox email (emanaslam543@gmail.com)
    try:
        send_food_alert("emanaslam543@gmail.com", food_details)
        notified_count += 1
    except Exception as e:
        logger.error(f"Error sending to demo email: {e}")

    return {"notified": notified_count, "food_details": food_details}
