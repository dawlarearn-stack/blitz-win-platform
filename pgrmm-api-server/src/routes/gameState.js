const express = require("express");
const { getDB } = require("../db");
const { generateReferralCode } = require("../helpers");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });

    const db = getDB();
    let user = await db.collection("users").findOne({ telegram_id });

    if (!user) {
      const code = generateReferralCode();
      await db.collection("users").insertOne({
        telegram_id,
        points: 0,
        energy: 1000,
        games_played: 0,
        progress: {},
        referral_code: code,
        username: null,
        first_name: null,
        last_seen_at: new Date(),
        joined_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
      user = await db.collection("users").findOne({ telegram_id });
    }

    // Fetch referrals
    const referralRows = await db.collection("referrals")
      .find({ referrer_telegram_id: telegram_id }).toArray();

    const referrals = [];
    if (referralRows.length > 0) {
      const referredIds = referralRows.map(r => r.referred_telegram_id);
      const referredUsers = await db.collection("users")
        .find({ telegram_id: { $in: referredIds } })
        .project({ telegram_id: 1, username: 1, first_name: 1, games_played: 1 })
        .toArray();

      for (const ref of referralRows) {
        const u = referredUsers.find(x => x.telegram_id === ref.referred_telegram_id);
        referrals.push({
          id: ref._id.toString(),
          username: u?.username || u?.first_name || ref.referred_telegram_id,
          gamesPlayed: u?.games_played || 0,
          joinedAt: new Date(ref.created_at).getTime(),
          claimed: ref.claimed,
        });
      }
    }

    res.json({
      points: user.points,
      energy: user.energy,
      games_played: user.games_played,
      progress: user.progress,
      referral_code: user.referral_code,
      referrals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
