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

      if (action === "suspicious") {
        const { data, error } = await supabase
          .from("suspicious_activity")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;

        // Also fetch banned users list
        const { data: bannedData } = await supabase
          .from("banned_users")
          .select("telegram_id, reason, banned_at, unbanned_at");
        
        // For multi_account_fingerprint logs, fetch the first account per fingerprint
        const multiLogs = (data || []).filter((d: any) => d.action_type === "multi_account_fingerprint");
        const fingerprints = [...new Set(multiLogs.map((l: any) => l.details?.fingerprint).filter(Boolean))];
        
        let firstAccounts: Record<string, string> = {};
        for (const fp of fingerprints) {
          const { data: fpData } = await supabase
            .from("device_fingerprints")
            .select("telegram_id")
            .eq("fingerprint", fp)
            .order("first_seen_at", { ascending: true })
            .limit(1);
          if (fpData && fpData.length > 0) {
            firstAccounts[fp] = fpData[0].telegram_id;
          }
        }

        return new Response(JSON.stringify({ 
          data, 
          banned: bannedData || [],
          firstAccounts,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "banned") {
        const { data, error } = await supabase
          .from("banned_users")
          .select("*")
          .order("banned_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Default: return stats
      const [totalUsersRes, activeUsersRes, pendingPaymentsRes, pendingWithdrawalsRes, suspiciousRes] = await Promise.all([
        supabase.from("bot_users").select("id", { count: "exact", head: true }),
        supabase.from("user_heartbeats").select("telegram_id", { count: "exact", head: true })
          .gte("last_seen_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()),
        supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("suspicious_activity").select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return new Response(JSON.stringify({
        totalUsers: totalUsersRes.count ?? 0,
        activeUsers: activeUsersRes.count ?? 0,
        pendingPayments: pendingPaymentsRes.count ?? 0,
        pendingWithdrawals: pendingWithdrawalsRes.count ?? 0,
        suspiciousCount: suspiciousRes.count ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /admin-stats - update config or ban/unban
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      // Ban user
      if (action === "ban") {
        const { telegram_id, reason } = body;
        if (!telegram_id) {
          return new Response(JSON.stringify({ error: "telegram_id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await supabase
          .from("banned_users")
          .upsert(
            { telegram_id, reason: reason || "Banned by admin", banned_at: new Date().toISOString(), unbanned_at: null },
            { onConflict: "telegram_id" }
          );
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, action: "banned" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Unban user
      if (action === "unban") {
        const { telegram_id } = body;
        if (!telegram_id) {
          return new Response(JSON.stringify({ error: "telegram_id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await supabase
          .from("banned_users")
          .update({ unbanned_at: new Date().toISOString() })
          .eq("telegram_id", telegram_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, action: "unbanned" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Default: config update
      const { key, value } = body;
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
