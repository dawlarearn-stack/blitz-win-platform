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
    const { telegram_id } = await req.json();

    if (!telegram_id) {
      return new Response(JSON.stringify({ error: "telegram_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create user game state
    let { data: state } = await supabase
      .from("user_game_state")
      .select("*")
      .eq("telegram_id", telegram_id)
      .single();

    if (!state) {
      const { data: newState, error } = await supabase
        .from("user_game_state")
        .upsert({ telegram_id }, { onConflict: "telegram_id" })
        .select("*")
        .single();

      if (error) throw error;
      state = newState;
    }

    return new Response(JSON.stringify({
      points: state!.points,
      energy: state!.energy,
      games_played: state!.games_played,
      progress: state!.progress,
      referral_code: state!.referral_code,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
