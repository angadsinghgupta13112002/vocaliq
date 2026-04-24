# Gemini AI Pipeline

VocalIQ uses a **Gemini analysis chain** of up to three passes. Pass 1 assesses the recording. Pass 2 receives Pass 1's output as context and generates a deeper coaching plan. For Google Drive videos, Pass 3 analyzes hand gestures by reusing the already-uploaded Gemini file — zero extra upload cost. All passes use `responseMimeType: "application/json"` to force structured output.

---

## Overview

```
Video/Audio buffer
        │
        ├──── (video) ──► uploadVideoToGemini() → Gemini File API URI
        │                        │
┌───────▼──────────────────────────────────────────┐
│  PASS 1 — Speech Assessment                      │
│  Model: gemini-2.5-flash                         │
│  Input: video via Gemini File API  (or audio     │
│         as base64 inlineData for audio mode)     │
│                                                  │
│  Output:                                         │
│    language, overallScore, scoreBreakdown,       │
│    scoreJustification, emotionDetected,          │
│    emotionNeeded, wpm, transcript[], tips[]      │
└───────────────────────┬──────────────────────────┘
                        │ Pass 1 JSON as context
┌───────────────────────▼──────────────────────────┐
│  PASS 2 — Deep Coaching                          │
│  Model: gemini-2.5-flash                         │
│  Input: text prompt + Pass 1 JSON                │
│                                                  │
│  Output:                                         │
│    detailedTips[], vocalControl{},               │
│    strengthsToKeep[], practicePlan               │
└───────────────────────┬──────────────────────────┘
                        │ (Drive uploads only — reuses same Gemini file URI)
┌───────────────────────▼──────────────────────────┐
│  PASS 3 — Gesture Analysis  (Drive videos only)  │
│  Model: gemini-2.5-flash                         │
│  Input: same Gemini File API URI (no re-upload)  │
│                                                  │
│  Output:                                         │
│    gestureTimeline[] — one entry per 3 seconds   │
│    { second, gesture, handsCount }               │
└──────────────────────────────────────────────────┘
        │
Merged result saved to Firestore
```

> **Pass 3 is Drive-only.** For webcam/upload sessions, [MediaPipe HandLandmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) runs entirely in the browser and sends the gesture timeline as a JSON field on the `/analyze` request — no extra Gemini call needed.

---

## Video Upload — Gemini File API

For video files, VocalIQ uses the Gemini File API rather than base64 encoding (videos are too large). The process:

1. Write the video buffer to an OS temp file
2. Upload to Gemini File API via `GoogleAIFileManager.uploadFile()`
3. Poll `getFile()` every 3 seconds until `state === "ACTIVE"` (typically 10–60 seconds)
4. Pass the `fileUri` in the `generateContent` call
5. Delete the temp file when done (Gemini auto-expires files after 48 hours)

For **audio-only** sessions, the audio buffer is encoded as base64 `inlineData` — no File API needed.

---

## Pass 1 Prompt

The prompt instructs Gemini to return a single JSON object. Key fields:

```json
{
  "language": "English",
  "overallScore": 7.4,
  "scoreBreakdown": {
    "contentClarity":     8,
    "emotionalDelivery":  6.5,
    "vocalConfidence":    7,
    "pacing":             7.5,
    "audienceEngagement": 7
  },
  "scoreJustification": "2–3 sentence explanation of the overall score.",
  "emotionDetected": "Nervousness",
  "emotionNeeded":   "Confidence",
  "wpm": 142,
  "transcript": [
    {
      "start":  "0:00",
      "end":    "0:08",
      "text":   "Good morning, thank you for having me today.",
      "issues": ["professional_tone"],
      "fix":    ""
    },
    {
      "start":  "0:08",
      "end":    "0:15",
      "text":   "I am, uh, very excited to be here.",
      "issues": ["filler_word", "nervousness"],
      "fix":    "Replace 'uh' with a deliberate 1-second pause."
    }
  ],
  "improvementTips": [
    "Reduce filler words — 4 uses of 'um'/'uh' detected",
    "Lead with your value proposition, not excitement",
    "Use declarative statements instead of hedging language"
  ]
}
```

### Issue tags

