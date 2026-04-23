# VocalIQ — AI Speaking Coach

**VocalIQ** is an AI-powered speaking coach that records or accepts video/audio of a user's speech, analyzes it using Google Gemini 2.5 Flash, and returns a detailed, timestamped coaching report.

**Live app:** https://vocaliq-956080638663.us-central1.run.app  
**Project:** CS651 — Advanced Web Technologies  
**Authors:** Angaddeep Singh Gupta, Samuel Paul Chetty, Lasya Uma Sri Lingala

---

## What it does

1. **Record or upload** a video or audio clip of any speech (interview, presentation, pitch, etc.)
2. **Browse Google Drive** to pick a video directly without downloading it first
3. **Two-pass Gemini analysis** scores the speech 1–10 and generates timestamped feedback
4. **Cloud Vision emotion timeline** extracts frames every 3 seconds and maps facial expressions to emotions (confident, nervous, anxious, etc.)
5. **Coaching report** shows score breakdown, emotion timeline, flagged moments, improvement tips, vocal control advice, and a personalized practice plan
6. **Watch past recordings** directly in the dashboard — every session is saved and playable

---

## Features

| Feature | Description |
|---|---|
| 🎙️ Video recording | In-browser MediaRecorder — no install needed |
| 📁 Video upload | Accepts MP4, WebM, QuickTime, MOV |
| 🗂️ Google Drive picker | Browse and import videos directly from Google Drive via OAuth |
| 🎧 Audio-only mode | For users without a camera |
| 🌐 Language detection | Gemini detects the spoken language automatically |
| 📊 1–10 score | Overall score + 5-dimension breakdown (content, delivery, confidence, pacing, engagement) |
| 😊 Emotion timeline | Cloud Vision Face Detection maps emotions frame-by-frame — confident, nervous, anxious, frustrated |
| 🕐 Timestamped transcript | Every segment flagged: filler words, nervousness, stutter, eye contact, enthusiasm |
| 💡 Deep coaching | Detailed tips with exercises and better phrasing examples |
| 🎵 Vocal control panel | WPM, target pace, tone, breath, and pause technique |
| 📈 Dashboard | Score history chart, best/average score, session list with playback |
| 📹 Recording playback | Watch or listen to any past session directly in the coaching report |
| 🔒 Google OAuth 2.0 | Secure login — no passwords stored |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8, React Router 7 |
| Backend | Node.js 20 + Express 5 |
| AI — Speech | Google Gemini 2.5 Flash (two-pass chain via Gemini File API) |
| AI — Emotion | Google Cloud Vision Face Detection API |
| Drive integration | Google Drive API v3 (drive.readonly scope) |
| Database | Google Firestore (NoSQL) |
| File storage | Google Cloud Storage |
| Auth | Google OAuth 2.0 + JWT (jsonwebtoken) |
| Analytics | Google Analytics 4 (frontend gtag.js + backend Measurement Protocol) |
| Deployment | Google Cloud Run (containerized, auto-scaling) |

---

## Wiki Pages

- [Architecture](Architecture) — system design, data flow, Firestore schema
- [Setup & Installation](Setup-and-Installation) — run locally in 5 minutes
- [Gemini AI Pipeline](Gemini-AI-Pipeline) — two-pass analysis, prompts, data shapes
- [API Reference](API-Reference) — all REST endpoints with request/response examples
- [Deployment](Deployment) — Cloud Run deploy guide
