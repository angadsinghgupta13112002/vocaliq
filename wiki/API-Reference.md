# API Reference

Base URL (production): `https://vocaliq-956080638663.us-central1.run.app/api`  
Base URL (local dev): `http://localhost:8080/api`

All protected endpoints require:
```
Authorization: Bearer <JWT>
```

---

## Auth Routes — `/api/auth`

### `GET /api/auth/google`
Redirects the browser to the Google OAuth consent screen.

**No request body.**

**Response:** `302 Redirect` → `https://accounts.google.com/o/oauth2/v2/auth?...`

---

### `GET /api/auth/google/callback`
Handles the OAuth authorization code returned by Google. Issues a JWT and redirects back to the React app.

**Query params:**
| Param | Description |
|---|---|
| `code` | OAuth authorization code from Google |

**Response:** `302 Redirect` → `{CLIENT_URL}/login?token=<JWT>`

---

### `GET /api/auth/me` 🔒
Returns the currently authenticated user's profile from Firestore.

**Response `200`:**
```json
{
  "success": true,
  "user": {
    "uid":         "106737976765594548027",
    "displayName": "Angad Singh Gupta",
    "email":       "angad@example.com",
    "photoURL":    "https://lh3.googleusercontent.com/...",
    "provider":    "google",
    "updatedAt":   { "_seconds": 1776487376, "_nanoseconds": 0 }
  }
}
```

**Response `401`:**
```json
{ "success": false, "error": "No token provided" }
```

**Response `404`:**
```json
{ "error": "User not found" }
```

---

### `POST /api/auth/logout` 🔒
Stateless logout — JWT is client-side. Server confirms the request; client must delete the token from localStorage.

**Response `200`:**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

### `GET /api/auth/google/photos` 🔒
Redirects the authenticated user to Google OAuth to authorize Google Drive access (`drive.readonly` scope). The user's `uid` is encoded in the OAuth state parameter.

**Response:** `302 Redirect` → Google OAuth consent screen

---

### `GET /api/auth/google/photos/callback`
Handles the Google Drive OAuth callback. Exchanges the code for tokens, stores them in the user's Firestore document, and redirects back to the dashboard.

**Response:** `302 Redirect` → `/dashboard?photosConnected=true`

---

### `GET /api/auth/google/photos/status` 🔒
Returns whether the current user has connected Google Drive.

**Response `200`:**
```json
{
  "success": true,
  "photosConnected": true,
  "photosConnectedAt": { "_seconds": 1776487376, "_nanoseconds": 0 }
}
```

---

## Google Drive Routes — `/api/photos`

### `GET /api/photos/videos` 🔒
Returns up to 20 of the user's most recent video files from Google Drive.

**Response `200`:**
```json
{
  "success": true,
  "videos": [
    {
      "id":           "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs",
      "filename":     "interview_practice.mp4",
      "url":          "https://www.googleapis.com/drive/v3/files/1Bxi...?alt=media",
      "thumbnailUrl": "https://lh3.googleusercontent.com/...",
      "createdAt":    "2026-04-20T14:30:00.000Z",
      "size":         "52428800",
      "mimeType":     "video/mp4"
    }
  ]
}
```

**Response `403`:**
```json
{ "success": false, "error": "Google Photos not connected. Please authorize via /api/auth/google/photos" }
```

---

### `POST /api/photos/download` 🔒 ⚠️ Rate limited (10 req / 15 min)
Downloads a Google Drive video by URL and returns it as a binary `video/mp4` stream. Used by the frontend to pass the video through the coaching pipeline.

**Request body:**
```json
{ "videoUrl": "https://www.googleapis.com/drive/v3/files/{fileId}?alt=media" }
```

**Response `200`:** Binary video stream (`Content-Type: video/mp4`)

**Response `400`:**
```json
{ "success": false, "error": "Invalid Google Drive URL" }
```

---

## Coaching Routes — `/api/coaching`

### `POST /api/coaching/analyze` 🔒 ⚠️ Rate limited (5 req / 15 min)
Uploads a video or audio file, runs the two-pass Gemini analysis, saves the session to Firestore, and returns the session ID.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `media` | File | Yes | Video (MP4, WebM, MOV, QuickTime) or audio (WebM, OGG, MP3, WAV). Max 500 MB. |
| `scenario` | string | No | Speech context (e.g. "Job Interview"). Default: "General presentation" |
| `audience` | string | No | Target audience (e.g. "Hiring Manager"). Default: "General audience" |
| `goal` | string | No | Coaching goal (e.g. "Build confidence"). Default: "Communicate effectively" |
| `mode` | string | No | `"video"` or `"audio"`. Default: `"video"` |
| `frames` | string | No | JSON string of `[{ second, base64 }]` frame array extracted client-side by `frameExtractor.js`. Required for Cloud Vision emotion analysis. Omit for audio-only sessions. |

**Allowed MIME types:**
`video/webm`, `video/mp4`, `video/quicktime`, `video/x-msvideo`, `video/mpeg`,
`audio/webm`, `audio/ogg`, `audio/mpeg`, `audio/mp4`, `audio/wav`

**Response `200`:**
```json
{
  "success":   true,
  "sessionId": "uid123_1776487376000",
  "message":   "Analysis complete"
}
```

**Response `400`:**
```json
{ "success": false, "error": "No media file uploaded." }
```

**Response `429` (rate limit):**
```json
{ "success": false, "error": "Too many analysis requests. Please wait 15 minutes." }
```

> ⏱️ **Timeout note:** This endpoint can take 30–180 seconds. The React client sets a 5-minute axios timeout. Cloud Run is configured with a 540-second request timeout.

---

### `GET /api/coaching/sessions` 🔒
Returns all coaching sessions for the authenticated user, sorted newest-first.

**Response `200`:**
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId":    "uid123_1776487376000",
      "overallScore": 7.4,
      "wpm":          142,
      "mode":         "audio",
      "language":     "English",
      "context": {
        "scenario": "Job Interview",
        "audience": "Hiring Manager",
        "goal":     "Build confidence"
      },
      "createdAt": { "_seconds": 1776487376, "_nanoseconds": 0 }
    }
  ]
}
```

---

### `GET /api/coaching/sessions/:id` 🔒
Returns a single coaching session by ID. Returns `403` if the session belongs to a different user.

**Response `200`:** Full session document (see [Architecture → Firestore Schema](Architecture#firestore-schema))

**Response `403`:**
```json
{ "success": false, "error": "Forbidden" }
```

**Response `404`:**
```json
{ "success": false, "error": "Session not found" }
```

---

## Health Check

### `GET /health`
No authentication required. Used by Cloud Run health probes.

**Response `200`:**
```json
{
  "status":    "ok",
  "app":       "VocalIQ",
  "timestamp": "2026-04-18T04:59:18.970Z"
}
```

---

## Error Response Format

All errors return structured JSON:

```json
{
  "success": false,
  "error":   "Human-readable error message",
  "stack":   "...only in NODE_ENV=development..."
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| All `/api/*` routes | 100 requests | 15 minutes per IP |
| `POST /api/coaching/analyze` | 5 requests | 15 minutes per IP |
