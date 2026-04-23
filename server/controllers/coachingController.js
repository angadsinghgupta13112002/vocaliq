/**
 * controllers/coachingController.js - VocalIQ Coaching Session Controller
 * Handles video/audio upload, runs the two-pass Gemini coaching chain,
 * runs Cloud Vision face detection in parallel (for emotion timeline),
 * saves results to Firestore coaching_sessions, and returns the full report.
 */
const { analyzeVideoWithGemini, analyzeAudioWithGemini } = require("../services/geminiCoachingService");
const { uploadVideo, uploadAudio }                       = require("../services/storageService");
const { setDocument, queryCollection, getDocument }      = require("../services/firestoreService");
const { sendServerEvent }                                = require("../services/analyticsService");
const { analyzeFrames, summarizeEmotionTimeline }        = require("../services/visionService");

// ─── POST /api/coaching/analyze ─────────────────────────────────────────────
// Accepts a video or audio file + context fields + optional JSON frames array.
// Runs the two-pass Gemini chain AND Cloud Vision face detection in parallel,
// saves everything to Firestore coaching_sessions, returns the full report.
//
// Request body fields:
//   scenario, audience, goal, mode  — coaching context
//   frames  — JSON string of [{ second, base64 }] extracted by frameExtractor.js
//             (only present for video/recorded modes — omit for audio-only)
const analyzeSession = async (req, res) => {
  try {
    const { uid } = req.user;
    const {
      scenario = "General presentation",
      audience = "General audience",
      goal     = "Communicate effectively",
      mode     = "video",
      frames: framesJson,          // Optional — JSON string of frame array
    } = req.body;
    const context = { scenario, audience, goal };

    if (!req.file) {
      return res.status(400).json({ success: false, error: "No media file provided" });
    }

    // Parse frames if provided — gracefully handle malformed JSON
    let frames = [];
    if (framesJson) {
      try {
        frames = JSON.parse(framesJson);
        console.log(`[coaching] Received ${frames.length} frames for Vision analysis`);
      } catch (_) {
        console.warn("[coaching] Could not parse frames JSON — skipping Vision analysis");
      }
    }

    console.log(`[coaching] Starting ${mode} analysis for user ${uid}`);

    // ── Run Gemini + GCS upload + Cloud Vision in parallel ──────────────────
    // Vision analysis runs concurrently with the (slower) Gemini pipeline,
    // so it adds nearly zero latency to the overall response time.

    let mediaUrl;
    let analysisResult;
    let emotionTimeline   = [];
    let emotionSummary    = {};

    if (mode === "audio") {
      // Audio mode: no frames — skip Vision entirely
      [mediaUrl, analysisResult] = await Promise.all([
        uploadAudio(req.file, uid),
        analyzeAudioWithGemini(req.file.buffer, context),
      ]);
    } else {
      // Video mode: run GCS upload, Gemini, and Vision concurrently
      const visionPromise = frames.length > 0
        ? analyzeFrames(frames).catch(err => {
            console.warn("[coaching] Vision analysis failed (non-fatal):", err.message);
            return [];
          })
        : Promise.resolve([]);

      [mediaUrl, analysisResult, emotionTimeline] = await Promise.all([
        uploadVideo(req.file, uid),
        analyzeVideoWithGemini(req.file.buffer, req.file.mimetype || "video/webm", context),
        visionPromise,
      ]);

      emotionSummary = summarizeEmotionTimeline(emotionTimeline);
      console.log(`[coaching] Emotion summary: dominant=${emotionSummary.dominantEmotion}, frames=${emotionTimeline.length}`);
    }

    const { pass1, pass2 } = analysisResult;
    const sessionId = `${uid}_${Date.now()}`;

    const sessionData = {
      userId:             uid,
      sessionId,
      mediaUrl,
      mode,
      context,
      language:           pass1.language,
      overallScore:       pass1.overallScore,
      scoreBreakdown:     pass1.scoreBreakdown,
      scoreJustification: pass1.scoreJustification,
      emotionDetected:    pass1.emotionDetected,
      emotionNeeded:      pass1.emotionNeeded,
      wpm:                pass1.wpm,
      transcript:         pass1.transcript || [],
      improvementTips:    pass1.improvementTips || [],
      detailedTips:       pass2.detailedTips || [],
      vocalControl:       pass2.vocalControl || {},
      strengthsToKeep:    pass2.strengthsToKeep || [],
      practicePlan:       pass2.practicePlan || "",
      // Cloud Vision emotion timeline — new fields
      emotionTimeline,     // Array of { second, emotion, confidence }
      emotionSummary,      // { dominantEmotion, emotionCounts, nervousSeconds, confidentSeconds }
      createdAt:          new Date(),
    };

    await setDocument("coaching_sessions", sessionId, sessionData);
    console.log(`[coaching] Session saved: ${sessionId}`);

    // Track analysis completion in GA4 via Measurement Protocol (backend event)
    sendServerEvent(uid, "session_analyzed", {
      mode,
      scenario,
      language:        pass1.language            || "unknown",
      overall_score:   pass1.overallScore         || 0,
      emotion_frames:  emotionTimeline.length,
      dominant_emotion: emotionSummary.dominantEmotion || "unknown",
    });

    res.json({ success: true, sessionId, data: sessionData });
  } catch (err) {
    console.error("[coaching] analyzeSession error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/coaching/sessions ──────────────────────────────────────────────
// Returns all coaching sessions for the authenticated user, sorted newest first.
const getSessions = async (req, res) => {
  try {
    const { uid } = req.user;
    const sessions = await queryCollection("coaching_sessions", "userId", uid, 50);

    sessions.sort((a, b) => {
      const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return tb - ta;
    });

    res.json({ success: true, sessions });
  } catch (err) {
    console.error("[coaching] getSessions error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/coaching/sessions/:id ─────────────────────────────────────────
// Returns a single coaching session by ID (must belong to the authenticated user).
const getSession = async (req, res) => {
  try {
    const { uid } = req.user;
    const session = await getDocument("coaching_sessions", req.params.id);

    if (!session || session.userId !== uid) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    res.json({ success: true, session });
  } catch (err) {
    console.error("[coaching] getSession error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { analyzeSession, getSessions, getSession };
