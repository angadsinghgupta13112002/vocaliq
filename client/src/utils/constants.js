/**
 * utils/constants.js - App-Wide Constants
 * Central place for all constant values used across the React SPA.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */

// Base URL for all API calls to the Express backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

// Local storage key for storing the JWT token
export const TOKEN_KEY = "auraboard_token";

// Gemini output field labels for display in the UI
export const MOOD_LABELS = {
  Joyful: "😊", Calm: "😌", Melancholic: "😢",
  Energetic: "⚡", Anxious: "😰", Neutral: "😐",
};

// Maximum audio recording duration in seconds
export const MAX_RECORDING_SECONDS = 60;
