/**
 * controllers/coachingController.js - VocalIQ Coaching Session Controller
 * Handles video/audio upload, runs the two-pass Gemini coaching chain,
 * runs Cloud Vision face detection in parallel (for emotion timeline),
 * saves results to Firestore coaching_sessions, and returns the full report.
 */
const axios                                              = require("axios");
const { analyzeVideoWithGemini, analyzeAudioWithGemini } = require("../services/geminiCoachingService");
const { uploadVideo, uploadAudio }                       = require("../services/storageService");
const { setDocument, queryCollection, getDocument }      = require("../services/firestoreService");
const { sendServerEvent }                                = require("../services/analyticsService");
const { analyzeFrames, summarizeEmotionTimeline }        = require("../services/visionService");
const { summarizeGestureTimeline }                       = require("../services/gestureService");
const { refreshGoogleToken }                             = require("../services/oauthService");
const { extractFramesFromBuffer }                        = require("../utils/serverFrameExtractor");

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
      scenario  = "General presentation",
      audience  = "General audience",
      goal      = "Communicate effectively",
      mode      = "video",
      frames:   framesJson,    // Optional — JSON string of emotion frame array
      gestures: gesturesJson,  // Optional — JSON string of gesture timeline (from MediaPipe)
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

    // Parse gesture timeline from MediaPipe (client-side) — also graceful
    let gestureTimeline = [];
    let gestureSummary  = {};
    if (gesturesJson) {
      try {
        gestureTimeline = JSON.parse(gesturesJson);
        gestureSummary  = summarizeGestureTimeline(gestureTimeline);
        console.log(`[coaching] Received ${gestureTimeline.length} gesture frames — dominant: ${gestureSummary.dominantGesture}`);
      } catch (_) {
        console.warn("[coaching] Could not parse gestures JSON — skipping gesture summary");
      }
    }

    console.log(`[coaching] Starting ${mode} analysis for user ${uid}`);

    // ── Run Gemini + GCS upload + Cloud Vision in parallel ──────────────────
    // Vision analysis runs concurrently with the (slower) Gemini pipeline,
    // so it adds nearly zero latency to the overall response time.

    let mediaUrl;
    let analysisResult;
    let emotionTimeline = [];
    let emotionSummary  = {};

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
      // Cloud Vision emotion timeline
      emotionTimeline,    // [{ second, emotion, confidence, eyeContact, ... }]
      emotionSummary,     // { dominantEmotion, emotionCounts, eyeContactPercent, ... }
      // MediaPipe gesture timeline
      gestureTimeline,    // [{ second, gesture, handsCount }]
      gestureSummary,     // { dominantGesture, gestureCounts, expressivenessScore, ... }
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
    // Order by createdAt desc at the Firestore level (composite index: userId ASC + createdAt DESC)
    // Falls back to JS sort if the index hasn't finished building yet
    let sessions;
    try {
      sessions = await queryCollection("coaching_sessions", "userId", uid, 50, "createdAt", "desc");
    } catch (indexErr) {
      console.warn("[coaching] orderBy index not ready, falling back to JS sort:", indexErr.message);
      sessions = await queryCollection("coaching_sessions", "userId", uid, 50);
      sessions.sort((a, b) => {
        const getMs = (s) => s.createdAt?.toDate?.()?.getTime?.() ?? (s.createdAt?._seconds ? s.createdAt._seconds * 1000 : parseInt(s.sessionId?.split("_")[1] || "0"));
        return getMs(b) - getMs(a);
      });
    }

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

