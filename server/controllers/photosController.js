/**
 * controllers/photosController.js - Google Photos Video Picker Controller
 * Handles fetching a user's Google Photos videos and proxying the download
 * stream to the coaching pipeline.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const { db }                              = require("../config/firebase");
const { getUserVideos, downloadVideoBuffer } = require("../services/googlePhotosService");

// Helper: retrieve the stored Google Photos access token for the current user
const getPhotosToken = async (uid) => {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new Error("User not found");

  const { photosAccessToken } = userDoc.data();
  if (!photosAccessToken) {
    throw new Error("Google Photos not connected. Please authorize via /api/auth/google/photos");
  }
  return photosAccessToken;
};

// ─── GET /api/photos/videos ──────────────────────────────────────────────────
// Returns the user's most recent 20 Google Photos videos.
// Frontend uses this to render the GooglePhotosPicker grid.
const listVideos = async (req, res) => {
  try {
    const accessToken = await getPhotosToken(req.user.uid);
    const videos      = await getUserVideos(accessToken);
    res.json({ success: true, videos });
  } catch (err) {
    const status = err.message.includes("not connected") ? 403 : 500;
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
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ success: false, error: "videoUrl is required" });
    }

    // Validate the URL is from Google Drive to prevent SSRF abuse
    if (!videoUrl.startsWith("https://www.googleapis.com/drive/v3/files/")) {
      return res.status(400).json({ success: false, error: "Invalid Google Drive URL" });
    }

    const accessToken = await getPhotosToken(req.user.uid);
    const buffer      = await downloadVideoBuffer(videoUrl, accessToken);

    // Return as video/mp4 — the coaching controller accepts this MIME type
    res.set({
      "Content-Type":        "video/mp4",
      "Content-Length":      buffer.length,
      "Content-Disposition": "attachment; filename=\"photos_video.mp4\"",
    });
    res.send(buffer);
  } catch (err) {
    const status = err.message.includes("not connected") ? 403 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

module.exports = { listVideos, downloadVideo };
