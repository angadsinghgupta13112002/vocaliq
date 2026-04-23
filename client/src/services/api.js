import axios from "axios";
import { API_BASE_URL, TOKEN_KEY } from "../utils/constants";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Coaching API ──────────────────────────────────────────────────────────
export const analyzeSession = (formData) =>
  api.post("/coaching/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 min — Gemini File API + two-pass + Vision can take 2–3 min
  });

// analyzeSessionFromDrive — server downloads from Drive and runs full analysis.
// Used for large Drive videos to bypass Cloud Run's 32 MB response limit and
// browser CORS restrictions on direct Google Drive downloads.
export const analyzeSessionFromDrive = (driveVideoUrl, filename, context) =>
  api.post("/coaching/analyze-from-drive", {
    driveVideoUrl,
    filename,
    scenario: context.scenario || "General presentation",
    audience: context.audience || "General audience",
    goal:     context.goal     || "Communicate effectively",
  }, { timeout: 300000 });

export const getSessions  = ()     => api.get("/coaching/sessions");
export const getSession   = (id)   => api.get(`/coaching/sessions/${id}`);

// ── Google Photos API ─────────────────────────────────────────────────────

/**
 * getPhotosStatus — checks whether the current user has Google Photos connected.
 * Returns { photosConnected: boolean, photosConnectedAt: string|null }
 */
export const getPhotosStatus = () => api.get("/auth/google/photos/status");

/**
 * connectGooglePhotos — redirects the browser to the Google Photos OAuth flow.
 * The JWT is passed as a query param because this is a full browser redirect
 * (not an axios call), so Authorization headers cannot be set.
 * The server-side callback stores the access token and redirects back to /session.
 */
export const connectGooglePhotos = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  window.location.href = `${API_BASE_URL}/auth/google/photos?token=${token}`;
};

/**
 * listPhotosVideos — fetches the user's 20 most recent Google Photos videos.
 * Returns { videos: [{ id, filename, url, thumbnailUrl, createdAt }] }
 */
export const listPhotosVideos = () => api.get("/photos/videos");

/**
 * downloadPhotosVideo — downloads a Google Drive video as a Blob.
 *
 * Cloud Run has a 32 MB response body limit, so we cannot proxy large video
 * files through the server. Instead:
 *   1. Ask the server for a fresh access token (with auto-refresh if expired)
 *   2. Download the file directly from Google Drive in the browser
 *      → bypasses Cloud Run entirely, no size limit
 *
 * @param {string} videoUrl — the Drive ?alt=media URL returned by listPhotosVideos
 * @returns {Blob} video blob suitable for creating a File object
 */
export const downloadPhotosVideo = async (videoUrl) => {
  // Step 1: get a validated (and possibly refreshed) access token from our server
  const { data } = await api.post("/photos/download", { videoUrl });

  // Step 2: download the video directly from Google Drive
  const response = await fetch(data.downloadUrl, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });

  if (!response.ok) {
    const msg = response.status === 401
      ? "Google Drive session expired. Please reconnect Drive and try again."
      : response.status === 403
      ? "Access denied. Make sure the file is in your own Google Drive."
      : `Google Drive returned ${response.status}. Please try again.`;
    throw new Error(msg);
  }

  return await response.blob();
};

export default api;
