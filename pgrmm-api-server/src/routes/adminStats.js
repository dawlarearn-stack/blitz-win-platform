const express = require("express");
const { getDB } = require("../db");
const { adminAuth } = require("../helpers");

const router = express.Router();

router.get("/", adminAuth, async (req, res) => {
  try {
    const db = getDB();
    const { action } = req.query;

    if (action === "config") {
      const configs = await db.collection("app_config").find({}).toArray();
      return res.json({ data: configs.map(c => ({ key: c.key, value: c.value, updated_at: c.updated_at })) });
    }

    if (action === "suspicious") {
      const logs = await db.collection("suspicious_activity")
        .find({}).sort({ created_at: -1 }).limit(100).toArray();
      const banned = await db.collection("banned_users").find({}).toArray();
      return res.json({ suspicious: logs, banned });
    }

    if (action === "banned") {
      const banned = await db.collection("banned_users").find({}).toArray();
      return res.json({ data: banned });
    }

    // Default: summary stats
    const totalUsers = await db.collection("users").countDocuments();
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
    const activeUsers = await db.collection("users").countDocuments({ last_seen_at: { $gte: fiveMinAgo } });
    const pendingPayments = await db.collection("payment_requests").countDocuments({ status: "pending" });
    const pendingWithdrawals = await db.collection("withdrawal_requests").countDocuments({ status: "pending" });
    const dayAgo = new Date(Date.now() - 86400_000);
    const suspiciousCount = await db.collection("suspicious_activity").countDocuments({ created_at: { $gte: dayAgo } });

    // Total points pipeline
    const pipeline = [{ $group: { _id: null, total: { $sum: "$points" } } }];
    const pointsAgg = await db.collection("users").aggregate(pipeline).toArray();
    const totalPoints = pointsAgg[0]?.total || 0;

    res.json({
      total_users: totalUsers,
      active_users: activeUsers,
      pending_payments: pendingPayments,
      pending_withdrawals: pendingWithdrawals,
      suspicious_24h: suspiciousCount,
      total_points: totalPoints,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", adminAuth, async (req, res) => {
  try {
    const db = getDB();
    const { action, telegram_id, reason, key, value } = req.body;

    if (action === "ban") {
      await db.collection("banned_users").updateOne(
        { telegram_id },
        { $set: { telegram_id, reason: reason || null, banned_at: new Date(), unbanned_at: null, banned_by: "admin" } },
        { upsert: true }
      );
      return res.json({ success: true });
    }

    if (action === "unban") {
      await db.collection("banned_users").updateOne(
        { telegram_id },
        { $set: { unbanned_at: new Date() } }
      );
      return res.json({ success: true });
    }

    // Default: save config
    if (key && value !== undefined) {
      await db.collection("app_config").updateOne(
        { key },
        { $set: { key, value, updated_at: new Date() } },
        { upsert: true }
      );
      return res.json({ success: true });
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
