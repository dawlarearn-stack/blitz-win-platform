import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminKey = req.headers.get("x-admin-key");
  const expectedKey = Deno.env.get("ADMIN_SECRET_KEY");
  if (!adminKey || adminKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  try {
    // GET /admin-stats - return stats
    if (req.method === "GET") {
      const action = url.searchParams.get("action");

      if (action === "config") {
        // Get all config
        const { data, error } = await supabase
          .from("app_config")
          .select("key, value, updated_at");
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Default: return stats
      const [totalUsersRes, activeUsersRes, pendingPaymentsRes, pendingWithdrawalsRes] = await Promise.all([
        supabase.from("bot_users").select("id", { count: "exact", head: true }),
        supabase.from("user_heartbeats").select("telegram_id", { count: "exact", head: true })
          .gte("last_seen_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()),
        supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      return new Response(JSON.stringify({
        totalUsers: totalUsersRes.count ?? 0,
        activeUsers: activeUsersRes.count ?? 0,
        pendingPayments: pendingPaymentsRes.count ?? 0,
        pendingWithdrawals: pendingWithdrawalsRes.count ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /admin-stats - update config
    if (req.method === "POST") {
      const { key, value } = await req.json();
      if (!key || value === undefined) {
        return new Response(JSON.stringify({ error: "key and value required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("app_config")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
