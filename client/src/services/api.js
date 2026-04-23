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
 * downloadPhotosVideo — downloads a Google Photos video as a Blob.
 * @param {string} videoUrl — the =dv URL returned by listPhotosVideos
 * @returns {Blob} video blob suitable for creating a File object
 */
export const downloadPhotosVideo = async (videoUrl) => {
  const res = await api.post(
    "/photos/download",
    { videoUrl },
    { responseType: "blob", timeout: 300000 }
  );
  return res.data; // Blob
};

export default api;
