/**
 * app.js - VocalIQ Express App Configuration
 * Configures middleware, mounts API routes, serves React build in production.
 * Author: Angaddeep Singh Gupta | CS651 VocalIQ
 */
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const path      = require("path");
const rateLimit = require("express-rate-limit");

const authRoutes     = require("./routes/authRoutes");
const coachingRoutes = require("./routes/coachingRoutes");
const errorHandler   = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [process.env.CLIENT_URL].filter(Boolean)
  : ["http://localhost:5173", "http://localhost:8080"];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Rate limiter — 100 requests per 15 min per IP (protects Gemini API costs)
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api", apiLimiter);

// API Routes
app.use("/api/auth",     authRoutes);
app.use("/api/coaching", coachingRoutes);

// Health check for Cloud Run
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", app: "VocalIQ", timestamp: new Date() });
});

// Serve React SPA in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "public")));
  app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
}

app.use(errorHandler);
module.exports = app;
