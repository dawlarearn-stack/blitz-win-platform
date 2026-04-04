const express = require("express");
const { getDB } = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { telegram_id, daily } = req.body;
    if (!telegram_id || !daily) return res.status(400).json({ error: "telegram_id and daily required" });

    const db = getDB();
    await db.collection("daily_rewards_state").updateOne(
      { telegram_id },
      {
        $set: {
          telegram_id,
          lastCheckinDate: daily.lastCheckinDate || "",
          checkinStreak: daily.checkinStreak || 0,
          claimedDays: daily.claimedDays || [],
          levelTasksClaimed: daily.levelTasksClaimed || [],
          adProgress: daily.adProgress || {},
          adClaimed: daily.adClaimed || [],
          adLastWatch: daily.adLastWatch || {},
          resetDate: daily.resetDate || "",
          freeEnergyClaimed: daily.freeEnergyClaimed || false,
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
