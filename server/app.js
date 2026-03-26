/**
 * app.js - AuraBoard Express App Configuration
 * Configures middleware, mounts all API routes, serves React build in production.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const path        = require("path");
const rateLimit   = require("express-rate-limit");

// Route imports
const authRoutes      = require("./routes/authRoutes");
const photoRoutes     = require("./routes/photoRoutes");
const audioRoutes     = require("./routes/audioRoutes");
const analyzeRoutes   = require("./routes/analyzeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// Middleware imports
const errorHandler    = require("./middleware/errorHandler");
const analyticsLogger = require("./middleware/analyticsLogger");

const app = express();

// Security - sets secure HTTP response headers
app.use(helmet());

// CORS - allow React dev server and deployed Cloud Run URL
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger - logs method, url, status, response time
app.use(morgan("dev"));

// Rate limiter - prevents abuse of paid Gemini API calls
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api", apiLimiter);

// Analytics logger - logs all API calls to Firestore analytics_logs collection
app.use("/api", analyticsLogger);

// API Routes
app.use("/api/auth",      authRoutes);
app.use("/api/photos",    photoRoutes);
app.use("/api/audio",     audioRoutes);
app.use("/api/analyze",   analyzeRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check - Cloud Run uses this to verify container is alive
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", app: "AuraBoard", timestamp: new Date() });
});

// Serve React SPA in production (Cloud Run)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "public")));
  app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
}

// Global error handler - must be registered last
app.use(errorHandler);

module.exports = app;
