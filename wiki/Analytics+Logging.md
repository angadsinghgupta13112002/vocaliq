# Analytics+Logging

## GA4 Property

**Measurement ID:** G-SN3LE9Y5RT
**Platform:** Google Analytics 4

---

## Frontend Events (gtag.js)

Tracked via `client/src/utils/analytics.js` using `window.gtag`:

| Event Name | Trigger | Parameters |
|---|---|---|
| `page_view` | Every React route change (App.jsx useEffect) | `page_path`, `page_title` |
| `login` | After Google OAuth JWT is stored | `method: "google"` |
| `session_submitted` | User clicks "Analyze My Speech" | `mode` (video/audio/upload/drive) |
| `session_complete` | After Gemini response returned to client | `score`, `mode` |
| `report_tab_viewed` | Each time user clicks a report tab | `tab` (overview/emotion/gestures/transcript/tips) |

```js
// client/src/utils/analytics.js
export const trackEvent = (eventName, params = {}) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
};

export const trackPageView = (path) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", "G-SN3LE9Y5RT", { page_path: path });
  }
};
```

---

## Backend Events (Measurement Protocol)

Tracked via `server/services/analyticsService.js` using GA4 Measurement Protocol — captures server-side events even if the browser closes before the result loads:

| Event Name | Trigger | Parameters |
|---|---|---|
| `login` | After JWT is issued in `authController.js` | `uid`, `method: "google"` |
| `session_analyzed` | After Firestore save in `coachingController.js` | `uid`, `score`, `emotion`, `source` (local/drive) |

```js
// server/services/analyticsService.js
const sendServerEvent = async (clientId, eventName, params = {}) => {
  await axios.post(
    `https://www.google-analytics.com/mp/collect?measurement_id=G-SN3LE9Y5RT&api_secret=${process.env.GA4_API_SECRET}`,
    {
      client_id: clientId,
      events: [{ name: eventName, params }],
    }
  );
};
```

---

## Cloud Run Logging

All backend events are streamed to **Google Cloud Logging** via `stdout`. Log lines are prefixed for easy filtering:

| Prefix | Source |
|---|---|
| `[coaching]` | coachingController.js — session analysis, Drive download, session save |
| `[gemini]` | geminiCoachingService.js — file upload, Pass 1/2/3 progress, scores |
| `[vision]` | visionService.js — Cloud Vision frame batches, emotion mapping |
| `[storage]` | storageService.js — GCS upload confirmation and URL |
| `[photos]` | googlePhotosService.js — Drive video list, token validation |
| `[oauth]` | oauthService.js — token exchange, refresh |
| `[analytics]` | analyticsService.js — Measurement Protocol sends |
| `[frameExtractor]` | serverFrameExtractor.js — ffmpeg frame extraction count |

**Example Cloud Run log output for a Drive session:**
```
[photos] Drive video list: 8 videos fetched for uid=116305...
[coaching] Starting Drive analysis: file=presentation.mp4 uid=116305...
[frameExtractor] Extracted 12 frames server-side (3s interval)
[gemini] Uploading video to Gemini File API...
[gemini] Video active. Running Pass 1...
[gemini] Pass 1 complete. Score: 7.2 Running Pass 2...
[gemini] Pass 2 complete.
[gemini] Running Pass 3: gesture analysis...
[gemini] Pass 3 complete: 12 gesture entries
[vision] Analyzing 12 frames via Cloud Vision...
[vision] Frame analysis complete: dominant=confident eyeContact=73%
[storage] Video uploaded: https://storage.googleapis.com/vocaliq-media/videos/...
[coaching] Drive session saved: 116305439069711589801_1745000123456
[analytics] Server event sent: session_analyzed score=7.2 source=drive
```

---

## Analytics Report

> **[ADD PDF]** — Upload the Analytics+Logging Report PDF as described in the [Analytics+Logging Report](https://borg.csueastbay.edu/~grewe/CS651/Project2New.html) guidelines.

The report should include:
- Screenshots of the GA4 Realtime dashboard showing events firing
- Screenshots of the GA4 Events report showing `session_analyzed`, `login`, `report_tab_viewed`
- Screenshots of Google Cloud Logging showing `[gemini]`, `[coaching]`, and `[vision]` log lines
- A comparison of frontend vs. backend event data
