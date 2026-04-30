# Demonstration of Application working

This page shows VocalIQ working end-to-end across multiple users and input modes.

---

## 1. Results for Each Team Member

Two team members recorded separate speeches and ran them through VocalIQ to produce distinct coaching reports.

### User 1 — Angaddeep Singh Gupta
> **[ADD SCREENSHOT]** — Coaching report showing Angaddeep's overall score, score breakdown, emotion detected, and coaching tips after recording a speech video

### User 2 — Samuel Paul Chetty
> **[ADD SCREENSHOT]** — Coaching report showing Samuel's overall score, score breakdown, emotion detected, and coaching tips after recording a separate speech video

> Note: Each report is stored as a separate document in the Firestore `coaching_sessions` collection under the respective user's `userId`.

---

## 2. Google Drive Video Upload — Input and Output

VocalIQ integrates with Google Drive (SocialNetwork X source). The user connects their Google account via OAuth, browses their Drive videos, selects one, and receives a full coaching report — the file is never downloaded to the browser.

### Step 1 — Connect Google Drive
> **[ADD SCREENSHOT]** — The "Browse Google Drive" button and the Google Drive OAuth consent screen

### Step 2 — Select a Video from Drive
> **[ADD SCREENSHOT]** — The Drive video picker modal showing the user's videos listed from Google Drive API

### Step 3 — Analysis Running
> **[ADD SCREENSHOT]** — The "Analyzing your speech..." progress state after clicking Analyze (server downloading + Gemini + Vision pipeline running)

### Step 4 — Coaching Report from Drive Video
> **[ADD SCREENSHOT]** — The full coaching report returned after Drive video analysis, showing the 5 tabs (Overview, Emotion Timeline, Gestures, Transcript, Tips & Coaching)

**What changed:** The Drive video was analyzed server-side. The server downloaded the video, ran the 3-pass Gemini chain, extracted frames with ffmpeg for Cloud Vision, and saved the full result to Firestore — all without the browser downloading the file.

---

## 3. Audio Recording — Input and Output

Users without a camera can switch to audio-only mode. The browser captures audio via MediaRecorder and submits it for Gemini analysis.

### Step 1 — Audio Recording Mode
> **[ADD SCREENSHOT]** — The CoachingSession page with the audio-only recording interface (waveform animation, record/stop button)

### Step 2 — Audio Coaching Report
> **[ADD SCREENSHOT]** — The coaching report returned for an audio-only session — shows score, transcript with timestamps, improvement tips, and vocal control panel (no emotion timeline since no video frames)

**What changed:** Gemini analyzed the audio using `inlineData` base64 encoding (audio files are small enough). No video frames were sent, so the Emotion Timeline tab shows "No emotion data available for audio-only sessions."

---

## 4. Data Stored in Google Cloud Firestore

Every coaching session is persisted to Firestore in two collections.

### users collection
> **[ADD SCREENSHOT]** — Firebase Console showing the `users` collection with at least 2 user documents, displaying fields: uid, displayName, email, provider, photosAccessToken, updatedAt

### coaching_sessions collection
> **[ADD SCREENSHOT]** — Firebase Console showing the `coaching_sessions` collection with multiple session documents, displaying the sessionId, userId, overallScore, and createdAt fields

> **[ADD SCREENSHOT]** — A single expanded coaching_sessions document showing the full nested structure: transcript[], emotionTimeline[], gestureTimeline[], scoreBreakdown, vocalControl, detailedTips[]

---

## 5. Gemini API Calls — Request and Response Examples

VocalIQ uses the Google Gemini 2.5 Flash model in a three-pass chain via the Gemini File API.

### Pass 1 — Assessment
The server uploads the video buffer to the Gemini File API, polls until state = ACTIVE, then sends:

**Prompt sent to Gemini:**
```
You are an expert speaking coach analyzing a video/audio recording.
Context — Scenario: "Job Interview", Audience: "Hiring Manager", Goal: "Get the job".

Carefully watch and listen. Analyze facial expressions, voice tone, pacing, word choice, and delivery.
Return ONLY valid JSON with no extra text, in this exact structure:
{
  "language": "<detected spoken language>",
  "overallScore": <number 1.0 to 10.0>,
  "scoreBreakdown": { "contentClarity": ..., "emotionalDelivery": ..., ... },
  ...
}
```

**Example Gemini Pass 1 Response:**
```json
{
  "language": "English",
  "overallScore": 7.2,
  "scoreBreakdown": {
    "contentClarity": 8,
    "emotionalDelivery": 6,
    "vocalConfidence": 7,
    "pacing": 7,
    "audienceEngagement": 8
  },
  "scoreJustification": "The speaker delivered clear content with good structure but showed some nervousness in vocal tone during the first half.",
  "emotionDetected": "nervous",
  "emotionNeeded": "confident",
  "wpm": 142,
  "transcript": [
    {
      "start": "0:00", "end": "0:08",
      "text": "Hi, thank you for having me today.",
      "issues": ["nervousness"],
      "fix": "Take a slow breath before speaking. Start with a confident, slightly slower pace."
    }
  ],
  "improvementTips": [
    "Slow down during the opening — your pace was 165 WPM in the first 30 seconds",
    "Increase vocal variety — avoid monotone delivery in the middle section",
    "Make more direct eye contact — look toward the camera, not down"
  ]
}
```

### Pass 2 — Deep Coaching
The Pass 1 JSON is fed as context into a new Gemini call (no file re-upload):

**Example Gemini Pass 2 Response:**
```json
{
  "detailedTips": [
    {
      "issue": "nervousness",
      "title": "Calm Your Opening",
      "explanation": "In a hiring manager context, nervousness in the first 10 seconds sets a weak first impression.",
      "exercise": "Practice a 3-second pause after your greeting before continuing. Record yourself 5 times.",
      "rephrasing": "Instead of rushing into 'I have 5 years of experience', try: 'I'd like to share what makes me a strong fit for this role.'"
    }
  ],
  "vocalControl": {
    "pacing": { "current": 142, "target": 130, "technique": "Pause after each key point for 1–2 seconds" },
    "tone": "Add warmth by slightly raising pitch on positive words",
    "breath": "Breathe at natural punctuation marks — don't rush through commas",
    "pause": "Use deliberate 2-second pauses before answering questions"
  },
  "strengthsToKeep": ["Clear structure", "Good vocabulary"],
  "practicePlan": "Day 1–2: Record 2-minute intro speeches focusing only on pace. Day 3–4: Add eye contact practice using your phone camera. Day 5–7: Full mock interview with a friend, focusing on pause technique."
}
```

### Pass 3 — Gesture Analysis (Drive videos only)
The same Gemini File URI is reused (no re-upload cost):

**Example Gemini Pass 3 Response:**
```json
[
  { "second": 0,  "gesture": "neutral_hand", "handsCount": 0 },
  { "second": 3,  "gesture": "open_hand",    "handsCount": 2 },
  { "second": 6,  "gesture": "pointing",     "handsCount": 1 },
  { "second": 9,  "gesture": "no_hands",     "handsCount": 0 },
  { "second": 12, "gesture": "open_hand",    "handsCount": 1 }
]
```

> **[ADD SCREENSHOT]** — Cloud Run logs showing the Gemini File API upload, Pass 1/2/3 log lines, and final session save: `[gemini] Pass 1 complete. Score: 7.2` / `[gemini] Pass 2 complete` / `[gemini] Pass 3 complete: 5 gesture entries`
