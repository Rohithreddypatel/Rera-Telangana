require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const mongoose  = require("mongoose");
const { closeBrowser } = require("./services/browserService");
const { sessionStore } = require("./services/sessionStore");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Validate required env vars ─────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌  MONGO_URI is not set. Copy server/.env.example to server/.env and fill in your credentials.");
  process.exit(1);
}

const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api", require("./routes/api"));

// ── Health check ───────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Telangana RERA API",
    dbState: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    activeSessions: sessionStore.size(),
  });
});

app.get("/", (req, res) => res.json({ status: "ok", app: "Telangana RERA API" }));

// ── MongoDB Connection ──────────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅  MongoDB connected");
    app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌  MongoDB connection error:", err.message);
    process.exit(1);
  });

// ── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown() {
  console.log("\n🔴  Shutting down…");
  for (const session of sessionStore.all()) {
    await closeBrowser(session.browser).catch(() => {});
  }
  sessionStore.clear();
  await mongoose.disconnect();
  process.exit(0);
}

process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);
