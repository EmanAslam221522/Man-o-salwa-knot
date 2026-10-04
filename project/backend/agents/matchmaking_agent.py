import json
import math
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from config import settings
from services.supabase_client import supabase_client

FALLBACK_MATCH_FOOD = [
    {"id": "mock-1", "food_name": "Chicken Biryani", "price": 350, "original_price": 700, "quantity": 8, "unit": "kg", "lat": 24.8607, "lng": 67.0011, "location_text": "Bahadurabad, Karachi", "seller_name": "Nawab Kitchen"},
    {"id": "mock-2", "food_name": "Paneer Wraps", "price": 120, "original_price": 250, "quantity": 24, "unit": "packs", "lat": 24.8620, "lng": 67.0050, "location_text": "Gulberg, Lahore", "seller_name": "Green Leaf Cafe"},
    {"id": "mock-3", "food_name": "Daal Chawal Meals", "price": 180, "original_price": 350, "quantity": 12, "unit": "meals", "lat": 24.8580, "lng": 67.0030, "location_text": "Saddar, Rawalpindi", "seller_name": "Sahaara Community Kitchen"},
    {"id": "mock-4", "food_name": "Fresh Raita & Naan", "price": 80, "original_price": 160, "quantity": 15, "unit": "packs", "lat": 24.8650, "lng": 67.0100, "location_text": "Gulshan, Karachi", "seller_name": "Al-Rehman Kitchen"}
]

@tool
def analyze_food_value_tool(price: float, original_price: float, quantity: int, rating: float = 5.0) -> str:
    """Scores food posts by value based on price, original price, quantity, and seller rating."""
    discount = 0.5
    if original_price and original_price > 0:
        discount = (original_price - price) / original_price
    
    score = int((discount * 50) + (min(rating, 5.0) * 10))
    if price == 0:
        score += 40
    return str(min(99, max(50, score)))

@tool
def suggest_pricing_tool(original_price: float, expiry_hours: int) -> str:
    """For business users, suggests optimal rescue pricing based on original price and time to expiry."""
    if expiry_hours < 2:
        return f"Rs {int(original_price * 0.2)} (80% clearance discount to ensure zero waste)"
    elif expiry_hours < 5:
        return f"Rs {int(original_price * 0.5)} (50% value recovery price)"
    else:
        return f"Rs {int(original_price * 0.75)} (25% off surplus price)"

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def run_matchmaking_agent(user_id: str, budget: int = None, people: int = None, preferences: list = None, lat: float = None, lng: float = None) -> dict:
    budget_val = budget if budget and budget > 0 else 500
    people_val = people if people and people > 0 else 2

    # Fetch available food
    available_food = []
    if supabase_client:
        try:
            res = supabase_client.table('food_posts').select('*, seller:profiles!user_id(name, rating, role)').eq('status', 'available').execute()
            if res.data and len(res.data) > 0:
                available_food = res.data
        except Exception as e:
            print(f"Supabase error in matchmaking: {e}")

    if not available_food:
        available_food = FALLBACK_MATCH_FOOD

    # Filter and score foods
    recommendations = []
    for food in available_food:
        f_lat = food.get("lat") or 24.8607
        f_lng = food.get("lng") or 67.0011
        user_lat = lat or 24.8607
        user_lng = lng or 67.0011
        distance = round(haversine(user_lat, user_lng, f_lat, f_lng), 1)
        
        f_price = float(food.get("price", 0))
        orig_price = float(food.get("original_price") or (f_price * 2))
        
        discount_pct = int(((orig_price - f_price) / max(1, orig_price)) * 100) if orig_price > f_price else 50
        cost_per_person = int(f_price / max(1, people_val))
        
        # Calculate matching score
        score = 75
        if f_price <= budget_val:
            score += 15
        if distance < 3.0:
            score += 8
        if discount_pct >= 50:
            score += 5

        score = min(99, score)

        seller_name = "Local Kitchen"
        if isinstance(food.get("seller"), dict):
            seller_name = food.get("seller", {}).get("name") or "Local Kitchen"
        elif food.get("seller_name"):
            seller_name = food.get("seller_name")

        reason = f"Costs Rs {cost_per_person}/person with {discount_pct}% discount. {distance} km away."

        recommendations.append({
            "foodId": str(food.get("id")),
            "foodName": food.get("food_name"),
            "score": score,
            "reason": reason,
            "price": int(f_price),
            "originalPrice": int(orig_price),
            "sellerName": seller_name,
            "distance": distance,
            "costPerPerson": cost_per_person,
            "timeLeft": "3-4h"
        })
    
    # Sort by score descending
    recommendations = sorted(recommendations, key=lambda x: x["score"], reverse=True)[:5]
    
    # Generate AI insights using Groq if available
    ai_insights = (
        f"For your Rs {budget_val} budget feeding {people_val} people, "
        f"{recommendations[0]['foodName']} offers the best nutritional economy at Rs {recommendations[0]['costPerPerson']} per person."
    )

    if settings.GROQ_API_KEY:
        try:
            llm = ChatGroq(model="openai/gpt-oss-120b", api_key=settings.GROQ_API_KEY, temperature=0.3)
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an AI nutrition and budget optimizer for ManOSalwaKnot food rescue. Give 1 crisp, encouraging sentence explaining why the top option best suits the user's budget and party size."),
                ("user", "Budget: Rs {budget}, People: {people}. Top Food: {top_food} at Rs {top_price}. Candidate list: {food_data}")
            ])
            chain = prompt | llm
            insight_res = await chain.ainvoke({
                "budget": budget_val,
                "people": people_val,
                "top_food": recommendations[0]["foodName"],
                "top_price": recommendations[0]["price"],
                "food_data": json.dumps(recommendations[:2])
            })
            if insight_res.content and len(insight_res.content.strip()) > 10:
                ai_insights = insight_res.content.strip()
        except Exception as e:
            print(f"Matchmaking LLM error: {e}")

    return {
        "recommendations": recommendations,
        "aiInsights": ai_insights,
        "pricingGuide": {
            "tier1": "8+ hrs to expiry: 20-30% discount",
            "tier2": "4-6 hrs to expiry: 40-50% discount (peak rescue volume)",
            "tier3": "<2 hrs to expiry: 70-80% discount or auto-donate to partner NGOs"
        }
    }
