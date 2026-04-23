/**
 * services/geminiCoachingService.js - VocalIQ Gemini Coaching Engine
 * Implements the two-pass Gemini coaching chain:
 *   Pass 1 → Assessment (language, score, transcript, timestamps, tips)
 *   Pass 2 → Deep coaching (exercises, rephrasing, vocal control, practice plan)
 * Uses Gemini File API for video (large files) and base64 inlineData for audio.
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs   = require("fs");
const os   = require("os");
const path = require("path");

const genAI       = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
const model       = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });

// ─── Safe JSON parser ────────────────────────────────────────────────────────
// Prevents a safety-blocked or malformed Gemini response from crashing the
// whole request. Returns a safe default object so the rest of the pipeline
// can continue and the client receives a meaningful error message.
const PASS1_DEFAULTS = {
  language: "Unknown", overallScore: 0,
  scoreBreakdown: { contentClarity: 0, emotionalDelivery: 0, vocalConfidence: 0, pacing: 0, audienceEngagement: 0 },
  scoreJustification: "Analysis could not be completed. Please try again.",
  emotionDetected: "Unknown", emotionNeeded: "Unknown", wpm: 0,
  transcript: [], improvementTips: [],
};
const PASS2_DEFAULTS = {
  detailedTips: [], vocalControl: {}, strengthsToKeep: [],
  practicePlan: "Please re-submit your recording for a detailed coaching plan.",
};

const safeParseGemini = (text, label) => {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("Gemini returned null or non-object");
    return parsed;
  } catch (err) {
    console.error(`[gemini] ${label} JSON parse failed:`, err.message, "| raw:", (text || "").substring(0, 200));
    return label.includes("Pass 1") ? { ...PASS1_DEFAULTS } : { ...PASS2_DEFAULTS };
  }
};

// ─── Gemini File API Upload ──────────────────────────────────────────────────
// Writes video buffer to a temp file, uploads to Gemini File API, polls until
// ACTIVE, then deletes the temp file. Returns the Gemini file object with .uri
const uploadVideoToGemini = async (videoBuffer, mimeType = "video/webm") => {
  const tmpPath = path.join(os.tmpdir(), `vocaliq_${Date.now()}.webm`);
  fs.writeFileSync(tmpPath, videoBuffer);
  try {
    const uploadResult = await fileManager.uploadFile(tmpPath, {
      mimeType,
      displayName: `coaching_${Date.now()}`,
    });
    // Poll until Gemini finishes processing the video (can take 10-60 seconds)
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === "PROCESSING") {
      await new Promise(r => setTimeout(r, 3000));
      file = await fileManager.getFile(uploadResult.file.name);
    }
    if (file.state === "FAILED") throw new Error("Gemini video processing failed.");
    return file;
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
};

// ─── Pass 1 Prompt ───────────────────────────────────────────────────────────
const buildPass1Prompt = (scenario, audience, goal) => `
You are an expert speaking coach analyzing a video/audio recording.
Context — Scenario: "${scenario}", Audience: "${audience}", Goal: "${goal}".

Carefully watch and listen. Analyze facial expressions, voice tone, pacing, word choice, and delivery.
Return ONLY valid JSON with no extra text, in this exact structure:
{
  "language": "<detected spoken language>",
  "overallScore": <number 1.0 to 10.0>,
  "scoreBreakdown": {
    "contentClarity": <1-10>,
    "emotionalDelivery": <1-10>,
    "vocalConfidence": <1-10>,
    "pacing": <1-10>,
    "audienceEngagement": <1-10>
  },
  "scoreJustification": "<2-3 sentence explanation of the overall score>",
  "emotionDetected": "<primary emotion visible in face and voice>",
  "emotionNeeded": "<the emotion most effective for this scenario and audience>",
  "wpm": <estimated words per minute as integer>,
  "transcript": [
    {
      "start": "<timestamp like 0:00>",
      "end": "<timestamp like 0:08>",
      "text": "<exact spoken words in this segment>",
      "issues": ["<use these exact tags: filler_word | nervousness | stutter | eye_contact_break | monotone | too_fast | too_slow | enthusiasm | professional_tone>"],
      "fix": "<specific actionable fix for this segment, or empty string if no issues>"
    }
  ],
  "improvementTips": ["<top tip 1>", "<top tip 2>", "<top tip 3>"]
}
Note: enthusiasm and professional_tone are positive tags — include them when applicable.
`;

// ─── Pass 2 Prompt ───────────────────────────────────────────────────────────
const buildPass2Prompt = (pass1) => `
You are an expert speaking coach. Based on this assessment of a speaker's recorded session:

${JSON.stringify(pass1, null, 2)}

Provide a detailed, personalized coaching plan. Return ONLY valid JSON with no extra text:
{
  "detailedTips": [
    {
      "issue": "<issue tag from transcript>",
      "title": "<concise coaching tip title>",
      "explanation": "<why this matters specifically for their scenario, audience, and goal>",
      "exercise": "<specific practice exercise they can do in the next 24 hours>",
      "rephrasing": "<example of better phrasing, or empty string if not applicable>"
    }
  ],
  "vocalControl": {
    "pacing": {
      "current": <wpm from assessment>,
      "target": <ideal wpm for their context>,
      "technique": "<specific pacing technique>"
    },
    "tone": "<vocal tone improvement technique>",
    "breath": "<breath control advice>",
    "pause": "<pause technique advice>"
  },
  "strengthsToKeep": ["<positive thing 1>", "<positive thing 2>"],
  "practicePlan": "<3-sentence personalized practice plan targeting their biggest weaknesses>"
}
`;

// ─── Pass 3 Prompt: Gesture Analysis ────────────────────────────────────────
// Used for Drive-sourced videos where client-side MediaPipe cannot run.
// Gemini inspects the already-uploaded file — no extra upload cost.
const GESTURE_ANALYSIS_PROMPT = `
Analyze the speaker's hand gestures in this video recording.
For every 3 seconds of video (0, 3, 6, 9 … up to the end), identify the dominant hand gesture.

Use ONLY these exact gesture labels:
- open_hand    : fingers spread open, palm clearly visible
- pointing     : index finger extended toward camera or to one side
- peace        : two fingers up (V sign / peace sign)
- thumbs_up    : thumb pointing upward
- fist         : closed fist, all fingers curled in
- partial_open : some fingers extended but not a fully open hand
- neutral_hand : relaxed hand at rest, not actively gesturing
- no_hands     : hands not visible or out of frame

Return ONLY a valid JSON array with no surrounding text or markdown:
[
  { "second": 0,  "gesture": "open_hand",   "handsCount": 2 },
  { "second": 3,  "gesture": "pointing",    "handsCount": 1 },
  { "second": 6,  "gesture": "no_hands",    "handsCount": 0 }
]
Include one entry per 3-second interval. Use handsCount 0 when no hands are visible.
`;

// ─── Analyze Video (uses Gemini File API) ────────────────────────────────────
// options.includeGestures = true  → adds a third Gemini pass for gesture analysis.
// Used by the Drive upload flow where client-side MediaPipe cannot run.
const analyzeVideoWithGemini = async (videoBuffer, mimeType, context, options = {}) => {
  const {
    scenario = "General presentation",
    audience = "General audience",
    goal     = "Communicate effectively",
  } = context;
  const { includeGestures = false } = options;

  console.log("[gemini] Uploading video to Gemini File API...");
  const geminiFile = await uploadVideoToGemini(videoBuffer, mimeType);
  console.log("[gemini] Video active. Running Pass 1...");

  const pass1Result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { text: buildPass1Prompt(scenario, audience, goal) },
        { fileData: { mimeType: geminiFile.mimeType, fileUri: geminiFile.uri } },
      ],
    }],
    generationConfig: { responseMimeType: "application/json" },
  });
  const pass1 = safeParseGemini(pass1Result.response.text(), "Pass 1 (video)");
  console.log("[gemini] Pass 1 complete. Score:", pass1.overallScore, "Running Pass 2...");

  const pass2Result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{ text: buildPass2Prompt(pass1) }],
    }],
    generationConfig: { responseMimeType: "application/json" },
  });
  const pass2 = safeParseGemini(pass2Result.response.text(), "Pass 2 (video)");
  console.log("[gemini] Pass 2 complete.");

  // ── Optional Pass 3: Gesture analysis (Drive uploads only) ──────────────
  let gestureTimeline = [];
  if (includeGestures) {
    console.log("[gemini] Running Pass 3: gesture analysis...");
    try {
      const pass3Result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { text: GESTURE_ANALYSIS_PROMPT },
            { fileData: { mimeType: geminiFile.mimeType, fileUri: geminiFile.uri } },
          ],
        }],
        generationConfig: { responseMimeType: "application/json" },
      });
      const raw = pass3Result.response.text();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        gestureTimeline = parsed;
        console.log(`[gemini] Pass 3 complete: ${gestureTimeline.length} gesture entries`);
      }
    } catch (err) {
      console.warn("[gemini] Pass 3 gesture analysis failed (non-fatal):", err.message);
    }
  }

  // Clean up the Gemini file (auto-expires in 48 h but good practice)
  try { await fileManager.deleteFile(geminiFile.name); } catch (_) {}

  return { pass1, pass2, gestureTimeline };
};

// ─── Analyze Audio (base64 inlineData — audio files are small enough) ───────
const analyzeAudioWithGemini = async (audioBuffer, context) => {
  const { scenario = "General speech", audience = "General audience", goal = "Communicate effectively" } = context;
  const base64Audio = Buffer.from(audioBuffer).toString("base64");

  console.log("[gemini] Running Pass 1 (audio)...");
  const pass1Result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { text: buildPass1Prompt(scenario, audience, goal) },
        { inlineData: { data: base64Audio, mimeType: "audio/webm" } },
      ],
    }],
    generationConfig: { responseMimeType: "application/json" },
  });
  const pass1 = safeParseGemini(pass1Result.response.text(), "Pass 1 (audio)");
  console.log("[gemini] Pass 1 complete. Score:", pass1.overallScore, "Running Pass 2...");

  const pass2Result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{ text: buildPass2Prompt(pass1) }],
    }],
    generationConfig: { responseMimeType: "application/json" },
  });
  const pass2 = safeParseGemini(pass2Result.response.text(), "Pass 2 (audio)");
  console.log("[gemini] Pass 2 complete.");

  return { pass1, pass2 };
};

module.exports = { analyzeVideoWithGemini, analyzeAudioWithGemini };
