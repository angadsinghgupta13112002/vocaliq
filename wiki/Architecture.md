# Architecture

## System Overview

```
Browser (React SPA)
        │
        │  HTTPS — JWT in Authorization header
        ▼
┌──────────────────────────────────────────────────┐
│   Google Cloud Run  (2 vCPU / 2 GiB RAM)         │
│   ┌──────────────────────────────────────────┐   │
│   │  Express 5  (Node.js 20)                 │   │
│   │  ├── /api/auth       (OAuth + JWT)        │   │
│   │  ├── /api/coaching   (analyze + sessions) │   │
│   │  ├── /api/photos     (Drive video list)   │   │
│   │  └── /public         (React SPA bundle)   │   │
│   └──────────────────────────────────────────┘   │
└────────────┬─────────────────────────────────────┘
             │
      ┌──────┼──────────┬──────────────┬────────────────┐
      ▼      ▼          ▼              ▼                ▼
  Firestore  GCS    Gemini File API  Cloud Vision    Google Drive
  (sessions) (media) (3-pass chain)  (emotion frames) (OAuth videos)
```

The React SPA and the Express API are **served from the same Cloud Run container**.
In production `VITE_API_URL=/api` so all API calls are same-origin — no CORS overhead.

---

## Request Flow A — Analyze Session (Local / Recorded Video)

```
1. User records or uploads a video in the browser
   ├── frameExtractor.js
   │     Seeks video at 3 s intervals via HTML5 Video + Canvas API
   │     Encodes each frame as base64 JPEG (320×240, up to 20 frames)
   │     Returns [{ second, base64 }]
   │
   └── gestureExtractor.js  (video/recorded modes only)
         Loads MediaPipe HandLandmarker WASM from CDN (singleton)
         Seeks video at 3 s intervals, draws to 320×240 canvas
         Detects 21 hand landmarks per frame
         Classifies gesture from landmark geometry:
           open_hand | pointing | peace | thumbs_up |
           fist | partial_open | neutral_hand | no_hands
         Returns [{ second, gesture, handsCount }]
         ↑ Both run in parallel via Promise.allSettled
        │
2. POST /api/coaching/analyze  (multipart/form-data)
   │  Auth middleware verifies JWT
   │  Rate limiter: 5 req / 15 min per IP
   │  Multer validates MIME type + size (≤ 500 MB)
   │  Body includes:
   │    media       — video/audio file buffer
   │    frames      — JSON string of [{ second, base64 }]
   │    gestures    — JSON string of [{ second, gesture, handsCount }]
   │    scenario / audience / goal / mode
        │
3. coachingController.analyzeSession()
   Parses + validates frames and gestures JSON
   Runs all three in parallel via Promise.all:
   │
   ├── storageService.uploadVideo()
   │     Streams buffer to GCS → videos/{uid}/{ts}.webm
   │     Returns public GCS URL
   │
   ├── geminiCoachingService.analyzeVideoWithGemini()
   │   │
   │   ├── PASS 1 — Assessment
   │   │     Write buffer to /tmp file
   │   │     fileManager.uploadFile() → Gemini File API
   │   │     Poll until state = ACTIVE
   │   │     generateContent(prompt + fileUri)
   │   │     Returns: language, overallScore, scoreBreakdown,
   │   │               scoreJustification, emotionDetected,
   │   │               emotionNeeded, wpm, transcript[], improvementTips[]
   │   │
   │   └── PASS 2 — Deep Coaching
   │         Feed Pass 1 JSON as context into new prompt
   │         generateContent(Pass1 JSON)
   │         Returns: detailedTips[], vocalControl{},
   │                  strengthsToKeep[], practicePlan
   │         Delete uploaded Gemini file
   │         Returns { pass1, pass2, gestureTimeline: [] }
   │
   └── visionService.analyzeFrames(frames)      (if frames provided)
         Batch frames in groups of 5 via Promise.all
         Cloud Vision Face Detection per frame:
           joy / sorrow / anger / surprise likelihood scores
           panAngle + tiltAngle for eye contact detection
         Maps scores → emotion label (confident/nervous/anxious/frustrated/neutral)
         Eye contact: direct if |pan| ≤ 15° and |tilt| ≤ 20°
         Returns [{ second, emotion, confidence, eyeContact, panAngle, tiltAngle }]
        │
   gestureService.summarizeGestureTimeline(gestureTimeline)
   → { dominantGesture, gestureCounts, expressiveSeconds,
       nervousSeconds, handsVisiblePercent, expressivenessScore }

   visionService.summarizeEmotionTimeline(emotionTimeline)
   → { dominantEmotion, emotionCounts, nervousSeconds,
       confidentSeconds, eyeContactPercent, eyeContactRating,
       lookingAwaySeconds }
        │
4. Merge all results → save to Firestore coaching_sessions/{sessionId}
        │
5. Return { success: true, sessionId, data } to client
        │
6. Client navigates to /report/{sessionId}
   Report renders 5 tabs:
     Overview | Emotion Timeline | Gestures | Transcript | Tips & Coaching
```

