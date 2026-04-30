# Google Database

VocalIQ uses **Google Cloud Firestore** in Native mode as its cloud database.

---

## Setup

**Database type:** Google Cloud Firestore (Native mode)
**Project:** auraboard-492122
**Region:** us-central1 (same region as Cloud Run for low latency)
**Access:** Firebase Admin SDK via Application Default Credentials (ADC) on Cloud Run — no key file stored in the Docker image

The Admin SDK is initialized in `server/config/firebase.js`:
```js
const admin = require("firebase-admin");
admin.initializeApp(); // Uses ADC on Cloud Run; key file path via GOOGLE_APPLICATION_CREDENTIALS locally
const db = admin.firestore();
module.exports = { db };
```

All Firestore reads and writes are done server-side through the Express API. The React frontend never touches Firestore directly — it only communicates with the Express server via authenticated REST calls.

---

## Collections and Document Structure

### Collection: `users`
**Document ID:** Google OAuth `uid` (the `sub` field from Google's userinfo endpoint)

```json
{
  "uid":                "116305439069711589801",
  "displayName":        "Angaddeep Singh Gupta",
  "email":              "angad@example.com",
  "photoURL":           "https://lh3.googleusercontent.com/...",
  "provider":           "google",
  "photosAccessToken":  "ya29.a0AfH6...",
  "photosRefreshToken": "1//0gBcD...",
  "photosConnectedAt":  "Timestamp",
  "updatedAt":          "Timestamp"
}
```

### Collection: `coaching_sessions`
**Document ID:** `{uid}_{Date.now()}` — e.g. `116305439069711589801_1745000123456`

```json
{
  "sessionId":   "116305439069711589801_1745000123456",
  "userId":      "116305439069711589801",
  "mode":        "video",
  "mediaUrl":    "https://storage.googleapis.com/vocaliq-media/videos/uid/1745000123456.webm",
  "language":    "English",
  "overallScore": 7.2,
  "wpm":         142,

  "context": {
    "scenario": "Job Interview",
    "audience": "Hiring Manager",
    "goal":     "Get the job"
  },

  "scoreBreakdown": {
    "contentClarity":     8,
    "emotionalDelivery":  6,
    "vocalConfidence":    7,
    "pacing":             7,
    "audienceEngagement": 8
  },

  "scoreJustification": "The speaker delivered clear content but showed some nervousness in the first half.",
  "emotionDetected":    "nervous",
  "emotionNeeded":      "confident",

  "transcript": [
    {
      "start": "0:00", "end": "0:08",
      "text": "Hi, thank you for having me today.",
      "issues": ["nervousness"],
      "fix": "Take a slow breath before speaking."
    }
  ],

  "improvementTips": ["Slow down in the opening", "More eye contact", "Vary vocal tone"],

  "detailedTips": [
    {
      "issue": "nervousness",
      "title": "Calm Your Opening",
      "explanation": "Nervousness in the first 10 seconds sets a weak first impression.",
      "exercise": "Practice a 3-second pause after greeting before continuing.",
      "rephrasing": "Instead of rushing, try: 'I'd like to share what makes me a strong fit.'"
    }
  ],

  "vocalControl": {
    "pacing": { "current": 142, "target": 130, "technique": "Pause after each key point" },
    "tone":   "Add warmth by raising pitch slightly on positive words",
    "breath": "Breathe at natural punctuation marks",
    "pause":  "Use deliberate 2-second pauses"
  },

  "strengthsToKeep": ["Clear structure", "Good vocabulary"],
  "practicePlan":    "Day 1-2: Focus on pace. Day 3-4: Eye contact. Day 5-7: Full mock interview.",

  "emotionTimeline": [
    { "second": 0,  "emotion": "nervous",   "confidence": 0.72, "eyeContact": "direct",       "panAngle": -4,  "tiltAngle": 2  },
    { "second": 3,  "emotion": "neutral",   "confidence": 0.61, "eyeContact": "looking_away", "panAngle": 22,  "tiltAngle": -5 },
    { "second": 6,  "emotion": "confident", "confidence": 0.85, "eyeContact": "direct",       "panAngle": 1,   "tiltAngle": 3  }
  ],

  "emotionSummary": {
    "dominantEmotion":    "confident",
    "emotionCounts":      { "confident": 6, "nervous": 3, "neutral": 2 },
    "nervousSeconds":     [0, 3],
    "confidentSeconds":   [6, 9, 12, 15, 18, 21],
    "eyeContactPercent":  73,
    "eyeContactRating":   "good",
    "lookingAwaySeconds": [3]
  },

  "gestureTimeline": [
    { "second": 0,  "gesture": "neutral_hand", "handsCount": 0 },
    { "second": 3,  "gesture": "open_hand",    "handsCount": 2 },
    { "second": 6,  "gesture": "pointing",     "handsCount": 1 }
  ],

  "gestureSummary": {
    "dominantGesture":     "open_hand",
    "gestureCounts":       { "open_hand": 5, "pointing": 2, "neutral_hand": 3, "no_hands": 1 },
    "expressiveSeconds":   [3, 6, 9, 12, 15],
    "nervousSeconds":      [],
    "handsVisiblePercent": 82,
    "expressivenessScore": 68
  },

  "createdAt": "Timestamp"
}
```

---

## How Data is Added, Updated, and Removed

### Adding Data

**New user (on first login):**
```js
// server/controllers/authController.js
await setDocument("users", uid, {
  uid, displayName, email, photoURL,
  provider: "google",
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}, true); // merge: true — won't overwrite existing fields
```

**New coaching session (after analysis):**
```js
// server/controllers/coachingController.js
await setDocument("coaching_sessions", sessionId, {
  sessionId, userId: uid, mode, mediaUrl,
  ...pass1, ...pass2,
  emotionTimeline, emotionSummary,
  gestureTimeline, gestureSummary,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

**Drive OAuth tokens (when user connects Google Drive):**
```js
// server/controllers/authController.js
await setDocument("users", uid, {
  photosAccessToken:  accessToken,
  photosRefreshToken: refreshToken,
  photosConnectedAt:  admin.firestore.FieldValue.serverTimestamp(),
}, true); // merge: true — only updates these 3 fields
```

### Updating Data

**Auto-refreshing an expired Drive access token:**
```js
// server/controllers/coachingController.js
const newToken = await refreshGoogleToken(refreshToken);
await setDocument("users", uid, { photosAccessToken: newToken }, true);
```

**Updating last-login timestamp on every sign-in:**
```js
await setDocument("users", uid, {
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}, true);
```

### Removing Data

Sessions and users are not deleted through the app UI. The `deleteDocument` helper is available if needed:
```js
// server/services/firestoreService.js
const deleteDocument = async (collection, docId) => {
  await db.collection(collection).doc(docId).delete();
};
```

---

## Queries Performed from the App

### Get a single session (coaching report page):
```js
// GET /api/coaching/sessions/:id
const session = await getDocument("coaching_sessions", sessionId);
```

### Get all sessions for a user, ordered by most recent first:
```js
// GET /api/coaching/sessions
const sessions = await queryCollection(
  "coaching_sessions", "userId", uid, 50, "createdAt", "desc"
);
```
This query uses a **Firestore composite index** on `userId ASC + createdAt DESC` — created via the `gcloud firestore indexes composite create` command.

### Get user profile (auth check):
```js
// GET /api/auth/me
const user = await getDocument("users", uid);
```

### Get user to retrieve Drive OAuth tokens:
```js
// Inside coachingController.analyzeFromDrive
const userDoc = await getDocument("users", uid);
const { photosAccessToken, photosRefreshToken } = userDoc;
```

---

## Firestore Composite Index

Because `getSessions` filters by `userId` and sorts by `createdAt`, Firestore requires a composite index:

| Collection | Field | Order |
|---|---|---|
| `coaching_sessions` | `userId` | Ascending |
| `coaching_sessions` | `createdAt` | Descending |

This index was created using:
```bash
gcloud firestore indexes composite create \
  --project=auraboard-492122 \
  --collection-group=coaching_sessions \
  --field-config=field-path=userId,order=ascending \
  --field-config=field-path=createdAt,order=descending \
  --query-scope=COLLECTION
```

> **[ADD SCREENSHOT]** — Firebase Console showing the `coaching_sessions` collection with multiple documents

> **[ADD SCREENSHOT]** — Firebase Console showing a single expanded session document with all nested fields

> **[ADD SCREENSHOT]** — Firebase Console showing the Indexes tab with the composite index status = Enabled
