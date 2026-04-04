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
    const { telegram_id, daily } = await req.json();
    if (!telegram_id || !daily) {
      return new Response(JSON.stringify({ error: "telegram_id and daily required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const row = {
      telegram_id,
      last_checkin_date: daily.lastCheckinDate || "",
      checkin_streak: daily.checkinStreak || 0,
      claimed_days: daily.claimedDays || [],
      level_tasks_claimed: daily.levelTasksClaimed || [],
      ad_progress: daily.adProgress || {},
      ad_claimed: daily.adClaimed || [],
      ad_last_watch: daily.adLastWatch || {},
      reset_date: daily.resetDate || "",
      free_energy_claimed: daily.freeEnergyClaimed || false,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("daily_rewards_state").upsert(row, { onConflict: "telegram_id" });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
