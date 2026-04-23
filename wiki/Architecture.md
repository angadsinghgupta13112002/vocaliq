# Architecture

## System Overview

```
Browser (React SPA)
        │
        │  HTTPS — JWT in Authorization header
        ▼
┌───────────────────────────────────┐
│   Google Cloud Run                │
│   ┌───────────────────────────┐   │
│   │  Express 5  (Node.js 20)  │   │
│   │  ├── /api/auth            │   │
│   │  ├── /api/coaching        │   │
│   │  ├── /api/photos          │   │
│   │  └── /public (React SPA)  │   │
│   └───────────────────────────┘   │
└────────────┬──────────────────────┘
             │
      ┌──────┼──────────────┬──────────────┐
      ▼      ▼              ▼              ▼
  Firestore  GCS        Gemini File API  Cloud Vision
  (sessions) (videos)   (2-pass analysis) (emotion frames)
```

The React SPA and the Express API are **served from the same Cloud Run container**. In production, `VITE_API_URL=/api` so all API calls are same-origin (no CORS overhead).

---

## Request Flow — Analyze Session

```
1. User records/uploads media in browser
   frameExtractor.js extracts 1 JPEG frame every 3s (Canvas API, client-side)
        │
2. POST /api/coaching/analyze (multipart/form-data)
   │  Auth middleware verifies JWT
   │  Rate limiter (5 req / 15 min)
   │  Multer validates MIME + size (≤500 MB)
   │  Body includes: frames[] JSON string (base64 JPEGs)
        │
3. coachingController.analyzeSession()
   Runs all three in parallel via Promise.all:
   ├── storageService.uploadVideo()       → GCS  videos/{uid}/{ts}.webm
   ├── geminiCoachingService.analyze()    → Gemini File API (two-pass)
   └── visionService.analyzeFrames()     → Cloud Vision Face Detection
            │                                       │
       ┌────▼──────────────────────────────┐   ┌───▼────────────────────────────┐
       │  PASS 1 — Assessment              │   │  Cloud Vision                  │
       │  Upload video to Gemini File API  │   │  Batch frames in groups of 5   │
       │  Poll until state = ACTIVE        │   │  Face Detection per frame      │
       │  generateContent(fileUri)         │   │  joy/sorrow/anger/surprise     │
       │  → language, overallScore,        │   │  → emotion label + confidence  │
       │    scoreBreakdown, transcript[],  │   │    per second timestamp        │
       │    emotionDetected, wpm, tips     │   └───────────────┬────────────────┘
       └────────────┬──────────────────────┘                   │
                    │                           summarizeEmotionTimeline()
       ┌────────────▼──────────────────────┐   → dominantEmotion, nervousSeconds,
       │  PASS 2 — Deep Coaching           │     confidentSeconds, emotionCounts
       │  Feed Pass 1 JSON as context      │
       │  generateContent(Pass1 JSON)      │
       │  → detailedTips[], vocalControl,  │
       │    strengthsToKeep[], practicePlan│
       └────────────┬──────────────────────┘
                    │
4. Merge Pass 1 + Pass 2 + emotionTimeline → save to Firestore coaching_sessions/{sessionId}
        │
5. Return { success: true, sessionId, data } to client
        │
6. Client navigates to /report/{sessionId}
```

---

## Directory Structure

```
vocaliq/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ScoreChart.jsx           # Recharts line chart
│   │   │   ├── ScoreRing.jsx            # SVG circular score
│   │   │   ├── TimestampedTranscript.jsx
│   │   │   ├── VideoRecorder.jsx        # MediaRecorder wrapper
│   │   │   ├── EmotionTimeline.jsx      # Cloud Vision emotion bar + summary
│   │   │   └── GooglePhotosPicker.jsx   # Google Drive video picker modal
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # JWT auth state + useAuth hook
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── Dashboard.jsx            # Session history + score progress
│   │   │   ├── SessionSetup.jsx         # Choose mode + context
│   │   │   ├── CoachingSession.jsx      # Record/upload + Drive picker + submit
│   │   │   └── CoachingReport.jsx       # 5-tab results view incl. Recording tab
│   │   ├── services/
│   │   │   └── api.js                   # Axios instance + all API helpers
│   │   └── utils/
│   │       ├── analytics.js             # GA4 trackEvent / trackPageView
│   │       ├── constants.js
│   │       └── frameExtractor.js        # Browser Canvas API frame extraction
│   ├── .env                             # Local dev (VITE_API_URL)
│   └── .env.production                  # Production (VITE_API_URL=/api)
│
├── server/                     # Express API
│   ├── config/
│   │   └── firebase.js                  # Firestore Admin SDK init (ADC / key file)
│   ├── controllers/
│   │   ├── authController.js            # OAuth + JWT issuance + Drive OAuth
│   │   ├── coachingController.js        # Analyze, getSessions, getSession
│   │   └── photosController.js          # Google Drive video list + download
│   ├── middleware/
│   │   ├── authMiddleware.js            # JWT verification (header + query param)
│   │   └── errorHandler.js             # Global error → JSON response
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── coachingRoutes.js
│   │   └── photosRoutes.js              # /api/photos/* endpoints
│   ├── services/
│   │   ├── analyticsService.js          # GA4 Measurement Protocol
│   │   ├── firestoreService.js          # Firestore CRUD helpers
│   │   ├── geminiCoachingService.js     # Two-pass Gemini chain
│   │   ├── googlePhotosService.js       # Google Drive API video fetch + download
│   │   ├── oauthService.js              # Google OAuth URL + token exchange
│   │   ├── storageService.js            # GCS upload (ADC / key file)
│   │   └── visionService.js             # Cloud Vision Face Detection + emotion mapping
│   ├── app.js                           # Express config + middleware stack
│   └── server.js                        # HTTP server entry point
│
├── Dockerfile                  # Multi-stage: build React → serve with Express
├── .dockerignore
└── wiki/                       # This documentation
```

