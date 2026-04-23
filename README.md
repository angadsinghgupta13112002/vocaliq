# VocalIQ — AI Speaking Coach

An AI-powered speaking coach. Record or upload a video/audio clip, get a 1–10 score, timestamped feedback, and a personalized coaching plan — powered by Google Gemini 2.5 Flash.

**Live:** https://vocaliq-956080638663.us-central1.run.app  
**Course:** CS651 — Web Systems

---

## Quick start

```bash
git clone https://github.com/angadsinghgupta13112002/vocaliq.git
cd vocaliq/server && npm install
cd ../client && npm install
# Add server/.env and client/.env (see wiki)
npm run dev      # in client/
node server.js   # in server/
```

See **[Setup & Installation](wiki/Setup-and-Installation.md)** for the full guide.

---

## Stack

React 19 + Vite · Express 5 · Node.js 20 · Google Gemini 2.5 Flash · Cloud Vision · Firestore · GCS · Google OAuth 2.0 + JWT · Cloud Run

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

Angaddeep Singh Gupta · Samuel Paul Chetty · Abhinay Konuri · Lasya Uma Sei Lingala
