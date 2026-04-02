import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_GAMES = [
  "bomb-finder", "memory-match", "reaction-tap", "lucky-box", "color-match",
  "speed-type", "pattern-memory", "number-sequence", "dice-roll", "whack-a-mole",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { telegram_id, game_id, level, fingerprint, user_agent } = await req.json();

    if (!telegram_id || !game_id || level === undefined) {
      return new Response(JSON.stringify({ error: "telegram_id, game_id, level required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!VALID_GAMES.includes(game_id)) {
      return new Response(JSON.stringify({ error: "Invalid game_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof level !== "number" || level < 0 || level > 100) {
      return new Response(JSON.stringify({ error: "Invalid level" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("cf-connecting-ip") || "unknown";

    // Check if user is banned
    const { data: banRecord } = await supabase
      .from("banned_users")
      .select("telegram_id, unbanned_at")
      .eq("telegram_id", telegram_id)
      .single();

    if (banRecord && !banRecord.unbanned_at) {
      return new Response(JSON.stringify({ error: "Your account has been banned." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 10 requests per 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
    const { count: recentSessions } = await supabase
      .from("game_sessions")
      .select("id", { count: "exact", head: true })
      .eq("telegram_id", telegram_id)
      .gte("created_at", tenSecondsAgo);

    if ((recentSessions ?? 0) >= 10) {
      await supabase.from("suspicious_activity").insert({
        telegram_id,
        action_type: "rate_limit_start",
        details: { game_id, level, recent_count: recentSessions },
        ip_address: ip,
        device_info: user_agent || null,
      });
      return new Response(JSON.stringify({ error: "Rate limited. Too many requests." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure user_game_state exists (upsert)
    const { data: userState } = await supabase
      .from("user_game_state")
      .select("*")
      .eq("telegram_id", telegram_id)
      .single();

    if (!userState) {
      await supabase.from("user_game_state").insert({ telegram_id });
      const { data: newState } = await supabase
        .from("user_game_state")
        .select("*")
        .eq("telegram_id", telegram_id)
        .single();
      if (!newState) {
        return new Response(JSON.stringify({ error: "Failed to initialize user state" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      Object.assign(userState ?? {}, newState);
    }

    const state = userState!;

    // Check energy
    if (state.energy < 1) {
      return new Response(JSON.stringify({ error: "Not enough energy", energy: state.energy }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct 1 energy
    const newEnergy = state.energy - 1;
    await supabase
      .from("user_game_state")
      .update({ energy: newEnergy, updated_at: new Date().toISOString() })
      .eq("telegram_id", telegram_id);

    // Expire any previous active sessions for this game
    await supabase
      .from("game_sessions")
      .update({ status: "expired" })
      .eq("telegram_id", telegram_id)
      .eq("game_id", game_id)
      .eq("status", "active");

    // Create game session
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .insert({
        telegram_id,
        game_id,
        level,
        status: "active",
      })
      .select("id")
      .single();

    if (sessionError) throw sessionError;

    // Track device fingerprint
    if (fingerprint) {
      const { data: existing } = await supabase
        .from("device_fingerprints")
        .select("id")
        .eq("telegram_id", telegram_id)
        .eq("fingerprint", fingerprint)
        .single();

      if (existing) {
        await supabase.from("device_fingerprints")
          .update({ last_seen_at: new Date().toISOString(), ip_address: ip })
          .eq("id", existing.id);
      } else {
        await supabase.from("device_fingerprints").insert({
          telegram_id, fingerprint, ip_address: ip, user_agent: user_agent || null,
        });

        // Check multi-account: same fingerprint used by different telegram_ids
        const { count: fpCount } = await supabase
          .from("device_fingerprints")
          .select("telegram_id", { count: "exact", head: true })
          .eq("fingerprint", fingerprint);

        if ((fpCount ?? 0) > 2) {
          await supabase.from("suspicious_activity").insert({
            telegram_id,
            action_type: "multi_account_fingerprint",
            details: { fingerprint, accounts_count: fpCount },
            ip_address: ip,
            device_info: user_agent || null,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      session_id: session!.id,
      energy: newEnergy,
      points: state.points,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
