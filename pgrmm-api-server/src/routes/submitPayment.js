const express = require("express");
const { getDB } = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { telegram_id, energy_amount, price_mmk, payment_method, receipt_last4, sender_name, sender_phone, screenshot_url } = req.body;

    if (!telegram_id || !energy_amount || !price_mmk || !payment_method || !receipt_last4 || !sender_name || !sender_phone)
      return res.status(400).json({ error: "Missing required fields" });
    if (String(receipt_last4).length !== 4)
      return res.status(400).json({ error: "Receipt last 4 digits must be exactly 4 characters" });

    const db = getDB();

    // Check existing pending
    const existing = await db.collection("payment_requests").findOne({ telegram_id, status: "pending" });
    if (existing)
      return res.status(409).json({ error: "You already have a pending payment request" });

    const doc = {
      telegram_id,
      energy_amount,
      price_mmk,
      payment_method,
      receipt_last4: String(receipt_last4),
      sender_name,
      sender_phone,
      screenshot_url: screenshot_url || null,
      status: "pending",
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("payment_requests").insertOne(doc);
    res.json({ success: true, id: result.insertedId.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
