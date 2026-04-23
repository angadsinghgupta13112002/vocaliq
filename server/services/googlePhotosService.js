/**
 * services/googlePhotosService.js - Google Drive Video Picker Integration
 * Fetches videos from a user's Google Drive using their OAuth access token.
 * Originally used Google Photos Library API (photoslibrary.readonly) but that
 * scope was deprecated by Google for new projects after May 2024. Switched to
 * Google Drive API (drive.readonly) which is available for all projects and
 * allows listing + downloading video files from the user's Google account.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const axios = require("axios");

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

/**
 * getUserVideos - Fetches the user's video files from Google Drive.
 * Filters by video MIME types. Returns up to 20 most recent video files.
 *
 * @param {string} accessToken - Google OAuth access token with drive.readonly scope
 * @returns {Array} - [{ id, filename, url, thumbnailUrl, createdAt }, ...]
 */
const getUserVideos = async (accessToken) => {
  try {
    const res = await axios.get(`${DRIVE_API_BASE}/files`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        // Search for video files in Drive
        q:        "mimeType contains 'video/' and trashed = false",
        fields:   "files(id,name,mimeType,thumbnailLink,createdTime,size,webContentLink)",
        pageSize: 20,
        orderBy:  "createdTime desc",
      },
    });

    const files = res.data.files || [];
    console.log(`[photos] Found ${files.length} video files in Google Drive`);

    return files.map((file) => ({
      id:           file.id,
      filename:     file.name,
      // Drive download URL — requires access token to download
      url:          `${DRIVE_API_BASE}/files/${file.id}?alt=media`,
      // Use Drive thumbnail or a placeholder
      thumbnailUrl: file.thumbnailLink || null,
      createdAt:    file.createdTime,
      size:         file.size,
      mimeType:     file.mimeType,
    }));
  } catch (err) {
    if (err.response?.status === 401) {
      const authErr = new Error("Drive access token expired");
      authErr.isTokenExpired = true;
      throw authErr;
    }
    console.error("[photos] getUserVideos error:", err.response?.data || err.message);
    throw new Error("Failed to fetch videos from Google Drive. Please reconnect your account.");
  }
};

/**
 * downloadVideoBuffer - Downloads a Google Drive video as a Buffer.
 * Used to pass the video to the Gemini and Cloud Vision analysis pipeline.
 *
 * @param {string} videoUrl    - Drive file download URL (with ?alt=media)
 * @param {string} accessToken - Google OAuth access token with drive.readonly scope
 * @returns {Buffer} - Video file as a Node.js Buffer
 */
const downloadVideoBuffer = async (videoUrl, accessToken) => {
  try {
    console.log("[photos] Downloading video from Google Drive...");
    const res = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      headers:      { Authorization: `Bearer ${accessToken}` },
      timeout:      300000, // 5 min for large videos
    });
    console.log(`[photos] Video downloaded — size: ${res.data.byteLength} bytes`);
    return Buffer.from(res.data);
  } catch (err) {
    // Distinguish auth failures (expired token) from other errors
    // so the controller can refresh the token and retry
    if (err.response?.status === 401) {
      const authErr  = new Error("Drive access token expired");
      authErr.isTokenExpired = true;
      throw authErr;
    }
    console.error("[photos] downloadVideoBuffer error:", err.message);
    throw new Error("Failed to download video from Google Drive.");
  }
};

module.exports = { getUserVideos, downloadVideoBuffer };
