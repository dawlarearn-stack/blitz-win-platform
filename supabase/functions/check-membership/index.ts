import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const REQUIRED_CHANNEL = "@pgrmmofficial";
const REQUIRED_GROUP = "@pgrmCommunity";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function checkMembership(chatId: string, userId: number, apiKey: string, lovableKey: string): Promise<boolean> {
  try {
    const resp = await fetch(`${GATEWAY_URL}/getChatMember`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, user_id: userId }),
    });
    const result = await resp.json();
    if (!result.ok) return false;
    const status = result.result?.status;
    return ["member", "administrator", "creator"].includes(status);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { telegram_id } = await req.json();
    if (!telegram_id) {
      return new Response(JSON.stringify({ error: "telegram_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = Number(telegram_id);
    if (isNaN(userId)) {
      return new Response(JSON.stringify({ error: "Invalid telegram_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [inChannel, inGroup] = await Promise.all([
      checkMembership(REQUIRED_CHANNEL, userId, TELEGRAM_API_KEY, LOVABLE_API_KEY),
      checkMembership(REQUIRED_GROUP, userId, TELEGRAM_API_KEY, LOVABLE_API_KEY),
    ]);

    return new Response(JSON.stringify({
      ok: true,
      inChannel,
      inGroup,
      verified: inChannel && inGroup,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
