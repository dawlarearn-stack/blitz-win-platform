const express = require("express");
const { getDB } = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    if (!telegram_id || telegram_id === "unknown")
      return res.status(400).json({ error: "telegram_id required" });

    const db = getDB();
    await db.collection("users").updateOne(
      { telegram_id },
      { $set: { last_seen_at: new Date() } },
      { upsert: true }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
