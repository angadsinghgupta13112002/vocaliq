# Description

## Commit History

The following commits show the progression of development from initial setup to final deployment:

| Hash | Commit Message |
|---|---|
| `9422435` | Fix 6 bugs found in full codebase audit |
| `a83aa60` | Fix session list ordering — Drive sessions now sort correctly above local |
| `1a96cb1` | Fix gesture timestamps exceeding video duration for .mov files |
| `6ece28d` | Fix empty Tips/Vocal Control tabs, remove Instagram dead code, clean up docs |
| `226573d` | feat: redesign home page with full feature showcase |
| `e31c304` | docs: rewrite architecture to reflect full current system |
| `38d9d5e` | docs: update YouTube script for Samuel and Abhinay |
| `a6906dc` | feat: emotion timeline + gesture detection for Drive videos |
| `02caa24` | Fix Google Drive video analysis: server-side download bypasses all size limits |
| `d44044d` | Fix large video download: bypass Cloud Run 32 MB response limit |
| `a0dff20` | Fix: blob error parser re-throwing JSON SyntaxError as user-facing message |
| `f478d78` | Fix Google Drive download for large .mov files — streaming + proper error surfacing |
| `46d5df1` | Fix Google Drive download failing after 1 hour — auto-refresh expired access token |
| `59a0dee` | Add hand gesture detection with MediaPipe HandLandmarker |
| `c979294` | Add Google Drive picker, Cloud Vision emotion + eye contact, recording playback, and rebrand to VocalIQ |
| `957439b` | Add Google Analytics GA4 — frontend + backend |
| `531b9c7` | Add wiki documentation and update README |
| `8e89045` | Fix: Express 5 wildcard route crash on Cloud Run |
| `f5b3d2f` | Fix: storageService ADC support for Cloud Run |
| `61b8078` | Prep for Cloud Run: ADC support, production API URL, CORS fix |
| `4560611` | Rebuild project as VocalIQ - AI Speaking Coach |

> Screenshot of GitHub commit history: https://github.com/angadsinghgupta13112002/vocaliq/commits/main

---

## GitHub Issue Board — Progress Over Time

The team used GitHub Issues to track every component and code file of the application. One unique issue was created per component / code file as required.

> **[ADD SCREENSHOT 1]** — Issue board at project start (issues open, no progress)

> **[ADD SCREENSHOT 2]** — Issue board mid-development (some issues in progress)

> **[ADD SCREENSHOT 3]** — Issue board after adding Drive integration

> **[ADD SCREENSHOT 4]** — Issue board after adding Gemini + Cloud Vision pipeline

> **[ADD SCREENSHOT 5]** — Issue board near project completion (issues closed)

To view the live issue board: https://github.com/angadsinghgupta13112002/vocaliq/issues

---

## Major Code Files and Their Functions

### Backend — `server/`

| File | Function |
|---|---|
| `server/server.js` | HTTP server entry point — reads `process.env.PORT` (Cloud Run injects this), starts Express app |
| `server/app.js` | Express 5 app configuration — sets up middleware stack (cors, helmet, morgan, multer), mounts all route groups, and serves the React SPA bundle via `app.use()` (Express 5 catch-all) |
| `server/config/firebase.js` | Initializes Firebase Admin SDK using Application Default Credentials (ADC) on Cloud Run; returns the Firestore `db` instance used across all services |
| `server/controllers/authController.js` | Handles Google OAuth 2.0 flow — builds redirect URL, exchanges auth code for tokens, upserts user in Firestore, signs a 7-day JWT, and handles the Drive OAuth callback separately |
| `server/controllers/coachingController.js` | Core controller — `analyzeSession` runs the Gemini + Cloud Vision + GCS upload pipeline in parallel for local/uploaded videos; `analyzeFromDrive` does the same for Drive videos server-side; `getSessions` returns ordered session list; `getSession` returns a single report |
| `server/controllers/photosController.js` | Lists videos from the user's Google Drive using the Drive API v3 and the stored OAuth token |
| `server/middleware/authMiddleware.js` | JWT verification middleware — checks `Authorization: Bearer <token>` header on every protected route |
| `server/middleware/errorHandler.js` | Global Express error handler — catches unhandled errors and returns a consistent JSON error response |
| `server/routes/authRoutes.js` | Mounts `/api/auth/*` endpoints — `/google`, `/google/callback`, `/google/photos`, `/google/photos/callback`, `/me` |
| `server/routes/coachingRoutes.js` | Mounts `/api/coaching/*` — `/analyze` (with multer file upload + rate limiter), `/analyze-from-drive`, `/sessions`, `/sessions/:id` |
| `server/routes/photosRoutes.js` | Mounts `/api/photos/*` — `/videos` endpoint for Drive video listing |
| `server/services/analyticsService.js` | Sends server-side events to Google Analytics 4 via the Measurement Protocol — `login`, `session_analyzed` (with score, emotion, source metadata) |
| `server/services/firestoreService.js` | Firestore CRUD abstraction layer — `getDocument`, `setDocument`, `queryCollection` (with optional `orderBy`), `deleteDocument` |
| `server/services/geminiCoachingService.js` | Three-pass Gemini chain — Pass 1 (assessment: score, transcript, emotion, WPM), Pass 2 (deep coaching: tips, exercises, vocal control), Pass 3 (gesture analysis for Drive videos); handles Gemini File API upload + polling |
| `server/services/gestureService.js` | `summarizeGestureTimeline()` — computes dominant gesture, gesture frequency counts, expressiveness score (0–100), nervous seconds, and hands-visible percentage |
| `server/services/googlePhotosService.js` | Google Drive API v3 wrapper — lists video files from Drive, validates access token, returns file metadata |
| `server/services/oauthService.js` | Builds Google OAuth URLs, exchanges authorization codes for tokens, refreshes expired Drive access tokens |
| `server/services/storageService.js` | Google Cloud Storage upload helper — streams video/audio buffers to GCS bucket under `videos/{uid}/` or `audio/{uid}/`, returns public URL |
| `server/services/visionService.js` | Cloud Vision Face Detection — batches base64 frames, calls the Vision API, maps likelihood scores to emotion labels (confident/nervous/anxious/frustrated/neutral), computes eye contact from pan/tilt angles |
| `server/utils/serverFrameExtractor.js` | Server-side video frame extraction using ffmpeg — writes buffer to temp file, extracts JPEG frames at 3-second intervals, returns base64 strings; used for Drive uploads where client-side Canvas API cannot run |

