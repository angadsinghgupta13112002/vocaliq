# Code Styling and Comments

VocalIQ follows consistent code style conventions throughout the entire codebase — both frontend (React/JSX) and backend (Node.js/Express).

---

## Naming Conventions

### camelCase — used for all variables, functions, and parameters

All variables, function names, and parameters use camelCase throughout the codebase:

```js
// server/services/firestoreService.js
const getDocument      = async (collection, docId) => { ... };
const setDocument      = async (collection, docId, data, merge = false) => { ... };
const queryCollection  = async (collection, field, value, limitNum, orderByField, orderDir) => { ... };
const deleteDocument   = async (collection, docId) => { ... };
```

```js
// server/controllers/coachingController.js
const analyzeSession   = async (req, res) => { ... };
const analyzeFromDrive = async (req, res) => { ... };
const getSessions      = async (req, res) => { ... };
const getSession       = async (req, res) => { ... };
```

```js
// client/src/utils/gestureExtractor.js
const extractGesturesFromVideo = async (videoUrl, intervalSecs = 3, maxFrames = 20) => { ... };
const classifyGesture          = (landmarks) => { ... };
```

### PascalCase — used for React components and classes

```jsx
// client/src/components/EmotionTimeline.jsx
const EmotionTimeline = ({ timeline, summary }) => { ... };
export default EmotionTimeline;

// client/src/components/GestureTimeline.jsx
const GestureTimeline = ({ timeline, summary }) => { ... };

// client/src/pages/CoachingReport.jsx
const CoachingReport = () => { ... };
```

### SCREAMING_SNAKE_CASE — used for constants

```js
// client/src/utils/constants.js
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY    = "vocaliq_token";
```

### Prefixed log tags — consistent across all backend services

All backend `console.log` and `console.error` calls include a bracketed prefix so logs are easy to filter in Cloud Run:

```js
console.log("[gemini] Uploading video to Gemini File API...");
console.log("[gemini] Pass 1 complete. Score:", pass1.overallScore);
console.warn("[vision] Frame batch failed (non-fatal):", err.message);
console.log("[coaching] Drive session saved:", sessionId);
console.error("[coaching] analyzeFromDrive error:", err.message);
console.log("[oauth] Access token refreshed successfully");
console.log("[storage] Video uploaded:", gcsUrl);
console.log("[analytics] Server event sent: session_analyzed");
```

---

## File-Level Header Comments

Every backend service and controller file starts with a JSDoc header block describing the file's purpose, what it does, and who authored it:

```js
/**
 * services/firestoreService.js - Firestore CRUD Abstraction Layer
 * Provides reusable helper functions for reading and writing to
 * VocalIQ's Firestore collections: users, coaching_sessions.
 * Author: Lasya Uma Sri Lingala | CS651 Project 2
 */
```

```js
/**
 * controllers/coachingController.js - VocalIQ Coaching Session Controller
 * Handles video/audio upload, runs the two-pass Gemini coaching chain,
 * runs Cloud Vision face detection in parallel (for emotion timeline),
 * saves results to Firestore coaching_sessions, and returns the full report.
 */
```

```js
/**
 * utils/serverFrameExtractor.js - Server-side video frame extraction via ffmpeg
 * Used for Google Drive videos where the client never downloads the file.
 * Extracts JPEG frames at a fixed interval, returns base64 strings for
 * the Cloud Vision emotion timeline pipeline.
 * Author: VocalIQ Team | CS651 Project 2
 */
```

---

## Inline Comments — Explaining the "Why"

Comments explain the reasoning behind non-obvious decisions, not just what the code does:

```js
// server/services/geminiCoachingService.js

// Poll until Gemini finishes processing the video (can take 10-60 seconds)
let file = await fileManager.getFile(uploadResult.file.name);
while (file.state === "PROCESSING") {
  await new Promise(r => setTimeout(r, 3000));
  file = await fileManager.getFile(uploadResult.file.name);
}
if (file.state === "FAILED") throw new Error("Gemini video processing failed.");

// Clean up the Gemini file (auto-expires in 48 h but good practice)
try { await fileManager.deleteFile(geminiFile.name); } catch (_) {}
```

