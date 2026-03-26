/**
 * services/oauthService.js - OAuth 2.0 Service
 * Builds authorization URLs and handles token exchange for
 * Google Photos and Instagram Basic Display API.
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
    scope:         "openid email profile https://www.googleapis.com/auth/photoslibrary.readonly",
    access_type:   "offline",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
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
 * fetchUserPhotos - Retrieves user's photos from Google Photos Library API
 * @param {string} accessToken - Google OAuth access token stored in Firestore
 * @param {string} provider    - "google" or "instagram"
 * @returns {Array} - Array of { url, id, timestamp } photo objects
 */
const fetchUserPhotos = async (accessToken, provider) => {
  if (provider === "google") {
    const res = await axios.get("https://photoslibrary.googleapis.com/v1/mediaItems", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params:  { pageSize: 20 },
    });
    return (res.data.mediaItems || []).map(item => ({
      id:        item.id,
      url:       item.baseUrl + "=d", // =d suffix for full download
      timestamp: item.mediaMetadata?.creationTime,
    }));
  }
  // TODO: Instagram photo fetching - Angaddeep
  return [];
};

// ── Instagram OAuth ────────────────────────────────────────────────────────

/**
 * getInstagramAuthUrl - Builds the Instagram Basic Display API authorization URL
 */
const getInstagramAuthUrl = () => {
  const params = new URLSearchParams({
    client_id:     process.env.INSTAGRAM_APP_ID,
    redirect_uri:  process.env.INSTAGRAM_REDIRECT_URI,
    scope:         "user_profile,user_media",
    response_type: "code",
  });
  return `https://api.instagram.com/oauth/authorize?${params}`;
};

module.exports = { getGoogleAuthUrl, exchangeGoogleCode, fetchUserPhotos, getInstagramAuthUrl };
