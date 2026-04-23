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
 * Uses responseType "blob" so large files stream from server to browser
 * without blocking. On error, parses the blob body to surface the real
 * server error message instead of a generic fallback.
 *
 * @param {string} videoUrl — the Drive ?alt=media URL returned by listPhotosVideos
 * @returns {Blob} video blob suitable for creating a File object
 */
export const downloadPhotosVideo = async (videoUrl) => {
  try {
    const res = await api.post(
      "/photos/download",
      { videoUrl },
      { responseType: "blob", timeout: 300000 }
    );
    return res.data; // Blob
  } catch (err) {
    // When responseType:"blob", axios gives us the error body as a Blob.
    // Read it as text so we can surface the real server error message.
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        if (text) {
          const payload = JSON.parse(text);
          throw new Error(payload?.error || "Download failed");
        }
      } catch (parseErr) {
        // Only re-throw if we successfully parsed a real error message
        if (parseErr.message && parseErr.message !== "Download failed"
            && !parseErr.message.includes("JSON")) {
          throw parseErr;
        }
      }
    }
    // Fallback: surface axios error message or a friendly default
    throw new Error(
      err.response?.status === 403
        ? "Google Drive session expired. Please reconnect Drive and try again."
        : err.message?.includes("timeout")
        ? "Download timed out — try a shorter video or check your connection."
        : "Failed to download from Google Drive. Please try again."
    );
  }
};

export default api;
