/**
 * services/visionService.js - Google Cloud Vision API Integration
 * Analyzes individual video frames for facial expressions, emotions,
 * and eye contact (using face pan/tilt angles from Cloud Vision).
 * Used to produce a second-by-second emotion + eye contact timeline.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const vision = require("@google-cloud/vision");

// Initialize Vision client — uses ADC on Cloud Run, key file locally
const client = new vision.ImageAnnotatorClient();

// Maps Cloud Vision likelihood strings to numeric scores (0–4)
const LIKELIHOOD_SCORE = {
  VERY_UNLIKELY: 0,
  UNLIKELY:      1,
  POSSIBLE:      2,
  LIKELY:        3,
  VERY_LIKELY:   4,
};

/**
 * detectEmotionFromFrame - Calls Vision Face Detection on a single base64 frame
 * Returns the dominant emotion and confidence score for that frame.
 *
 * @param {string} base64Image - Base64-encoded JPEG frame (no data: prefix)
 * @returns {Object} - { emotion, confidence, raw }
 */
const detectEmotionFromFrame = async (base64Image) => {
  try {
    // Call Vision API with FACE_DETECTION feature
    const [result] = await client.annotateImage({
      image:    { content: base64Image },
      features: [{ type: "FACE_DETECTION", maxResults: 1 }],
    });

    const faces = result.faceAnnotations || [];

    // No face detected in this frame — return neutral
    if (faces.length === 0) {
      return { emotion: "no_face", confidence: 0, raw: {} };
    }

    const face = faces[0];

    // Extract likelihood scores for each emotion
    const scores = {
      joy:      LIKELIHOOD_SCORE[face.joyLikelihood]      || 0,
      sorrow:   LIKELIHOOD_SCORE[face.sorrowLikelihood]   || 0,
      anger:    LIKELIHOOD_SCORE[face.angerLikelihood]    || 0,
      surprise: LIKELIHOOD_SCORE[face.surpriseLikelihood] || 0,
    };

    // ── Eye contact detection ──────────────────────────────────────────────
    // Cloud Vision returns pan (left/right) and tilt (up/down) angles in degrees.
    // If the speaker's face is turned more than 15° horizontally or 20° vertically
    // from center, they are considered to be looking away from the camera.
    const panAngle  = face.panAngle  || 0;  // negative = looking left, positive = looking right
    const tiltAngle = face.tiltAngle || 0;  // negative = looking up,   positive = looking down
    const eyeContact = (Math.abs(panAngle) <= 15 && Math.abs(tiltAngle) <= 20)
      ? "direct"
      : "looking_away";

    // Map Vision API emotions to user-friendly coaching labels
    // Nervous = high sorrow + low joy, Confident = high joy + low sorrow
    const detectionConfidence = face.detectionConfidence || 0;

    let emotion    = "neutral";
    let confidence = detectionConfidence;

    if (scores.joy >= 3) {
      emotion    = "confident";
      confidence = detectionConfidence * (scores.joy / 4);
    } else if (scores.sorrow >= 3 || (scores.sorrow >= 2 && scores.joy <= 1)) {
      emotion    = "nervous";
      confidence = detectionConfidence * (scores.sorrow / 4);
    } else if (scores.anger >= 3) {
      emotion    = "frustrated";
      confidence = detectionConfidence * (scores.anger / 4);
    } else if (scores.surprise >= 3) {
      emotion    = "surprised";
      confidence = detectionConfidence * (scores.surprise / 4);
    } else if (scores.joy >= 2) {
      emotion    = "engaged";
      confidence = detectionConfidence * (scores.joy / 4);
    } else if (scores.sorrow >= 2) {
      emotion    = "anxious";
      confidence = detectionConfidence * (scores.sorrow / 4);
    }

    return {
      emotion,
      confidence:  Math.round(confidence * 100) / 100,
      eyeContact,
      panAngle:    Math.round(panAngle),
      tiltAngle:   Math.round(tiltAngle),
      raw: {
        joy:      face.joyLikelihood,
        sorrow:   face.sorrowLikelihood,
        anger:    face.angerLikelihood,
        surprise: face.surpriseLikelihood,
      },
    };
  } catch (err) {
    // Never let Vision errors crash the coaching pipeline
    console.warn("[vision] Frame analysis error:", err.message);
    return { emotion: "unknown", confidence: 0, raw: {} };
  }
};

