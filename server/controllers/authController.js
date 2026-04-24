/**
 * controllers/authController.js - Authentication Controller
 * Handles OAuth 2.0 authorization URL generation, token exchange,
 * JWT issuance, and Firestore user upsert for Google login.
 * Also handles the separate Google Drive OAuth flow (drive.readonly scope)
 * so users can pull their own videos into VocalIQ coaching sessions.
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

// ── Google Photos OAuth ────────────────────────────────────────────────────

/**
 * googlePhotosLogin - Redirects user to Google OAuth consent for Photos access.
 * This is a SEPARATE OAuth flow from the main Google login — it requests
 * photoslibrary.readonly scope and always shows the consent screen (prompt=consent)
 * so we reliably get a refresh token.
 *
 * The user must already be logged in (JWT required) before calling this endpoint
 * so we know which Firestore user doc to attach the Photos token to.
 */
const googlePhotosLogin = (req, res) => {
  // Embed the user's uid in the OAuth state param so the callback knows
  // which Firestore user document to update with the Photos access token.
  const state   = Buffer.from(JSON.stringify({ uid: req.user.uid })).toString("base64url");
  const authUrl = oauthService.getGooglePhotosAuthUrl() + `&state=${state}`;
  res.redirect(authUrl);
};

/**
 * googlePhotosCallback - Exchanges the Photos authorization code for tokens,
 * then stores them in Firestore on the user document so subsequent
 * /api/photos/videos calls can use them.
 */
const googlePhotosCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // User denied the consent screen
    if (error) {
      return res.redirect(`${process.env.CLIENT_URL}/session?photosError=access_denied`);
    }

    // Decode the state to get the uid
    let uid;
    try {
      ({ uid } = JSON.parse(Buffer.from(state, "base64url").toString("utf8")));
    } catch (_) {
      return res.status(400).json({ error: "Invalid OAuth state parameter" });
    }

    // Exchange code for access + refresh tokens
    const { accessToken, refreshToken } = await oauthService.exchangeGooglePhotosCode(code);

    // Store tokens in the user's Firestore document so future requests can reuse them
    await db.collection("users").doc(uid).set({
      photosAccessToken:  accessToken,
      photosRefreshToken: refreshToken || null,
      photosConnectedAt:  new Date(),
    }, { merge: true });

    console.log(`[auth] Google Photos connected for user: ${uid}`);

    // Redirect back to the dashboard with a success flag.
    // We can't redirect back to /session because the session context (scenario,
    // audience, goal, mode) lives in React Router state which is lost after a
    // full-page OAuth redirect. User re-enters the session from the dashboard.
    res.redirect(`${process.env.CLIENT_URL}/dashboard?photosConnected=true`);
  } catch (err) {
    console.error("[auth] googlePhotosCallback error:", err.message);
    res.redirect(`${process.env.CLIENT_URL}/dashboard?photosError=${encodeURIComponent(err.message)}`);
  }
};

/**
 * getPhotosStatus - Returns whether the current user has Google Photos connected.
 * Frontend calls this on load to decide whether to show "Connect Google Photos"
 * or the photos picker directly.
 */
const getPhotosStatus = async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const data = userDoc.data();
    res.json({
      success:          true,
      photosConnected:  !!data.photosAccessToken,
      photosConnectedAt: data.photosConnectedAt || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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

module.exports = {
  googleLogin,
  googleCallback,
  googlePhotosLogin,
  googlePhotosCallback,
  getPhotosStatus,
  getMe,
  logout,
};