---

## Firestore Schema

### Collection: `users`
Document ID = Google OAuth `uid`

```json
{
  "uid":                  "string — Google OAuth sub",
  "displayName":          "string",
  "email":                "string",
  "photoURL":             "string",
  "provider":             "google",
  "photosAccessToken":    "string — Google Drive OAuth access token (set after Drive connect)",
  "photosRefreshToken":   "string — Google Drive OAuth refresh token",
  "photosConnectedAt":    "Timestamp — when Drive was connected",
  "updatedAt":            "Timestamp"
}
```

### Collection: `coaching_sessions`
Document ID = `{uid}_{timestamp}`

```json
{
  "sessionId":        "string — {uid}_{Date.now()}",
  "userId":           "string — Firestore user doc ID",
  "mode":             "video | audio",
  "language":         "string — detected by Gemini",
  "overallScore":     "number — 1.0 to 10.0",
  "wpm":              "number — words per minute",
  "scoreBreakdown": {
    "contentClarity":     "number",
    "emotionalDelivery":  "number",
    "vocalConfidence":    "number",
    "pacing":             "number",
    "audienceEngagement": "number"
  },
  "scoreJustification":  "string",
  "emotionDetected":     "string — e.g. Nervousness",
  "emotionNeeded":       "string — e.g. Confidence",
  "context": {
    "scenario":  "string",
    "audience":  "string",
    "goal":      "string",
    "mode":      "string"
  },
  "transcript": [
    {
      "start":  "string — e.g. 0:00",
      "end":    "string — e.g. 0:08",
      "text":   "string",
      "issues": ["filler_word | nervousness | stutter | eye_contact_break | monotone | too_fast | too_slow | enthusiasm | professional_tone"],
      "fix":    "string — actionable coaching note"
    }
  ],
  "improvementTips":  ["string"],
  "detailedTips": [
    {
      "issue":       "string — issue tag",
      "title":       "string",
      "explanation": "string",
      "exercise":    "string",
      "rephrasing":  "string"
    }
  ],
  "vocalControl": {
    "pacing": { "current": "number", "target": "number", "technique": "string" },
    "tone":   "string",
    "breath": "string",
    "pause":  "string"
  },
  "strengthsToKeep": ["string"],
  "practicePlan":    "string",
  "mediaUrl":        "string — GCS public URL of the uploaded video/audio file",
  "emotionTimeline": [
    {
      "second":     "number — timestamp of the frame",
      "emotion":    "string — confident | nervous | anxious | frustrated | neutral | surprised",
      "confidence": "number — 0.0 to 1.0"
    }
  ],
  "emotionSummary": {
    "dominantEmotion":  "string",
    "emotionCounts":    "object — { confident: n, nervous: n, ... }",
    "nervousSeconds":   ["number"],
    "confidentSeconds": ["number"]
  },
  "createdAt": "Timestamp"
}
```

---

## Authentication Flow

```
1. User clicks "Continue with Google"
        │
2. Browser → GET /api/auth/google
   Server builds Google OAuth URL with scope: openid email profile
   Server → 302 redirect to accounts.google.com
        │
3. Google → 302 redirect to /api/auth/google/callback?code=...
        │
4. Server exchanges code for access_token
   Server fetches userinfo (sub, name, email, picture)
   Server upserts user doc in Firestore
   Server signs JWT: { uid, email, displayName }, 7d expiry
   Server → 302 redirect to /login?token=<JWT>
        │
5. React LoginPage reads token from URL query param
   Stores JWT in localStorage as 'vocaliq_token'
   Calls /api/auth/me to hydrate user state
   Navigates to /dashboard
```
