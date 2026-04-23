/**
 * utils/gestureExtractor.js - MediaPipe Hand Gesture Extraction
 * Processes video frames through MediaPipe HandLandmarker to detect hand
 * landmarks and classify gestures (open hand, pointing, fist, etc.)
 * Runs entirely client-side — no API cost, no data leaves the browser.
 * Author: VocalIQ Team | CS651 Project 2
 */
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// ── MediaPipe landmark indices ────────────────────────────────────────────────
const THUMB_IP   = 3;  const THUMB_TIP  = 4;
const INDEX_MCP  = 5;  const INDEX_TIP  = 8;
const MIDDLE_MCP = 9;  const MIDDLE_TIP = 12;
const RING_MCP   = 13; const RING_TIP   = 16;
const PINKY_MCP  = 17; const PINKY_TIP  = 20;

// Finger is "extended" if its tip Y is clearly above its MCP joint (Y=0 is top)
const isExtended = (lm, tip, mcp, threshold = 0.04) =>
  lm[mcp].y - lm[tip].y > threshold;

/**
 * Classify a single hand's 21 landmarks into a named gesture.
 * @param {Array}  landmarks  — 21 {x,y,z} landmark objects from MediaPipe
 * @param {string} handedness — "Left" or "Right"
 * @returns {string} gesture label
 */
const classifyGesture = (landmarks, handedness) => {
  const isRight = handedness !== "Left";

  // Thumb: compare tip vs IP joint horizontally (direction flips for left hand)
  const thumb  = isRight
    ? landmarks[THUMB_TIP].x < landmarks[THUMB_IP].x
    : landmarks[THUMB_TIP].x > landmarks[THUMB_IP].x;

  const index  = isExtended(landmarks, INDEX_TIP,  INDEX_MCP);
  const middle = isExtended(landmarks, MIDDLE_TIP, MIDDLE_MCP);
  const ring   = isExtended(landmarks, RING_TIP,   RING_MCP);
  const pinky  = isExtended(landmarks, PINKY_TIP,  PINKY_MCP);

  const extCount = [index, middle, ring, pinky].filter(Boolean).length;

  if (extCount >= 4)                                          return "open_hand";
  if (index && !middle && !ring && !pinky)                   return "pointing";
  if (index && middle && !ring && !pinky)                    return "peace";
  if (!index && !middle && !ring && !pinky && thumb)         return "thumbs_up";
  if (extCount === 0 && !thumb)                              return "fist";
  if (extCount >= 2)                                         return "partial_open";
  return "neutral_hand";
};

/**
 * Pick the dominant (most expressive) gesture across both hands in one frame.
 */
const GESTURE_PRIORITY = [
  "open_hand", "peace", "pointing", "thumbs_up",
  "partial_open", "neutral_hand", "fist",
];

const dominantForFrame = (hands) => {
  if (!hands || hands.length === 0) return "no_hands";
  const gestures = hands.map(h => classifyGesture(h.landmarks, h.handedness));
  return GESTURE_PRIORITY.find(g => gestures.includes(g)) ?? gestures[0];
};

// ── Singleton HandLandmarker ──────────────────────────────────────────────────
let _landmarker = null;

const initLandmarker = async () => {
  if (_landmarker) return _landmarker;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  _landmarker = await HandLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    numHands:    2,
  });

  return _landmarker;
};

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * extractGestures — seeks through a video blob and returns a gesture timeline.
 *
 * @param {Blob}   videoBlob    — the recorded or uploaded video file
 * @param {number} intervalSec — sample one frame every N seconds (default 3)
 * @param {number} maxFrames   — cap total frames (default 20)
 * @returns {Promise<Array>}   [{ second, gesture, handsCount }, ...]
 */
export const extractGestures = async (
  videoBlob,
  intervalSec = 3,
  maxFrames   = 20
) => {
  let landmarker;
  try {
    landmarker = await initLandmarker();
  } catch (err) {
    console.warn("[gesture] MediaPipe init failed:", err.message);
    return [];
  }

  return new Promise((resolve) => {
    const url    = URL.createObjectURL(videoBlob);
    const video  = document.createElement("video");
    video.src         = url;
    video.muted       = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const canvas  = document.createElement("canvas");
    canvas.width  = 320;
    canvas.height = 240;
    const ctx     = canvas.getContext("2d");

    const results = [];

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.src = "";
    };

    video.onerror = () => { cleanup(); resolve([]); };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) { cleanup(); resolve([]); return; }

      // Build list of timestamps to sample
      const times = [];
      for (let t = 0; t < duration && times.length < maxFrames; t += intervalSec) {
        times.push(Math.round(t));
      }

      let i = 0;

      const processNext = () => {
        if (i >= times.length) { cleanup(); resolve(results); return; }
        video.currentTime = times[i];
      };

      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, 320, 240);
          const detection = landmarker.detect(canvas);

          const hands = (detection.landmarks || []).map((lm, idx) => ({
            landmarks:  lm,
            handedness: detection.handednesses?.[idx]?.[0]?.categoryName ?? "Right",
          }));

          results.push({
            second:     times[i],
            gesture:    dominantForFrame(hands),
            handsCount: hands.length,
          });
        } catch (_) {
          // Non-fatal — log the frame as no_hands rather than crashing
          results.push({ second: times[i], gesture: "no_hands", handsCount: 0 });
        }

        i++;
        processNext();
      };

      processNext();
    };
  });
};
