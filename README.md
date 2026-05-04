# VocalIQ — AI Speaking Coach

> An AI-powered speaking coach built for CS651: Web Systems at California State University, East Bay.
> Record or upload a speech video or audio clip and receive a comprehensive coaching report in under 90 seconds — powered by Google Gemini 2.5 Flash.

🌐 **Live App:** https://vocaliq-956080638663.us-central1.run.app  
🔗 **GitHub:** https://github.com/angadsinghgupta13112002/vocaliq  
▶️ **Demo Video:** https://youtu.be/ZU2qN5g1DA4  
📖 **Wiki:** https://github.com/angadsinghgupta13112002/vocaliq/wiki  

---

## Team

| Name | Role |
|------|------|
| Angaddeep Singh Gupta | Full-stack development, Gemini AI pipeline, Cloud Run deployment |
| Abhinay Konuri | Google Cloud integration, analytics, deployment support |
| Samuel Paul Chetty | Auth flow, JWT middleware, frontend state management |
| Lasya Uma Sri Lingala | Firestore schema, GCS storage service, Firebase config |

**Course:** CS651 — Web Systems · **Professor:** Lynne Grewe · **Cal State East Bay**

---

## Features

- **Google OAuth 2.0** — Sign in with Google, JWT session management (7-day expiry)
- **Video & Audio Recording** — In-browser recording via MediaRecorder API
- **File Upload** — MP4, WebM, MOV, and audio file support
- **Google Drive Integration** — Browse and analyze Drive videos without downloading
- **Three-Pass Gemini AI Pipeline** — Assessment → Deep Coaching → Gesture Analysis
- **Cloud Vision Emotion Timeline** — Frame-by-frame facial expression + eye contact tracking
- **MediaPipe Gesture Detection** — 21 hand landmarks, 8 gesture types, client-side WASM
- **Coaching Report** — Overall score (0–10), five sub-scores, timestamped transcript, improvement tips, vocal control breakdown, 7-day practice plan
- **Session History Dashboard** — All past sessions sorted newest-first with score progress chart
- **Google Analytics GA4** — Frontend (gtag.js) + backend (Measurement Protocol) event tracking
- **Google Cloud Run Deployment** — Multi-stage Docker build, ADC credentials, scale to zero

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite | SPA framework with fast HMR builds |
| React Router 7 | Client-side routing with protected routes |
| MediaRecorder API | In-browser video/audio capture |
| HTML5 Canvas API | Frame extraction every 3 seconds |
| MediaPipe HandLandmarker | Client-side WASM gesture detection |
| Recharts | Score progress chart on dashboard |
| GA4 (gtag.js) | Frontend analytics event tracking |

### Backend
| Technology | Purpose |
|---|---|
| Node.js 20 + Express 5 | REST API server |
| JWT (jsonwebtoken) | Stateless authentication tokens |
| Multer | Multipart video/audio file upload |
| ffmpeg | Server-side frame extraction for Drive videos |
| axios | HTTP client for external API calls |

### Google Cloud Services
| Service | Purpose |
|---|---|
| Google OAuth 2.0 | User authentication + Drive access |
| Gemini 2.5 Flash (File API) | Three-pass AI speech analysis |
| Cloud Vision API | Face detection — emotion + eye contact |
| Cloud Firestore | User profiles + coaching session storage |
| Google Cloud Storage | Video/audio file storage |
| Google Cloud Run | Containerized deployment |
| Google Analytics GA4 | Frontend + backend event tracking |
| Google Drive API v3 | Browse and download user Drive videos |

---

## System Architecture

```
Browser (React 19)
    │
    │  JWT in Authorization header
    ▼
Express API (Cloud Run — us-central1)
    ├── POST /coaching/analyze          → Video/audio upload + analysis
    ├── POST /coaching/analyze-drive    → Google Drive video analysis
    ├── GET  /coaching/sessions         → Session history (Firestore)
    ├── GET  /coaching/session/:id      → Single session report
    ├── GET  /auth/google               → OAuth redirect
    ├── GET  /auth/google/callback      → Token exchange + JWT issue
    ├── GET  /photos/videos             → List Drive videos
    └── GET  /photos/connect            → Drive OAuth flow
         │
         ├── Gemini 2.5 Flash (File API) ──→ 3-pass pipeline
         ├── Cloud Vision API            ──→ Emotion per frame
         ├── Cloud Firestore             ──→ Users + sessions
         ├── Google Cloud Storage        ──→ Media files
         └── GA4 Measurement Protocol   ──→ Server-side events
```