---

## Request Flow B — Analyze From Drive (Google Drive Video)

For large Drive videos the client **never downloads the file**.
The server downloads, analyzes, and returns only a session ID.
This bypasses the Cloud Run 32 MB response limit and browser CORS restrictions.

```
1. User opens Google Drive picker (Browse Google Drive button)
   GooglePhotosPicker component calls GET /api/photos/videos
   Server fetches video list from Google Drive API using stored OAuth token
   User selects a video → client receives { videoUrl, filename }
   Client stores driveVideoUrl in state (does NOT download the file)
        │
2. User clicks Analyze My Speech
   POST /api/coaching/analyze-from-drive  (JSON body)
   │  Auth middleware verifies JWT
   │  Rate limiter: 5 req / 15 min per IP
   │  Body: { driveVideoUrl, filename, scenario, audience, goal }
        │
3. coachingController.analyzeFromDrive()
   Validates driveVideoUrl prefix (SSRF protection)
   Retrieves photosAccessToken + photosRefreshToken from Firestore users/{uid}
   Downloads video from Google Drive (server-to-server, no size limit):
     axios.get(driveVideoUrl, { responseType: "arraybuffer", timeout: 300 s })
     If 401 → refreshGoogleToken(refreshToken) → retry once
   Detects MIME type from filename extension
        │
   Runs all three in parallel via Promise.all:
   │
   ├── storageService.uploadVideo(fakeFile, uid)
   │     Streams buffer to GCS
   │
   ├── geminiCoachingService.analyzeVideoWithGemini(buffer, mime, ctx,
   │                                                { includeGestures: true })
   │   │
   │   ├── PASS 1 — Assessment       (same as Flow A)
   │   │
   │   ├── PASS 2 — Deep Coaching    (same as Flow A)
   │   │
   │   └── PASS 3 — Gesture Analysis  (Drive only — replaces client MediaPipe)
   │         Re-uses same Gemini File URI (already ACTIVE, zero re-upload cost)
   │         generateContent(gesture prompt + fileUri)
   │         Prompt asks for [{ second, gesture, handsCount }]
   │         Same gesture labels as MediaPipe client-side
   │         Returns gestureTimeline[]
   │         Deletes uploaded Gemini file
   │         Returns { pass1, pass2, gestureTimeline }
   │
   └── visionChainPromise:
         serverFrameExtractor.extractFramesFromBuffer(buffer, mime, 3s, 20)
           Write buffer to /tmp file
           ffmpeg: fps=1/3, max 20 frames, JPEG quality 3
           Read frames back as base64 strings
           Cleanup all temp files
           Returns [{ second, base64 }]
         → visionService.analyzeFrames(frames)
           (same Cloud Vision pipeline as Flow A)
        │
   gestureService.summarizeGestureTimeline(gestureTimeline)
   visionService.summarizeEmotionTimeline(emotionTimeline)
        │
4. Save to Firestore coaching_sessions/{sessionId}
   Full emotionTimeline + emotionSummary + gestureTimeline + gestureSummary
   (identical schema to Flow A — report renders the same)
        │
5. Return { success: true, sessionId } to client
        │
6. Client navigates to /report/{sessionId}
```

---

## Google Drive OAuth Flow

```
1. User clicks "Browse Google Drive"
   GET /api/photos/videos → server checks photosAccessToken in Firestore
   If not connected → client shows Connect Google Drive screen
        │
2. connectGooglePhotos() in client
   Redirects browser to /api/auth/google/photos?token=<JWT>
   (token passed in query param because this is a full browser redirect)
        │
3. Server builds Drive OAuth URL:
   scope = https://www.googleapis.com/auth/drive.readonly
   Redirects user to Google consent screen
        │
4. Google → /api/auth/google/photos/callback?code=...
   Server exchanges code for { access_token, refresh_token }
   Saves both to Firestore users/{uid}:
     photosAccessToken, photosRefreshToken, photosConnectedAt
   Redirects browser back to /session
        │
5. Future requests:
   Server uses photosAccessToken to call Drive API
   If 401 → refreshGoogleToken(refreshToken) → new token → update Firestore
   Token rotation is transparent to the user
```

---

## Directory Structure