// ─── POST /api/coaching/analyze-from-drive ──────────────────────────────────
// Handles videos selected from Google Drive. Instead of proxying the video
// through the browser (which hits Cloud Run's 32 MB response limit and CORS
// issues), the server downloads it directly from Drive and runs the full
// Gemini analysis pipeline. The large file never touches the client.
//
// Body: { driveVideoUrl, filename, scenario, audience, goal }
const analyzeFromDrive = async (req, res) => {
  const { uid } = req.user;
  const {
    driveVideoUrl,
    filename  = "drive_video.mp4",
    scenario  = "General presentation",
    audience  = "General audience",
    goal      = "Communicate effectively",
  } = req.body;

  if (!driveVideoUrl?.startsWith("https://www.googleapis.com/drive/v3/files/")) {
    return res.status(400).json({ success: false, error: "Invalid Google Drive URL" });
  }

  try {

  // Retrieve stored Drive tokens for this user
  const userDoc = await getDocument("users", uid);
  if (!userDoc?.photosAccessToken) {
    return res.status(403).json({ success: false, error: "Google Drive not connected" });
  }
  let accessToken = userDoc.photosAccessToken;

  // Download the video from Drive (server-to-server — no 32 MB Cloud Run limit)
  const downloadFromDrive = async (token) => {
    const resp = await axios.get(driveVideoUrl, {
      responseType: "arraybuffer",
      headers:      { Authorization: `Bearer ${token}` },
      timeout:      300000,
    });
    return Buffer.from(resp.data);
  };

  let videoBuffer;
  try {
    videoBuffer = await downloadFromDrive(accessToken);
  } catch (err) {
    if (err.response?.status === 401 && userDoc.photosRefreshToken) {
      accessToken = await refreshGoogleToken(userDoc.photosRefreshToken);
      await setDocument("users", uid, { photosAccessToken: accessToken });
      videoBuffer = await downloadFromDrive(accessToken);
    } else {
      throw new Error("Failed to download video from Google Drive: " + err.message);
    }
  }

  console.log(`[coaching] Drive download complete — ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);

  // Detect MIME type from filename extension
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeType = { mov: "video/quicktime", mp4: "video/mp4", webm: "video/webm", avi: "video/x-msvideo" }[ext] || "video/mp4";

  const context = { scenario, audience, goal };
  const fakeFile = { buffer: videoBuffer, mimetype: mimeType, originalname: filename };

  // ── Run everything in parallel ───────────────────────────────────────────
  // 1. GCS upload   — streams buffer to Cloud Storage
  // 2. Gemini       — Pass 1 + Pass 2 (speech/delivery) + Pass 3 (gestures)
  // 3. Vision chain — ffmpeg extracts frames → Cloud Vision face/emotion detection
  //
  // Frame extraction + Vision run concurrently with Gemini so they add
  // near-zero extra wall-clock time (Gemini is always the bottleneck).

  const visionChainPromise = extractFramesFromBuffer(videoBuffer, mimeType, 3, 20)
    .then(frames => {
      if (frames.length === 0) return [];
      console.log(`[coaching] Drive frames extracted: ${frames.length} — running Vision...`);
      return analyzeFrames(frames);
    })
    .catch(err => {
      console.warn("[coaching] Vision chain failed (non-fatal):", err.message);
      return [];
    });

  const [mediaUrl, analysisResult, emotionTimeline] = await Promise.all([
    uploadVideo(fakeFile, uid),
    analyzeVideoWithGemini(videoBuffer, mimeType, context, { includeGestures: true }),
    visionChainPromise,
  ]);

  const { pass1, pass2, gestureTimeline } = analysisResult;
  const emotionSummary = summarizeEmotionTimeline(emotionTimeline);
  const gestureSummary = summarizeGestureTimeline(gestureTimeline);

  console.log(`[coaching] Drive analysis done — emotion: ${emotionSummary.dominantEmotion}, dominant gesture: ${gestureSummary.dominantGesture}`);

  const sessionId = `${uid}_${Date.now()}`;

  const sessionData = {
    userId:             uid,
    sessionId,
    mediaUrl,
    mode:               "video",
    context,
    language:           pass1.language,
    overallScore:       pass1.overallScore,
    scoreBreakdown:     pass1.scoreBreakdown,
    scoreJustification: pass1.scoreJustification,
    emotionDetected:    pass1.emotionDetected,
    emotionNeeded:      pass1.emotionNeeded,
    wpm:                pass1.wpm,
    transcript:         pass1.transcript       || [],
    improvementTips:    pass1.improvementTips  || [],
    detailedTips:       pass2.detailedTips     || [],
    vocalControl:       pass2.vocalControl     || {},
    strengthsToKeep:    pass2.strengthsToKeep  || [],
    practicePlan:       pass2.practicePlan     || "",
    emotionTimeline,
    emotionSummary,
    gestureTimeline,
    gestureSummary,
    createdAt:          new Date(),
  };

    await setDocument("coaching_sessions", sessionId, sessionData);
    console.log(`[coaching] Drive session saved: ${sessionId}`);

    sendServerEvent(uid, "session_analyzed", {
      mode: "video", scenario, source: "google_drive",
      language: pass1.language || "unknown",
      overall_score: pass1.overallScore || 0,
    });

    res.json({ success: true, sessionId, message: "Analysis complete" });
  } catch (err) {
    console.error("[coaching] analyzeFromDrive error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { analyzeSession, getSessions, getSession, analyzeFromDrive };