**Key design decisions:**
- React client and Express API share the same Cloud Run origin — no CORS issues
- All Firestore/GCS access is server-side only — client never touches Google APIs directly
- Application Default Credentials (ADC) — no service account key file in Docker image
- JWT verified by `authMiddleware.js` on every protected route

---

## Three-Pass Gemini Pipeline

VocalIQ uses **Google Gemini 2.5 Flash** via the File API in a three-pass chain:

### Pass 1 — Assessment
- **Input:** Video/audio file uploaded to Gemini File API
- **Output:** Overall score (1–10), 5 sub-scores, detected emotion, WPM, timestamped transcript, top 3 improvement areas

### Pass 2 — Deep Coaching
- **Input:** Pass 1 JSON results as context (no re-upload needed)
- **Output:** Detailed tip cards with exercises + rephrasing examples, vocal control breakdown (pacing/tone/breath/pause), strengths to keep, 7-day practice plan

### Pass 3 — Gesture Analysis *(Drive videos only)*
- **Input:** Same Gemini File URI (no re-upload)
- **Output:** Every 3 seconds → gesture label + hand count (open_hand, pointing, thumbs_up, fist, peace, no_hands)

> **Why three passes?** Pass 1 grounds Pass 2 in objective data — dramatically improving coaching specificity. Pass 3 is kept separate as it is computationally independent and only relevant for video sessions.

---

## Project Structure

```
vocaliq/
├── client/                          # React 19 frontend (Vite)
│   ├── index.html                   # HTML entry point with GA4 snippet
│   ├── vite.config.js               # Vite config with API proxy
│   ├── src/
│   │   ├── App.jsx                  # React Router + protected routes
│   │   ├── main.jsx                 # React DOM entry point
│   │   ├── index.css                # Global styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # JWT auth state + useAuth() hook
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # Google Sign-In landing page
│   │   │   ├── Dashboard.jsx        # Session history + score chart
│   │   │   ├── SessionSetup.jsx     # Pre-session context form
│   │   │   ├── CoachingSession.jsx  # Record/upload/Drive picker
│   │   │   └── CoachingReport.jsx   # 5-tab coaching report
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Top navigation bar
│   │   │   ├── ScoreRing.jsx        # Animated SVG score ring
│   │   │   ├── ScoreChart.jsx       # Recharts score history line chart
│   │   │   ├── EmotionTimeline.jsx  # Cloud Vision emotion color bar
│   │   │   ├── GestureTimeline.jsx  # MediaPipe gesture bar + chart
│   │   │   ├── GooglePhotosPicker.jsx # Google Drive video picker modal
│   │   │   ├── TimestampedTranscript.jsx # Transcript with issue tags
│   │   │   └── VideoRecorder.jsx    # MediaRecorder + waveform UI
│   │   ├── services/
│   │   │   └── api.js               # Axios instance + JWT interceptor
│   │   └── utils/
│   │       ├── frameExtractor.js    # Canvas → base64 JPEG frames (3s)
│   │       ├── gestureExtractor.js  # MediaPipe HandLandmarker WASM
│   │       ├── analytics.js         # GA4 trackPageView/trackEvent
│   │       └── constants.js         # API_BASE_URL, TOKEN_KEY
│   └── public/
│       └── favicon.svg
│
├── server/                          # Node.js 20 + Express 5 backend
│   ├── server.js                    # Entry point — reads PORT, starts app
│   ├── app.js                       # Express setup, CORS, routes, SPA catch-all
│   ├── config/
│   │   └── firebase.js              # Firebase Admin SDK + Firestore init
│   ├── controllers/
│   │   ├── authController.js        # OAuth callback, JWT issue, user upsert
│   │   ├── coachingController.js    # Full analysis pipeline controller
│   │   └── photosController.js      # Google Drive video list + download
│   ├── routes/
│   │   ├── authRoutes.js            # /auth/* endpoints
│   │   ├── coachingRoutes.js        # /coaching/* endpoints
│   │   └── photosRoutes.js          # /photos/* endpoints
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT verification for protected routes
│   │   └── errorHandler.js         # Global error handler — JSON responses
│   ├── services/
│   │   ├── geminiCoachingService.js # Gemini File API + 3-pass prompt chain
│   │   ├── visionService.js         # Cloud Vision face detection + emotion map
│   │   ├── gestureService.js        # Gesture timeline → expressiveness score
│   │   ├── storageService.js        # GCS upload with ADC
│   │   ├── firestoreService.js      # Firestore CRUD helpers
│   │   ├── oauthService.js          # Google OAuth URL, token exchange, refresh
│   │   ├── analyticsService.js      # GA4 Measurement Protocol events
│   │   └── googlePhotosService.js   # Drive API v3 — list videos, validate tokens
│   └── utils/
│       └── serverFrameExtractor.js  # ffmpeg frame extraction for Drive videos
│
├── Dockerfile                       # Multi-stage build (node:20-alpine)
├── .dockerignore
├── .gitignore
├── Presentation.pdf                 # 13-slide project presentation
├── Proposal.pdf                     # Original project proposal
└── Analytics_Logging_Report.pdf     # GA4 + Cloud Run analytics report
```

