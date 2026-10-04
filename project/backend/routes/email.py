import math
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.supabase_client import supabase_client
from services.email_service import send_food_alert

router = APIRouter(prefix="/email")

class NotifyRequest(BaseModel):
    foodPostId: str

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.post("/notify")
async def notify_endpoint(req: NotifyRequest):
    if not supabase_client:
        return {"notified": 0, "error": "Database not available"}
        
    try:
        # Fetch food post
        post_res = supabase_client.table('food_posts').select('*').eq('id', req.foodPostId).execute()
        if not post_res.data:
            raise HTTPException(status_code=404, detail="Food post not found")
        post = post_res.data[0]
        
        # Fetch seller info for better email
        seller_name = "Local business"
        user_res = supabase_client.table('profiles').select('name').eq('id', post['user_id']).execute()
        if user_res.data:
            seller_name = user_res.data[0]['name']
            
        food_details = {
            "id": post['id'],
            "food_name": post.get('food_name'),
            "quantity": post.get('quantity'),
            "unit": post.get('unit'),
            "price": post.get('price'),
            "location_text": post.get('location_text'),
            "seller_name": seller_name,
            "expiry_time": post.get('expiry_time')
        }
        
        # Fetch subscribers
        subs_res = supabase_client.table('food_subscriptions').select('*').eq('email_enabled', True).execute()
        subs = subs_res.data or []
        
        notified_count = 0
        p_lat = post.get('lat')
        p_lng = post.get('lng')
        
        for sub in subs:
            # Need to get user email and location from profile
            profile_res = supabase_client.table('profiles').select('email, lat, lng').eq('id', sub['user_id']).execute()
            if not profile_res.data:
                continue
            profile = profile_res.data[0]
            
            # Check radius
            u_lat = profile.get('lat')
            u_lng = profile.get('lng')
            radius = sub.get('notify_radius_km', 5)
            
            if p_lat and p_lng and u_lat and u_lng:
                dist = haversine_km(p_lat, p_lng, u_lat, u_lng)
                if dist <= radius:
                    email = profile.get('email')
                    if email:
                        send_food_alert(email, food_details)
                        notified_count += 1
                        
                        # Record notification
                        supabase_client.table('notifications').insert({
                            "food_post_id": req.foodPostId,
                            "subscriber_id": sub['user_id'],
                            "channel": "email",
                            "status": "sent"
                        }).execute()
        
        # ALWAYS send to demo email
        send_food_alert("emanaslam543@gmail.com", food_details)
        notified_count += 1
        
        return {"notified": notified_count}
    except Exception as e:
        print(f"Error in notify: {e}")
        return {"notified": 0, "error": str(e)}
