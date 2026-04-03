const express = require("express");
const { getDB } = require("../db");
const { telegramApi } = require("../helpers");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { telegram_id, withdrawal_method, amount_points, amount_usd, amount_mmk, currency, binance_account_name, binance_uid, bep20_address, account_name, phone_number } = req.body;

    if (!telegram_id || !withdrawal_method || !amount_points || !currency)
      return res.status(400).json({ error: "Missing required fields" });
    if (amount_points < 500000)
      return res.status(400).json({ error: "Minimum 500,000 points required" });

    // Validate method-specific fields
    if (withdrawal_method === "binance_id" && (!binance_account_name || !binance_uid))
      return res.status(400).json({ error: "Binance account name and UID required" });
    if (withdrawal_method === "bep20" && !bep20_address)
      return res.status(400).json({ error: "BEP20 address required" });
    if ((withdrawal_method === "kbz_pay" || withdrawal_method === "wave_pay") && (!account_name || !phone_number))
      return res.status(400).json({ error: "Account name and phone number required" });

    const db = getDB();

    // Check existing pending
    const existing = await db.collection("withdrawal_requests").findOne({ telegram_id, status: "pending" });
    if (existing) return res.status(409).json({ error: "You already have a pending withdrawal" });

    // Deduct points
    const user = await db.collection("users").findOne({ telegram_id });
    if (!user || user.points < amount_points)
      return res.status(400).json({ error: "Insufficient points" });

    await db.collection("users").updateOne(
      { telegram_id },
      { $inc: { points: -amount_points }, $set: { updated_at: new Date() } }
    );

    const doc = {
      telegram_id, withdrawal_method, amount_points,
      amount_usd: amount_usd || null, amount_mmk: amount_mmk || null,
      currency, binance_account_name: binance_account_name || null,
      binance_uid: binance_uid || null, bep20_address: bep20_address || null,
      account_name: account_name || null, phone_number: phone_number || null,
      status: "pending", created_at: new Date(), updated_at: new Date(),
    };

    const result = await db.collection("withdrawal_requests").insertOne(doc);
    res.json({ success: true, id: result.insertedId.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
