const express = require("express");
const { getDB } = require("../db");
const { telegramApi, generateReferralCode } = require("../helpers");

const router = express.Router();

const REQUIRED_CHANNEL = process.env.REQUIRED_CHANNEL || "@pgrmmofficial";
const REQUIRED_GROUP = process.env.REQUIRED_GROUP || "@pgrmCommunity";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://pgrmm.top";

async function checkMembership(chatId, userId) {
  const result = await telegramApi("getChatMember", { chat_id: chatId, user_id: userId });
  if (!result.ok) return false;
  return ["member", "administrator", "creator"].includes(result.result?.status);
}

async function handleStart(chatId) {
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
  });
}

async function handleMembershipCheck(callbackQueryId, chatId, userId) {
  const [inChannel, inGroup] = await Promise.all([
    checkMembership(REQUIRED_CHANNEL, userId),
    checkMembership(REQUIRED_GROUP, userId),
  ]);

  await telegramApi("answerCallbackQuery", { callback_query_id: callbackQueryId });

  if (inChannel && inGroup) {
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: "✅ Access granted! Click the button below to open PGRmm WebApp.",
      reply_markup: { inline_keyboard: [[{ text: "🚀 Open WebApp", web_app: { url: WEBAPP_URL } }]] },
    });
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
    });
  }
}

// POST /api/telegram-poll — triggered by cron or manual call
router.post("/", async (req, res) => {
  const MAX_RUNTIME_MS = 55_000;
  const MIN_REMAINING_MS = 5_000;
  const startTime = Date.now();

  try {
    const db = getDB();
    let totalProcessed = 0;

    // Read offset from app_config
    let configDoc = await db.collection("app_config").findOne({ key: "telegram_poll_offset" });
    let currentOffset = configDoc?.value || 0;

    while (true) {
      const elapsed = Date.now() - startTime;
      const remainingMs = MAX_RUNTIME_MS - elapsed;
      if (remainingMs < MIN_REMAINING_MS) break;

      const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
      if (timeout < 1) break;

      const data = await telegramApi("getUpdates", {
        offset: currentOffset,
        timeout,
        allowed_updates: ["message", "callback_query"],
      });

      if (!data.ok) return res.status(502).json({ error: data });

      const updates = data.result ?? [];
      if (updates.length === 0) continue;

      for (const u of updates) {
        try {
          if (u.message?.text?.startsWith("/start")) {
            const from = u.message.from;
            const chatId = u.message.chat.id;
            const messageText = u.message.text.trim();

            // Upsert user
            await db.collection("users").updateOne(
              { telegram_id: String(from.id) },
              {
                $set: { username: from.username || null, first_name: from.first_name || null, updated_at: new Date() },
                $setOnInsert: {
                  telegram_id: String(from.id), points: 0, energy: 1000, games_played: 0,
                  progress: {}, referral_code: generateReferralCode(),
                  last_seen_at: new Date(), joined_at: new Date(), created_at: new Date(),
                },
              },
              { upsert: true }
            );

            // Handle referral
            const parts = messageText.split(" ");
            if (parts.length > 1 && parts[1].startsWith("ref_")) {
              const refCode = parts[1].replace("ref_", "");
              const referredId = String(from.id);
              const referrer = await db.collection("users").findOne({ referral_code: refCode });
              if (referrer && referrer.telegram_id !== referredId) {
                await db.collection("referrals").updateOne(
                  { referred_telegram_id: referredId },
                  {
                    $setOnInsert: {
                      referrer_telegram_id: referrer.telegram_id,
                      referred_telegram_id: referredId,
                      claimed: false, claimed_at: null, created_at: new Date(),
                    },
                  },
                  { upsert: true }
                );
              }
            }

            await handleStart(chatId);
            totalProcessed++;
          } else if (u.callback_query?.data === "check_membership") {
            const cb = u.callback_query;
            await db.collection("users").updateOne(
              { telegram_id: String(cb.from.id) },
              {
                $set: { username: cb.from.username || null, first_name: cb.from.first_name || null, updated_at: new Date() },
                $setOnInsert: {
                  telegram_id: String(cb.from.id), points: 0, energy: 1000, games_played: 0,
                  progress: {}, referral_code: generateReferralCode(),
                  last_seen_at: new Date(), joined_at: new Date(), created_at: new Date(),
                },
              },
              { upsert: true }
            );
            await handleMembershipCheck(cb.id, cb.message.chat.id, cb.from.id);
            totalProcessed++;
          } else if (u.message?.from) {
            const from = u.message.from;
            await db.collection("users").updateOne(
              { telegram_id: String(from.id) },
              {
                $set: { username: from.username || null, first_name: from.first_name || null, updated_at: new Date() },
                $setOnInsert: {
                  telegram_id: String(from.id), points: 0, energy: 1000, games_played: 0,
                  progress: {}, referral_code: generateReferralCode(),
                  last_seen_at: new Date(), joined_at: new Date(), created_at: new Date(),
                },
              },
              { upsert: true }
            );
            totalProcessed++;
          }
        } catch (err) {
          console.error("Error processing update:", u.update_id, err);
        }
      }

      // Save offset
      const newOffset = Math.max(...updates.map(u => u.update_id)) + 1;
      await db.collection("app_config").updateOne(
        { key: "telegram_poll_offset" },
        { $set: { key: "telegram_poll_offset", value: newOffset, updated_at: new Date() } },
        { upsert: true }
      );
      currentOffset = newOffset;
    }

    res.json({ ok: true, processed: totalProcessed, finalOffset: currentOffset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
