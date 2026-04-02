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
        .upsert({ telegram_id, energy: 1000 }, { onConflict: "telegram_id" })
        .select("*")
        .single();

      if (error) throw error;
      state = newState;
    }

    // Fetch referrals where this user is the referrer
    const { data: referralRows } = await supabase
      .from("referrals")
      .select("id, referred_telegram_id, created_at, claimed")
      .eq("referrer_telegram_id", telegram_id);

    // Enrich referrals with user info and games played
    const referrals = [];
    if (referralRows && referralRows.length > 0) {
      const referredIds = referralRows.map(r => r.referred_telegram_id);

      const [{ data: botUsers }, { data: gameStates }] = await Promise.all([
        supabase.from("bot_users").select("telegram_id, username, first_name").in("telegram_id", referredIds),
        supabase.from("user_game_state").select("telegram_id, games_played").in("telegram_id", referredIds),
      ]);

      for (const ref of referralRows) {
        const user = botUsers?.find(u => u.telegram_id === ref.referred_telegram_id);
        const gs = gameStates?.find(g => g.telegram_id === ref.referred_telegram_id);
        referrals.push({
          id: ref.id,
          username: user?.username || user?.first_name || ref.referred_telegram_id,
          gamesPlayed: gs?.games_played || 0,
          joinedAt: new Date(ref.created_at).getTime(),
          claimed: ref.claimed,
        });
      }
    }

    return new Response(JSON.stringify({
      points: state!.points,
      energy: state!.energy,
      games_played: state!.games_played,
      progress: state!.progress,
      referral_code: state!.referral_code,
      referrals,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
