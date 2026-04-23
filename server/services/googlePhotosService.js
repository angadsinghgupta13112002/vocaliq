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
 * streamVideoDownload - Opens a streaming GET request to Google Drive.
 * Returns the raw axios response so the controller can pipe it directly
 * to the client — no buffering, no memory spike for large files.
 *
 * @param {string} videoUrl    - Drive file download URL (with ?alt=media)
 * @param {string} accessToken - Google OAuth access token with drive.readonly scope
 * @returns {AxiosResponse}    - Streaming response (response.data is a Readable)
 */
const streamVideoDownload = async (videoUrl, accessToken) => {
  try {
    console.log("[photos] Opening streaming download from Google Drive...");
    const res = await axios.get(videoUrl, {
      responseType: "stream",
      headers:      { Authorization: `Bearer ${accessToken}` },
      timeout:      300000, // 5 min for large videos
    });
    console.log(`[photos] Stream opened — content-type: ${res.headers["content-type"]}, size: ${res.headers["content-length"] || "unknown"} bytes`);
    return res;
  } catch (err) {
    if (err.response?.status === 401) {
      const authErr = new Error("Drive access token expired");
      authErr.isTokenExpired = true;
      throw authErr;
    }
    console.error("[photos] streamVideoDownload error:", err.message);
    throw new Error(`Failed to download video from Google Drive: ${err.message}`);
  }
};

module.exports = { getUserVideos, streamVideoDownload };