---

## Database Schema (Cloud Firestore)

### `users/{uid}`
```json
{
  "uid": "116305439069711589801",
  "displayName": "Angaddeep Singh Gupta",
  "email": "angad@example.com",
  "photoURL": "https://...",
  "provider": "google",
  "photosAccessToken": "ya29...",
  "photosRefreshToken": "1//...",
  "photosConnectedAt": "2025-04-01T00:00:00Z",
  "updatedAt": "2025-04-28T00:00:00Z"
}
```

### `coaching_sessions/{uid}_{timestamp}`
```json
{
  "userId": "116305439069711589801",
  "sessionId": "116305..._1745000123456",
  "mediaUrl": "https://storage.googleapis.com/vocaliq-media/...",
  "mode": "video",
  "source": "upload",
  "context": { "scenario": "General Presentation", "audience": "Professionals", "goal": "Improve clarity" },
  "overallScore": 7.5,
  "scoreBreakdown": { "content": 8, "delivery": 7, "confidence": 7, "pacing": 8, "engagement": 7 },
  "emotionDetected": "Attempted Enthusiasm",
  "wpm": 142,
  "transcript": [{ "time": "0:12", "text": "...", "issue": "filler_words", "fix": "..." }],
  "improvementTips": ["...", "...", "..."],
  "detailedTips": [{ "title": "...", "explanation": "...", "exercise": "...", "rephrasing": "..." }],
  "vocalControl": { "pacing": "...", "tone": "...", "breath": "...", "pause": "..." },
  "strengthsToKeep": ["...", "..."],
  "practicePlan": { "day1": "...", "day2": "...", "day7": "..." },
  "emotionTimeline": [{ "time": 3, "emotion": "joy", "eyeContact": true }],
  "emotionSummary": { "dominant": "confident", "eyeContactPercent": 73 },
  "gestureTimeline": [{ "time": 3, "gesture": "open_hand", "handsCount": 1 }],
  "gestureSummary": { "dominant": "open_hand", "expressiveness": 72 },
  "createdAt": "2025-04-28T00:00:00Z"
}
```

