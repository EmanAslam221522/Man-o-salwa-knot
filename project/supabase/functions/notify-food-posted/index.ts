import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotifyRequest {
  foodPostId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { foodPostId } = (await req.json()) as NotifyRequest;

    if (!foodPostId) {
      return new Response(
        JSON.stringify({ error: "foodPostId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the food post with seller info
    const { data: post, error: postError } = await supabase
      .from("food_posts")
      .select(
        "id, food_name, quantity, unit, price, expiry_time, location_text, lat, lng, user_id, profiles!user_id(name)"
      )
      .eq("id", foodPostId)
      .maybeSingle();

    if (postError || !post) {
      return new Response(
        JSON.stringify({ error: "Food post not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all subscribers with email alerts enabled
    const { data: subscribers, error: subError } = await supabase
      .from("food_subscriptions")
      .select(
        "user_id, notify_radius_km, email_enabled, profiles!user_id(id, email, name, lat, lng)"
      )
      .eq("email_enabled", true);

    if (subError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscribers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ notified: 0, message: "No subscribers to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter subscribers within their radius (if both have coordinates)
    const inRadius = subscribers.filter((sub: any) => {
      const profile = sub.profiles;
      if (!profile) return false;
      if (
        post.lat != null &&
        post.lng != null &&
        profile.lat != null &&
        profile.lng != null
      ) {
        const dist = haversineKm(
          profile.lat,
          profile.lng,
          post.lat,
          post.lng
        );
        return dist <= Number(sub.notify_radius_km);
      }
      // If no coordinates, notify everyone (fallback)
      return true;
    });

    // Create notification records and simulate email sending
    let sentCount = 0;
    for (const sub of inRadius) {
      const profile = sub.profiles;

      // Insert notification record
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          food_post_id: post.id,
          subscriber_id: sub.user_id,
          channel: "email",
          status: "sent",
        });

      if (!notifError) {
        sentCount++;
        // In production, an email service (Resend, SendGrid, etc.) would be called here.
        // The notification record above is the durable log of the alert.
        console.log(
          `[FOOD ALERT] To: ${profile.email} | Food: ${post.food_name} | Qty: ${post.quantity}${post.unit} | Price: ${post.price} | Location: ${post.location_text} | Expiry: ${post.expiry_time}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        notified: sentCount,
        totalSubscribers: subscribers.length,
        inRadius: inRadius.length,
        foodName: post.food_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
