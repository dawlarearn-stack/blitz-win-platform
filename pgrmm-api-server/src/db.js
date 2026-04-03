const { MongoClient } = require("mongodb");

let db;

async function connectDB() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db();
  console.log("Connected to MongoDB:", db.databaseName);

  // Create indexes
  await db.collection("users").createIndex({ telegram_id: 1 }, { unique: true });
  await db.collection("users").createIndex({ referral_code: 1 }, { unique: true });
  await db.collection("users").createIndex({ points: -1 });
  await db.collection("game_sessions").createIndex({ telegram_id: 1, created_at: -1 });
  await db.collection("game_sessions").createIndex({ telegram_id: 1, game_id: 1, status: 1 });
  await db.collection("referrals").createIndex({ referred_telegram_id: 1 }, { unique: true });
  await db.collection("referrals").createIndex({ referrer_telegram_id: 1 });
  await db.collection("payment_requests").createIndex({ telegram_id: 1, status: 1 });
  await db.collection("withdrawal_requests").createIndex({ telegram_id: 1, status: 1 });
  await db.collection("device_fingerprints").createIndex({ telegram_id: 1, fingerprint: 1 }, { unique: true });
  await db.collection("banned_users").createIndex({ telegram_id: 1 }, { unique: true });
  await db.collection("suspicious_activity").createIndex({ created_at: -1 });

  console.log("Indexes created");
}

function getDB() {
  if (!db) throw new Error("Database not connected");
  return db;
}

module.exports = { connectDB, getDB };
