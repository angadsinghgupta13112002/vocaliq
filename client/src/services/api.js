/**
 * services/api.js - Axios API Client Configuration
 * Configures an Axios instance with the base URL and automatic
 * JWT token injection into every request Authorization header.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */
import axios from "axios";
import { API_BASE_URL, TOKEN_KEY } from "../utils/constants";

// Create Axios instance with the backend base URL
const api = axios.create({ baseURL: API_BASE_URL });

// Request interceptor - attach JWT token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 (token expired) globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY); // Clear expired token
      window.location.href = "/login";    // Redirect to login
    }
    return Promise.reject(error);
  }
);

export default api;
