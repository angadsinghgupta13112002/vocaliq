/**
 * controllers/coachingController.js - VocalIQ Coaching Session Controller
 * Handles video/audio upload, runs the two-pass Gemini coaching chain,
 * saves results to Firestore coaching_sessions, and returns the full report.
 */
const { analyzeVideoWithGemini, analyzeAudioWithGemini } = require("../services/geminiCoachingService");
const { uploadVideo, uploadAudio }                       = require("../services/storageService");
const { setDocument, queryCollection, getDocument }      = require("../services/firestoreService");

// ─── POST /api/coaching/analyze ─────────────────────────────────────────────
// Accepts a video or audio file + context fields, runs the two-pass Gemini
// chain, saves the session to Firestore, and returns the full coaching report.
const analyzeSession = async (req, res) => {
  try {
    const { uid } = req.user;
    const { scenario = "General presentation", audience = "General audience", goal = "Communicate effectively", mode = "video" } = req.body;
    const context = { scenario, audience, goal };

    if (!req.file) {
      return res.status(400).json({ success: false, error: "No media file provided" });
    }

    console.log(`[coaching] Starting ${mode} analysis for user ${uid}`);

    // Upload to GCS for permanent storage + get analysis from Gemini
    let mediaUrl;
    let analysisResult;

    if (mode === "audio") {
      [mediaUrl, analysisResult] = await Promise.all([
        uploadAudio(req.file, uid),
        analyzeAudioWithGemini(req.file.buffer, context),
      ]);
    } else {
      // For video: upload to GCS in parallel with Gemini File API upload
      mediaUrl = await uploadVideo(req.file, uid);
      analysisResult = await analyzeVideoWithGemini(req.file.buffer, req.file.mimetype || "video/webm", context);
    }

    const { pass1, pass2 } = analysisResult;
    const sessionId = `${uid}_${Date.now()}`;

    const sessionData = {
      userId:           uid,
      sessionId,
      mediaUrl,
      mode,
      context,
      language:         pass1.language,
      overallScore:     pass1.overallScore,
      scoreBreakdown:   pass1.scoreBreakdown,
      scoreJustification: pass1.scoreJustification,
      emotionDetected:  pass1.emotionDetected,
      emotionNeeded:    pass1.emotionNeeded,
      wpm:              pass1.wpm,
      transcript:       pass1.transcript || [],
      improvementTips:  pass1.improvementTips || [],
      detailedTips:     pass2.detailedTips || [],
      vocalControl:     pass2.vocalControl || {},
      strengthsToKeep:  pass2.strengthsToKeep || [],
      practicePlan:     pass2.practicePlan || "",
      createdAt:        new Date(),
    };

    await setDocument("coaching_sessions", sessionId, sessionData);
    console.log(`[coaching] Session saved: ${sessionId}`);

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
