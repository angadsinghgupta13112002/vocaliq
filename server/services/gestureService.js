/**
 * services/gestureService.js - Hand Gesture Timeline Summarizer
 * Consumes the gesture timeline produced by MediaPipe (client-side) and
 * returns a structured summary for the coaching report.
 * Author: VocalIQ Team | CS651 Project 2
 */

// Gestures that signal confidence and expressiveness
const EXPRESSIVE_GESTURES = new Set(["open_hand", "peace", "pointing", "thumbs_up"]);

// Gestures that signal tension or nervousness
const NERVOUS_GESTURES = new Set(["fist"]);

/**
 * summarizeGestureTimeline
 * @param {Array} timeline — [{ second, gesture, handsCount }, ...]
 * @returns {Object} summary
 */
const summarizeGestureTimeline = (timeline) => {
  if (!timeline || timeline.length === 0) {
    return {
      dominantGesture:      "no_hands",
      gestureCounts:        {},
      expressiveSeconds:    [],
      nervousSeconds:       [],
      handsVisiblePercent:  0,
      expressivenessScore:  0,
    };
  }

  // Count each gesture type
  const gestureCounts = {};
  timeline.forEach(({ gesture }) => {
    gestureCounts[gesture] = (gestureCounts[gesture] || 0) + 1;
  });

  // Dominant gesture (most frequent)
  const dominantGesture = Object.entries(gestureCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "no_hands";

  // Seconds where the speaker made expressive or nervous gestures
  const expressiveSeconds = timeline
    .filter(t => EXPRESSIVE_GESTURES.has(t.gesture))
    .map(t => t.second);

  const nervousSeconds = timeline
    .filter(t => NERVOUS_GESTURES.has(t.gesture))
    .map(t => t.second);

  // What % of frames had visible hands
  const handsVisibleFrames  = timeline.filter(t => t.gesture !== "no_hands").length;
  const handsVisiblePercent = Math.round((handsVisibleFrames / timeline.length) * 100);

  // Expressiveness score 0–100:
  // 50% from hands-visible rate + 50% from expressive-gesture rate
  const expressiveRate      = expressiveSeconds.length / timeline.length;
  const expressivenessScore = Math.min(100, Math.round(
    handsVisiblePercent * 0.5 + expressiveRate * 100 * 0.5
  ));

  return {
    dominantGesture,
    gestureCounts,
    expressiveSeconds,
    nervousSeconds,
    handsVisiblePercent,
    expressivenessScore,
  };
};

module.exports = { summarizeGestureTimeline };
