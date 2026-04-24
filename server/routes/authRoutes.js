/**
 * routes/authRoutes.js - Authentication Route Definitions
 * Defines OAuth 2.0 login, callback, logout, and current user endpoints.
 * Includes a separate Google Drive OAuth flow (drive.readonly scope)
 * for the video picker feature.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const express        = require("express");
const router         = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// ── Google Auth ────────────────────────────────────────────────────────────
router.get("/google",             authController.googleLogin);       // Redirect to Google OAuth
router.get("/google/callback",    authController.googleCallback);    // Handle OAuth code exchange

// ── Google Photos Auth (separate scope — requires existing JWT) ────────────
// /google/photos       → requires JWT (user must already be logged in)
// /google/photos/callback → public callback hit by Google after consent
router.get("/google/photos",          authMiddleware, authController.googlePhotosLogin);
router.get("/google/photos/callback", authController.googlePhotosCallback);
router.get("/google/photos/status",   authMiddleware, authController.getPhotosStatus);

// ── Session ───────────────────────────────────────────────────────────────
router.get("/me",      authMiddleware, authController.getMe);        // Get current logged-in user
router.post("/logout", authMiddleware, authController.logout);       // Logout and clear session

module.exports = router;