### Frontend — `client/src/`

| File | Function |
|---|---|
| `client/src/App.jsx` | React Router 7 SPA setup — defines all routes (`/`, `/login`, `/dashboard`, `/session`, `/setup`, `/report/:id`), wraps app in `AuthProvider` |
| `client/src/context/AuthContext.jsx` | Global authentication state — stores JWT, user object, `login()` / `logout()` methods; provides `useAuth()` hook used throughout the app |
| `client/src/services/api.js` | Axios instance configured with `baseURL = VITE_API_URL` — attaches `Authorization: Bearer <JWT>` header on every request via interceptor |
| `client/src/pages/LoginPage.jsx` | Google Sign-In page — reads the `?token=` query param after OAuth redirect and calls `login()` to store JWT |
| `client/src/pages/Dashboard.jsx` | User dashboard — fetches session history, renders score progress chart (Recharts), best/average score cards, and a clickable session list with playback links |
| `client/src/pages/SessionSetup.jsx` | Pre-session context form — user sets scenario, audience, and goal before recording |
| `client/src/pages/CoachingSession.jsx` | Main recording/upload page — switches between Record, Upload, and Google Drive modes; handles MediaRecorder, file picker, Drive picker, and submits to `/api/coaching/analyze` or `/analyze-from-drive` |
| `client/src/pages/CoachingReport.jsx` | Full 5-tab coaching report — Overview, Emotion Timeline, Gestures, Transcript, Tips & Coaching; loads session from API and renders all data |
| `client/src/components/Navbar.jsx` | Top navigation bar — shows logo, user avatar, and logout button; visible on all authenticated pages |
| `client/src/components/ScoreRing.jsx` | Animated SVG circular progress ring displaying the overall score (1–10) |
| `client/src/components/ScoreChart.jsx` | Recharts line chart showing score history across sessions on the Dashboard |
| `client/src/components/VideoRecorder.jsx` | MediaRecorder wrapper with live waveform animation — handles start, stop, and preview of recorded video |
| `client/src/components/TimestampedTranscript.jsx` | Renders the Gemini transcript array — each segment shows start/end timestamps, spoken text, issue tags (color-coded), and the specific fix |
| `client/src/components/EmotionTimeline.jsx` | Cloud Vision emotion visualization — color-coded timeline bar (one block per 3-second frame), emotion summary cards, eye contact percentage, nervous/confident moment markers |
| `client/src/components/GestureTimeline.jsx` | MediaPipe/Gemini gesture visualization — timeline bar, expressiveness score ring, gesture frequency breakdown, coaching tip card |
| `client/src/components/GooglePhotosPicker.jsx` | Google Drive video picker modal — shows Drive-connected state, lists available videos, handles connect/disconnect flow |
| `client/src/utils/frameExtractor.js` | Browser-side video frame extractor — uses HTML5 Video + Canvas API to seek the video at 3-second intervals and encode each frame as a base64 JPEG (320×240) |
| `client/src/utils/gestureExtractor.js` | MediaPipe HandLandmarker integration — loads WASM model (singleton), seeks video at 3-second intervals, detects 21 hand landmarks per frame, classifies gesture type from landmark geometry |
| `client/src/utils/analytics.js` | GA4 helper functions — `trackPageView()` and `trackEvent()` wrappers over `window.gtag` |
| `client/src/utils/constants.js` | App-wide constants — `API_BASE_URL` (set from `VITE_API_URL` env var), `TOKEN_KEY` (localStorage key for JWT) |

### Infrastructure

| File | Function |
|---|---|
| `Dockerfile` | Multi-stage build — Stage 1 installs deps and compiles React with Vite; Stage 2 installs ffmpeg via `apk`, copies the compiled frontend and server code, starts `node server.js` |
| `.dockerignore` | Excludes `node_modules`, `.env` files, and dev artifacts from the Docker build context |
| `client/.env` | Local development env — sets `VITE_API_URL=http://localhost:8080/api` |
| `client/.env.production` | Production env — sets `VITE_API_URL=/api` (same-origin, no CORS) |
