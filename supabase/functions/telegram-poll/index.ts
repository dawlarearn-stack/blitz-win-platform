import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

Deno.serve(async () => {
  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY is not configured");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalProcessed = 0;

  // Read initial offset
  const { data: state, error: stateErr } = await supabase
    .from("telegram_bot_state")
    .select("update_offset")
    .eq("id", 1)
    .single();

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 });
  }

  let currentOffset = state.update_offset;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ["message"],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502 });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    // Extract users from /start commands and any message
    const usersToUpsert: { telegram_id: string; username: string | null; first_name: string | null }[] = [];

    for (const u of updates) {
      if (u.message?.from) {
        const from = u.message.from;
        usersToUpsert.push({
          telegram_id: String(from.id),
          username: from.username || null,
          first_name: from.first_name || null,
        });
      }
    }

    // Upsert users (track all who interact with bot)
    if (usersToUpsert.length > 0) {
      const uniqueUsers = Object.values(
        usersToUpsert.reduce((acc, u) => ({ ...acc, [u.telegram_id]: u }), {} as Record<string, typeof usersToUpsert[0]>)
      );

      const { error: upsertErr } = await supabase
        .from("bot_users")
        .upsert(
          uniqueUsers.map((u) => ({
            telegram_id: u.telegram_id,
            username: u.username,
            first_name: u.first_name,
          })),
          { onConflict: "telegram_id", ignoreDuplicates: false }
        );

      if (upsertErr) {
        console.error("Failed to upsert bot users:", upsertErr);
      }

      totalProcessed += uniqueUsers.length;
    }

    // Advance offset
    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    const { error: offsetErr } = await supabase
      .from("telegram_bot_state")
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (offsetErr) {
      return new Response(JSON.stringify({ error: offsetErr.message }), { status: 500 });
    }

    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }));
});
