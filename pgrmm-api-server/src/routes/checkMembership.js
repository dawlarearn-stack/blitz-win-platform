const express = require("express");
const { telegramApi } = require("../helpers");

const router = express.Router();

async function checkMembership(chatId, userId) {
  const result = await telegramApi("getChatMember", { chat_id: chatId, user_id: userId });
  if (!result.ok) return false;
  return ["member", "administrator", "creator"].includes(result.result?.status);
}

router.post("/", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });

    const channel = process.env.REQUIRED_CHANNEL || "@pgrmmofficial";
    const group = process.env.REQUIRED_GROUP || "@pgrmCommunity";

    const [inChannel, inGroup] = await Promise.all([
      checkMembership(channel, Number(telegram_id)),
      checkMembership(group, Number(telegram_id)),
    ]);

    res.json({
      ok: true,
      inChannel,
      inGroup,
      verified: inChannel && inGroup,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
