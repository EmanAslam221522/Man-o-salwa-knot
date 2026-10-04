import json
import math
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from config import settings
from services.supabase_client import supabase_client

@tool
def analyze_food_value_tool(price: float, original_price: float, quantity: int, rating: float = 5.0) -> str:
    """Scores food posts by value based on price, original price, quantity, and seller rating."""
    discount = 0
    if original_price and original_price > 0:
        discount = (original_price - price) / original_price
    
    # Arbitrary value score logic
    score = (discount * 50) + (min(rating, 5.0) * 10)
    if price == 0:
        score += 40 # Max score for free food
    return str(min(100, max(0, int(score))))

@tool
def suggest_pricing_tool(original_price: float, expiry_hours: int) -> str:
    """For business users, suggests optimal rescue pricing based on original price and time to expiry."""
    if expiry_hours < 2:
        return str(original_price * 0.2) # 80% off
    elif expiry_hours < 6:
        return str(original_price * 0.5) # 50% off
    else:
        return str(original_price * 0.8) # 20% off

@tool
def nutrition_match_tool(food_description: str, preferences: list) -> str:
    """Matches food to dietary preferences. Returns yes or no."""
    # Simplified mock implementation
    food_lower = food_description.lower()
    for pref in preferences:
        pref_lower = pref.lower()
        if pref_lower == 'veg' and ('meat' in food_lower or 'chicken' in food_lower or 'beef' in food_lower):
            return "no"
    return "yes"

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

tools = [analyze_food_value_tool, suggest_pricing_tool, nutrition_match_tool]

async def run_matchmaking_agent(user_id: str, budget: int = None, people: int = None, preferences: list = None, lat: float = None, lng: float = None) -> dict:
    if not settings.GROQ_API_KEY:
        return {
            "recommendations": [],
            "aiInsights": "API key missing. Unable to generate AI matchmaking insights."
        }

    # Fetch available food
    available_food = []
    if supabase_client:
        try:
            res = supabase_client.table('food_posts').select('*').eq('status', 'available').execute()
            available_food = res.data or []
        except:
            pass

    # Filter and score foods basically before LLM
    recommendations = []
    for food in available_food:
        f_lat = food.get("lat")
        f_lng = food.get("lng")
        distance = None
        if lat and lng and f_lat and f_lng:
            distance = haversine(lat, lng, f_lat, f_lng)
        
        f_price = food.get("price", 0)
        
        if budget and f_price > budget:
            continue
            
        score = 80 # Default
        if distance and distance < 5:
            score += 10
            
        recommendations.append({
            "foodId": food.get("id"),
            "foodName": food.get("food_name"),
            "score": score,
            "reason": "Good value and nearby.",
            "price": f_price,
            "sellerName": food.get("user_id", "Unknown"), # Ideally join profiles
            "distance": round(distance, 1) if distance else None,
            "timeLeft": "N/A" # Ideally compute from expiry_time
        })
    
    # Sort by score
    recommendations = sorted(recommendations, key=lambda x: x["score"], reverse=True)[:5]
    
    # Use LLM for insights
    llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=settings.GROQ_API_KEY)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an AI matchmaking expert for a food rescue app. Generate a short, insightful 1-2 sentence recommendation based on user criteria and found food."),
        ("user", "User Budget: {budget}, People: {people}, Preferences: {prefs}. Found Food: {food_data}")
    ])
    
    try:
        chain = prompt | llm
        insight_res = await chain.ainvoke({
            "budget": budget,
            "people": people,
            "prefs": preferences or [],
            "food_data": json.dumps(recommendations)
        })
        ai_insights = insight_res.content
    except Exception as e:
        ai_insights = f"Based on your criteria, we found {len(recommendations)} matching items."

    return {
        "recommendations": recommendations,
        "aiInsights": ai_insights
    }
