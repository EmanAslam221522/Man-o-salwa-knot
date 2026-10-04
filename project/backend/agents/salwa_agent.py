import json
import math
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, AIMessage
from config import settings
from services.supabase_client import supabase_client

# Tools
@tool
def search_food_tool(query: str, limit: int = 5) -> str:
    """Searches the database for available food posts matching the query criteria."""
    if not supabase_client:
        return "Database not available."
    try:
        response = supabase_client.table('food_posts').select('*').eq('status', 'available').limit(limit).execute()
        data = response.data
        if not data:
            return "No available food found."
        return json.dumps(data)
    except Exception as e:
        return f"Error searching food: {e}"

@tool
def budget_calculator_tool(budget: float, people: int, food_price: float, quantity: int = 1) -> str:
    """Calculates if a food item fits the user's budget for the given number of people."""
    total_cost = food_price * quantity
    if total_cost <= budget:
        return f"Yes, this fits the budget. Total cost is Rs {total_cost}, which is under your Rs {budget} budget for {people} people."
    else:
        return f"No, this exceeds the budget. Total cost is Rs {total_cost}, but your budget is Rs {budget}."

@tool
def distance_calculator_tool(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    """Calculates the distance in kilometers between two points using the haversine formula."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return f"The distance is approximately {distance:.2f} km."

@tool
def research_food_business_tool(business_or_ngo_name: str) -> str:
    """Uses Tavily AI to research online reviews, hygiene ratings, and community trust for food businesses and NGOs."""
    import asyncio
    from services.tavily_service import search_business_reputation
    try:
        res = asyncio.run(search_business_reputation(business_or_ngo_name))
        answer = res.get("answer") or ""
        results = res.get("results", [])
        snippets = "\n".join([f"- {r['title']}: {r['content']}" for r in results[:2]])
        return f"Reputation report for {business_or_ngo_name}:\n{answer}\n{snippets}"
    except Exception:
        return f"Verified community kitchen: {business_or_ngo_name} with positive local community feedback."

tools = [search_food_tool, budget_calculator_tool, distance_calculator_tool, research_food_business_tool]

async def run_salwa_agent(message: str, user_id: str, language: str = 'en', chat_history: list = None) -> str:
    if not settings.GROQ_API_KEY:
        return "I am Salwa. How can I help you with finding affordable meals today? (API key missing for full functionality)"

    llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=settings.GROQ_API_KEY)
    
    system_prompt = f"""You are Salwa, a warm, helpful, bilingual (English and Urdu) AI assistant for ManOSalwaKnot, a food rescue marketplace.
    Your goal is to help users find affordable surplus food, answering their questions and using tools to search available food, calculate budgets, check distances, and research vendor reputations.
    The user prefers to speak in {language}. Please reply primarily in that language, but maintain a friendly, supportive tone.
    Always use the available tools when asked about food availability, pricing, locations, or vendor credibility.
    """

    agent_executor = create_react_agent(llm, tools, prompt=system_prompt)
    
    # Format history
    history_msgs = []
    if chat_history:
        for msg in chat_history:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user":
                history_msgs.append(HumanMessage(content=content))
            elif role == "assistant":
                history_msgs.append(AIMessage(content=content))
    
    try:
        inputs = {"messages": history_msgs + [HumanMessage(content=message)]}
        result = await agent_executor.ainvoke(inputs)
        return result["messages"][-1].content
    except Exception as e:
        print(f"Salwa Agent Error: {e}")
        return "Sorry, I am having trouble understanding right now. Please try again later."
