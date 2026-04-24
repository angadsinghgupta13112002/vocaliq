# VocalIQ — AI Speaking Coach

An AI-powered speaking coach. Record or upload a video/audio clip, get a 1–10 score, timestamped feedback, and a personalized coaching plan — powered by Google Gemini 2.5 Flash.

**Live:** https://vocaliq-956080638663.us-central1.run.app  
**Course:** CS651 — Web Systems

---

## Quick start

```bash
git clone https://github.com/angadsinghgupta13112002/vocaliq.git
cd vocaliq

# Install dependencies
cd server && npm install
cd ../client && npm install

# Add server/.env and client/.env (see wiki/Setup-and-Installation.md)

# Terminal 1 — API server (port 8080)
cd server && npm run dev

# Terminal 2 — React dev server (port 5173)
cd client && npm run dev
```

See **[Setup & Installation](wiki/Setup-and-Installation.md)** for the full guide.

---

## Stack

React 19 + Vite · Express 5 · Node.js 20 · Gemini 2.5 Flash (3-pass) · Cloud Vision API · MediaPipe HandLandmarker · Google Drive API · Firestore · GCS · Google OAuth 2.0 + JWT · Cloud Run

---

## Docs

| Page | Description |
|---|---|
| [Home](wiki/Home.md) | Features, tech stack overview |
| [Architecture](wiki/Architecture.md) | System design, data flow, Firestore schema |
| [Setup & Installation](wiki/Setup-and-Installation.md) | Local dev in 5 minutes |
| [API Reference](wiki/API-Reference.md) | All REST endpoints with examples |
| [Deployment](wiki/Deployment.md) | Cloud Run deploy guide |

---

## Authors

Angaddeep Singh Gupta · Samuel Paul Chetty · Abhinay Konuri · Lasya Uma Sri Lingala
