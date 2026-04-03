const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../db");
const { adminAuth, telegramApi } = require("../helpers");

const router = express.Router();

router.get("/", adminAuth, async (req, res) => {
  try {
    const db = getDB();
    const status = req.query.status || "pending";
    const data = await db.collection("withdrawal_requests")
      .find({ status })
      .sort({ created_at: -1 })
      .toArray();
    const mapped = data.map(d => ({ ...d, id: d._id.toString(), _id: undefined }));
    res.json({ data: mapped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", adminAuth, async (req, res) => {
  try {
    const { id, action } = req.body;
    if (!id || !["approved", "rejected"].includes(action))
      return res.status(400).json({ error: "id and valid action required" });

    const db = getDB();
    let objectId;
    try { objectId = new ObjectId(id); } catch { return res.status(400).json({ error: "Invalid id" }); }

    const result = await db.collection("withdrawal_requests").findOneAndUpdate(
      { _id: objectId, status: "pending" },
      { $set: { status: action, updated_at: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ error: "Request not found or already processed" });

    // If rejected, refund points
    if (action === "rejected") {
      await db.collection("users").updateOne(
        { telegram_id: result.telegram_id },
        { $inc: { points: result.amount_points }, $set: { updated_at: new Date() } }
      );
    }

    // Telegram notification
    if (result.telegram_id) {
      const emoji = action === "approved" ? "✅" : "❌";
      const amount = result.currency === "USD" ? `$${result.amount_usd}` : `${result.amount_mmk} MMK`;
      const text = action === "approved"
        ? `${emoji} Your withdrawal of ${amount} has been approved!`
        : `${emoji} Your withdrawal has been rejected. Points refunded.`;
      try { await telegramApi("sendMessage", { chat_id: Number(result.telegram_id), text, parse_mode: "HTML" }); } catch {}
    }

    res.json({ success: true, data: { ...result, id: result._id.toString() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