```js
// server/controllers/coachingController.js

// Validate driveVideoUrl prefix to prevent SSRF attacks
if (!driveVideoUrl.startsWith("https://www.googleapis.com/drive/")) {
  return res.status(400).json({ success: false, error: "Invalid Drive URL" });
}

// Try Firestore-native orderBy first (requires composite index).
// Fall back to JS sort if the index is still building.
let sessions;
try {
  sessions = await queryCollection("coaching_sessions", "userId", uid, 50, "createdAt", "desc");
} catch (indexErr) {
  console.warn("[coaching] orderBy index not ready, falling back to JS sort:", indexErr.message);
  sessions = await queryCollection("coaching_sessions", "userId", uid, 50);
  sessions.sort((a, b) => { /* timestamp comparison */ });
}
```

```js
// client/src/utils/gestureExtractor.js

// match frameExtractor — ensures accurate duration for .mov files
video.preload     = "metadata";
video.muted       = true;
video.playsInline = true;
video.crossOrigin = "anonymous";
video.src         = url;
video.load(); // triggers reliable metadata load event

// Clamp timestamp to within video duration — prevents out-of-bounds seek
times.push(Math.min(Math.round(t), Math.floor(duration)));
```

---

## Function-Level JSDoc Comments

All major functions include JSDoc blocks with `@param` and `@returns` documentation:

```js
/**
 * getDocument - Retrieves a single Firestore document by collection and ID
 * @param {string} collection - Firestore collection name
 * @param {string} docId      - Document ID
 * @returns {Object|null}     - Document data or null if not found
 */
const getDocument = async (collection, docId) => {
  const doc = await db.collection(collection).doc(docId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

/**
 * queryCollection - Queries a collection with a where clause
 * @param {string}      collection   - Firestore collection name
 * @param {string}      field        - Field to filter on
 * @param {string}      value        - Value to match
 * @param {number}      limitNum     - Max documents to return
 * @param {string|null} orderByField - Optional field to order results by
 * @param {string}      orderDir     - "asc" or "desc" (default "desc")
 * @returns {Array}                  - Array of document data objects
 */
const queryCollection = async (collection, field, value, limitNum = 20, orderByField = null, orderDir = "desc") => { ... };
```

---

## Section Dividers

Long files use visual section dividers with `─` characters to separate logical blocks:

```js
// server/services/geminiCoachingService.js

// ─── Safe JSON parser ────────────────────────────────────────────────────────
const safeParseGemini = (text, label) => { ... };

// ─── Gemini File API Upload ──────────────────────────────────────────────────
const uploadVideoToGemini = async (videoBuffer, mimeType) => { ... };

// ─── Pass 1 Prompt ───────────────────────────────────────────────────────────
const buildPass1Prompt = (scenario, audience, goal) => `...`;

// ─── Pass 2 Prompt ───────────────────────────────────────────────────────────
const buildPass2Prompt = (pass1) => `...`;

// ─── Pass 3 Prompt: Gesture Analysis ────────────────────────────────────────
const GESTURE_ANALYSIS_PROMPT = `...`;

// ─── Analyze Video (uses Gemini File API) ────────────────────────────────────
const analyzeVideoWithGemini = async (videoBuffer, mimeType, context, options) => { ... };

// ─── Analyze Audio (base64 inlineData) ──────────────────────────────────────
const analyzeAudioWithGemini = async (audioBuffer, context) => { ... };
```

---

## Error Handling Comments

All `try/catch` blocks include a comment explaining why errors are caught non-fatally vs. fatally:

```js
// Non-fatal: Cloud Vision frame analysis failing shouldn't kill the whole session
try {
  emotionTimeline = await analyzeFrames(frames);
} catch (visionErr) {
  console.warn("[coaching] Vision analysis failed (non-fatal):", visionErr.message);
}

// Non-fatal: Pass 3 gesture analysis is bonus data — don't fail the response
try {
  const pass3Result = await model.generateContent({ ... });
  gestureTimeline = JSON.parse(pass3Result.response.text());
} catch (err) {
  console.warn("[gemini] Pass 3 gesture analysis failed (non-fatal):", err.message);
}

// Always clean up temp files — don't let errors leave gigabytes of junk
try { fs.unlinkSync(tmpInput); } catch (_) {}
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
```
