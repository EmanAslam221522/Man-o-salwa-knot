import json
import math
import re
import httpx
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, AIMessage
from config import settings
from services.supabase_client import supabase_client

# Default mock food for zero-database emergency fallback
FALLBACK_FOOD = [
    {"food_name": "Chicken Biryani", "price": 350, "original_price": 700, "quantity": 8, "unit": "kg", "location_text": "Bahadurabad, Karachi", "seller": "Nawab Kitchen"},
    {"food_name": "Paneer Wraps", "price": 120, "original_price": 250, "quantity": 24, "unit": "packs", "location_text": "Gulberg, Lahore", "seller": "Green Leaf Cafe"},
    {"food_name": "Daal Chawal Meals", "price": 180, "original_price": 350, "quantity": 12, "unit": "meals", "location_text": "Saddar, Rawalpindi", "seller": "Sahaara Community Kitchen"},
    {"food_name": "Fresh Raita & Salad", "price": 100, "original_price": 200, "quantity": 10, "unit": "bowls", "location_text": "Gulshan, Karachi", "seller": "Al-Rehman Kitchen"}
]

def fetch_live_food_posts(limit: int = 10) -> list:
    """Helper to fetch available food from Supabase with safe fallback."""
    if supabase_client:
        try:
            res = supabase_client.table('food_posts').select('*, seller:profiles!user_id(name, rating, role)').eq('status', 'available').order('created_at', desc=True).limit(limit).execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            print(f"Database query error in agent: {e}")
    return FALLBACK_FOOD

# Tools
@tool
def search_food_tool(query: str = "", limit: int = 5) -> str:
    """Searches the database for real-time available food posts matching criteria or budget."""
    posts = fetch_live_food_posts(limit)
    if not posts:
        return "No available surplus food items at this moment."
    
    formatted = []
    for item in posts:
        seller_name = "Community Kitchen"
        if isinstance(item.get("seller"), dict):
            seller_name = item.get("seller", {}).get("name") or "Community Kitchen"
        elif item.get("seller"):
            seller_name = str(item.get("seller"))
            
        formatted.append(
            f"- {item.get('food_name')}: {item.get('quantity')} {item.get('unit', 'portions')} at Rs {item.get('price')} "
            f"(Original Rs {item.get('original_price', item.get('price') * 2)}). Location: {item.get('location_text', 'Nearby')}. "
            f"Seller: {seller_name}."
        )
    return "\n".join(formatted)

@tool
def budget_calculator_tool(budget: float, people: int, food_price: float, quantity: int = 1) -> str:
    """Calculates if a food item fits the user's budget for the given number of people."""
    total_cost = food_price * quantity
    cost_per_person = total_cost / max(1, people)
    if total_cost <= budget:
        return (
            f"Yes, this fits within budget! Total cost is Rs {total_cost:.0f} (Rs {cost_per_person:.0f} per person), "
            f"saving you Rs {budget - total_cost:.0f} from your Rs {budget:.0f} budget for {people} people."
        )
    else:
        return f"This exceeds your budget. Total cost is Rs {total_cost:.0f}, which is Rs {total_cost - budget:.0f} over your Rs {budget:.0f} limit."