/**
 * analyzeFrames - Analyzes an array of timestamped frames with Cloud Vision.
 * Returns an emotion timeline array for the coaching report.
 *
 * @param {Array} frames - [{ second: number, base64: string }, ...]
 * @returns {Array} - [{ second, emotion, confidence, raw }, ...]
 */
const analyzeFrames = async (frames) => {
  if (!frames || frames.length === 0) return [];

  console.log(`[vision] Analyzing ${frames.length} frames with Cloud Vision Face Detection`);

  // Process frames in parallel (max 5 concurrent to respect API rate limits)
  const results = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < frames.length; i += BATCH_SIZE) {
    const batch = frames.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (frame) => {
        const result = await detectEmotionFromFrame(frame.base64);
        return {
          second:     frame.second,
          emotion:    result.emotion,
          confidence: result.confidence,
          eyeContact: result.eyeContact,
          panAngle:   result.panAngle,
          tiltAngle:  result.tiltAngle,
          raw:        result.raw,
        };
      })
    );
    results.push(...batchResults);
  }

  // Filter out frames where no face was detected
  const timeline = results.filter(r => r.emotion !== "no_face" && r.emotion !== "unknown");

  console.log(`[vision] Emotion timeline built: ${timeline.length} frames with faces detected`);
  return timeline;
};

/**
 * summarizeEmotionTimeline - Produces a human-readable summary of the emotion timeline.
 * Used to add a brief emotion overview to the coaching report.
 *
 * @param {Array} timeline - Output from analyzeFrames()
 * @returns {Object} - { dominantEmotion, emotionCounts, nervousSeconds, confidentSeconds,
 *                       eyeContactPercent, eyeContactRating, lookingAwaySeconds }
 */
const summarizeEmotionTimeline = (timeline) => {
  if (!timeline || timeline.length === 0) {
    return { dominantEmotion: "unknown", emotionCounts: {}, nervousSeconds: [], confidentSeconds: [] };
  }

  // Count occurrences of each emotion
  const emotionCounts = {};
  timeline.forEach(({ emotion }) => {
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  });

  // Find dominant emotion
  const dominantEmotion = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "neutral";

  // Collect seconds where user appeared nervous or confident
  const nervousSeconds   = timeline.filter(t => t.emotion === "nervous"   || t.emotion === "anxious").map(t => t.second);
  const confidentSeconds = timeline.filter(t => t.emotion === "confident" || t.emotion === "engaged").map(t => t.second);

  // ── Eye contact summary ──────────────────────────────────────────────────
  const framesWithEyeData   = timeline.filter(t => t.eyeContact !== undefined);
  const directFrames        = framesWithEyeData.filter(t => t.eyeContact === "direct");
  const lookingAwaySeconds  = framesWithEyeData.filter(t => t.eyeContact === "looking_away").map(t => t.second);
  const eyeContactPercent   = framesWithEyeData.length > 0
    ? Math.round((directFrames.length / framesWithEyeData.length) * 100)
    : null;

  // Rating label for the eye contact score
  let eyeContactRating = "unknown";
  if (eyeContactPercent !== null) {
    if (eyeContactPercent >= 80)      eyeContactRating = "excellent";
    else if (eyeContactPercent >= 60) eyeContactRating = "good";
    else if (eyeContactPercent >= 40) eyeContactRating = "needs_work";
    else                              eyeContactRating = "poor";
  }

  return {
    dominantEmotion,
    emotionCounts,
    nervousSeconds,
    confidentSeconds,
    eyeContactPercent,
    eyeContactRating,
    lookingAwaySeconds,
  };
};

module.exports = { analyzeFrames, summarizeEmotionTimeline };
