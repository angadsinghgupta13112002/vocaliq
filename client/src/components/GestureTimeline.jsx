/**
 * components/GestureTimeline.jsx - Hand Gesture Timeline Visualization
 * Displays a second-by-second gesture chart from MediaPipe HandLandmarker.
 * Part of the coaching report — shows when the speaker used open vs closed hands.
 * Author: VocalIQ Team | CS651 Project 2
 */

// Color for each gesture
const GESTURE_COLORS = {
  open_hand:    "#22c55e",  // green   — confident, open
  peace:        "#84cc16",  // lime    — expressive
  pointing:     "#6366f1",  // indigo  — authoritative
  thumbs_up:    "#22d3ee",  // cyan    — positive
  partial_open: "#94a3b8",  // slate   — moderate
  neutral_hand: "#64748b",  // muted   — neutral
  fist:         "#f97316",  // orange  — tense/nervous
  no_hands:     "#1e293b",  // dark    — hidden
};

const GESTURE_LABELS = {
  open_hand:    "Open Hand",
  peace:        "Peace / Emphasis",
  pointing:     "Pointing",
  thumbs_up:    "Thumbs Up",
  partial_open: "Partial Open",
  neutral_hand: "Neutral",
  fist:         "Fist / Closed",
  no_hands:     "Hands Hidden",
};

const GESTURE_EMOJI = {
  open_hand:    "🖐️",
  peace:        "✌️",
  pointing:     "👆",
  thumbs_up:    "👍",
  partial_open: "🤟",
  neutral_hand: "✋",
  fist:         "✊",
  no_hands:     "🙈",
};

// Coaching advice per gesture type
const GESTURE_TIP = {
  open_hand:    "Open palms signal openness and confidence — keep it up!",
  peace:        "Two-finger gestures add emphasis and energy to key points.",
  pointing:     "Pointing can feel directive or aggressive. Try replacing with open-hand sweeps.",
  thumbs_up:    "Affirmative gestures reinforce your message with positive energy.",
  partial_open: "You're using your hands — great! Try opening your palms fully for more impact.",
  neutral_hand: "Neutral hands are fine, but open gestures create stronger audience connection.",
  fist:         "Closed fists suggest tension. Consciously relax and open your hands when you speak.",
  no_hands:     "Your hands weren't visible in most frames. Bring them into frame — gestures build trust.",
};

// Expressiveness bar color
const SCORE_COLOR = (score) => {
  if (score >= 70) return "#22c55e";
  if (score >= 45) return "#84cc16";
  if (score >= 25) return "#f59e0b";
  return "#ef4444";
};

/**
 * GestureTimeline
 * @prop {Array}  timeline — [{ second, gesture, handsCount }, ...] from server
 * @prop {Object} summary  — { dominantGesture, gestureCounts, expressiveSeconds,
 *                             nervousSeconds, handsVisiblePercent, expressivenessScore }
 */
