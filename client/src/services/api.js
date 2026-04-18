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

// Coaching API helpers
export const analyzeSession = (formData) =>
  api.post("/coaching/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 min — Gemini File API + two-pass can take 2–3 min
  });

export const getSessions  = ()     => api.get("/coaching/sessions");
export const getSession   = (id)   => api.get(`/coaching/sessions/${id}`);

export default api;
