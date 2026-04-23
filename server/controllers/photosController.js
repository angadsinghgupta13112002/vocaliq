/**
 * controllers/photosController.js - Google Photos Video Picker Controller
 * Handles fetching a user's Google Photos videos and proxying the download
 * stream to the coaching pipeline.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const { db }                                 = require("../config/firebase");
const { getUserVideos, streamVideoDownload } = require("../services/googlePhotosService");
const { refreshGoogleToken }                 = require("../services/oauthService");

// Helper: retrieve both tokens for the current user from Firestore
const getPhotosTokens = async (uid) => {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new Error("User not found");

  const { photosAccessToken, photosRefreshToken } = userDoc.data();
  if (!photosAccessToken) {
    throw new Error("Google Photos not connected. Please authorize via /api/auth/google/photos");
  }
  return { accessToken: photosAccessToken, refreshToken: photosRefreshToken || null };
};

// Helper: refresh an expired access token and persist the new one to Firestore
const rotateToken = async (uid, refreshToken) => {
  if (!refreshToken) {
    throw new Error("Google Photos session expired. Please reconnect your Google Drive.");
  }
  const newAccessToken = await refreshGoogleToken(refreshToken);
  await db.collection("users").doc(uid).set(
    { photosAccessToken: newAccessToken },
    { merge: true }
  );
  console.log(`[photos] Token rotated for user ${uid}`);
  return newAccessToken;
};

// ─── GET /api/photos/videos ──────────────────────────────────────────────────
// Returns the user's most recent 20 Google Photos videos.
// Frontend uses this to render the GooglePhotosPicker grid.
const listVideos = async (req, res) => {
  const uid = req.user.uid;
  try {
    let { accessToken, refreshToken } = await getPhotosTokens(uid);
    try {
      const videos = await getUserVideos(accessToken);
      return res.json({ success: true, videos });
    } catch (err) {
      if (!err.isTokenExpired) throw err;
      // Token expired — refresh and retry once
      accessToken = await rotateToken(uid, refreshToken);
      const videos = await getUserVideos(accessToken);
      return res.json({ success: true, videos });
    }
  } catch (err) {
    const status = err.message.includes("not connected") || err.message.includes("reconnect") ? 403 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// ─── POST /api/photos/download ───────────────────────────────────────────────
// Downloads a Google Photos video by its base URL and returns it as a binary
// stream. The frontend submits this stream to /api/coaching/analyze as if the
// user had picked a local file — the coaching pipeline is identical.
//
// Body: { videoUrl: string }   — the =dv URL returned by listVideos
const downloadVideo = async (req, res) => {
  const uid = req.user.uid;
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ success: false, error: "videoUrl is required" });
    }

    // Validate the URL is from Google Drive to prevent SSRF abuse
    if (!videoUrl.startsWith("https://www.googleapis.com/drive/v3/files/")) {
      return res.status(400).json({ success: false, error: "Invalid Google Drive URL" });
    }

    let { accessToken, refreshToken } = await getPhotosTokens(uid);

    // Open a streaming request to Google Drive — no memory buffering
    let driveStream;
    try {
      driveStream = await streamVideoDownload(videoUrl, accessToken);
    } catch (err) {
      if (!err.isTokenExpired) throw err;
      // Access token expired — refresh and retry once
      accessToken  = await rotateToken(uid, refreshToken);
      driveStream  = await streamVideoDownload(videoUrl, accessToken);
    }

    // Pass through real content-type and length from Drive
    // (handles .mov = video/quicktime, .mp4 = video/mp4, etc.)
    const contentType   = driveStream.headers["content-type"]   || "video/mp4";
    const contentLength = driveStream.headers["content-length"];
    res.set("Content-Type",        contentType);
    res.set("Content-Disposition", "attachment; filename=\"video.mov\"");
    if (contentLength) res.set("Content-Length", contentLength);

    // Pipe Google Drive's response stream directly to the client —
    // never loads the whole file into memory
    driveStream.data.pipe(res);

    // If the drive stream errors mid-pipe, close the response gracefully
    driveStream.data.on("error", (streamErr) => {
      console.error("[photos] Drive stream error:", streamErr.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: "Drive stream interrupted" });
      } else {
        res.end();
      }
    });
  } catch (err) {
    const status = err.message.includes("not connected") || err.message.includes("reconnect") ? 403 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

module.exports = { listVideos, downloadVideo };
