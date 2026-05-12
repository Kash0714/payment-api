const express = require("express");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const bankRoutes = require("./routes/bankRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ── Routes ──────────────────────────────────────────────
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users/:userId/bank-accounts", bankRoutes);
app.use("/api/v1/payments", paymentRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString(), version: "1.0.0" });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

module.exports = app;
