/**
 * controllers/authController.js - Authentication Controller
 * Handles OAuth 2.0 authorization URL generation, token exchange,
 * JWT issuance, and Firestore user upsert for Google Photos and Instagram.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const jwt              = require("jsonwebtoken");
const { db }           = require("../config/firebase");
const oauthService     = require("../services/oauthService");
const { sendServerEvent } = require("../services/analyticsService");

// googleLogin - Redirects user to Google OAuth consent screen
const googleLogin = (req, res) => {
  const authUrl = oauthService.getGoogleAuthUrl();
  res.redirect(authUrl);
};

// googleCallback - Exchanges authorization code for access token, issues JWT
const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const { userInfo } = await oauthService.exchangeGoogleCode(code);

    // Upsert user document in Firestore users collection
    // NOTE: accessToken intentionally NOT stored — VocalIQ has no API that needs it
    await db.collection("users").doc(userInfo.uid).set({
      uid:         userInfo.uid,
      displayName: userInfo.displayName,
      email:       userInfo.email,
      photoURL:    userInfo.photoURL,
      provider:    "google",
      updatedAt:   new Date(),
    }, { merge: true });

    // Issue a signed JWT for subsequent API requests
    const jwtToken = jwt.sign(
      { uid: userInfo.uid, email: userInfo.email, displayName: userInfo.displayName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Track login event in GA4 via Measurement Protocol (backend event)
    sendServerEvent(userInfo.uid, "login", { method: "google" });

    // Redirect back to React SPA with token in query string
    res.redirect(`${process.env.CLIENT_URL}/login?token=${jwtToken}`);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// instagramLogin - Redirects user to Instagram OAuth consent screen
const instagramLogin = (req, res) => {
  const authUrl = oauthService.getInstagramAuthUrl();
  res.redirect(authUrl);
};

// instagramCallback - Exchanges Instagram auth code for access token
const instagramCallback = async (req, res) => {
  // TODO: Implement Instagram token exchange - Angaddeep
  res.json({ message: "Instagram callback - coming soon" });
};

// getMe - Returns the currently authenticated user's info from Firestore
const getMe = async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user: userDoc.data() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// logout - Client-side logout (JWT is stateless; just confirm to client)
const logout = (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};

module.exports = { googleLogin, googleCallback, instagramLogin, instagramCallback, getMe, logout };
