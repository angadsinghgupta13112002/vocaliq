/**
 * services/oauthService.js - OAuth 2.0 Service
 * Builds authorization URLs and handles token exchange for
 * Google login and Google Drive access.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const axios = require("axios");

// ── Google Photos OAuth ────────────────────────────────────────────────────

/**
 * getGoogleAuthUrl - Builds the Google OAuth 2.0 authorization URL
 * @returns {string} - URL to redirect user to for Google login
 */
const getGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "offline",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

/**
 * getGooglePhotosAuthUrl - Builds a Google OAuth URL specifically for
 * Google Photos access. Requests photoslibrary.readonly scope separately
 * from the main login flow so users only grant Photos access when needed.
 */
const getGooglePhotosAuthUrl = () => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.GOOGLE_PHOTOS_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI.replace("/callback", "/photos/callback"),
    response_type: "code",
    // Using drive.readonly instead of photoslibrary.readonly — Google deprecated
    // photoslibrary.readonly for projects created after May 2024. Drive API is
    // not restricted and allows listing + downloading video files.
    scope:         "https://www.googleapis.com/auth/drive.readonly",
    access_type:   "offline",
    prompt:        "select_account consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

/**
 * exchangeGooglePhotosCode - Exchanges the Photos OAuth code for an access token.
 * Returns the access token and refresh token for Google Photos API calls.
 *
 * @param {string} code - Authorization code from Google Photos OAuth callback
 * @returns {Object}    - { accessToken, refreshToken }
 */
const exchangeGooglePhotosCode = async (code) => {
  const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
    code,
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri:  process.env.GOOGLE_PHOTOS_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI.replace("/callback", "/photos/callback"),
    grant_type:    "authorization_code",
  });
  return {
    accessToken:  tokenRes.data.access_token,
    refreshToken: tokenRes.data.refresh_token || null,
  };
};

/**
 * exchangeGoogleCode - Exchanges OAuth code for access token and user info
 * @param {string} code - Authorization code from Google OAuth callback
 * @returns {Object} - { userInfo: { uid, displayName, email, photoURL }, accessToken }
 */
const exchangeGoogleCode = async (code) => {
  // Exchange code for tokens
  const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
    code,
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
    grant_type:    "authorization_code",
  });
  const { access_token } = tokenRes.data;

  // Get user profile info using the access token
  const profileRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  return {
    accessToken: access_token,
    userInfo: {
      uid:         profileRes.data.sub,
      displayName: profileRes.data.name,
      email:       profileRes.data.email,
      photoURL:    profileRes.data.picture,
    },
  };
};

/**
 * refreshGoogleToken - Uses a stored refresh token to obtain a new access token.
 * Called automatically when a Drive API request returns 401 (token expired).
 *
 * @param {string} refreshToken - The refresh token stored in Firestore
 * @returns {string}            - New access token
 */
const refreshGoogleToken = async (refreshToken) => {
  const res = await axios.post("https://oauth2.googleapis.com/token", {
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type:    "refresh_token",
  });
  if (!res.data.access_token) throw new Error("Token refresh failed — no access_token returned");
  console.log("[oauth] Access token refreshed successfully");
  return res.data.access_token;
};

module.exports = {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGooglePhotosAuthUrl,
  exchangeGooglePhotosCode,
  refreshGoogleToken,
};