```
vocaliq/
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ScoreChart.jsx           # Recharts score progress chart
│   │   │   ├── ScoreRing.jsx            # SVG circular score ring
│   │   │   ├── TimestampedTranscript.jsx
│   │   │   ├── VideoRecorder.jsx        # MediaRecorder wrapper
│   │   │   ├── EmotionTimeline.jsx      # Cloud Vision emotion bar + summary cards
│   │   │   ├── GestureTimeline.jsx      # MediaPipe/Gemini gesture bar + summary cards
│   │   │   └── GooglePhotosPicker.jsx   # Google Drive video picker modal
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # JWT auth state + useAuth hook
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── Dashboard.jsx            # Session history + score progress
│   │   │   ├── SessionSetup.jsx         # Choose mode + set context
│   │   │   ├── CoachingSession.jsx      # Record/upload + Drive picker + submit
│   │   │   └── CoachingReport.jsx       # 5-tab report (Overview/Emotion/Gestures/Transcript/Tips)
│   │   ├── services/
│   │   │   └── api.js                   # Axios instance + all API call helpers
│   │   └── utils/
│   │       ├── analytics.js             # GA4 trackEvent / trackPageView helpers
│   │       ├── constants.js             # API_BASE_URL, TOKEN_KEY
│   │       ├── frameExtractor.js        # Browser Canvas API → base64 JPEG frames
│   │       └── gestureExtractor.js      # MediaPipe HandLandmarker → gesture timeline
│   ├── .env                             # Local dev (VITE_API_URL=http://localhost:8080/api)
│   └── .env.production                  # Production (VITE_API_URL=/api)
│
├── server/                          # Express API
│   ├── config/
│   │   └── firebase.js                  # Firestore Admin SDK (ADC on Cloud Run / key file locally)
│   ├── controllers/
│   │   ├── authController.js            # Google OAuth + JWT issuance + Drive OAuth callback
│   │   ├── coachingController.js        # analyzeSession, analyzeFromDrive, getSessions, getSession
│   │   └── photosController.js          # Drive video list + download token endpoint
│   ├── middleware/
│   │   ├── authMiddleware.js            # JWT verification (Authorization header + query param)
│   │   └── errorHandler.js             # Global error → JSON response
│   ├── routes/
│   │   ├── authRoutes.js                # /api/auth/*
│   │   ├── coachingRoutes.js            # /api/coaching/* (multer, rate limiter)
│   │   └── photosRoutes.js              # /api/photos/*
│   ├── services/
│   │   ├── analyticsService.js          # GA4 Measurement Protocol (server-side events)
│   │   ├── firestoreService.js          # setDocument, getDocument, queryCollection
│   │   ├── geminiCoachingService.js     # Three-pass Gemini chain (Pass 1 + 2 + optional 3)
│   │   ├── gestureService.js            # summarizeGestureTimeline()
│   │   ├── googlePhotosService.js       # Google Drive API — list videos, token validation
│   │   ├── oauthService.js              # Google OAuth URL builder + token exchange + refresh
│   │   ├── storageService.js            # GCS upload (video / audio / photo)
│   │   └── visionService.js             # Cloud Vision Face Detection + emotion/eye-contact mapping
│   ├── utils/
│   │   └── serverFrameExtractor.js      # ffmpeg server-side frame extraction (Drive uploads)
│   ├── app.js                           # Express config + middleware stack + route mounting
│   └── server.js                        # HTTP server entry point (PORT=8080)
│
├── Dockerfile                       # Multi-stage: build React → install ffmpeg → serve with Express
├── .dockerignore
└── wiki/                            # This documentation
    └── Architecture.md
```

---

## Firestore Schema

### Collection: `users`
Document ID = Google OAuth `uid`

```json
{
  "uid":                "string — Google OAuth sub",
  "displayName":        "string",
  "email":              "string",
  "photoURL":           "string",
  "provider":           "google",
  "photosAccessToken":  "string — Google Drive OAuth access token",
  "photosRefreshToken": "string — Google Drive OAuth refresh token (for auto-renewal)",
  "photosConnectedAt":  "Timestamp — when Drive was first connected",
  "updatedAt":          "Timestamp"
}
```

### Collection: `coaching_sessions`
Document ID = `{uid}_{Date.now()}`

