/**
 * middleware/errorHandler.js - Global Express Error Handler
 * Catches all errors thrown in route handlers and returns structured JSON responses.
 * Must be registered last in app.js (after all routes).
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
module.exports = errorHandler;
