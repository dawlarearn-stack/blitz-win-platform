const express = require("express");
const { getDB } = require("../db");

const router = express.Router();

const defaultConversions = [
  { energy: 50, pointsCost: 3000 },
  { energy: 100, pointsCost: 5500 },
  { energy: 200, pointsCost: 10000 },
  { energy: 500, pointsCost: 24000 },
];

router.post("/", async (req, res) => {
  try {
    const { telegram_id, points_cost, energy_amount } = req.body;
    if (!telegram_id || !points_cost || !energy_amount)
      return res.status(400).json({ error: "Missing required fields" });
    if (points_cost <= 0 || energy_amount <= 0)
      return res.status(400).json({ error: "Invalid amounts" });

    const db = getDB();

    // Validate conversion option
    const configRow = await db.collection("app_config").findOne({ key: "point_conversions" });
    const validOptions = configRow?.value || defaultConversions;
    const match = validOptions.find(o => o.pointsCost === points_cost && o.energy === energy_amount);
    if (!match) return res.status(400).json({ error: "Invalid conversion option" });

    const user = await db.collection("users").findOne({ telegram_id });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.points < points_cost)
      return res.status(400).json({ error: "Insufficient points" });

    const newPoints = user.points - points_cost;
    const newEnergy = user.energy + energy_amount;

    await db.collection("users").updateOne(
      { telegram_id },
      { $set: { points: newPoints, energy: newEnergy, updated_at: new Date() } }
    );

    res.json({ ok: true, points: newPoints, energy: newEnergy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
