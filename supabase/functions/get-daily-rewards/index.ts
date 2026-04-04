import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

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

    const { data } = await supabase
      .from("daily_rewards_state")
      .select("*")
      .eq("telegram_id", telegram_id)
      .single();

    if (!data) {
      // Return defaults
      return new Response(JSON.stringify({
        lastCheckinDate: "",
        checkinStreak: 0,
        claimedDays: [],
        levelTasksClaimed: [],
        adProgress: {},
        adClaimed: [],
        adLastWatch: {},
        resetDate: today(),
        freeEnergyClaimed: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reset daily tasks if new day
    const currentDate = today();
    let result = {
      lastCheckinDate: data.last_checkin_date || "",
      checkinStreak: data.checkin_streak || 0,
      claimedDays: data.claimed_days || [],
      levelTasksClaimed: data.level_tasks_claimed || [],
      adProgress: data.ad_progress || {},
      adClaimed: data.ad_claimed || [],
      adLastWatch: data.ad_last_watch || {},
      resetDate: data.reset_date || currentDate,
      freeEnergyClaimed: data.free_energy_claimed || false,
    };

    if (result.resetDate !== currentDate) {
      result.levelTasksClaimed = [];
      result.adProgress = {};
      result.adClaimed = [];
      result.adLastWatch = {};
      result.freeEnergyClaimed = false;
      result.resetDate = currentDate;

      // Update in DB
      await supabase.from("daily_rewards_state").update({
        level_tasks_claimed: [],
        ad_progress: {},
        ad_claimed: [],
        ad_last_watch: {},
        free_energy_claimed: false,
        reset_date: currentDate,
        updated_at: new Date().toISOString(),
      }).eq("telegram_id", telegram_id);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