```json
{
  "sessionId":   "string — {uid}_{timestamp}",
  "userId":      "string — matches users document ID",
  "mode":        "video | audio | upload",
  "mediaUrl":    "string — GCS public URL of uploaded video or audio file",
  "language":    "string — spoken language detected by Gemini",
  "overallScore": "number — 1.0 to 10.0",
  "wpm":         "number — estimated words per minute",

  "context": {
    "scenario": "string",
    "audience": "string",
    "goal":     "string"
  },

  "scoreBreakdown": {
    "contentClarity":     "number 1–10",
    "emotionalDelivery":  "number 1–10",
    "vocalConfidence":    "number 1–10",
    "pacing":             "number 1–10",
    "audienceEngagement": "number 1–10"
  },

  "scoreJustification": "string — Gemini's explanation of the overall score",
  "emotionDetected":    "string — primary emotion Gemini observed",
  "emotionNeeded":      "string — ideal emotion for this scenario",

  "transcript": [
    {
      "start":  "string — e.g. 0:00",
      "end":    "string — e.g. 0:08",
      "text":   "string — spoken words in this segment",
      "issues": ["filler_word | nervousness | stutter | eye_contact_break | monotone | too_fast | too_slow | enthusiasm | professional_tone"],
      "fix":    "string — actionable coaching note, or empty string"
    }
  ],

  "improvementTips": ["string"],

  "detailedTips": [
    {
      "issue":       "string — issue tag from transcript",
      "title":       "string",
      "explanation": "string",
      "exercise":    "string",
      "rephrasing":  "string"
    }
  ],

  "vocalControl": {
    "pacing": { "current": "number (wpm)", "target": "number (wpm)", "technique": "string" },
    "tone":   "string",
    "breath": "string",
    "pause":  "string"
  },

  "strengthsToKeep": ["string"],
  "practicePlan":    "string — 3-sentence personalized 7-day plan",

  "emotionTimeline": [
    {
      "second":     "number — timestamp of the analyzed frame",
      "emotion":    "string — confident | nervous | anxious | frustrated | surprised | neutral",
      "confidence": "number — 0.0 to 1.0",
      "eyeContact": "string — direct | looking_away",
      "panAngle":   "number — face horizontal angle in degrees",
      "tiltAngle":  "number — face vertical angle in degrees",
      "raw": {
        "joy":      "string — Cloud Vision likelihood",
        "sorrow":   "string",
        "anger":    "string",
        "surprise": "string"
      }
    }
  ],

  "emotionSummary": {
    "dominantEmotion":   "string",
    "emotionCounts":     "object — { confident: n, nervous: n, ... }",
    "nervousSeconds":    ["number"],
    "confidentSeconds":  ["number"],
    "eyeContactPercent": "number — 0 to 100",
    "eyeContactRating":  "string — excellent | good | needs_work | poor",
    "lookingAwaySeconds": ["number"]
  },

  "gestureTimeline": [
    {
      "second":     "number — timestamp of the analyzed frame",
      "gesture":    "string — open_hand | pointing | peace | thumbs_up | fist | partial_open | neutral_hand | no_hands",
      "handsCount": "number — 0, 1, or 2"
    }
  ],

  "gestureSummary": {
    "dominantGesture":     "string",
    "gestureCounts":       "object — { open_hand: n, pointing: n, ... }",
    "expressiveSeconds":   ["number"],
    "nervousSeconds":      ["number"],
    "handsVisiblePercent": "number — 0 to 100",
    "expressivenessScore": "number — 0 to 100"
  },

  "createdAt": "Timestamp"
}
```

---

## Authentication Flow — Google Sign-In

```
1. User clicks "Continue with Google"
        │
2. Browser → GET /api/auth/google
   Server builds Google OAuth URL with scopes: openid email profile
   Server → 302 redirect to accounts.google.com
        │
3. Google → 302 redirect to /api/auth/google/callback?code=...
        │
4. Server exchanges code for access_token
   Server fetches userinfo (sub, name, email, picture)
   Server upserts user doc in Firestore (merge: true)
   Server signs JWT: { uid, email, displayName }, 7-day expiry
   sendServerEvent(uid, "login") → GA4 Measurement Protocol
   Server → 302 redirect to /login?token=<JWT>
        │
5. React reads token from URL query param
   Stores JWT in localStorage as 'vocaliq_token'
   Calls /api/auth/me to hydrate user state
   Navigates to /dashboard
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Same-origin SPA + API on Cloud Run | No CORS, simplified deployment, single container |
| Multi-stage Dockerfile with ffmpeg | Small final image; ffmpeg only in production stage for Drive frame extraction |
| 2 GiB / 2 vCPU Cloud Run | 116 MB video buffer + Gemini upload + GCS upload + ffmpeg frame extraction exceed 1 GiB |
| Three-pass Gemini chain | Pass 2 grounded in Pass 1 data; Pass 3 reuses existing File API URI (zero re-upload cost) |
| Client-side MediaPipe for local videos | Zero server cost; 21-landmark precision; runs before upload |
| Gemini Pass 3 for Drive videos | Client never downloads Drive file; Gemini already has the file ACTIVE |
| Server-side Drive analysis (`/analyze-from-drive`) | Bypasses Cloud Run 32 MB response limit and browser CORS on googleapis.com redirects |
| Promise.all for parallel pipelines | GCS upload + Gemini + Vision/ffmpeg run concurrently; total time = slowest step, not sum |
| ADC on Cloud Run, key file locally | No credentials in Docker image; IAM roles on service account |
| GA4 Measurement Protocol on server | Captures completion events even if browser closes before result loads |
| Token auto-refresh for Drive OAuth | Access tokens expire in 1 hour; refresh token stored in Firestore; rotated transparently |