const GestureTimeline = ({ timeline = [], summary = {} }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="gt-empty">
        <span>🙌</span>
        <p>No hand gesture data available for this session.</p>
        <p className="gt-hint">
          Gesture tracking requires a front-facing camera with your hands visible in the frame.
        </p>
      </div>
    );
  }

  const {
    dominantGesture    = "neutral_hand",
    gestureCounts      = {},
    expressiveSeconds  = [],
    nervousSeconds     = [],
    handsVisiblePercent = 0,
    expressivenessScore = 0,
  } = summary;

  const totalFrames = timeline.length;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Sort gesture entries by count descending (skip no_hands in breakdown)
  const gestureEntries = Object.entries(gestureCounts)
    .filter(([g]) => g !== "no_hands")
    .sort(([, a], [, b]) => b - a);

  const scoreColor = SCORE_COLOR(expressivenessScore);

  return (
    <div className="gt-root">

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="gt-cards">

        {/* Dominant gesture */}
        <div className="gt-card">
          <div className="gt-card-emoji">{GESTURE_EMOJI[dominantGesture] ?? "✋"}</div>
          <div className="gt-card-value" style={{ color: GESTURE_COLORS[dominantGesture] ?? "#94a3b8" }}>
            {GESTURE_LABELS[dominantGesture] ?? dominantGesture}
          </div>
          <div className="gt-card-label">Dominant Gesture</div>
        </div>

        {/* Expressiveness score */}
        <div className="gt-card">
          <div className="gt-card-emoji">🎯</div>
          <div className="gt-card-value" style={{ color: scoreColor }}>
            {expressivenessScore} / 100
          </div>
          <div className="gt-card-label">Expressiveness Score</div>
          <div className="gt-badge" style={{ background: `${scoreColor}22`, color: scoreColor }}>
            {expressivenessScore >= 70 ? "Highly Expressive"
              : expressivenessScore >= 45 ? "Moderately Expressive"
              : expressivenessScore >= 25 ? "Needs More Gestures"
              : "Hands Mostly Hidden"}
          </div>
        </div>

        {/* Hands visible */}
        <div className="gt-card">
          <div className="gt-card-emoji">👁️</div>
          <div className="gt-card-value" style={{ color: SCORE_COLOR(handsVisiblePercent) }}>
            {handsVisiblePercent}%
          </div>
          <div className="gt-card-label">Hands Visible</div>
          {expressiveSeconds.length > 0 && (
            <div className="gt-timestamps">
              {expressiveSeconds.slice(0, 4).map(s => (
                <span key={s} className="gt-chip gt-chip-expressive">{formatTime(s)}</span>
              ))}
              {expressiveSeconds.length > 4 && (
                <span className="gt-chip-more">+{expressiveSeconds.length - 4} more</span>
              )}
            </div>
          )}
        </div>

        {/* Nervous/tense moments */}
        <div className="gt-card">
          <div className="gt-card-emoji">✊</div>
          <div className="gt-card-value" style={{ color: nervousSeconds.length > 0 ? "#f97316" : "#22c55e" }}>
            {nervousSeconds.length > 0 ? `${nervousSeconds.length} frames` : "None detected"}
          </div>
          <div className="gt-card-label">Tense Moments</div>
          {nervousSeconds.length > 0 && (
            <div className="gt-timestamps">
              {nervousSeconds.slice(0, 4).map(s => (
                <span key={s} className="gt-chip gt-chip-nervous">{formatTime(s)}</span>
              ))}
              {nervousSeconds.length > 4 && (
                <span className="gt-chip-more">+{nervousSeconds.length - 4} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Gesture Over Time bar ──────────────────────────────────────── */}
      <div className="gt-section">
        <h3 className="gt-section-title">Gestures Over Time</h3>
        <div className="gt-bar-wrap" title="Each segment = one analyzed frame">
          {timeline.map((frame, i) => (
            <div
              key={i}
              className="gt-bar-seg"
              style={{ background: GESTURE_COLORS[frame.gesture] ?? "#475569", flex: 1 }}
              title={`${formatTime(frame.second)} — ${GESTURE_LABELS[frame.gesture] ?? frame.gesture}${frame.handsCount > 0 ? ` (${frame.handsCount} hand${frame.handsCount > 1 ? "s" : ""})` : ""}`}
            />
          ))}
        </div>
        <div className="gt-bar-labels">
          <span>{formatTime(timeline[0]?.second ?? 0)}</span>
          <span>{formatTime(timeline[Math.floor(timeline.length / 2)]?.second ?? 0)}</span>
          <span>{formatTime(timeline[timeline.length - 1]?.second ?? 0)}</span>
        </div>
      </div>

      {/* ── Gesture breakdown chart ────────────────────────────────────── */}
      {gestureEntries.length > 0 && (
        <div className="gt-section">
          <h3 className="gt-section-title">Gesture Breakdown</h3>
          <div className="gt-breakdown">
            {gestureEntries.map(([gesture, count]) => {
              const pct = Math.round((count / totalFrames) * 100);
              return (
                <div key={gesture} className="gt-row">
                  <div className="gt-row-label">
                    <span>{GESTURE_EMOJI[gesture]}</span>
                    <span>{GESTURE_LABELS[gesture] ?? gesture}</span>
                  </div>
                  <div className="gt-row-bar-wrap">
                    <div
                      className="gt-row-bar"
                      style={{ width: `${pct}%`, background: GESTURE_COLORS[gesture] ?? "#475569" }}
                    />
                  </div>
                  <div className="gt-row-pct">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Expressiveness progress bar ─────────────────────────────────── */}
      <div className="gt-section">
        <h3 className="gt-section-title">🎯 Expressiveness</h3>
        <div className="gt-score-bar-wrap">
          <div
            className="gt-score-bar-fill"
            style={{ width: `${expressivenessScore}%`, background: scoreColor }}
          />
        </div>
        <div className="gt-score-labels">
          <span style={{ color: scoreColor, fontWeight: 600 }}>
            {expressivenessScore}% expressive gestures
          </span>
          <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
            {handsVisiblePercent}% of frames had visible hands
          </span>
        </div>
      </div>

      {/* ── Coaching insight ──────────────────────────────────────────────── */}
      <div className="gt-insight">
        <span className="gt-insight-icon">
          {expressivenessScore >= 70 ? "✅" : "💡"}
        </span>
        <span>{GESTURE_TIP[dominantGesture]}</span>
      </div>

      <style>{`
        .gt-root { display: flex; flex-direction: column; gap: 24px; }

        .gt-empty {
          text-align: center; padding: 40px; color: #64748b;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .gt-empty span { font-size: 2.5rem; }
        .gt-empty p { margin: 0; }
        .gt-hint { font-size: 0.8rem; color: #475569; }

        .gt-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
        .gt-card {
          background: #1e293b; border-radius: 12px; padding: 16px;
          text-align: center; border: 1px solid #2d3748;
        }
        .gt-card-emoji  { font-size: 1.8rem; margin-bottom: 6px; }
        .gt-card-value  { font-size: 1rem; font-weight: 600; margin-bottom: 4px; }
        .gt-card-label  { font-size: 0.75rem; color: #64748b; margin-bottom: 8px; }

        .gt-badge {
          display: inline-block; font-size: 0.72rem; font-weight: 600;
          padding: 3px 10px; border-radius: 9999px; margin-top: 4px;
        }

        .gt-timestamps { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 6px; }
        .gt-chip {
          font-size: 0.7rem; padding: 2px 7px; border-radius: 9999px; font-family: monospace;
        }
        .gt-chip-expressive { background: rgba(34,197,94,0.15); color: #22c55e; }
        .gt-chip-nervous    { background: rgba(249,115,22,0.15); color: #f97316; }
        .gt-chip-more       { font-size: 0.7rem; color: #64748b; align-self: center; }

        .gt-section { }
        .gt-section-title {
          font-size: 0.85rem; font-weight: 600; color: #94a3b8;
          margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;
        }

        .gt-bar-wrap { display: flex; height: 24px; border-radius: 6px; overflow: hidden; gap: 1px; }
        .gt-bar-seg  { min-width: 2px; cursor: default; transition: opacity 0.15s; }
        .gt-bar-seg:hover { opacity: 0.75; }
        .gt-bar-labels {
          display: flex; justify-content: space-between;
          font-size: 0.7rem; color: #475569; margin-top: 4px; font-family: monospace;
        }

        .gt-breakdown { display: flex; flex-direction: column; gap: 8px; }
        .gt-row { display: grid; grid-template-columns: 150px 1fr 44px; align-items: center; gap: 10px; }
        .gt-row-label { display: flex; gap: 6px; align-items: center; font-size: 0.85rem; color: #cbd5e1; }
        .gt-row-bar-wrap { background: #1e293b; border-radius: 4px; height: 10px; overflow: hidden; }
        .gt-row-bar  { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
        .gt-row-pct  { font-size: 0.75rem; color: #94a3b8; text-align: right; }

        .gt-score-bar-wrap {
          height: 12px; background: #1e293b; border-radius: 6px;
          overflow: hidden; margin-bottom: 8px;
        }
        .gt-score-bar-fill { height: 100%; border-radius: 6px; transition: width 0.6s ease; }
        .gt-score-labels { display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem; }

        .gt-insight {
          background: #1e293b; border-left: 3px solid #6366f1;
          border-radius: 0 10px 10px 0; padding: 14px 16px;
          display: flex; gap: 10px; align-items: flex-start;
          font-size: 0.875rem; color: #cbd5e1; line-height: 1.5;
        }
        .gt-insight-icon { font-size: 1.1rem; flex-shrink: 0; }
      `}</style>
    </div>
  );
};

export default GestureTimeline;
