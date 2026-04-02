#!/usr/bin/env node
/**
 * Supabase PostgreSQL → MongoDB Migration Script
 * 
 * Usage:
 *   1. Install dependencies: npm install pg mongodb
 *   2. Set environment variables (or edit below)
 *   3. Run: node migrate-to-mongodb.js
 * 
 * Environment Variables:
 *   SUPABASE_DB_URL  - PostgreSQL connection string (from Supabase dashboard)
 *   MONGODB_URI      - MongoDB connection string (e.g. mongodb://localhost:27017/pgrmm)
 */

const { Client } = require("pg");
const { MongoClient } = require("mongodb");

// ─── Configuration ───
const PG_URL = process.env.SUPABASE_DB_URL || "postgresql://postgres:YOUR_PASSWORD@db.psaqhftdxwudrzhygxeu.supabase.co:5432/postgres";
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pgrmm";

async function migrate() {
  console.log("🔄 Starting migration: Supabase PostgreSQL → MongoDB\n");

  // Connect to both databases
  const pg = new Client({ connectionString: PG_URL });
  await pg.connect();
  console.log("✅ Connected to PostgreSQL");

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db();
  console.log("✅ Connected to MongoDB\n");

  // ─── 1. Migrate users (merge bot_users + user_game_state + user_heartbeats) ───
  console.log("📦 Migrating users...");
  const { rows: gameStates } = await pg.query("SELECT * FROM user_game_state");
  const { rows: botUsers } = await pg.query("SELECT * FROM bot_users");
  const { rows: heartbeats } = await pg.query("SELECT * FROM user_heartbeats");

  const botUserMap = {};
  for (const u of botUsers) {
    botUserMap[u.telegram_id] = u;
  }
  const heartbeatMap = {};
  for (const h of heartbeats) {
    heartbeatMap[h.telegram_id] = h.last_seen_at;
  }

  const users = gameStates.map((gs) => {
    const bu = botUserMap[gs.telegram_id] || {};
    return {
      telegram_id: gs.telegram_id,
      username: bu.username || null,
      first_name: bu.first_name || null,
      points: gs.points,
      energy: gs.energy,
      games_played: gs.games_played,
      progress: gs.progress || {},
      referral_code: gs.referral_code,
      last_seen_at: heartbeatMap[gs.telegram_id] ? new Date(heartbeatMap[gs.telegram_id]) : null,
      joined_at: bu.joined_at ? new Date(bu.joined_at) : new Date(gs.created_at),
      created_at: new Date(gs.created_at),
      updated_at: new Date(gs.updated_at),
    };
  });

  // Also add bot_users that don't have game state yet
  for (const bu of botUsers) {
    if (!gameStates.find((gs) => gs.telegram_id === bu.telegram_id)) {
      users.push({
        telegram_id: bu.telegram_id,
        username: bu.username || null,
        first_name: bu.first_name || null,
        points: 0,
        energy: 1000,
        games_played: 0,
        progress: {},
        referral_code: null,
        last_seen_at: heartbeatMap[bu.telegram_id] ? new Date(heartbeatMap[bu.telegram_id]) : null,
        joined_at: new Date(bu.joined_at),
        created_at: new Date(bu.joined_at),
        updated_at: new Date(bu.joined_at),
      });
    }
  }

  if (users.length > 0) {
    await db.collection("users").deleteMany({});
    await db.collection("users").insertMany(users);
    await db.collection("users").createIndex({ telegram_id: 1 }, { unique: true });
    await db.collection("users").createIndex({ referral_code: 1 }, { unique: true, sparse: true });
    await db.collection("users").createIndex({ points: -1 });
  }
  console.log(`  ✅ ${users.length} users migrated`);

  // ─── 2. Migrate game_sessions ───
  console.log("📦 Migrating game_sessions...");
  const { rows: sessions } = await pg.query("SELECT * FROM game_sessions");
  if (sessions.length > 0) {
    const docs = sessions.map((s) => ({
      _id: s.id,
      telegram_id: s.telegram_id,
      game_id: s.game_id,
      level: s.level,
      status: s.status,
      points_awarded: s.points_awarded || 0,
      started_at: new Date(s.started_at),
      completed_at: s.completed_at ? new Date(s.completed_at) : null,
      created_at: new Date(s.created_at),
    }));
    await db.collection("game_sessions").deleteMany({});
    await db.collection("game_sessions").insertMany(docs);
    await db.collection("game_sessions").createIndex({ telegram_id: 1, status: 1 });
    await db.collection("game_sessions").createIndex({ telegram_id: 1, created_at: -1 });
  }
  console.log(`  ✅ ${sessions.length} game sessions migrated`);

  // ─── 3. Migrate referrals ───
  console.log("📦 Migrating referrals...");
  const { rows: referrals } = await pg.query("SELECT * FROM referrals");
  if (referrals.length > 0) {
    const docs = referrals.map((r) => ({
      _id: r.id,
      referrer_telegram_id: r.referrer_telegram_id,
      referred_telegram_id: r.referred_telegram_id,
      claimed: r.claimed,
      claimed_at: r.claimed_at ? new Date(r.claimed_at) : null,
      created_at: new Date(r.created_at),
    }));
    await db.collection("referrals").deleteMany({});
    await db.collection("referrals").insertMany(docs);
    await db.collection("referrals").createIndex({ referrer_telegram_id: 1 });
    await db.collection("referrals").createIndex({ created_at: -1 });
  }
  console.log(`  ✅ ${referrals.length} referrals migrated`);

  // ─── 4. Migrate payment_requests ───
  console.log("📦 Migrating payment_requests...");
  const { rows: payments } = await pg.query("SELECT * FROM payment_requests");
  if (payments.length > 0) {
    const docs = payments.map((p) => ({
      _id: p.id,
      telegram_id: p.telegram_id,
      energy_amount: p.energy_amount,
      price_mmk: p.price_mmk,
      payment_method: p.payment_method,
      receipt_last4: p.receipt_last4,
      sender_name: p.sender_name,
      sender_phone: p.sender_phone,
      screenshot_url: p.screenshot_url,
      status: p.status,
      expires_at: new Date(p.expires_at),
      created_at: new Date(p.created_at),
      updated_at: new Date(p.updated_at),
    }));
    await db.collection("payment_requests").deleteMany({});
    await db.collection("payment_requests").insertMany(docs);
    await db.collection("payment_requests").createIndex({ telegram_id: 1 });
    await db.collection("payment_requests").createIndex({ status: 1, created_at: -1 });
  }
  console.log(`  ✅ ${payments.length} payment requests migrated`);

  // ─── 5. Migrate withdrawal_requests ───
  console.log("📦 Migrating withdrawal_requests...");
  const { rows: withdrawals } = await pg.query("SELECT * FROM withdrawal_requests");
  if (withdrawals.length > 0) {
    const docs = withdrawals.map((w) => ({
      _id: w.id,
      telegram_id: w.telegram_id,
      withdrawal_method: w.withdrawal_method,
      amount_points: w.amount_points,
      amount_usd: w.amount_usd,
      amount_mmk: w.amount_mmk,
      currency: w.currency,
      binance_account_name: w.binance_account_name,
      binance_uid: w.binance_uid,
      bep20_address: w.bep20_address,
      account_name: w.account_name,
      phone_number: w.phone_number,
      status: w.status,
      created_at: new Date(w.created_at),
      updated_at: new Date(w.updated_at),
    }));
    await db.collection("withdrawal_requests").deleteMany({});
    await db.collection("withdrawal_requests").insertMany(docs);
    await db.collection("withdrawal_requests").createIndex({ telegram_id: 1 });
    await db.collection("withdrawal_requests").createIndex({ status: 1, created_at: -1 });
  }
  console.log(`  ✅ ${withdrawals.length} withdrawal requests migrated`);

  // ─── 6. Migrate banned_users ───
  console.log("📦 Migrating banned_users...");
  const { rows: banned } = await pg.query("SELECT * FROM banned_users");
  if (banned.length > 0) {
    const docs = banned.map((b) => ({
      _id: b.id,
      telegram_id: b.telegram_id,
      reason: b.reason,
      banned_by: b.banned_by,
      banned_at: new Date(b.banned_at),
      unbanned_at: b.unbanned_at ? new Date(b.unbanned_at) : null,
    }));
    await db.collection("banned_users").deleteMany({});
    await db.collection("banned_users").insertMany(docs);
    await db.collection("banned_users").createIndex({ telegram_id: 1 });
  }
  console.log(`  ✅ ${banned.length} banned users migrated`);

  // ─── 7. Migrate device_fingerprints ───
  console.log("📦 Migrating device_fingerprints...");
  const { rows: fingerprints } = await pg.query("SELECT * FROM device_fingerprints");
  if (fingerprints.length > 0) {
    const docs = fingerprints.map((f) => ({
      _id: f.id,
      telegram_id: f.telegram_id,
      fingerprint: f.fingerprint,
      ip_address: f.ip_address,
      user_agent: f.user_agent,
      first_seen_at: new Date(f.first_seen_at),
      last_seen_at: new Date(f.last_seen_at),
    }));
    await db.collection("device_fingerprints").deleteMany({});
    await db.collection("device_fingerprints").insertMany(docs);
    await db.collection("device_fingerprints").createIndex({ telegram_id: 1 });
    await db.collection("device_fingerprints").createIndex({ fingerprint: 1 });
  }
  console.log(`  ✅ ${fingerprints.length} fingerprints migrated`);

  // ─── 8. Migrate suspicious_activity ───
  console.log("📦 Migrating suspicious_activity...");
  const { rows: suspicious } = await pg.query("SELECT * FROM suspicious_activity ORDER BY created_at DESC LIMIT 1000");
  if (suspicious.length > 0) {
    const docs = suspicious.map((s) => ({
      _id: s.id,
      telegram_id: s.telegram_id,
      action_type: s.action_type,
      details: s.details,
      ip_address: s.ip_address,
      device_info: s.device_info,
      created_at: new Date(s.created_at),
    }));
    await db.collection("suspicious_activity").deleteMany({});
    await db.collection("suspicious_activity").insertMany(docs);
    await db.collection("suspicious_activity").createIndex({ telegram_id: 1 });
    await db.collection("suspicious_activity").createIndex({ created_at: -1 });
  }
  console.log(`  ✅ ${suspicious.length} suspicious activity logs migrated`);

  // ─── 9. Migrate app_config ───
  console.log("📦 Migrating app_config...");
  const { rows: configs } = await pg.query("SELECT * FROM app_config");
  if (configs.length > 0) {
    const docs = configs.map((c) => ({
      key: c.key,
      value: c.value,
      updated_at: new Date(c.updated_at),
    }));
    await db.collection("app_config").deleteMany({});
    await db.collection("app_config").insertMany(docs);
    await db.collection("app_config").createIndex({ key: 1 }, { unique: true });
  }
  console.log(`  ✅ ${configs.length} config entries migrated`);

  // ─── 10. Migrate telegram_bot_state ───
  console.log("📦 Migrating telegram_bot_state...");
  const { rows: botState } = await pg.query("SELECT * FROM telegram_bot_state");
  if (botState.length > 0) {
    const docs = botState.map((s) => ({
      _id: s.id,
      update_offset: s.update_offset,
      updated_at: new Date(s.updated_at),
    }));
    await db.collection("telegram_bot_state").deleteMany({});
    await db.collection("telegram_bot_state").insertMany(docs);
  }
  console.log(`  ✅ ${botState.length} bot state entries migrated`);

  // ─── Summary ───
  console.log("\n🎉 Migration complete!");
  console.log("─".repeat(50));
  console.log(`  Users:            ${users.length}`);
  console.log(`  Game Sessions:    ${sessions.length}`);
  console.log(`  Referrals:        ${referrals.length}`);
  console.log(`  Payment Requests: ${payments.length}`);
  console.log(`  Withdrawals:      ${withdrawals.length}`);
  console.log(`  Banned Users:     ${banned.length}`);
  console.log(`  Fingerprints:     ${fingerprints.length}`);
  console.log(`  Suspicious Logs:  ${suspicious.length}`);
  console.log(`  App Config:       ${configs.length}`);
  console.log(`  Bot State:        ${botState.length}`);

  await pg.end();
  await mongo.close();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
