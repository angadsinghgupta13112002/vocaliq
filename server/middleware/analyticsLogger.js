/**
 * middleware/analyticsLogger.js - API Analytics Logging Middleware
 * Logs every API call (method, endpoint, status code, latency) to the
 * Firestore analytics_logs collection. Required for the 50-point Analytics
 * requirement in CS651 Project 2.
 * Author: Lasya Uma Sri Lingala | CS651 Project 2
 */
const { db } = require("../config/firebase");

const analyticsLogger = async (req, res, next) => {
  const startTime = Date.now(); // Record request start time

  // After response is sent, log to Firestore
  res.on("finish", async () => {
    const latencyMs = Date.now() - startTime;
    try {
      await db.collection("analytics_logs").add({
        userId:     req.user?.uid || "anonymous",
        method:     req.method,
        endpoint:   req.originalUrl,
        statusCode: res.statusCode,
        latencyMs,
        timestamp:  new Date(),
      });
    } catch (logErr) {
      // Never block the response for a logging failure
      console.error("[Analytics] Failed to log:", logErr.message);
    }
  });

  next();
};
module.exports = analyticsLogger;