> **Index:** Composite index on `userId ASC + createdAt DESC` for efficient session history queries.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/google` | ❌ | Redirect to Google OAuth consent |
| `GET` | `/auth/google/callback` | ❌ | Exchange code → JWT |
| `GET` | `/auth/me` | ✅ | Get current user profile |
| `POST` | `/coaching/analyze` | ✅ | Upload + analyze video/audio |
| `POST` | `/coaching/analyze-drive` | ✅ | Analyze a Google Drive video |
| `GET` | `/coaching/sessions` | ✅ | Get all sessions for user |
| `GET` | `/coaching/session/:id` | ✅ | Get single session report |
| `GET` | `/photos/connect` | ✅ | Start Drive OAuth flow |
| `GET` | `/photos/callback` | ✅ | Drive OAuth callback |
| `GET` | `/photos/videos` | ✅ | List user's Drive videos |

---

## Analytics

**GA4 Measurement ID:** `G-SN3LE9Y5RT`

### Frontend Events (gtag.js)
| Event | Trigger |
|---|---|
| `page_view` | Every React route change |
| `login` | After JWT stored in localStorage |
| `session_submitted` | User clicks Analyze My Speech |
| `session_complete` | After AI results returned |
| `report_tab_viewed` | Each tab click in coaching report |

### Backend Events (Measurement Protocol)
| Event | Trigger |
|---|---|
| `login` | After JWT issued in `authController.js` |
| `session_analyzed` | After Firestore save — includes score, emotion, source |

### Cloud Run Log Prefixes
| Prefix | Source |
|---|---|
| `[coaching]` | Session start, Drive download, Firestore save |
| `[gemini]` | Upload, Pass 1/2/3, scores |
| `[vision]` | Cloud Vision batches, emotion mapping |
| `[storage]` | GCS upload confirmation |
| `[photos]` | Drive video list, token validation |
| `[oauth]` | Token exchange, refresh |
| `[analytics]` | Measurement Protocol sends |

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- Google Cloud project with Firestore, GCS, Gemini, Cloud Vision APIs enabled
- Google OAuth 2.0 credentials

### 1. Clone the repo
```bash
git clone https://github.com/angadsinghgupta13112002/vocaliq.git
cd vocaliq
```

### 2. Install dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 3. Configure environment variables

**`server/.env`**
```env
PORT=8080
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
PHOTOS_REDIRECT_URI=http://localhost:8080/photos/callback
GCS_BUCKET_NAME=your_bucket_name
GEMINI_API_KEY=your_gemini_api_key
GA_API_SECRET=your_ga4_api_secret
GA_MEASUREMENT_ID=G-SN3LE9Y5RT
```

**`client/.env`**
```env
VITE_API_URL=http://localhost:8080/api
```

### 4. Run locally
```bash
# Terminal 1 — API server (port 8080)
cd server && npm run dev

# Terminal 2 — React dev server (port 5173)
cd client && npm run dev
```

Open http://localhost:5173

---

## Deployment (Google Cloud Run)

### Build and push Docker image
```bash
gcloud builds submit --tag gcr.io/auraboard-492122/vocaliq
```

### Deploy to Cloud Run
```bash
gcloud run deploy vocaliq \
  --image gcr.io/auraboard-492122/vocaliq \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 540 \
  --set-env-vars "JWT_SECRET=...,GOOGLE_CLIENT_ID=...,..."
```

### Application Default Credentials (ADC)
No service account key file is stored in the Docker image. The Cloud Run service account is granted the following IAM roles:
- `roles/datastore.user` — Firestore read/write
- `roles/storage.objectAdmin` — Cloud Storage upload
- `roles/aiplatform.user` — Gemini API access
- `roles/cloudvision.user` — Cloud Vision API

---

## Lessons Learned

1. **Express 5 breaking change** — `app.get("*")` is invalid; must use `app.use()` for the SPA catch-all
2. **Cloud Run PORT** — Cloud Run injects `PORT` automatically; never hardcode it
3. **ADC vs key files** — Never commit secrets; use ADC + IAM roles on Cloud Run
4. **Vite bakes API URLs at build time** — Need `.env.production` with correct `VITE_API_URL` before Docker build
5. **GA4 backend events** — `gtag.js` is browser-only; server-side tracking requires GA4 Measurement Protocol
6. **Three-pass Gemini prompting** — One large prompt gives generic coaching; splitting into three focused passes gives dramatically better, specific results

---

## License

Built for CS651 Web Systems — California State University, East Bay · Spring 2026
