const express = require("express");
const { getDB } = require("../db");
const { adminAuth, telegramApi } = require("../helpers");

const router = express.Router();

router.post("/", adminAuth, async (req, res) => {
  try {
    const { target, message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    const db = getDB();
    let chatIds = [];

    if (target === "all") {
      const users = await db.collection("users")
        .find({}).project({ telegram_id: 1 }).toArray();
      chatIds = users.map(u => u.telegram_id);
    } else {
      chatIds = [String(target).trim()];
    }

    let sent = 0, failed = 0;
    for (const chatId of chatIds) {
      try {
        await telegramApi("sendMessage", { chat_id: Number(chatId), text: message, parse_mode: "HTML" });
        sent++;
      } catch {
        failed++;
      }
    }

    res.json({ success: true, sent, failed, total: chatIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
