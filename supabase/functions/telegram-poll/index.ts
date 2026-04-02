import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

const REQUIRED_CHANNEL = "@pgrmmofficial";
const REQUIRED_GROUP = "@pgrmCommunity";
const WEBAPP_URL = "https://pgrmm.pages.dev";

async function telegramApi(method: string, body: Record<string, unknown>, apiKey: string, lovableKey: string) {
  const resp = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return resp.json();
}

async function checkMembership(chatId: string, userId: number, apiKey: string, lovableKey: string): Promise<boolean> {
  const result = await telegramApi("getChatMember", { chat_id: chatId, user_id: userId }, apiKey, lovableKey);
  if (!result.ok) return false;
  const status = result.result?.status;
  return ["member", "administrator", "creator"].includes(status);
}

async function handleStartCommand(chatId: number, apiKey: string, lovableKey: string) {
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text: "Welcome to PGRmm! 🚀\n\nTo unlock the WebApp, please join our official channel and community group first.",
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "1️⃣ Join Our Channel", url: "https://t.me/pgrmmofficial" }],
        [{ text: "2️⃣ Join Our Group", url: "https://t.me/pgrmCommunity" }],
        [{ text: "3️⃣ Check & Unlock WebApp ✅", callback_data: "check_membership" }],
      ],
    },
  }, apiKey, lovableKey);
}

async function handleMembershipCheck(callbackQueryId: string, chatId: number, userId: number, apiKey: string, lovableKey: string) {
  const [inChannel, inGroup] = await Promise.all([
    checkMembership(REQUIRED_CHANNEL, userId, apiKey, lovableKey),
    checkMembership(REQUIRED_GROUP, userId, apiKey, lovableKey),
  ]);

  // Answer the callback to remove loading state
  await telegramApi("answerCallbackQuery", { callback_query_id: callbackQueryId }, apiKey, lovableKey);

  if (inChannel && inGroup) {
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: "✅ Access granted! Click the button below to open PGRmm WebApp.",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 Open WebApp", web_app: { url: WEBAPP_URL } }],
        ],
      },
    }, apiKey, lovableKey);
  } else {
    let missing = "";
    if (!inChannel && !inGroup) missing = "the channel and the community group";
    else if (!inChannel) missing = "the channel (@pgrmmofficial)";
    else missing = "the community group (@pgrmCommunity)";

    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: `❌ You must join ${missing} to unlock the WebApp.\n\nPlease join and try again.`,
      reply_markup: {
        inline_keyboard: [
          [{ text: "1️⃣ Join Our Channel", url: "https://t.me/pgrmmofficial" }],
          [{ text: "2️⃣ Join Our Group", url: "https://t.me/pgrmCommunity" }],
          [{ text: "3️⃣ Check Again ✅", callback_data: "check_membership" }],
        ],
      },
    }, apiKey, lovableKey);
  }
}

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
        allowed_updates: ["message", "callback_query"],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502 });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    // Process each update
    for (const u of updates) {
      try {
        // Handle /start command
        if (u.message?.text?.startsWith("/start")) {
          const from = u.message.from;
          const chatId = u.message.chat.id;

          // Upsert bot user
          await supabase.from("bot_users").upsert(
            {
              telegram_id: String(from.id),
              username: from.username || null,
              first_name: from.first_name || null,
            },
            { onConflict: "telegram_id", ignoreDuplicates: false }
          );

          await handleStartCommand(chatId, TELEGRAM_API_KEY, LOVABLE_API_KEY);
          totalProcessed++;
        }
        // Handle callback queries (Check & Unlock button)
        else if (u.callback_query?.data === "check_membership") {
          const cb = u.callback_query;
          const userId = cb.from.id;
          const chatId = cb.message.chat.id;

          // Upsert bot user
          await supabase.from("bot_users").upsert(
            {
              telegram_id: String(userId),
              username: cb.from.username || null,
              first_name: cb.from.first_name || null,
            },
            { onConflict: "telegram_id", ignoreDuplicates: false }
          );

          await handleMembershipCheck(cb.id, chatId, userId, TELEGRAM_API_KEY, LOVABLE_API_KEY);
          totalProcessed++;
        }
        // Handle other messages - upsert user
        else if (u.message?.from) {
          const from = u.message.from;
          await supabase.from("bot_users").upsert(
            {
              telegram_id: String(from.id),
              username: from.username || null,
              first_name: from.first_name || null,
            },
            { onConflict: "telegram_id", ignoreDuplicates: false }
          );
          totalProcessed++;
        }
      } catch (err) {
        console.error("Error processing update:", u.update_id, err);
      }
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
