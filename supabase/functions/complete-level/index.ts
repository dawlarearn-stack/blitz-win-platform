import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_COMPLETION_SECONDS = 1.99;

// Points per level tier (must match frontend display only — server is source of truth)
function getPointsForLevel(level: number): number {
  if (level <= 9) return 35;
  if (level <= 19) return 55;
  if (level <= 39) return 75;
  if (level <= 59) return 95;
  if (level <= 79) return 115;
  if (level <= 89) return 150;
  return 175;
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
    const { telegram_id, session_id, game_id, level, won } = await req.json();

    if (!telegram_id || !session_id || !game_id || level === undefined || won === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("cf-connecting-ip") || "unknown";

    // Rate limit: max 10 complete requests per 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
    const { count: recentCompletes } = await supabase
      .from("game_sessions")
      .select("id", { count: "exact", head: true })
      .eq("telegram_id", telegram_id)
      .not("completed_at", "is", null)
      .gte("completed_at", tenSecondsAgo);

    if ((recentCompletes ?? 0) >= 10) {
      await supabase.from("suspicious_activity").insert({
        telegram_id,
        action_type: "rate_limit_complete",
        details: { session_id, game_id, level, recent_count: recentCompletes },
        ip_address: ip,
      });
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the session
    const { data: session } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate session belongs to user
    if (session.telegram_id !== telegram_id) {
      await supabase.from("suspicious_activity").insert({
        telegram_id,
        action_type: "session_mismatch",
        details: { session_id, actual_owner: session.telegram_id },
        ip_address: ip,
      });
      return new Response(JSON.stringify({ error: "Session mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Session must be active
    if (session.status !== "active") {
      return new Response(JSON.stringify({ error: "Session already completed or expired" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate game_id and level match session
    if (session.game_id !== game_id || session.level !== level) {
      await supabase.from("suspicious_activity").insert({
        telegram_id,
        action_type: "session_data_mismatch",
        details: {
          session_id,
          expected_game: session.game_id,
          got_game: game_id,
          expected_level: session.level,
          got_level: level,
        },
        ip_address: ip,
      });
      return new Response(JSON.stringify({ error: "Game/level mismatch with session" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check minimum completion time
    const startedAt = new Date(session.started_at).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - startedAt) / 1000;

    if (elapsedSeconds < MIN_COMPLETION_SECONDS) {
      await supabase.from("suspicious_activity").insert({
        telegram_id,
        action_type: "speed_hack",
        details: { session_id, game_id, level, elapsed_seconds: elapsedSeconds },
        ip_address: ip,
      });

      // Mark session as suspicious but still complete it (no points)
      await supabase.from("game_sessions").update({
        status: "suspicious",
        completed_at: new Date().toISOString(),
        points_awarded: 0,
      }).eq("id", session_id);

      return new Response(JSON.stringify({
        error: "Completion too fast, flagged as suspicious",
        points_awarded: 0,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate points (server decides)
    const pointsAwarded = won ? getPointsForLevel(level) : 0;

    // Complete the session
    await supabase.from("game_sessions").update({
      status: won ? "completed" : "lost",
      completed_at: new Date().toISOString(),
      points_awarded: pointsAwarded,
    }).eq("id", session_id);

    // Update user game state if won
    if (won && pointsAwarded > 0) {
      const { data: userState } = await supabase
        .from("user_game_state")
        .select("*")
        .eq("telegram_id", telegram_id)
        .single();

      if (userState) {
        const progress = (userState.progress as Record<string, any>) || {};
        const gameProgress = progress[game_id] || { gameId: game_id, currentLevel: 0, highestLevel: 0 };

        const updatedProgress = {
          ...progress,
          [game_id]: {
            ...gameProgress,
            currentLevel: level,
            highestLevel: Math.max(gameProgress.highestLevel || 0, level),
          },
        };

        await supabase.from("user_game_state").update({
          points: userState.points + pointsAwarded,
          games_played: userState.games_played + 1,
          progress: updatedProgress,
          updated_at: new Date().toISOString(),
        }).eq("telegram_id", telegram_id);
      }
    }

    // Get updated state
    const { data: finalState } = await supabase
      .from("user_game_state")
      .select("points, energy, progress, games_played")
      .eq("telegram_id", telegram_id)
      .single();

    return new Response(JSON.stringify({
      success: true,
      points_awarded: pointsAwarded,
      points: finalState?.points ?? 0,
      energy: finalState?.energy ?? 0,
      progress: finalState?.progress ?? {},
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
