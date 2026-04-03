const express = require("express");
const { getDB } = require("../db");
const { VALID_GAMES, getIP } = require("../helpers");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { telegram_id, game_id, level, fingerprint, user_agent } = req.body;
    if (!telegram_id || !game_id || level === undefined)
      return res.status(400).json({ error: "telegram_id, game_id, level required" });
    if (!VALID_GAMES.includes(game_id))
      return res.status(400).json({ error: "Invalid game_id" });
    if (typeof level !== "number" || level < 0 || level > 100)
      return res.status(400).json({ error: "Invalid level" });

    const db = getDB();
    const ip = getIP(req);

    // Ban check
    const ban = await db.collection("banned_users").findOne({ telegram_id, unbanned_at: null });
    if (ban) return res.status(403).json({ error: "Your account has been banned." });

    // Rate limit: max 10 sessions in 10s
    const tenSecondsAgo = new Date(Date.now() - 10_000);
    const recentCount = await db.collection("game_sessions").countDocuments({
      telegram_id, created_at: { $gte: tenSecondsAgo },
    });
    if (recentCount >= 10) {
      await db.collection("suspicious_activity").insertOne({
        telegram_id, action_type: "rate_limit_start",
        details: { game_id, level, recent_count: recentCount },
        ip_address: ip, device_info: user_agent || null, created_at: new Date(),
      });
      return res.status(429).json({ error: "Rate limited. Too many requests." });
    }

    // Ensure user exists
    let user = await db.collection("users").findOne({ telegram_id });
    if (!user) {
      const { generateReferralCode } = require("../helpers");
      await db.collection("users").insertOne({
        telegram_id, points: 0, energy: 1000, games_played: 0,
        progress: {}, referral_code: generateReferralCode(),
        username: null, first_name: null, last_seen_at: new Date(),
        joined_at: new Date(), created_at: new Date(), updated_at: new Date(),
      });
      user = await db.collection("users").findOne({ telegram_id });
    }

    if (user.energy < 1)
      return res.status(400).json({ error: "Not enough energy", energy: user.energy });

    // Deduct 1 energy
    const newEnergy = user.energy - 1;
    await db.collection("users").updateOne(
      { telegram_id },
      { $set: { energy: newEnergy, updated_at: new Date() } }
    );

    // Expire previous active sessions for this game
    await db.collection("game_sessions").updateMany(
      { telegram_id, game_id, status: "active" },
      { $set: { status: "expired" } }
    );

    // Create session
    const session = {
      telegram_id, game_id, level, status: "active",
      started_at: new Date(), completed_at: null,
      points_awarded: 0, created_at: new Date(),
    };
    const result = await db.collection("game_sessions").insertOne(session);

    // Track fingerprint
    if (fingerprint) {
      const existing = await db.collection("device_fingerprints").findOne({ telegram_id, fingerprint });
      if (existing) {
        await db.collection("device_fingerprints").updateOne(
          { _id: existing._id },
          { $set: { last_seen_at: new Date(), ip_address: ip } }
        );
      } else {
        await db.collection("device_fingerprints").insertOne({
          telegram_id, fingerprint, ip_address: ip,
          user_agent: user_agent || null,
          first_seen_at: new Date(), last_seen_at: new Date(),
        });
        // Multi-account check
        const fpCount = await db.collection("device_fingerprints").countDocuments({ fingerprint });
        if (fpCount > 2) {
          await db.collection("suspicious_activity").insertOne({
            telegram_id, action_type: "multi_account_fingerprint",
            details: { fingerprint, accounts_count: fpCount },
            ip_address: ip, device_info: user_agent || null, created_at: new Date(),
          });
        }
      }
    }

    res.json({ session_id: result.insertedId.toString(), energy: newEnergy, points: user.points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
