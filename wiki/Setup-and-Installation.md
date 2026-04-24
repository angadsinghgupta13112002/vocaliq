# Setup & Installation

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20 or later | |
| npm | 10 or later | |
| ffmpeg | Any recent | Required for server-side frame extraction (Drive uploads). Install via `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Linux). |
| gcloud CLI | Any recent version | For deploy only |
| Google Cloud project | — | With Firestore, GCS, Gemini API, Cloud Vision, and Drive API enabled |

---

## 1. Clone the repo

```bash
git clone https://github.com/angadsinghgupta13112002/vocaliq.git
cd vocaliq
```

---

## 2. Install dependencies

```bash
# Server
cd server && npm install

# Client (in a new terminal)
cd client && npm install
```

---

## 3. Configure environment variables

### Server — `server/.env`

Create `server/.env` with the following values:

```env
# App
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Google Gemini
GEMINI_API_KEY=<your Gemini API key from aistudio.google.com>
GEMINI_MODEL=gemini-2.5-flash

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=<your GCP project ID>
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
GCS_BUCKET_NAME=<your GCS bucket name>

# Google OAuth 2.0
GOOGLE_CLIENT_ID=<OAuth 2.0 client ID>
GOOGLE_CLIENT_SECRET=<OAuth 2.0 client secret>
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback
GOOGLE_PHOTOS_REDIRECT_URI=http://localhost:8080/api/auth/google/photos/callback

# JWT
JWT_SECRET=<a long random hex string>
JWT_EXPIRES_IN=7d

# Google Analytics (optional — frontend only, set in client/.env)
# VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Place your Firebase service account key at `server/service-account-key.json`. Download it from **Firebase Console → Project Settings → Service Accounts → Generate new private key**.

### Client — `client/.env`

```env
VITE_API_URL=http://localhost:8080/api
```

---

## 4. Google Cloud setup

### Enable APIs

```bash
gcloud services enable \
  firestore.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  generativelanguage.googleapis.com \
  vision.googleapis.com \
  drive.googleapis.com
```

### Create a GCS bucket

```bash
gcloud storage buckets create gs://YOUR_BUCKET_NAME \
  --location=us-central1 \
  --uniform-bucket-level-access
```

### Set up Firestore

In the [Firebase Console](https://console.firebase.google.com), create a project (or use an existing one), then enable **Firestore in Native mode**.

### OAuth 2.0 credentials

In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials):

1. Create an **OAuth 2.0 Client ID** (Web application)
2. Add **Authorized JavaScript origins**: `http://localhost:5173`
3. Add **Authorized redirect URIs**:
   - `http://localhost:8080/api/auth/google/callback` (main login)
   - `http://localhost:8080/api/auth/google/photos/callback` (Google Drive picker)

---

## 5. Run locally

```bash
# Terminal 1 — API server (port 8080)
cd server && npm run dev

# Terminal 2 — React dev server (port 5173)
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 6. Verify it's working

| Check | Expected result |
|---|---|
| `curl http://localhost:8080/health` | `{ "status": "ok", "app": "VocalIQ" }` |
| Visit `http://localhost:5173` | VocalIQ login page |
| Click "Continue with Google" | Google OAuth consent screen |
| After login | Dashboard with your name |

---

## Environment variable reference

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` or `production` |
| `CLIENT_URL` | Yes | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `GEMINI_API_KEY` | Yes | From [Google AI Studio](https://aistudio.google.com) |
| `GEMINI_MODEL` | No | Default: `gemini-2.5-flash` |
| `GOOGLE_CLOUD_PROJECT_ID` | Yes | GCP project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local only | Path to service account key JSON (omit on Cloud Run) |
| `GCS_BUCKET_NAME` | Yes | GCS bucket for video storage |
| `GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | Yes | Must match what's registered in Cloud Console |
| `GOOGLE_PHOTOS_REDIRECT_URI` | Yes | Google Drive OAuth callback URI |
| `JWT_SECRET` | Yes | Minimum 32 chars, random hex recommended |
| `JWT_EXPIRES_IN` | No | Default: `7d` |
| `VITE_API_URL` | Client only | `http://localhost:8080/api` locally, `/api` in production |
