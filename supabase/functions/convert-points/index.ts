import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { telegram_id, points_cost, energy_amount } = await req.json();

    if (!telegram_id || !points_cost || !energy_amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (points_cost <= 0 || energy_amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amounts" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate conversion option exists in app_config
    const { data: configRow } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "point_conversions")
      .single();

    const defaultConversions = [
      { energy: 50, pointsCost: 3000 },
      { energy: 100, pointsCost: 5500 },
      { energy: 200, pointsCost: 10000 },
      { energy: 500, pointsCost: 24000 },
    ];

    const validOptions = (configRow?.value as any[]) || defaultConversions;
    const matchingOption = validOptions.find(
      (o: any) => o.pointsCost === points_cost && o.energy === energy_amount
    );

    if (!matchingOption) {
      return new Response(JSON.stringify({ error: "Invalid conversion option" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user state
    const { data: state } = await supabase
      .from("user_game_state")
      .select("points, energy")
      .eq("telegram_id", telegram_id)
      .single();

    if (!state) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (state.points < points_cost) {
      return new Response(JSON.stringify({ error: "Insufficient points" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newPoints = state.points - points_cost;
    const newEnergy = state.energy + energy_amount;

    const { error: updateErr } = await supabase
      .from("user_game_state")
      .update({ points: newPoints, energy: newEnergy, updated_at: new Date().toISOString() })
      .eq("telegram_id", telegram_id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({
      ok: true,
      points: newPoints,
      energy: newEnergy,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
