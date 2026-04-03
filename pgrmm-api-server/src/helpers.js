const crypto = require("crypto");

function generateReferralCode() {
  return "PGR-" + crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
}

function getPointsForLevel(level) {
  if (level <= 9) return 35;
  if (level <= 19) return 55;
  if (level <= 39) return 75;
  if (level <= 59) return 95;
  if (level <= 79) return 115;
  if (level <= 89) return 150;
  return 175;
}

const VALID_GAMES = [
  "bomb-finder", "memory-match", "reaction-tap", "lucky-box", "color-match",
  "speed-type", "pattern-memory", "number-sequence", "dice-roll", "whack-a-mole",
];

function getIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
         req.headers["cf-connecting-ip"] || req.ip || "unknown";
}

function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function telegramApi(method, body) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json();
}

module.exports = { generateReferralCode, getPointsForLevel, VALID_GAMES, getIP, adminAuth, telegramApi };
