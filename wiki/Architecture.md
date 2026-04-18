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
│   │  └── /public (React SPA)  │   │
│   └───────────────────────────┘   │
└────────────┬──────────────────────┘
             │
      ┌──────┼──────────────┐
      ▼      ▼              ▼
  Firestore  GCS        Gemini File API
  (sessions) (videos)   (2-pass analysis)
```

The React SPA and the Express API are **served from the same Cloud Run container**. In production, `VITE_API_URL=/api` so all API calls are same-origin (no CORS overhead).

---

## Request Flow — Analyze Session

```
1. User records/uploads media in browser
        │
2. POST /api/coaching/analyze (multipart/form-data)
   │  Auth middleware verifies JWT
   │  Rate limiter (5 req / 15 min)
   │  Multer validates MIME + size (≤500 MB)
        │
3. coachingController.analyzeSession()
   ├── storageService.uploadVideo()   → GCS  videos/{uid}/{ts}.webm
   └── geminiCoachingService.analyze()
            │
       ┌────▼──────────────────────────────┐
       │  PASS 1 — Assessment              │
       │  Upload video to Gemini File API  │
       │  Poll until state = ACTIVE        │
       │  generateContent(fileUri)         │
       │  → language, overallScore,        │
       │    scoreBreakdown, transcript[],  │
       │    emotionDetected, wpm, tips     │
       └────────────┬──────────────────────┘
                    │
       ┌────────────▼──────────────────────┐
       │  PASS 2 — Deep Coaching           │
       │  Feed Pass 1 JSON as context      │
       │  generateContent(Pass1 JSON)      │
       │  → detailedTips[], vocalControl,  │
       │    strengthsToKeep[], practicePlan│
       └────────────┬──────────────────────┘
                    │
4. Merge Pass 1 + Pass 2 → save to Firestore coaching_sessions/{sessionId}
        │
5. Return { success: true, sessionId } to client
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
│   │   │   ├── ScoreChart.jsx       # Recharts line chart
│   │   │   ├── ScoreRing.jsx        # SVG circular score
│   │   │   ├── TimestampedTranscript.jsx
│   │   │   └── VideoRecorder.jsx    # MediaRecorder wrapper
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # JWT auth state + useAuth hook
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── SessionSetup.jsx     # Choose mode + context
│   │   │   ├── CoachingSession.jsx  # Record/upload + submit
│   │   │   └── CoachingReport.jsx   # 4-tab results view
│   │   ├── services/
│   │   │   └── api.js               # Axios instance + helpers
│   │   └── utils/
│   │       └── constants.js
│   ├── .env                         # Local dev (VITE_API_URL)
│   └── .env.production              # Production (VITE_API_URL=/api)
│
├── server/                     # Express API
│   ├── config/
│   │   └── firebase.js              # Firestore Admin SDK init (ADC / key file)
│   ├── controllers/
│   │   ├── authController.js        # OAuth + JWT issuance
│   │   └── coachingController.js    # Analyze, getSessions, getSession
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT verification → req.user
│   │   └── errorHandler.js         # Global error → JSON response
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── coachingRoutes.js
│   ├── services/
│   │   ├── geminiCoachingService.js # Two-pass Gemini chain
│   │   ├── oauthService.js          # Google OAuth URL + token exchange
│   │   └── storageService.js        # GCS upload (ADC / key file)
│   ├── app.js                       # Express config + middleware stack
│   └── server.js                    # HTTP server entry point
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
  "uid":         "string  — Google OAuth sub",
  "displayName": "string",
  "email":       "string",
  "photoURL":    "string",
  "provider":    "google",
  "updatedAt":   "Timestamp"
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
  "videoUrl":        "string — GCS public URL",
  "createdAt":       "Timestamp"
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
