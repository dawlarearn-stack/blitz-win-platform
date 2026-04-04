require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");

// Route imports
const gameStateRoutes = require("./routes/gameState");
const startLevelRoutes = require("./routes/startLevel");
const completeLevelRoutes = require("./routes/completeLevel");
const convertPointsRoutes = require("./routes/convertPoints");
const heartbeatRoutes = require("./routes/heartbeat");
const checkMembershipRoutes = require("./routes/checkMembership");
const submitPaymentRoutes = require("./routes/submitPayment");
const checkPaymentRoutes = require("./routes/checkPayment");
const submitWithdrawalRoutes = require("./routes/submitWithdrawal");
const adminStatsRoutes = require("./routes/adminStats");
const adminPaymentsRoutes = require("./routes/adminPayments");
const adminWithdrawalsRoutes = require("./routes/adminWithdrawals");
const adminAnnounceRoutes = require("./routes/adminAnnounce");
const telegramPollRoutes = require("./routes/telegramPoll");
const getDailyRewardsRoutes = require("./routes/getDailyRewards");
const saveDailyRewardsRoutes = require("./routes/saveDailyRewards");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// API routes — all under /api
app.use("/api/get-game-state", gameStateRoutes);
app.use("/api/start-level", startLevelRoutes);
app.use("/api/complete-level", completeLevelRoutes);
app.use("/api/convert-points", convertPointsRoutes);
app.use("/api/heartbeat", heartbeatRoutes);
app.use("/api/check-membership", checkMembershipRoutes);
app.use("/api/submit-payment", submitPaymentRoutes);
app.use("/api/check-payment", checkPaymentRoutes);
app.use("/api/submit-withdrawal", submitWithdrawalRoutes);
app.use("/api/admin-stats", adminStatsRoutes);
app.use("/api/admin-payments", adminPaymentsRoutes);
app.use("/api/admin-withdrawals", adminWithdrawalsRoutes);
app.use("/api/admin-announce", adminAnnounceRoutes);
app.use("/api/telegram-poll", telegramPollRoutes);

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`PGRmm API running on port ${PORT}`));
});
