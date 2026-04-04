const express = require("express");
const { getDB } = require("../db");

const router = express.Router();

function today() {
  return new Date().toISOString().slice(0, 10);
}

router.post("/", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });

    const db = getDB();
    let data = await db.collection("daily_rewards_state").findOne({ telegram_id });

    if (!data) {
      return res.json({
        lastCheckinDate: "",
        checkinStreak: 0,
        claimedDays: [],
        levelTasksClaimed: [],
        adProgress: {},
        adClaimed: [],
        adLastWatch: {},
        resetDate: today(),
        freeEnergyClaimed: false,
      });
    }

    const currentDate = today();
    let result = {
      lastCheckinDate: data.lastCheckinDate || "",
      checkinStreak: data.checkinStreak || 0,
      claimedDays: data.claimedDays || [],
      levelTasksClaimed: data.levelTasksClaimed || [],
      adProgress: data.adProgress || {},
      adClaimed: data.adClaimed || [],
      adLastWatch: data.adLastWatch || {},
      resetDate: data.resetDate || currentDate,
      freeEnergyClaimed: data.freeEnergyClaimed || false,
    };

    if (result.resetDate !== currentDate) {
      result.levelTasksClaimed = [];
      result.adProgress = {};
      result.adClaimed = [];
      result.adLastWatch = {};
      result.freeEnergyClaimed = false;
      result.resetDate = currentDate;

      await db.collection("daily_rewards_state").updateOne(
        { telegram_id },
        { $set: { ...result, updated_at: new Date() } }
      );
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
