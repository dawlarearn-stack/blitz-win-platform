const express = require("express");
const { getDB } = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { telegram_id, all } = req.query;
    if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });

    const db = getDB();

    if (all === "true") {
      const data = await db.collection("payment_requests")
        .find({ telegram_id })
        .project({ _id: 1, energy_amount: 1, price_mmk: 1, payment_method: 1, status: 1, created_at: 1, receipt_last4: 1 })
        .sort({ created_at: -1 })
        .limit(20)
        .toArray();
      // Map _id to id
      const mapped = data.map(d => ({ id: d._id.toString(), ...d, _id: undefined }));
      return res.json({ data: mapped });
    }

    const data = await db.collection("payment_requests")
      .find({ telegram_id })
      .sort({ created_at: -1 })
      .limit(1)
      .toArray();

    res.json({ data: data[0] ? { ...data[0], id: data[0]._id.toString() } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