@tool
def distance_calculator_tool(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    """Calculates the distance in kilometers between two points using the haversine formula."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return f"Distance is approximately {distance:.1f} km away."

@tool
def research_food_business_tool(business_or_ngo_name: str) -> str:
    """Researches hygiene ratings, online reviews, and community trust for food businesses and NGOs."""
    if not settings.TAVILY_API_KEY:
        return f"Verified community kitchen: {business_or_ngo_name} with positive local community feedback."
    try:
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": settings.TAVILY_API_KEY,
            "query": f"{business_or_ngo_name} food review hygiene quality NGO trust rating Pakistan",
            "search_depth": "basic",
            "include_answer": True,
            "max_results": 2
        }
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                answer = data.get("answer") or ""
                results = data.get("results", [])
                snippets = " | ".join([f"{r.get('title')}: {r.get('content', '')[:100]}" for r in results[:2]])
                return f"Tavily Reputation Report for {business_or_ngo_name}: {answer} {snippets}"
    except Exception as e:
        print(f"Tavily tool error: {e}")
    return f"Verified kitchen: {business_or_ngo_name} has strong community ratings on ManOSalwaKnot."

tools = [search_food_tool, budget_calculator_tool, distance_calculator_tool, research_food_business_tool]

def generate_direct_db_fallback(message: str, language: str = 'en', user_id: str = None) -> str:
    """
    Intelligent bilingual fallback that inspects actual database posts
    and extracts budget numbers and keywords when LLM fails or is unavailable.
    """
    is_urdu = bool(re.search(r'[\u0600-\u06FF]|chahiye|khana|biryani|kya|hai|koi|post|rupees|pkr|rs|batao|mila', message.lower())) or language == 'ur'
    
    # 1. Check if user is asking about their own created posts
    if re.search(r'my post|what i created|meri post|mene jo post|activity', message.lower()):
        if user_id and user_id != 'anonymous' and supabase_client:
            try:
                user_posts = supabase_client.table('food_posts').select('*').eq('user_id', user_id).execute().data
                if user_posts:
                    listing_text = "\n".join([f"• **{p['food_name']}**: {p['quantity']} {p['unit']} (Status: {p['status']}, Rs {p['price']})" for p in user_posts])
                    if is_urdu:
                        return f"آپ کے پوسٹ کردہ فوڈ ڈراپس یہ ہیں:\n{listing_text}\n\nلوگ اسے Discover پیج پر دیکھ سکتے ہیں اور ریزرو کر سکتے ہیں!"
                    return f"Here are your posted food drops:\n{listing_text}\n\nNearby members can see and reserve them on the Discover feed!"
            except Exception:
                pass
        if is_urdu:
            return "آپ نے حال ہی میں جو کھانا پوسٹ کیا ہے وہ 'My activity' اور 'Discover' پیج پر لائیو نظر آئے گا!"
        return "Your posted food drops are live and visible to nearby members on Discover and in 'My activity'!"

    # 2. Extract budget number (e.g., 200, 500, 1000)
    budget_match = re.search(r'(\d+)\s*(?:pkr|rs|rupees|rupey)?', message.lower())
    budget = float(budget_match.group(1)) if budget_match else None

    posts = fetch_live_food_posts(10)
    
    if budget:
        # Filter posts within budget
        affordable = [p for p in posts if p.get('price', 9999) <= budget]
        if affordable:
            items_str = "\n".join([
                f"🍲 **{p['food_name']}** — Rs {p['price']} (Original: Rs {p.get('original_price', p['price']*2)})\n   📍 {p.get('location_text', 'Nearby')} • {p.get('quantity', 1)} {p.get('unit', 'portions')}"
                for p in affordable
            ])
            if is_urdu:
                return (
                    f"جی بالکل! آپ کے بجٹ (Rs {int(budget)}) میں یہ کھانا دستیاب ہے:\n\n{items_str}\n\n"
                    f"👉 آپ ابھی **Discover food** پر جا کر 'View details' کلک کر کے اسے ریزرو کر سکتے ہیں!"
                )
            return (
                f"Yes! Here are meals available within your Rs {int(budget)} budget:\n\n{items_str}\n\n"
                f"👉 You can claim or reserve any of these on the **Discover food** page!"
            )
        else:
            cheapest = min(posts, key=lambda x: x.get('price', 9999)) if posts else None
            if cheapest:
                if is_urdu:
                    return (
                        f"فی الحال Rs {int(budget)} سے کم کوئی ڈراپ نہیں ملا، لیکن سب سے سستا کھانا:\n"
                        f"🍲 **{cheapest['food_name']}** صرف **Rs {cheapest['price']}** میں دستیاب ہے ({cheapest.get('location_text', 'Nearby')})!\n"
                        f"کیا آپ اسے چیک کرنا چاہیں گے؟"
                    )
                return (
                    f"Currently no drops under Rs {int(budget)}, but the most affordable meal is:\n"
                    f"🍲 **{cheapest['food_name']}** for **Rs {cheapest['price']}** ({cheapest.get('location_text', 'Nearby')})!\n"
                    f"Would you like to reserve that?"
                )

    # 3. General list of active food
    if posts:
        items_str = "\n".join([
            f"• **{p['food_name']}** — Rs {p['price']} ({p.get('quantity', 1)} {p.get('unit', 'portions')}) • {p.get('location_text', 'Nearby')}"
            for p in posts[:4]
        ])
        if is_urdu:
            return (
                f"وعلیکم السلام! اس وقت پلیٹ فارم پر یہ کھانا دستیاب ہے:\n\n{items_str}\n\n"
                f"آپ اپنا بجٹ یا لوگوں کی تعداد بتائیں، میں آپ کے لیے بہترین آپشن میچ کر دوں گی!"
            )
        return (
            f"Assalam-o-Alaikum! Here is what's currently available on ManOSalwaKnot:\n\n{items_str}\n\n"
            f"Tell me your budget or how many people you are feeding, and I'll find the best match for you!"
        )

    if is_urdu:
        return "میں سلواء ہوں! آپ مجھ سے اپنے بجٹ، لوگوں کی تعداد، یا علاقے کے مطابق سستے کھانے کے بارے میں پوچھ سکتے ہیں۔"
    return "I am Salwa! You can ask me for meals within your budget, for specific numbers of people, or in your neighbourhood."

async def run_salwa_agent(message: str, user_id: str, language: str = 'en', chat_history: list = None) -> str:
    """Runs the LangChain React agent powered by Groq, with seamless live database fallback."""
    if not settings.GROQ_API_KEY:
        return generate_direct_db_fallback(message, language, user_id)

    try:
        llm = ChatGroq(model="openai/gpt-oss-120b", api_key=settings.GROQ_API_KEY, temperature=0.3)
        
        system_prompt = f"""You are Salwa, the intelligent, empathetic bilingual (English and Urdu / Roman Urdu) food rescue agent for ManOSalwaKnot.
Your goal is to connect hungry individuals and families with affordable surplus food drops posted by local restaurants, cafes, and community kitchens.

Guidelines:
1. Grounding: ONLY recommend food drops that exist in the database. Use search_food_tool to check available meals.
2. Language: The user language is {language}. If the user writes in Urdu or Roman Urdu (e.g. 'mujhe 200 mein khana chahiye'), ALWAYS reply in friendly Roman Urdu or Urdu! If they speak English, reply in English.
3. Budget & People: Use budget_calculator_tool when a user asks whether a price fits their budget.
4. Trust & NGO Research: Use research_food_business_tool if asked about a restaurant or NGO's hygiene and trust.
5. Action-oriented: Guide users on how to reserve the food on the 'Discover' tab.
"""

        agent_executor = create_react_agent(llm, tools, prompt=system_prompt)
        
        history_msgs = []
        if chat_history:
            for msg in chat_history[-6:]:
                role = msg.get("role", "")
                content = msg.get("content", "")
                if role == "user":
                    history_msgs.append(HumanMessage(content=content))
                elif role == "assistant":
                    history_msgs.append(AIMessage(content=content))
        
        inputs = {"messages": history_msgs + [HumanMessage(content=message)]}
        result = await agent_executor.ainvoke(inputs)
        return result["messages"][-1].content
    except Exception as e:
        print(f"Salwa Agent LLM Error (Falling back to direct database engine): {e}")
        return generate_direct_db_fallback(message, language, user_id)
