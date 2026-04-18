# Deployment

VocalIQ is deployed to **Google Cloud Run** as a single containerized service. The React client is built at Docker build time and served as static files by the Express server — no separate frontend hosting needed.

**Live URL:** https://vocaliq-956080638663.us-central1.run.app

---

## How the Dockerfile works

```dockerfile
# Stage 1 — build the React client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --silent
COPY client/ ./
RUN npm run build          # Vite bakes VITE_API_URL=/api from .env.production

# Stage 2 — production Express server
FROM node:20-alpine AS production
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production --silent
COPY server/ ./
COPY --from=client-builder /app/client/dist ./public   # React build → /app/public

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
```

In production, Express serves the React SPA from `./public` and all API calls go to `/api` (same origin, no CORS).

---

## Deploy from source (recommended)

`gcloud run deploy --source .` triggers **Cloud Build** to build the Docker image and push it to Artifact Registry automatically. No local Docker needed.

```bash
gcloud run deploy vocaliq \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account auraboard-sa@auraboard-492122.iam.gserviceaccount.com \
  --memory 1Gi \
  --cpu 1 \
  --timeout 540 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "NODE_ENV=production,GEMINI_MODEL=gemini-2.5-flash,GOOGLE_CLOUD_PROJECT_ID=auraboard-492122,GCS_BUCKET_NAME=auraboard-audio,JWT_EXPIRES_IN=7d" \
  --set-env-vars "GEMINI_API_KEY=<key>" \
  --set-env-vars "GOOGLE_CLIENT_ID=<id>" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=<secret>" \
  --set-env-vars "JWT_SECRET=<secret>" \
  --set-env-vars "CLIENT_URL=https://vocaliq-956080638663.us-central1.run.app" \
  --set-env-vars "GOOGLE_REDIRECT_URI=https://vocaliq-956080638663.us-central1.run.app/api/auth/google/callback" \
  --project auraboard-492122 --quiet
```

> **Note:** `PORT` is intentionally omitted — Cloud Run injects it automatically. Including it causes a deployment validation error.

---

## Service account & credentials

VocalIQ uses **Application Default Credentials (ADC)** on Cloud Run. The service account `auraboard-sa@auraboard-492122.iam.gserviceaccount.com` is attached to the Cloud Run service and has:

| Role | Purpose |
|---|---|
| `roles/datastore.user` | Read/write Firestore sessions and users |
| `roles/storage.objectAdmin` | Upload videos to GCS |

Gemini API is accessed via API key (`GEMINI_API_KEY`) — no additional IAM role needed.

There is **no service account key file in the Docker image**. The `firebase.js` and `storageService.js` both fall back to ADC when `GOOGLE_APPLICATION_CREDENTIALS` is not set:

```js
// firebase.js
const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? admin.credential.cert(require(keyPath))
  : admin.credential.applicationDefault();   // ← Cloud Run uses this
```

---

## Update env vars without rebuilding

To update just the environment variables (e.g. after getting a new API key):

```bash
gcloud run services update vocaliq \
  --region us-central1 \
  --update-env-vars "GEMINI_API_KEY=<new-key>" \
  --project auraboard-492122
```

---

## OAuth setup after first deploy

After deploying for the first time, add the Cloud Run URL to the OAuth 2.0 client in [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials):

| Field | Value |
|---|---|
| Authorized JavaScript origins | `https://vocaliq-956080638663.us-central1.run.app` |
| Authorized redirect URIs | `https://vocaliq-956080638663.us-central1.run.app/api/auth/google/callback` |

---

## Cloud Run configuration

| Setting | Value | Reason |
|---|---|---|
| Memory | 1 GiB | Gemini video processing buffers can be large |
| CPU | 1 vCPU | Sufficient for Node.js + Express |
| Timeout | 540 seconds | Gemini File API polling can take 60+ seconds; two-pass chain adds more |
| Min instances | 0 | Scale to zero when idle (cost saving) |
| Max instances | 3 | Cap concurrency to control Gemini API costs |
| Concurrency | Default (80) | Express is non-blocking; handles concurrent requests well |

---

## Redeploy after code changes

```bash
# Just redeploy — Cloud Build handles the rest
gcloud run deploy vocaliq --source . --region us-central1 --project auraboard-492122 --quiet
```

Cloud Build caches Docker layers. A typical redeploy takes 2–3 minutes.

---

## Verify deployment

```bash
# Health check
curl https://vocaliq-956080638663.us-central1.run.app/health

# Expected:
# { "status": "ok", "app": "VocalIQ", "timestamp": "..." }
```

```bash
# View recent Cloud Run logs
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="vocaliq"' \
  --project auraboard-492122 --limit 20 --format "value(textPayload)"
```
