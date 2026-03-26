/**
 * middleware/authMiddleware.js - JWT Authentication Guard
 * Verifies the JWT token sent in the Authorization header.
 * Attaches decoded user info to req.user for downstream route handlers.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Expect "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

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