| Tag | Meaning |
|---|---|
| `filler_word` | "um", "uh", "like", "you know" |
| `nervousness` | Vocal tremor, rushed delivery, pitch rise |
| `stutter` | Repetition of words or syllables |
| `eye_contact_break` | Looking away (video only) |
| `monotone` | Flat pitch with no variation |
| `too_fast` | WPM significantly above target |
| `too_slow` | WPM significantly below target |
| `enthusiasm` | ✅ Positive — strong, energetic delivery |
| `professional_tone` | ✅ Positive — appropriate register for context |

---

## Pass 2 Prompt

Pass 2 receives the full Pass 1 JSON as context:

```
You are an expert speaking coach. Based on this assessment of a speaker's recorded session:
<Pass 1 JSON>
Provide a detailed, personalized coaching plan...
```

Pass 2 output shape:

```json
{
  "detailedTips": [
    {
      "issue":       "filler_word",
      "title":       "Eliminate filler words with the pause technique",
      "explanation": "Why this matters for their specific scenario and audience.",
      "exercise":    "Specific practice exercise for the next 24 hours.",
      "rephrasing":  "\"I am excited\" → [pause] \"It is a pleasure to meet you.\""
    }
  ],
  "vocalControl": {
    "pacing": {
      "current":   142,
      "target":    130,
      "technique": "Breathe before each new thought."
    },
    "tone":   "End declarative sentences with a downward inflection.",
    "breath": "Diaphragmatic breath before each answer.",
    "pause":  "Use 1-second pauses instead of fillers."
  },
  "strengthsToKeep": [
    "Clear, professional vocabulary",
    "Good sentence structure throughout"
  ],
  "practicePlan": "Day 1: count fillers. Day 2: rewrite hedging language. Day 3: full mock interview."
}
```

---

## Pass 3 Prompt: Gesture Analysis (Drive uploads only)

For Google Drive videos, client-side MediaPipe cannot run (no browser), so a third Gemini pass inspects the same already-uploaded file — **zero extra upload cost**.

The prompt instructs Gemini to classify the dominant hand gesture for every 3-second window using eight fixed labels:

| Label | Meaning |
|---|---|
| `open_hand` | Fingers spread open, palm clearly visible |
| `pointing` | Index finger extended toward camera or to one side |
| `peace` | Two fingers up (V / peace sign) |
| `thumbs_up` | Thumb pointing upward |
| `fist` | Closed fist, all fingers curled in |
| `partial_open` | Some fingers extended but not fully open |
| `neutral_hand` | Relaxed hand at rest, not actively gesturing |
| `no_hands` | Hands not visible or out of frame |

Pass 3 output shape (array, one entry per 3-second interval):

```json
[
  { "second": 0,  "gesture": "open_hand", "handsCount": 2 },
  { "second": 3,  "gesture": "pointing",  "handsCount": 1 },
  { "second": 6,  "gesture": "no_hands",  "handsCount": 0 }
]
```

Pass 3 failures are non-fatal — if Gemini returns malformed JSON or times out, `gestureTimeline` is set to `[]` and the rest of the report is unaffected.

For webcam and upload sessions, MediaPipe runs in the browser (zero server cost) and sends the same `{ second, gesture, handsCount }` format as a JSON field on the `/api/coaching/analyze` request.

---

## Safe JSON Parsing

Gemini occasionally returns safety blocks, rate-limit messages, or malformed JSON. VocalIQ wraps every `JSON.parse()` call in `safeParseGemini()`:

```js
const safeParseGemini = (text, label) => {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("non-object");
    return parsed;
  } catch (err) {
    console.error(`[gemini] ${label} parse failed:`, err.message);
    return label.includes("Pass 1") ? { ...PASS1_DEFAULTS } : { ...PASS2_DEFAULTS };
  }
};
```

If parsing fails, sensible defaults are returned so the coaching report always renders — it just shows "Analysis could not be completed. Please try again." in the justification field.

---

## Context-aware coaching

VocalIQ passes scenario, audience, and goal context to both prompts. This allows Gemini to tailor advice specifically — e.g., a job interview needs confidence, a conference talk needs engagement, a sales pitch needs persuasion.

```js
const { scenario = "General presentation",
        audience = "General audience",
        goal     = "Communicate effectively" } = context;
```

The context is embedded directly in the Pass 1 prompt so Gemini can score against the right expectations.
