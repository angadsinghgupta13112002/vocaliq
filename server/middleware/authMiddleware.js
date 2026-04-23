/**
 * middleware/authMiddleware.js - JWT Authentication Guard
 * Verifies the JWT token sent in the Authorization header.
 * Attaches decoded user info to req.user for downstream route handlers.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Accept token from Authorization header (API calls) OR query param (browser redirects)
  // The query param path is only used for the Google Photos OAuth redirect flow
  // where window.location.href is used and headers cannot be set.
  let token;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  } else {
    return res.status(401).json({ success: false, error: "No token provided" });
  }

  try {
    // Verify and decode the JWT using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info { uid, email, displayName }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};
module.exports = authMiddleware;
