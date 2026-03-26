/**
 * routes/authRoutes.js - Authentication Route Definitions
 * Defines OAuth 2.0 login, callback, logout, and current user endpoints.
 * All routes are handled by authController.js
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const express        = require("express");
const router         = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/google",           authController.googleLogin);      // Redirect to Google OAuth
router.get("/google/callback",  authController.googleCallback);   // Handle OAuth code exchange
router.get("/instagram",        authController.instagramLogin);   // Redirect to Instagram OAuth
router.get("/instagram/callback", authController.instagramCallback); // Handle Instagram code
router.get("/me",     authMiddleware, authController.getMe);      // Get current logged-in user
router.post("/logout",authMiddleware, authController.logout);     // Logout and clear session

module.exports = router;
