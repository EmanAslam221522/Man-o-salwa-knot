import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  message: string;
  userId?: string;
  language?: "en" | "ur";
}

interface FoodPostRow {
  id: string;
  food_name: string;
  quantity: number;
  unit: string;
  price: number;
  original_price: number | null;
  expiry_time: string | null;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  status: string;
  profiles: { name: string; rating: number; rating_count: number } | null;
}

function haversineKm(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildContext(posts: FoodPostRow[]): string {
  if (posts.length === 0) {
    return "No food posts are currently available on the platform.";
  }
  const lines = posts.map((p, i) => {
    const expiry = p.expiry_time
      ? new Date(p.expiry_time).toLocaleString("en-PK")
      : "no expiry set";
    const seller = p.profiles?.name ?? "Unknown kitchen";
    const rating = p.profiles?.rating ?? "unrated";
    const origStr = p.original_price ? ` (original price: Rs ${p.original_price}/${p.unit})` : "";
    return `${i + 1}. ${p.food_name} — ${p.quantity} ${p.unit} at Rs ${p.price}/${p.unit}${origStr}. Seller: ${seller} (rating: ${rating}). Location: ${p.location_text ?? "unknown"}. Available until: ${expiry}. Description: ${p.description ?? "N/A"}`;
  });
  return `Currently available food posts on ManOSalwaKnot:\n${lines.join("\n")}`;
}

function extractBudget(text: string): number | null {
  const match = text.match(/(?:rs|rs\.|rupees|₹)\s*(\d[\d,]*)/i) ||
    text.match(/(\d[\d,]*)\s*(?:rs|rupees|₹)/i) ||
    text.match(/budget\s*(?:of|is|:)?\s*(\d[\d,]*)/i);
  if (match) return parseInt(match[1].replace(/,/g, ""));
  return null;
}

function extractPeople(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:people|persons|kids|children|guests)/i) ||
    text.match(/(?:for|feed)\s*(\d+)/i);
  if (match) return parseInt(match[1]);
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, userId, language = "en" } = (await req.json()) as ChatRequest;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all available food posts with seller info
    const { data: posts, error: postsError } = await supabase
      .from("food_posts")
      .select(
        "id, food_name, quantity, unit, price, original_price, expiry_time, location_text, lat, lng, description, status, profiles!user_id(name, rating, rating_count)"
      )
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(20);

    if (postsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch food data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const foodPosts = (posts ?? []) as unknown as FoodPostRow[];

    // Extract intent from user message
    const budget = extractBudget(message);
    const people = extractPeople(message);
    const lowerMsg = message.toLowerCase();

    // Filter posts based on intent
    let filtered = foodPosts;

    // Food name matching
    const foodKeywords = lowerMsg.match(
      /\b(biryani|daal|dal|rice|chawal|curry|wraps|paneer|chicken|veg|vegetable|roti|naan|karahi|nihari|haleem|korma|pulao|kebab|seekh|tikka|stew|soup)\b/g
    );
    if (foodKeywords) {
      const matched = foodPosts.filter(p =>
        foodKeywords.some(kw => p.food_name.toLowerCase().includes(kw))
      );
      if (matched.length > 0) filtered = matched;
    }

    // Budget filtering — find posts where total cost fits the budget
    if (budget) {
      const affordable = filtered.filter(p => p.price <= budget);
      if (affordable.length > 0) filtered = affordable;
    }

    // People-based estimation
    let peopleContext = "";
    if (people) {
      // Roughly 0.5kg per person for main dishes
      const estimatedKg = people * 0.5;
      const sortedByQty = [...filtered].sort((a, b) => a.quantity - b.quantity);
      const suitable = sortedByQty.filter(p => p.quantity >= estimatedKg * 0.7);
      if (suitable.length > 0) {
        filtered = suitable;
        peopleContext = `User wants to feed approximately ${people} people. Estimated need: ~${estimatedKg}kg of food. `;
      }
    }

    // Build the food context string
    const foodContext = buildContext(filtered);
    const userLat = 24.8607; // Default Karachi
    const userLng = 67.0011;

    // Add distance info if posts have coordinates
    const postsWithDistance = filtered.map(p => {
      if (p.lat && p.lng) {
        return { ...p, distance: haversineKm(userLat, userLng, p.lat, p.lng) };
      }
      return { ...p, distance: null };
    });

    const distanceContext = postsWithDistance
      .filter(p => p.distance !== null)
      .map(p => `${p.food_name}: ${p.distance!.toFixed(1)}km away`)
      .join(", ");

    // Try Groq if API key is available
    const groqKey = Deno.env.get("GROQ_API_KEY");

    let reply: string;

    if (groqKey) {
      const systemPrompt = `You are Salwa, the AI assistant for ManOSalwaKnot, a real-time food rescue marketplace in Pakistan. You help users find surplus food from restaurants and kitchens nearby.

IMPORTANT RULES:
- Always answer based ONLY on the real food data provided below. Never make up food items, prices, or restaurants.
- If no food matches the user's request, say so honestly and suggest they check back later or post a request.
- Prices are in Pakistani Rupees (Rs / PKR).
- Be concise, friendly, and practical. Suggest the best 1-2 options with details.
- If the user writes in Urdu/Roman Urdu, respond in Urdu/Roman Urdu. If they write in English, respond in English.
- Include the food name, quantity, price, seller name, location, and time left when recommending.
- You can suggest reserving food or contacting the seller.

${peopleContext}

REAL-TIME FOOD DATA FROM THE PLATFORM:
${foodContext}

${distanceContext ? `Distances from user: ${distanceContext}` : ""}

Current time: ${new Date().toISOString()}`;

      const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      if (groqResp.ok) {
        const groqData = await groqResp.json();
        reply = groqData.choices?.[0]?.message?.content ?? "";
      } else {
        reply = generateLocalReply(message, filtered, postsWithDistance, language);
      }
    } else {
      // Fallback: rule-based response using real data
      reply = generateLocalReply(message, filtered, postsWithDistance, language);
    }

    // Save chat messages
    if (userId) {
      await supabase.from("chat_messages").insert([
        { user_id: userId, role: "user", content: message },
        { user_id: userId, role: "assistant", content: reply },
      ]);
    }

    return new Response(
      JSON.stringify({ reply, language, postsFound: filtered.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateLocalReply(
  message: string,
  posts: FoodPostRow[],
  postsWithDist: (FoodPostRow & { distance: number | null })[],
  language: string
): string {
  if (posts.length === 0) {
    return language === "ur"
      ? "افسوس کہ اس وقت آپ کی تلاش کے مطابق کوئی کھانا دستیاب نہیں ہے۔ براہ کرم تھوڑی دیر بعد دوبارہ دیکھیں یا اپنی ضرورت پوسٹ کریں۔"
      : "Unfortunately, no food matching your request is available right now. Please check back soon or post a request so kitchens nearby can see it.";
  }

  const lower = message.toLowerCase();
  const isUrdu = language === "ur" || /urdu|biryani|khana|khana|kya|hai|chahiye|chahiye|mujhe|mujhe|jo|jo|karachi|lahore|pakistan/.test(lower);

  // Pick top 2 recommendations
  const top = postsWithDist.slice(0, 2);

  if (isUrdu) {
    const items = top.map(p => {
      const dist = p.distance ? `${p.distance.toFixed(1)}km دور` : "";
      const expiry = p.expiry_time ? `ختم ہونے کا وقت: ${new Date(p.expiry_time).toLocaleTimeString("ur-PK")}` : "";
      return `• ${p.food_name} — ${p.quantity} ${p.unit}، Rs ${p.price}/${p.unit}۔ فروش: ${p.profiles?.name ?? "کچن"}۔ مقام: ${p.location_text ?? "نامعلوم"}۔ ${dist} ${expiry}`;
    }).join("\n");
    return `آپ کے لیے بہترین آپشنز:\n\n${items}\n\nکیا آپ اسے بک کرنا چاہیں گے؟`;
  }

  const items = top.map(p => {
    const dist = p.distance ? `${p.distance.toFixed(1)}km away` : "";
    const expiry = p.expiry_time
      ? `available until ${new Date(p.expiry_time).toLocaleTimeString("en-PK")}`
      : "";
    const seller = p.profiles?.name ?? "Community kitchen";
    const rating = p.profiles?.rating ?? "new";
    return `• ${p.food_name} — ${p.quantity} ${p.unit} at Rs ${p.price}/${p.unit}. Seller: ${seller} (rating: ${rating}). Location: ${p.location_text ?? "unknown"}. ${dist} ${expiry}`;
  }).join("\n");

  const budget = extractBudget(message);
  const people = extractPeople(message);

  let prefix = "";
  if (people) {
    const totalCost = top[0] ? top[0].price * Math.ceil(people * 0.5) : 0;
    prefix = `To feed ${people} people, you'd need about ${Math.ceil(people * 0.5)}kg. `;
    if (budget) {
      prefix += budget >= totalCost
        ? `At Rs ${top[0].price}/${top[0].unit}, the total would be about Rs ${totalCost} — within your Rs ${budget} budget. `
        : `This would cost about Rs ${totalCost}, which is over your Rs ${budget} budget. `;
    }
  } else if (budget) {
    prefix = `Within your Rs ${budget} budget, here are the best options: `;
  }

  return `${prefix}Here are the best rescue drops near you:\n\n${items}\n\nWould you like to reserve one of these? I can help you get the seller's contact details.`;
}
