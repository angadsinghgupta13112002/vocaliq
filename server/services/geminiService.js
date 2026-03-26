/**
 * services/geminiService.js - Google Gemini API Wrapper
 * Provides abstraction for all three Gemini API calls:
 *   1. analyzePhotoWithGemini  - Vision API (STEP 3b) --> outputXXX
 *   2. analyzeAudioWithGemini  - Audio API  (STEP 4b) --> outputYYY
 *   3. generateAuraReport      - Cross-modal (STEP 5) --> outputZZZ
 * Author: Abhinay Konuri | CS651 Project 2
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini client with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });

/**
 * analyzePhotoWithGemini - STEP 3b
 * Sends a photo URL to Gemini Vision and extracts emotional metadata.
 * @param {string} photoUrl - Public URL of the photo to analyze
 * @returns {Object} outputXXX - { emotionalTone, colorMood, socialContext, activityType, sceneType, confidenceScore }
 */
const analyzePhotoWithGemini = async (photoUrl) => {
  const prompt = `
    Analyze this photo and return a JSON object with these exact fields:
    {
      "emotionalTone": "string (e.g. Joyful, Calm, Melancholic, Energetic)",
      "colorMood": "string (e.g. Warm, Cool, Neutral, Vibrant)",
      "socialContext": "string (Solo or Group)",
      "activityType": "string (e.g. Outdoor, Indoor, Travel, Food, Social)",
      "sceneType": "string (e.g. Nature, Urban, Home, Restaurant)",
      "confidenceScore": number between 0 and 1
    }
    Return ONLY valid JSON, no extra text.
  `;

  // Fetch the image and convert to base64 for Gemini
  const imageResponse = await fetch(photoUrl);
  const imageBuffer   = await imageResponse.arrayBuffer();
  const base64Image   = Buffer.from(imageBuffer).toString("base64");
  const mimeType      = imageResponse.headers.get("content-type") || "image/jpeg";

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: base64Image, mimeType } },
  ]);

  const text = result.response.text().trim();
  // Clean potential markdown code fences from Gemini response
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
};

/**
 * analyzeAudioWithGemini - STEP 4b
 * Sends a GCS audio URL to Gemini Audio for transcription and mood extraction.
 * @param {string} audioUrl - Public GCS URL of the voice recording
 * @returns {Object} outputYYY - { transcription, sentiment, energyLevel, stressSignals, topicTags }
 */
const analyzeAudioWithGemini = async (audioUrl) => {
  const prompt = `
    Listen to this audio recording and return a JSON object with these exact fields:
    {
      "transcription": "string (full transcript of what was said)",
      "sentiment": "string (Positive, Neutral, or Negative)",
      "energyLevel": number between 1 and 10,
      "stressSignals": boolean,
      "topicTags": ["array", "of", "key", "topics", "mentioned"]
    }
    Return ONLY valid JSON, no extra text.
  `;

  const result = await model.generateContent([
    prompt,
    { fileData: { mimeType: "audio/webm", fileUri: audioUrl } },
  ]);

  const text  = result.response.text().trim();
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
};

/**
 * generateAuraReport - STEP 5
 * Sends combined photo + audio summaries to Gemini for cross-modal insight generation.
 * @param {Array} photoSummaries - Array of outputXXX objects (last 7 days)
 * @param {Array} audioSummaries - Array of outputYYY objects (last 7 days)
 * @returns {Object} outputZZZ - { auraScore, narrativeParagraph, correlationInsights, photoSummary, audioSummary }
 */
const generateAuraReport = async (photoSummaries, audioSummaries) => {
  const prompt = `
    You are an emotional intelligence analyst. You have the following data from the past 7 days:

    PHOTO EMOTIONAL DATA:
    ${JSON.stringify(photoSummaries, null, 2)}

    VOICE MOOD DATA:
    ${JSON.stringify(audioSummaries, null, 2)}

    Identify correlations and patterns between the visual and audio emotional data.
    Return a JSON object with these exact fields:
    {
      "auraScore": number between 1 and 10 representing overall emotional wellbeing,
      "narrativeParagraph": "string (150-word insight narrative highlighting non-obvious patterns)",
      "correlationInsights": ["array", "of", "key", "cross-modal", "insights"],
      "photoSummary": "string (2-sentence summary of photo emotional trends)",
      "audioSummary": "string (2-sentence summary of audio mood trends)"
    }
    Return ONLY valid JSON, no extra text.
  `;

  const result = await model.generateContent(prompt);
  const text   = result.response.text().trim();
  const clean  = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
};

module.exports = { analyzePhotoWithGemini, analyzeAudioWithGemini, generateAuraReport };
