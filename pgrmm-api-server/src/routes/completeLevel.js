const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../db");
const { getPointsForLevel, getIP } = require("../helpers");

const router = express.Router();
const MIN_COMPLETION_SECONDS = 1.99;

router.post("/", async (req, res) => {
  try {
    const { telegram_id, session_id, game_id, level, won } = req.body;
    if (!telegram_id || !session_id || !game_id || level === undefined || won === undefined)
      return res.status(400).json({ error: "Missing required fields" });

    const db = getDB();
    const ip = getIP(req);

    // Rate limit
    const tenSecondsAgo = new Date(Date.now() - 10_000);
    const recentCompletes = await db.collection("game_sessions").countDocuments({
      telegram_id, completed_at: { $gte: tenSecondsAgo },
    });
    if (recentCompletes >= 10) {
      await db.collection("suspicious_activity").insertOne({
        telegram_id, action_type: "rate_limit_complete",
        details: { session_id, game_id, level, recent_count: recentCompletes },
        ip_address: ip, created_at: new Date(),
      });
      return res.status(429).json({ error: "Rate limited" });
    }

    // Get session
    let objectId;
    try { objectId = new ObjectId(session_id); } catch { return res.status(404).json({ error: "Invalid session_id" }); }
    const session = await db.collection("game_sessions").findOne({ _id: objectId });
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.telegram_id !== telegram_id) {
      await db.collection("suspicious_activity").insertOne({
        telegram_id, action_type: "session_mismatch",
        details: { session_id, actual_owner: session.telegram_id },
        ip_address: ip, created_at: new Date(),
      });
      return res.status(403).json({ error: "Session mismatch" });
    }
    if (session.status !== "active")
      return res.status(400).json({ error: "Session already completed or expired" });
    if (session.game_id !== game_id || session.level !== level) {
      await db.collection("suspicious_activity").insertOne({
        telegram_id, action_type: "session_data_mismatch",
        details: { session_id, expected_game: session.game_id, got_game: game_id, expected_level: session.level, got_level: level },
        ip_address: ip, created_at: new Date(),
      });
      return res.status(400).json({ error: "Game/level mismatch with session" });
    }

    // Speed check
    const elapsedSeconds = (Date.now() - new Date(session.started_at).getTime()) / 1000;
    if (elapsedSeconds < MIN_COMPLETION_SECONDS) {
      await db.collection("suspicious_activity").insertOne({
        telegram_id, action_type: "speed_hack",
        details: { session_id, game_id, level, elapsed_seconds: elapsedSeconds },
        ip_address: ip, created_at: new Date(),
      });
      await db.collection("game_sessions").updateOne(
        { _id: objectId },
        { $set: { status: "suspicious", completed_at: new Date(), points_awarded: 0 } }
      );
      return res.status(400).json({ error: "Completion too fast", points_awarded: 0 });
    }

    const pointsAwarded = won ? getPointsForLevel(level) : 0;

    await db.collection("game_sessions").updateOne(
      { _id: objectId },
      { $set: { status: won ? "completed" : "lost", completed_at: new Date(), points_awarded: pointsAwarded } }
    );

    // Update user state if won
    if (won && pointsAwarded > 0) {
      const user = await db.collection("users").findOne({ telegram_id });
      if (user) {
        const progress = user.progress || {};
        const gp = progress[game_id] || { gameId: game_id, currentLevel: 0, highestLevel: 0 };
        progress[game_id] = {
          ...gp,
          gameId: game_id,
          currentLevel: level + 1,
          highestLevel: Math.max(gp.highestLevel || 0, level),
        };
        await db.collection("users").updateOne(
          { telegram_id },
          { $set: { progress, updated_at: new Date() }, $inc: { points: pointsAwarded, games_played: 1 } }
        );
      }
    }

    const finalState = await db.collection("users").findOne({ telegram_id });
    res.json({
      success: true, points_awarded: pointsAwarded,
      points: finalState?.points ?? 0, energy: finalState?.energy ?? 0,
      progress: finalState?.progress ?? {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
